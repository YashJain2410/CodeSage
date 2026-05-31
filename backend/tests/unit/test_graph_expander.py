from app.core.retrieval.graph_expander import GraphExpander
from app.core.retrieval.intent import QueryIntent

import networkx as nx


def build_test_graph():

    graph = nx.MultiDiGraph()

    # Call graph
    graph.add_edge("api_handler", "login_user")
    graph.add_edge("login_user", "validate_credentials")
    graph.add_edge("login_user", "create_session")
    graph.add_edge("create_session", "save_token")

    # Test relationship
    graph.add_edge(
        "test_login_user",
        "login_user",
        edge_type="tests"
    )

    return graph


def main():

    graph = build_test_graph()

    expander = GraphExpander(graph)

    func_id = "login_user"

    print("\n=== EXPLAIN ===")
    print(expander.expand_explain(func_id))

    print("\n=== BUG ===")
    print(expander.expand_bug(func_id))

    print("\n=== IMPACT ===")
    print(expander.expand_impact(func_id))

    print("\n=== TEST ===")
    print(expander.expand_test(func_id))

    print("\n=== ONBOARD ===")
    print(expander.expand_onboard(func_id))

    print("\n=== ROUTER TESTS ===")

    print(
        "BUG ->",
        expander.expand(
            func_id,
            QueryIntent.BUG
        )
    )

    print(
        "IMPACT ->",
        expander.expand(
            func_id,
            QueryIntent.IMPACT
        )
    )

    print(
        "TEST ->",
        expander.expand(
            func_id,
            QueryIntent.TEST
        )
    )

    print(
        "ONBOARD ->",
        expander.expand(
            func_id,
            QueryIntent.ONBOARD
        )
    )

    print(
        "EXPLAIN ->",
        expander.expand(
            func_id,
            QueryIntent.EXPLAIN
        )
    )


if __name__ == "__main__":
    main()