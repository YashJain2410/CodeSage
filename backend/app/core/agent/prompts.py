from langchain_core.prompts import ( ChatPromptTemplate )

from app.core.retrieval.intent import QueryIntent

SYSTEM_PROMPT = """
You are CodeSage,
an expert code assistant
with full context of a codebase.

You are given structured context
including:

- target function
- callers
- callees
- test coverage

Rules:

- Always cite filepath:line_number
- When tracing bugs, walk the call path
  step by step
- When answering impact questions,
  list every affected caller
- If no tests cover the target,
  mention this proactively
- Never fabricate file paths
- Never fabricate function names
"""


INTENT_SYSTEM_PROMPTS = {
    QueryIntent.BUG: """
Focus on stack traces,
call chains,
root cause analysis.
""",

    QueryIntent.IMPACT: """
Focus on ripple effects,
dependencies,
affected callers.
""",

    QueryIntent.TEST: """
Focus on coverage,
missing tests,
test gaps.
""",

    QueryIntent.EXPLAIN: """
Focus on explaining architecture,
responsibilities,
and execution flow.
""",

    QueryIntent.ONBOARD: """
Assume the reader is new
to the codebase.

Explain architecture,
major components,
and relationships.
"""
}


HUMAN_TEMPLATE = """
Question: {query}

Context:
{context}

Please answer the question
using only the provided context.

Cite specific file:line references.
"""


ANSWER_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", SYSTEM_PROMPT),
        ("human", HUMAN_TEMPLATE)
    ]
)


def build_prompt(intent: QueryIntent):

    extra_prompt = INTENT_SYSTEM_PROMPTS.get(intent, "")

    return ChatPromptTemplate.from_messages(
        [
            (
                "system",
                SYSTEM_PROMPT + "\n" + extra_prompt
            ),
            (
                "human",
                HUMAN_TEMPLATE
            )
        ]
    )