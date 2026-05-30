from app.core.retrieval.hybrid import HybridRetriever


def main():

    retriever = HybridRetriever()

    # Same documents that were indexed into Qdrant
    documents = [
        {
            "func_id": "login_user",
            "text": """
            Authenticate user credentials and create session token.
            Handles invalid passwords and account lockout.
            """
        },
        {
            "func_id": "charge_card",
            "text": """
            Process customer payment using Stripe API.
            Handles payment failures and refunds.
            """
        },
        {
            "func_id": "send_email",
            "text": """
            Send transactional emails to users.
            Used for password reset and notifications.
            """
        }
    ]

    # Build BM25 index
    retriever.build_bm25_index(documents)

    query = "why does payment fail"

    print(f"\nQuery: {query}")

    print("\n=== BM25 RESULTS ===")
    bm25_results = retriever.bm25_search(query)

    for result in bm25_results:
        print(result)

    print("\n=== DENSE RESULTS ===")
    dense_results = retriever.dense_search(query)

    for result in dense_results:
        print(result)

    print("\n=== HYBRID (RRF) RESULTS ===")
    fused_results = retriever.search(query)

    for func_id, score in fused_results:
        print(
            f"Function: {func_id} | "
            f"RRF Score: {score:.6f}"
        )


if __name__ == "__main__":
    main()