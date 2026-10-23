# CodeSage model audit and interview preparation

Audit date: 23 October 2026. Based on source inspection and current vendor documentation, not a live model benchmark. The working tree was being edited concurrently during this audit; this report reflects the later source snapshot. The audit itself does not change model settings or application code.

## 1. What models are actually involved?

There are three core learned-model roles, with the generation model also serving intent classification. Provider support is not evidence that every provider is being used. Defaults in source are not proof of the deployed configuration or successful API calls.

| Stage | Model or algorithm in source | Purpose | Evidence |
| --- | --- | --- | --- |
| Parse repository | Python parser and Tree-sitter-based language parsers | Extract functions/classes, names, locations, imports and calls | `backend/app/core/parser/` |
| Build graph | Static graph construction and NetworkX | Connect callers, callees and tests | `backend/app/core/graph/` |
| Embed code at indexing time | `microsoft/unixcoder-base` through SentenceTransformer | Turn code units plus metadata into vectors | `backend/app/core/indexer/embedder.py` |
| Embed a search question | Same UniXcoder checkpoint | Put questions in the same vector space as indexed code | `backend/app/core/retrieval/hybrid.py` |
| Lexical retrieval | BM25 | Find literal symbols, names and terminology | `backend/app/core/retrieval/hybrid.py` |
| Combine search results | Reciprocal Rank Fusion, constant 60 | Combine lexical and dense rankings without comparing incompatible raw scores | Same file |
| Classify intent | Keyword rules; selected LLM when rules are insufficient | Choose BUG, EXPLAIN, IMPACT, TEST or ONBOARD | `backend/app/core/retrieval/intent.py` |
| Expand related code | Graph traversal selected by intent | Find connected functions missed by initial search | `backend/app/core/retrieval/graph_expander.py` |
| Rerank candidates | `cross-encoder/ms-marco-MiniLM-L-6-v2` | Score each question/code pair jointly | `backend/app/core/retrieval/reranker.py` |
| Assemble context | String assembly and approximate token budget | Fit useful code into the answer prompt | `backend/app/core/retrieval/context_assembler.py` |
| Generate answer | Latest backend default: Gemini `gemini-3.8-flash`; request can select a configured provider/model | Explain retrieved code | `backend/app/config.py`, `backend/app/core/llm/factory.py`, `backend/app/core/agent/nodes.py` |
| Evaluate answers | RAGAS integration, with no explicit judge checkpoint in source | Intended faithfulness and context evaluation | `backend/app/evaluation/ragas_evaluator.py` |

BM25, RRF, parsers, Qdrant, NetworkX and LangGraph are not additional LLMs. No project-specific model fine-tuning or training pipeline was found in the inspected application paths.

The reranker's spelling redirects on Hugging Face to the canonical `cross-encoder/ms-marco-MiniLM-L6-v2`; the extra hyphen is not, by itself, evidence of a missing model.

### Generation configuration is in transition

At the start of inspection, generation and intent fallback named `gemini-3.5-flash`. Later edits changed backend defaults to `gemini-3.8-flash`, made model selection configurable, and routed intent inference through the selected provider/model. Do not describe the older hardcoded intent provider as the latest behavior.

The latest factory contains Gemini and Anthropic adapters, plus OpenAI-compatible adapters for OpenAI, DeepSeek, Groq, Mistral, xAI and OpenRouter. Groq/OpenRouter are serving platforms with selectable model IDs, not individual models. Only Gemini has a concrete default checkpoint in the inspected backend settings; the other provider model IDs require configuration or a request value.

The evaluation harness still explicitly names `gemini-3.5-flash`. Frontend defaults and persisted browser settings must also be checked: an explicit request model overrides the backend default. A backend environment change alone may therefore not change every request.

## 2. Why these choices are defensible

These are engineering rationales inferred from the architecture, not a documented record of why the original author selected each checkpoint.

### UniXcoder: a code-aware retrieval baseline

An embedding represents a question or code fragment as a list of numbers. Similar vectors help find code implementing an idea even when its function name differs from the user's words. This handles questions such as “where do we prevent duplicate payments?” when the relevant code uses names such as `idempotency_key`.

UniXcoder is a reasonable starting point because its training targets code representations. Microsoft's model card demonstrates natural-language/code search and 768-dimensional embeddings. It can run locally, avoiding an embedding API charge per call. Local inference still consumes memory, compute and maintenance effort. [Microsoft model card](https://huggingface.co/microsoft/unixcoder-base).

