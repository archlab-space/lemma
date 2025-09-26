"""
LLM client utilities for the Lemma application.
"""

from typing import Optional
import litellm
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.logging import get_logger
from .decorators import async_retry

logger = get_logger(__name__)
settings = get_settings()


class LLMError(Exception):
    """Exception for LLM-related errors."""
    pass


@async_retry(max_retries=3, delay=1.0)
async def call_llm_structured(
    prompt: str, 
    response_format: type[BaseModel], 
    max_tokens: int = 500, 
    model: Optional[str] = None,
    temperature: float = 0.1
) -> BaseModel:
    """Call LLM using LiteLLM with structured output."""
    try:
        model_val: str = model if model is not None else getattr(settings, 'PDF_DEFAULT_LLM_MODEL', 'openrouter/openai/gpt-5')
        
        # Use OpenAI API key from settings
        api_key = getattr(settings, 'OPENROUTER_API_KEY', None)
        if not api_key:
            raise LLMError("OPENROUTER_API_KEY not configured")
            
        response = await litellm.acompletion(
            model=model_val,
            messages=[
                {"role": "system", "content": "You are a top-tier academic researcher and a specialist in library and information science. You excel at deeply analyzing academic papers and extracting core information in a highly structured format."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=max_tokens,
            temperature=temperature,
            api_key=api_key,
            response_format=response_format,  # Structured output with Pydantic model
            stream=False
        )
        
        # Parse the structured response
        content = response.choices[0].message.content # type: ignore
        if content is None:
            raise LLMError("LLM returned empty content")
        
        # Parse JSON into Pydantic model
        return response_format.model_validate_json(content)
        
    except LLMError:
        raise
    except Exception as e:
        raise LLMError(f"LLM call failed: {str(e)}") from e