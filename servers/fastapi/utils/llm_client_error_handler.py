from fastapi import HTTPException
import traceback


def handle_llm_client_exceptions(e: Exception) -> HTTPException:
    traceback.print_exc()

    OpenAIAPIError = None
    GoogleAPIError = None
    AnthropicAPIError = None

    try:
        from openai import APIError as OpenAIAPIError  # type: ignore
    except Exception:
        pass

    try:
        from google.genai.errors import APIError as GoogleAPIError  # type: ignore
    except Exception:
        pass

    try:
        from anthropic import APIError as AnthropicAPIError  # type: ignore
    except Exception:
        pass

    if OpenAIAPIError is not None and isinstance(e, OpenAIAPIError):
        return HTTPException(status_code=500, detail=f"OpenAI API error: {e.message}")
    if GoogleAPIError is not None and isinstance(e, GoogleAPIError):
        return HTTPException(status_code=500, detail=f"Google API error: {e.message}")
    if AnthropicAPIError is not None and isinstance(e, AnthropicAPIError):
        return HTTPException(status_code=500, detail=f"Anthropic API error: {e.message}")
    return HTTPException(status_code=500, detail=f"LLM API error: {e}")