Important limitation: CodeSage loads the checkpoint through a generic SentenceTransformer wrapper, whereas Microsoft's reference uses a dedicated UniXcoder wrapper and encoder-only formatting. Verify special tokens, pooling, masking and truncation against that reference before judging the checkpoint's quality. A correct vector dimension does not prove equivalent inference.

### MiniLM: improve precision after inexpensive candidate search

The embedding model encodes a question and a code unit separately, enabling efficient vector search over the repository. The cross-encoder reads both together and estimates relevance more directly. Applying it only to shortlisted candidates controls the cost of joint scoring.

MiniLM is a compact baseline, but this checkpoint was trained for MS MARCO passage ranking, not specifically for source-code retrieval. Its published passage-ranking performance is not evidence of CodeSage's code-ranking quality. [Sentence Transformers model card](https://huggingface.co/cross-encoder/ms-marco-MiniLM-L6-v2).

### Gemini Flash: answer synthesis and occasional intent inference

A hosted model avoids serving a generative LLM locally. Using the same configured model for intent and answering simplifies provider handling. However, classifying one of five labels is a much smaller task than explaining a multi-file failure, so the same model need not be optimal for both.

Google currently lists `gemini-3.8-flash` as a stable model and documents structured output support. That makes it a valid candidate to evaluate, not a proven winner on this project. [Google model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash).

### Why keep BM25 and the graph?

Dense embeddings handle semantic similarity; BM25 handles exact symbols and literals. A query for `refresh_token` benefits from literal matching, while a paraphrased business requirement may benefit from dense retrieval. RRF combines the rankings without assuming BM25 and cosine scores share a scale.

The graph adds a separate signal: a function may matter because it calls, is called by, or tests the initial result. For IMPACT intent, upstream callers matter; for BUG, nearby callers and callees matter; for TEST, linked test nodes matter. These are deterministic traversals over an approximate static graph, not LLM-generated understanding. Dynamic calls and incomplete static analysis can still hide dependencies.

## 3. What I would improve before replacing models

### Establish a trustworthy evaluation baseline

The repository has 80 golden cases: 20 BUG, 20 EXPLAIN, 15 IMPACT, 15 TEST and 10 ONBOARD. That is useful starting material, but the current evaluation path needs repair:

1. The harness reads `case['intent']`; the supplied cases use `expected_intent`.
2. The evaluation route passes the uncompiled `workflow` builder, while the runtime exports a compiled `graph` with the execution path.
3. Harness invocation omits graph/retrieval state that the normal query service prepares.
4. The RAGAS adapter passes function IDs as `contexts` and joined expected function IDs as `ground_truth`. Semantic faithfulness requires actual source passages and suitable reference answers or claims. IDs are useful for retrieval metrics, but are not source evidence for answer judging.
5. The RAGAS judge/provider is not explicitly pinned. The shown requirements also do not declare `ragas` or `datasets`; check and repair environment compatibility rather than guessing an implicit judge model.
6. The harness expects `baseline.json`; no tracked baseline file was found in the file inventory.
7. `expected_answer_contains` and `expected_citations` exist in the golden data, but the inspected harness does not use them to validate answer correctness or source grounding.
8. The embedding-comparison, chunking-experiment and evaluation-analysis notebooks are empty files. They are not evidence of completed experiments.

Consequently, do not claim “we selected these because our benchmark showed they were best.” A defensible statement is “these are initial baselines; I have identified how to evaluate alternatives reliably.”

### Fix evidence handling and avoid false confidence

The answer node currently returns `citations=[]` and `confidence=1.0`. The confidence-check node does no assessment, so the confidence router accepts every normally generated answer. This is not calibrated confidence or implemented self-correction.

Extract structured source references, validate file paths and line ranges against the retrieved repository revision, then assess whether cited evidence supports each claim. Citation syntax alone is insufficient: the existing citation metric mostly recognizes a Python `file:line` shape and does not establish factual support or cover all supported languages.

Use retrieval coverage and claim verification to decide when to abstain or ask for clarification. Do not interpret a raw reranker score or an LLM's self-reported probability as answer correctness.

### Improve representation and deployment

