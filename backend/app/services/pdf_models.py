"""
PDF Processing Models and Configuration for Lemma
Contains all Pydantic models, dataclasses, and configuration constants.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from pydantic import BaseModel

from app.core.config import get_settings

settings = get_settings()


class ProcessingConfig:
    """Configuration constants for PDF processing."""
    MAX_CHUNK_WORDS = getattr(settings, 'PDF_MAX_CHUNK_WORDS', 400)
    OVERLAP_WORDS = getattr(settings, 'PDF_OVERLAP_WORDS', 100)
    MAX_ANALYSIS_CHARS = getattr(settings, 'PDF_MAX_ANALYSIS_CHARS', 1_000_000)
    READING_WPM = getattr(settings, 'PDF_READING_WPM', 200)
    MAX_WORKERS = getattr(settings, 'PDF_MAX_WORKERS', 2)
    BATCH_SIZE = getattr(settings, 'PDF_BATCH_SIZE', 5)
    LLM_MAX_RETRIES = getattr(settings, 'PDF_LLM_MAX_RETRIES', 3)
    LLM_RETRY_DELAY = getattr(settings, 'PDF_LLM_RETRY_DELAY', 1.0)
    DEFAULT_LLM_MODEL = getattr(settings, 'PDF_DEFAULT_LLM_MODEL', 'openai/gpt-4')


class ProcessingError(Exception):
    """Base exception for PDF processing errors."""
    def __init__(self, message: str, file_path: Optional[str] = None, details: Optional[Dict] = None):
        self.file_path = file_path
        self.details = details or {}
        super().__init__(self._format_message(message))
    
    def _format_message(self, message: str) -> str:
        """Standardize error message format."""
        parts = [f"PDF Processing Error: {message}"]
        if self.file_path:
            parts.append(f"File: {self.file_path}")
        if self.details:
            details_str = ", ".join(f"{k}={v}" for k, v in self.details.items())
            parts.append(f"Details: {details_str}")
        return " | ".join(parts)


@dataclass
class DocumentMetadata:
    """Extracted metadata from PDF document."""
    title: Optional[str] = None
    authors: List[str] = field(default_factory=list)
    page_count: int = 0
    word_count: int = 0


class DocumentOutlineItem(BaseModel):
    title: str
    level: int
    type: str  # introduction|methods|results|discussion|conclusion|references


class EnhancedMetadata(BaseModel):
    title: Optional[str] = None
    authors: List[str] = []
    abstract: Optional[str] = None
    keywords: List[str] = []
    doi: Optional[str] = None
    publication_year: Optional[int] = None
    journal: Optional[str] = None
    page_count: int = 0
    word_count: int = 0
    language: str = "en"
    ai_enhanced: bool = True


class TechnicalTerm(BaseModel):
    term: str
    definition: str


class CitationImpactPrediction(BaseModel):
    predicted_citations: int
    confidence: float
    reasoning: str


class AdvancedFeatures(BaseModel):
    readability_score: float = 0.7
    difficulty_level: str = "intermediate"
    related_topics: List[str] = []
    key_concepts: List[str] = []
    technical_terms: List[TechnicalTerm] = []
    citation_impact_prediction: Optional[CitationImpactPrediction] = None
    future_work_suggestions: List[str] = []


class ComprehensiveAnalysis(BaseModel):
    metadata: EnhancedMetadata
    outline: List[DocumentOutlineItem]
    research_questions: List[str]
    key_contributions: List[str]
    methodology_summary: Optional[str] = None
    advanced_features: AdvancedFeatures