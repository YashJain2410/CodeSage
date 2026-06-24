from datasets import Dataset

def build_ragas_dataset(eval_results):

    rows = []

    for result in eval_results:

        rows.append(
            {
                "question": result.query,
                "answer": result.answer,
                "contexts": result.retrieved_func_ids,
                "ground_truth":
                    ",".join(
                        result.expected_func_ids
                    ),
            }
        )

    return Dataset.from_list(rows)