- Index text includes only the first 1,000 source characters. Context blocks include only the first 2,000. Larger-context models cannot recover code discarded before inference. Prefer token-aware chunks with symbol metadata, preserving complete small functions and splitting long functions coherently.
- BM25 currently tokenizes using lowercase whitespace splitting. Test identifier-aware splitting for snake_case, camelCase, punctuation and file paths while preserving original symbols.
- `EMBED_MODEL` exists in settings, but indexing and retrieval instantiate `CodeEmbedder()` with its constructor default. Wire configuration through both before treating the environment variable as a model switch.
- Qdrant vector size is hardcoded to 768 in collection creation and recreation. Make dimension and model version explicit.
- The embedding cache helper keys by unit ID and source, without model version or the full graph-enriched input text. It is not used by the current batch-indexing path. If enabled later, namespace by model/revision, preprocessing and the exact input representation.
- Indexing and retrieval create separate embedder instances; model initialization also occurs during module/application loading. Share or separate inference services deliberately and measure per-process memory, rather than assuming one model instance for the whole deployment.
- Operations documentation reports that the free Render backend runs out of memory at 512 MB. This is a repository-documented limitation, not a newly reproduced deployment result. Moving inference to a service or using sufficient memory addresses a different problem from choosing a more accurate checkpoint.

## 4. Candidates worth testing

These are candidates, not measured upgrades. The winner depends on CodeSage's code, query mix, serving budget and latency target.

| Goal | Candidate or approach | Reason to test | Tradeoff |
| --- | --- | --- | --- |
| Hosted code embeddings | Voyage `voyage-code-4`; retain `voyage-code-3` as a comparison if available | Vendor documentation lists code-retrieval models | API cost, network dependence, and sending code to an additional service |
| Self-hosted retrieval with more resources | `Qwen/Qwen3-Embedding-0.6B` | Instruction-aware retrieval model worth evaluating on code | Larger memory requirement; use the documented query prompt and pooling |
| Small local retrieval baseline | `BAAI/bge-small-en-v1.5` | Test whether a smaller general retriever provides acceptable quality at lower serving cost | General retrieval training may lose code-specific distinctions; no promise it fits the complete application into 512 MB |
| Improve reranking locally | `Qwen/Qwen3-Reranker-0.6B` | Test instruction-aware reranking on code questions | More compute and memory; verify library support and model-specific scoring behavior |
| Improve reranking through an API | Voyage `rerank-3-lite`, then `rerank-3` | Compare hosted relevance ranking and remove local reranker serving | Per-call charges and additional network latency |
| Cheaper intent classification | Rules plus `gemini-3.5-flash-lite` for ambiguous cases | Five-label classification may not need the answer model | Requires independent intent-model configuration; validate confusion between BUG, IMPACT and EXPLAIN |
| Answer generation | Keep the configured `gemini-3.8-flash` as one baseline; compare a configured alternative provider with identical retrieved context | Isolate answer quality from retrieval changes | A new provider adapter alone does not establish compatibility or better answers |

