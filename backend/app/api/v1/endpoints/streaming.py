import asyncio
import json
import time
from typing import AsyncGenerator, Dict, Any
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials

from app.core.dependencies import get_current_user_from_headers
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


async def generate_sample_stream(
    message: str = "Hello, streaming world!",
    chunk_delay: float = 0.1,
    chunk_size: int = 20
) -> AsyncGenerator[str, None]:
    """Generate a sample streaming response with hardcoded text."""
    
    # Split message into chunks
    words = message.split()
    current_chunk = []
    
    for word in words:
        current_chunk.append(word)
        
        # Yield chunk when we reach chunk_size or it's the last word
        if len(current_chunk) >= chunk_size or word == words[-1]:
            chunk_text = " ".join(current_chunk)
            
            # Create Server-Sent Events format
            data = {
                "type": "content",
                "content": chunk_text,
                "timestamp": time.time()
            }
            
            yield f"data: {json.dumps(data)}\n\n"
            
            current_chunk = []
            await asyncio.sleep(chunk_delay)
    
    # Send completion signal
    completion_data = {
        "type": "done",
        "timestamp": time.time()
    }
    yield f"data: {json.dumps(completion_data)}\n\n"


async def generate_typing_effect_stream(text: str) -> AsyncGenerator[str, None]:
    """Generate a typing effect stream, character by character."""
    
    for i, char in enumerate(text):
        data = {
            "type": "content",
            "content": char,
            "position": i,
            "timestamp": time.time()
        }
        
        yield f"data: {json.dumps(data)}\n\n"
        
        # Variable delay based on character type
        if char == ".":
            await asyncio.sleep(0.3)  # Longer pause for periods
        elif char == ",":
            await asyncio.sleep(0.2)  # Medium pause for commas
        elif char == " ":
            await asyncio.sleep(0.05)  # Short pause for spaces
        else:
            await asyncio.sleep(0.03)  # Normal typing speed
    
    # Send completion
    completion_data = {"type": "done", "timestamp": time.time()}
    yield f"data: {json.dumps(completion_data)}\n\n"


async def generate_simulated_ai_response() -> AsyncGenerator[str, None]:
    """Simulate an AI assistant response with realistic streaming."""
    
    response_text = """Based on the academic paper you've uploaded, I can provide you with a comprehensive analysis. 

The paper presents a novel approach to machine learning that combines traditional statistical methods with modern deep learning architectures. Here are the key findings:

1. **Methodology**: The authors propose a hybrid model that leverages both supervised and unsupervised learning techniques.

2. **Results**: The experimental results show a 23% improvement in accuracy compared to baseline models, with statistical significance (p < 0.001).

3. **Limitations**: The study acknowledges some limitations, including dataset size constraints and computational complexity.

4. **Future Work**: The authors suggest several promising directions for extending this research, particularly in the area of transfer learning.

This research contributes significantly to our understanding of hybrid AI architectures and opens up new possibilities for practical applications."""

    # Send metadata first
    metadata = {
        "type": "metadata",
        "model": "gpt-3.5-turbo",
        "temperature": 0.1,
        "estimated_tokens": 150,
        "timestamp": time.time()
    }
    yield f"data: {json.dumps(metadata)}\n\n"
    
    # Stream the response in realistic chunks
    sentences = response_text.split('. ')
    
    for i, sentence in enumerate(sentences):
        if i > 0:
            sentence = '. ' + sentence  # Add period back except for first sentence
        
        # Break sentence into smaller chunks
        words = sentence.split()
        chunk_size = 3  # Stream 3 words at a time
        
        for j in range(0, len(words), chunk_size):
            chunk_words = words[j:j + chunk_size]
            chunk_text = ' '.join(chunk_words)
            
            if j + chunk_size < len(words):
                chunk_text += ' '  # Add space if not the last chunk
            
            data = {
                "type": "content",
                "content": chunk_text,
                "sentence_index": i,
                "chunk_index": j // chunk_size,
                "timestamp": time.time()
            }
            
            yield f"data: {json.dumps(data)}\n\n"
            
            # Realistic streaming delay
            await asyncio.sleep(0.05 + (0.02 * len(chunk_words)))
    
    # Send final completion
    completion_data = {
        "type": "done",
        "total_tokens": 150,
        "finish_reason": "stop",
        "timestamp": time.time()
    }
    yield f"data: {json.dumps(completion_data)}\n\n"


@router.get("/test")
async def test_basic_streaming(
    message: str = Query(default="Hello from FastAPI streaming!", description="Message to stream"),
    delay: float = Query(default=0.1, ge=0.01, le=2.0, description="Delay between chunks in seconds"),
    user: Dict[str, Any] = Depends(get_current_user_from_headers)
):
    """Basic streaming test endpoint with hardcoded text."""
    
    logger.info("Starting basic stream test", 
                message=message, 
                delay=delay,
                user_id=user.get("id") if user else None)
    
    def generate():
        return generate_sample_stream(message, delay)
    
    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )


@router.get("/typing")
async def test_typing_effect(
    text: str = Query(default="This is a realistic typing effect demonstration.", description="Text to type"),
    user: Dict[str, Any] = Depends(get_current_user_from_headers)
):
    """Typing effect streaming endpoint."""
    
    logger.info("Starting typing effect stream", 
                text_length=len(text),
                user_id=user.get("id") if user else None)
    
    return StreamingResponse(
        generate_typing_effect_stream(text),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        }
    )


@router.get("/ai-response")
async def test_ai_response_simulation(
    user: Dict[str, Any] = Depends(get_current_user_from_headers)
):
    """Simulate a realistic AI assistant response stream."""
    
    logger.info("Starting AI response simulation", 
                user_id=user.get("id") if user else None)
    
    return StreamingResponse(
        generate_simulated_ai_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        }
    )


@router.get("/sse")
async def server_sent_events_demo(
    count: int = Query(default=10, ge=1, le=100, description="Number of events to send"),
    interval: float = Query(default=1.0, ge=0.1, le=5.0, description="Interval between events"),
    user: Dict[str, Any] = Depends(get_current_user_from_headers)
):
    """Server-Sent Events (SSE) demonstration."""
    
    async def generate_events():
        logger.info("Starting SSE demo", 
                    count=count, 
                    interval=interval,
                    user_id=user.get("id") if user else None)
        
        for i in range(count):
            event_data = {
                "event_number": i + 1,
                "total_events": count,
                "message": f"This is event {i + 1} of {count}",
                "timestamp": time.time(),
                "progress": round((i + 1) / count * 100, 2)
            }
            
            yield f"data: {json.dumps(event_data)}\n\n"
            
            if i < count - 1:  # Don't sleep after the last event
                await asyncio.sleep(interval)
        
        # Send completion event
        completion_event = {
            "type": "complete",
            "message": "All events sent successfully",
            "timestamp": time.time()
        }
        yield f"data: {json.dumps(completion_event)}\n\n"
    
    return StreamingResponse(
        generate_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        }
    )