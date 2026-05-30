from app.core.retrieval.intent import QueryIntentClassifier, QueryIntent

classifier = QueryIntentClassifier()


# BUG

def test_bug_intent():

    result = classifier.classify_rules( "why does login fail" )

    assert result.intent == QueryIntent.BUG


# TEST

def test_test_intent():

    result = classifier.classify_rules("does charge_card have test coverage")

    assert result.intent == QueryIntent.TEST


# IMPACT

def test_impact_intent():

    result = classifier.classify_rules(
        "what breaks if i remove retry decorator"
    )

    assert result.intent == QueryIntent.IMPACT


# EXPLAIN

def test_explain_intent():

    result = classifier.classify_rules(
        "how does authentication work"
    )

    assert result.intent == QueryIntent.EXPLAIN


# ONBOARD

def test_onboard_intent():

    result = classifier.classify_rules(
        "give me an overview of the architecture"
    )

    assert result.intent == QueryIntent.ONBOARD