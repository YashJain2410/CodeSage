class ModelConfigurationError(ValueError):
    """The selected provider, model, or API key is not configured."""


class ModelRequestError(RuntimeError):
    """The selected model failed; no alternative model was called."""