Primary documentation: [Voyage embeddings](https://docs.voyageai.com/docs/embeddings), [Qwen embedding model](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B), [BGE small model](https://huggingface.co/BAAI/bge-small-en-v1.5), [Qwen reranker](https://huggingface.co/Qwen/Qwen3-Reranker-0.6B), [Voyage rerankers](https://docs.voyageai.com/docs/reranker), [Google Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite).

For the current constrained hosted demo, I would first test hosted embeddings and either a hosted reranker or no reranker. For a private installation with sufficient hardware, test the Qwen pair. Keep UniXcoder and MiniLM as baselines until the results justify replacing them.

Separating intent and answer models is a proposed optimization; the latest implementation intentionally uses the same selection for both. Make that distinction explicit when discussing future work.

## 5. How to prove that an alternative is better

1. Repair the harness and record the repository commit, corpus revision, model IDs/revisions, preprocessing, prompts and serving setup.
2. Use the existing golden set for initial diagnostics. Add held-out cases from other repositories and languages; do not tune and report final quality on the same cases.
3. Compare BM25 alone, dense alone, hybrid, hybrid plus graph, and hybrid plus graph plus reranking. This tests whether each stage earns its complexity.
4. For an embedding comparison, hold lexical retrieval, graph rules, reranker and generator fixed; re-embed the full corpus for each checkpoint. Measure Recall@10/20 before reranking and end-to-end retrieval coverage.
5. For a reranker comparison, reuse identical candidate lists. Measure MRR@10, nDCG@10 and relevant-code retention at the actual context cutoff. Include a no-reranker baseline.
6. For a generator comparison, reuse identical assembled context. Score correctness, grounded claims, valid citations, completeness and appropriate abstention. Use blinded human review for a sample and a pinned judge as a supporting signal.
7. For intent, measure accuracy, macro-F1, confusion matrix and rule bypass rate. The current keyword-derived confidence is a heuristic, not a calibrated probability.
8. Measure end-to-end p50/p95 latency, cold start, peak memory, indexing throughput, API failures, token usage and cost per successful grounded answer. Include intent calls and any model thinking tokens billed by the provider.
9. Set acceptance criteria before inspecting results. For example, require a meaningful retrieval gain within a chosen latency/cost budget and no material regression on critical bug/impact cases. Treat any numerical threshold as a team decision, not an industry standard.

Do not assume “newer,” “larger,” or a public leaderboard score means better on this application. If relevant code is absent before generation, a more capable answer model cannot reliably reconstruct that missing repository evidence.

## 6. Safe model migration

### Changing the answer model

Configure the supported provider, its API key and an account-supported model ID, or pass provider/model in a request. Check frontend defaults and saved settings. Test output-limit handling, failures and actual model metadata. Changing the generator does not require rebuilding embeddings, but does require re-evaluating answers and intent if both share the selection.

### Changing embeddings

Use the new model for documents and questions with its documented preprocessing. Create a separate, versioned Qdrant collection with the correct dimension, re-embed everything, validate it, then switch traffic while retaining rollback. Equal dimensions do not make independently trained embedding spaces compatible. Do not mix old and new vectors, or destructively reset the only working collection as a migration strategy.

### Changing the reranker

No vector rebuild is needed. Confirm the model's pair-input formatting, score direction, maximum sequence length, truncation and inference dependencies. Re-evaluate the same candidate sets and deployment memory.

## 7. Interview answers to practice

### “Which AI models do you use, and why?” — 60–90 seconds

“CodeSage separates finding relevant code from explaining it. At indexing time I extract functions and build a static relationship graph, then use UniXcoder embeddings for semantic code retrieval. At query time I combine those results with BM25, because exact identifiers and semantic similarity solve different retrieval problems. I merge the rankings with reciprocal rank fusion, expand relevant callers, callees or tests according to intent, and use a MiniLM cross-encoder to rerank the candidates. The selected generative model, currently defaulting to Gemini Flash in the backend, answers from that context. Rules handle clear intents; ambiguous questions use the selected LLM.

“These checkpoints are reasonable baselines, but I would not claim they are optimal without project-specific evaluation. My next step is to repair the evaluation path, measure each retrieval stage separately, and compare code-focused embeddings and rerankers under a latency, memory and cost budget.”

### “Why not just send the entire repository to a large-context model?”

“That can be a useful baseline for a small repository. As repositories grow, sending everything increases token cost and latency and adds irrelevant material. Retrieval gives targeted, revision-specific evidence. I would compare both approaches on small repositories rather than assume retrieval always wins.”

### “Why not use only embeddings?”

“Embeddings can miss exact symbols and near-identical identifiers. BM25 recovers literal matches; the graph recovers connected code that is relevant because of program structure. I would use ablations to verify the incremental benefit.”

### “Why do you need both an embedding model and a reranker?”

“The embedding model precomputes document vectors so I can search the repository efficiently. The reranker jointly reads the question and each shortlisted candidate, trading additional inference for better ordering. Reranking the entire repository would be too expensive, so I apply it after retrieval.”

### “Why not use the LLM to create the call graph?”

“Parsing and static analysis are cheaper, reproducible and tied to source locations. The graph is still approximate, especially for dynamic dispatch, so I describe its limits instead of treating it as perfect program analysis.”

### “How do you prevent hallucinations?”

“The intended design is to ground answers in retrieved code and validated citations, and to abstain when evidence is insufficient. The current implementation still has empty citations and fixed confidence, so I would present grounding verification as unfinished work, not claim it is already solved.”

### “Have you fine-tuned the models?”

“No. The inspected application uses pretrained checkpoints with repository indexing and prompting. Indexing changes the retrieved knowledge, not the model weights. I would consider fine-tuning only after identifying a repeatable failure pattern and collecting enough representative training and held-out examples.”

### “Which model would you replace first?”

“First I would fix the evaluation and hosting constraints. Then I would identify the failing stage: missing relevant functions means investigate embeddings/chunking; good candidates ranked poorly means investigate reranking; correct context with an incorrect explanation means investigate the generator. I would replace the component with measured benefit rather than replace the whole stack.”

### “What is your biggest current limitation?”

“Reliable measurement and deployment. The current evaluation integration needs correction, confidence is not calibrated, and the documented free backend cannot fit the local model stack. Those are concrete engineering limitations with a clear improvement plan.”

## Recommended order of work

Repair evaluation and source grounding; confirm one effective model configuration across API/frontend/eval; choose an inference deployment that fits the budget; benchmark embeddings and rerankers independently; compare generators on identical context; migrate only the winning components with rollback.
