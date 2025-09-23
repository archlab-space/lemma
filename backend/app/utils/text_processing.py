"""
Text processing utilities for the Lemma application.
"""

import json
from typing import Optional, List

from app.core.logging import get_logger

logger = get_logger(__name__)


def prepare_text_for_analysis(full_text: str, max_chars: int = 1_000_000) -> str:
    """Prepare text for LLM analysis with intelligent sampling."""
    if len(full_text) <= max_chars:
        return full_text
    
    # For long documents, take beginning, middle, and end
    chunk_size = max_chars // 3
    beginning = full_text[:chunk_size]
    middle_start = len(full_text) // 2 - chunk_size // 2
    middle = full_text[middle_start:middle_start + chunk_size]
    end = full_text[-chunk_size:]
    
    return f"{beginning}\n\n[... MIDDLE SECTION ...]\n\n{middle}\n\n[... END SECTION ...]\n\n{end}"


def estimate_reading_time(word_count: int, reading_wpm: int = 200) -> int:
    """Estimate reading time in minutes for academic text."""
    if word_count <= 0:
        return 0
    return max(1, round(word_count / reading_wpm))
