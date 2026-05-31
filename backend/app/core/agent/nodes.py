from app.core.agent.state import AgentState
from app.core.retrieval.intent import QueryIntentClassifier
from app.core.retrieval.hybrid import HybridRetriever
from app.core.retrieval.graph_expander import GraphExpander
from app.core.retrieval.reranker import CrossEncoderReranker
from app.core.retrieval.context_assembler import ContextAssembler


classifier = QueryIntentClassifier()

def classify_intent_node(state: AgentState):

    result = classifier.classify(state["query"])
    state["intent"] = result.intent
    return state


retriever = HybridRetriever()

def retrieve_node(state: AgentState):

    results = retriever.search(state["query"])
    state["retrieved_nodes"] = results
    return state



def expand_node(state: AgentState):

    graph = state["graph"]
    expander = GraphExpander(graph)
    expanded = []

    for func_id, _ in state["retrieved_nodes"]:

        expanded.extend(
            expander.expand(
                func_id, 
                state["intent"]
            )
        )
    
    state["expanded_nodes"] = list(set(expanded))

    return state


reranker = CrossEncoderReranker()

def rerank_node(state: AgentState):

    graph = state["graph"]

    ranked = reranker.rerank(
        query=state["query"],
        candidates=state["expanded_nodes"],
        graph=graph
    )

    state["reranked_nodes"] = ranked

    return state


assembler = ContextAssembler()

def assemble_context_node(state: AgentState):

    graph = state["graph"]

    context = assembler.assemble(
        ranked_nodes=state["reranked_nodes"],
        graph=graph
    )

    state["context"] = context

    return state