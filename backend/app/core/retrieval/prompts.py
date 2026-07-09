INTENT_CLASSIFIER_PROMPT = """
You are an intent classifier for a codebase assistant.

Classify the user's question into exactly one of these labels:

BUG
EXPLAIN
IMPACT
TEST
ONBOARD

Definitions:

BUG
Questions about debugging, crashes, errors, exceptions or unexpected behaviour.

EXPLAIN
Questions asking how code works or what a function does.

IMPACT
Questions about changing, deleting or refactoring code.

TEST
Questions about tests, coverage or validation.

ONBOARD
Questions asking for architecture, overview or project structure.

Return ONLY one word.

Question:
{query}
"""