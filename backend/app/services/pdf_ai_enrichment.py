"""
PDF AI Enrichment for Lemma
Handles LLM-powered analysis, metadata enhancement, and content enrichment.
"""

from typing import Dict, Any, Optional

from app.core.logging import get_logger
from app.utils.text_processing import prepare_text_for_analysis, estimate_reading_time
from app.utils.llm_client import call_llm_structured
from .pdf_models import (
    ProcessingConfig, DocumentMetadata, ComprehensiveAnalysis, 
    EnhancedMetadata, AdvancedFeatures
)

logger = get_logger(__name__)


class PDFAIEnricher:
    """Handles AI-powered PDF content enrichment."""
    
    async def apply_ai_enhancements(self, result: Dict[str, Any], file_path: str):
        """Apply AI enhancements to extracted content."""
        try:
            # Prepare metadata for AI processing
            basic_metadata = self._prepare_basic_metadata(result)
            pdf_metadata = result.get("pdf_metadata", {})
            
            # Single comprehensive LLM call for everything
            analysis_result = await self._enrich_document_content(
                basic_metadata, 
                result["full_text"],
                pdf_metadata
            )
            
            # Update result with enhanced data
            self._update_result_with_enhancements(result, analysis_result)
            logger.info("Applied comprehensive AI analysis: metadata + enrichment + outline")
            
            # Mark as successfully enhanced
            result["ai_enhancement_status"] = {
                "success": True,
                "error": None,
                "timestamp": None
            }
            
        except Exception as ai_error:
            logger.warning(f"AI enhancement failed for {file_path}, using basic metadata: {str(ai_error)}")
            
            # Add error indication to result
            result["ai_enhancement_status"] = {
                "success": False,
                "error": str(ai_error),
                "timestamp": None
            }
            
            # Ensure we have basic structure even on failure
            if "enrichment" not in result:
                result["enrichment"] = {}
            if "outline" not in result:
                result["outline"] = []
            
            # Mark metadata as not AI enhanced
            if "metadata" in result:
                result["metadata"]["ai_enhanced"] = False
    
    def _prepare_basic_metadata(self, result: Dict[str, Any]) -> DocumentMetadata:
        """Prepare basic metadata for AI processing."""
        basic_metadata_dict = result.get("metadata", {})
        return DocumentMetadata(
            title=basic_metadata_dict.get("title"),
            authors=basic_metadata_dict.get("authors", []),
            page_count=basic_metadata_dict.get("page_count", 0),
            word_count=basic_metadata_dict.get("word_count", 0)
        )
    
    def _update_result_with_enhancements(self, result: Dict[str, Any], analysis_result: Dict[str, Any]):
        """Update result dictionary with AI enhancements."""
        enhanced_metadata = analysis_result.get("metadata", {})
        if enhanced_metadata:
            # Update metadata fields with fallbacks
            metadata_updates = {
                "title": enhanced_metadata.get("title", result["metadata"].get("title")),
                "authors": enhanced_metadata.get("authors", result["metadata"].get("authors", [])),
                "abstract": enhanced_metadata.get("abstract"),
                "keywords": enhanced_metadata.get("keywords", []),
                "doi": enhanced_metadata.get("doi"),
                "publication_year": enhanced_metadata.get("publication_year"),
                "journal": enhanced_metadata.get("journal"),
                "page_count": enhanced_metadata.get("page_count", result["metadata"].get("page_count", 0)),
                "word_count": enhanced_metadata.get("word_count", result["metadata"].get("word_count", 0)),
                "language": enhanced_metadata.get("language", "en"),
                "ai_enhanced": enhanced_metadata.get("ai_enhanced", True),
            }
            result["metadata"].update(metadata_updates)
        
        result["enrichment"] = analysis_result.get("enrichment", {})
        result["outline"] = analysis_result.get("outline", [])

    async def _enrich_document_content(
        self, 
        basic_metadata: DocumentMetadata, 
        full_text: str, 
        pdf_metadata: Dict
    ) -> Dict[str, Any]:
        """Generate AI-powered content enrichments and document outline using full text."""
        try:
            logger.info("Starting comprehensive content enrichment with full text")
            
            if not full_text or len(full_text.strip()) < 100:
                logger.warning("Insufficient text for enrichment")
                return {"metadata": {}, "enrichment": {}, "outline": []}
            
            # Use full text for comprehensive analysis
            # For very long documents, use intelligent sampling
            analysis_text = prepare_text_for_analysis(full_text, ProcessingConfig.MAX_ANALYSIS_CHARS)
            
            # Single comprehensive LLM call for metadata + outline + enrichments
            analysis_result = await self._comprehensive_document_analysis(analysis_text, basic_metadata, pdf_metadata)
            
            # Calculate reading time (basic estimation)  
            reading_time_minutes = estimate_reading_time(basic_metadata.word_count, ProcessingConfig.READING_WPM)
            
            return {
                "metadata": analysis_result.metadata.model_dump(),
                "enrichment": {
                    "research_questions": analysis_result.research_questions,
                    "key_contributions": analysis_result.key_contributions,
                    "methodology_summary": analysis_result.methodology_summary,
                    "reading_time_minutes": reading_time_minutes,
                    "readability_score": analysis_result.advanced_features.readability_score,
                    "difficulty_level": analysis_result.advanced_features.difficulty_level,
                    "related_topics": analysis_result.advanced_features.related_topics,
                    "citation_impact_prediction": analysis_result.advanced_features.citation_impact_prediction.model_dump() if analysis_result.advanced_features.citation_impact_prediction else None,
                    "key_concepts": analysis_result.advanced_features.key_concepts,
                    "technical_terms": [term.model_dump() for term in analysis_result.advanced_features.technical_terms],
                    "future_work_suggestions": analysis_result.advanced_features.future_work_suggestions,
                },
                "outline": [item.model_dump() for item in analysis_result.outline]
            }
            
        except Exception as e:
            logger.error(f"Content enrichment failed: {str(e)}")
            raise

    async def _comprehensive_document_analysis(
        self, 
        text: str, 
        basic_metadata: DocumentMetadata, 
        pdf_metadata: Dict
    ) -> ComprehensiveAnalysis:
        """Single LLM call for comprehensive document analysis using structured output."""
        try:
            # Include existing metadata for context
            context_info = f"""
            Existing PDF metadata: {pdf_metadata}
            Basic extracted info: Title="{basic_metadata.title}", Authors={basic_metadata.authors}, 
            Word count={basic_metadata.word_count}, Pages={basic_metadata.page_count}
            """
            
            prompt = f"""
            ### CORE TASK ###
            Analyze the provided academic paper text and return a single, complete JSON object that strictly adheres to the JSON structure specified below.

            ### GENERAL INSTRUCTIONS ###
            1. **Accurate Extraction**: Carefully read the entire paper to accurately extract or infer all requested information.
            2. **In-depth Analysis**: Go beyond surface-level information. Perform a critical analysis, such as evaluating the nature of the contributions and identifying potential limitations of the research.
            3. **Follow Structure**: Strictly adhere to the format, field names, and data types defined in the "JSON OUTPUT STRUCTURE & EXAMPLE" section below.
            4. **Complete Output**: Ensure the generated JSON object is complete and not truncated. Do not add any comments, explanations, or json markers before or after the JSON object.

            ### JSON OUTPUT STRUCTURE & EXAMPLE ###
            You must output a JSON object that conforms to the following structure and types. This is an example; please learn its format and content style:

            ```json
            {{
                "metadata": {{
                    "title": "Enhanced and Concise Title of the Paper",
                    "authors": ["John Doe", "Jane Smith"],
                    "abstract": "A well-summarized abstract of the paper, capturing the core problem, methods, results, and conclusion.",
                    "keywords": ["Machine Learning", "Data Analysis", "Academic Research"],
                    "doi": "10.1234/journal.xxxx.xxxxx",
                    "publication_year": 2024,
                    "journal": "Journal of Advanced Research",
                    "page_count": 0,
                    "word_count": 0,
                    "language": "en"
                }},
                "outline": [
                    {{"title": "Introduction", "level": 1, "type": "introduction"}},
                    {{"title": "Related Work", "level": 1, "type": "discussion"}},
                    {{"title": "Methodology", "level": 1, "type": "methods"}},
                    {{"title": "Core Algorithm", "level": 2, "type": "methods"}},
                    {{"title": "Experiments and Results", "level": 1, "type": "results"}},
                    {{"title": "Conclusion", "level": 1, "type": "conclusion"}}
                ],
                "research_questions": [
                    "What is the primary research question this paper aims to answer?",
                    "How does the proposed method compare to existing state-of-the-art approaches?"
                ],
                "key_contributions": [
                    "Contribution 1 (e.g., Proposes a novel 'XYZ' architecture that improves efficiency by 30%). Distinguish if it's a breakthrough or incremental improvement.",
                    "Contribution 2 (e.g., Creates a new benchmark dataset for evaluating 'ABC' tasks.)"
                ],
                "methodology_summary": "Summarize the core methodology in 2-3 sentences, focusing on the main techniques, data used for training/validation, and the evaluation metrics.",
                "advanced_features": {{
                    "readability_score": 0.8,
                    "difficulty_level": "advanced",
                    "related_topics": ["Deep Learning", "Natural Language Processing", "Computer Vision"],
                    "key_concepts": ["Attention Mechanism", "Transformer Network", "Backpropagation"],
                    "technical_terms": [
                        {{"term": "Neural Network", "definition": "A computational model inspired by the structure and function of biological neural networks."}},
                        {{"term": "Overfitting", "definition": "A modeling error that occurs when a function is too closely fit to a limited set of data points."}}
                    ],
                    "citation_impact_prediction": {{
                        "predicted_citations": 60,
                        "confidence": 0.85,
                        "reasoning": "The paper introduces a foundational method with broad applicability in a rapidly growing field, likely to be cited by future work."
                    }},
                    "future_work_suggestions": [
                        "Suggestion 1 (based on paper's limitations): Address the method's high computational cost to make it more accessible.",
                        "Suggestion 2: Apply the proposed framework to a different domain, such as medical image analysis."
                    ]
                }}
            }}
            ```
            
            ### CONTEXTUAL INFORMATION ###
            {context_info}
            
            ### TEXT FOR ANALYSIS ###
            {text}
            """
            
            result = await call_llm_structured(
                prompt, 
                ComprehensiveAnalysis, 
                max_tokens=8192, 
                model=ProcessingConfig.DEFAULT_LLM_MODEL,
                temperature=1
            )
            return result  # type: ignore  # We know this is ComprehensiveAnalysis
            
        except Exception as e:
            logger.error(f"Comprehensive document analysis failed: {str(e)}")
            raise