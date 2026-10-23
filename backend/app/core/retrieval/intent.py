from enum import Enum

from dataclasses import dataclass
from typing import Literal

from app.observability.metrics import INTENT_CLASSIFICATION_METHOD, INTENT_COUNT
from app.core.llm.factory import get_llm
from app.core.llm.errors import ModelRequestError
from app.core.retrieval.prompts import INTENT_CLASSIFIER_PROMPT

class QueryIntent(str, Enum):
    BUG = "BUG"
    EXPLAIN = "EXPLAIN"
    IMPACT = "IMPACT"
    TEST = "TEST"
    ONBOARD = "ONBOARD"


@dataclass
class IntentResult:
    intent: QueryIntent
    confidence: float
    method: Literal["rules", "llm"]


class QueryIntentClassifier:

    def __init__(self):
        self.intent_keywords = {
            QueryIntent.BUG: [
                "fail",
                "error",
                "broken",
                "bug",
                "crash",
                "exception",
                "not working",
                "why does"
            ],

            QueryIntent.IMPACT: [
                "change",
                "modify",
                "refactor",
                "break",
                "affect",
                "depends on",
                "if i remove"
            ],

            QueryIntent.TEST: [
                "test",
                "coverage",
                "spec",
                "assert",
                "unit test",
                "tested"
            ],

            QueryIntent.EXPLAIN: [
                "explain",
                "what does",
                "how does",
                "understand",
                "what is",
                "purpose of"
            ],

            QueryIntent.ONBOARD: [
                "architecture",
                "overview",
                "how does the system",
                "flow",
                "whole",
                "entire"
            ]
        }


    def classify_rules(self, query: str):

        query = query.lower()
        best_intent = None
        best_score = 0

        for intent, keywords in self.intent_keywords.items():

            score = 0

            for keyword in keywords:

                if keyword in query:
                    score += 1

            if score > best_score:
                best_score = score
                best_intent = intent

        if best_score == 0:
            return None
        
        confidence = min(best_score / 2, 1.0)

        return IntentResult(
            intent = best_intent,
            confidence = confidence,
            method = "rules"
        )
    

    def classify_llm(
        self,
        query: str,
        provider: str | None = None,
        model_name: str | None = None,
    ):

        llm = get_llm(provider, model_name)

        response = llm.generate(
            system_prompt="You are an intent classifier",
            user_prompt=INTENT_CLASSIFIER_PROMPT.format(
                query = query
            ),
        )

        label = response.strip().upper()

        try:
            intent = QueryIntent(label)
        
        except ValueError as exc:
            raise ModelRequestError(
                "The selected model returned an invalid intent label. No fallback was used."
            ) from exc

        return IntentResult(
            intent = intent,
            confidence = 0.6,
            method = "llm",
        )
    

    def classify(
        self,
        query: str,
        provider: str | None = None,
        model_name: str | None = None,
    ) -> IntentResult:

        rule_result = self.classify_rules(query)

        if rule_result and rule_result.confidence >= 0.8:

            INTENT_CLASSIFICATION_METHOD.labels(
                method="rules"
            ).inc()

            INTENT_COUNT.labels(
                intent=rule_result.intent.value
            ).inc()

            return rule_result

        llm_result = self.classify_llm(query, provider, model_name)

        INTENT_CLASSIFICATION_METHOD.labels(
            method="llm"
        ).inc()

        INTENT_COUNT.labels(
            intent=llm_result.intent.value
        ).inc()

        return llm_result
