import os
import logging
from typing import Dict, List, Optional, Union
from enum import Enum
from dataclasses import dataclass
from datetime import datetime
import asyncio
import aiohttp
import json

# Add this import for loading .env files
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, validator
import uvicorn
from groq import Groq

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Groq AI Content & Rephrase Service",
    description="AI-powered text rephrasing and content generation service using Groq",
    version="1.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Groq API Configuration - now reads from .env file
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    logger.warning("GROQ_API_KEY not found in environment variables or .env file")

# Initialize Groq client
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# Enums and Models
class RephraseStyle(str, Enum):
    FORMAL = "formal"
    CASUAL = "casual"
    CREATIVE = "creative"
    CONCISE = "concise"

class ContentGenerationType(str, Enum):
    NEW = "new"
    CONTINUE = "continue"
    EXPAND = "expand"
    BRAINSTORM = "brainstorm"
    OUTLINE = "outline"
    SUMMARIZE = "summarize"

class ContentTone(str, Enum):
    PROFESSIONAL = "professional"
    CASUAL = "casual"
    CREATIVE = "creative"
    ACADEMIC = "academic"
    PERSUASIVE = "persuasive"

class ContentLength(str, Enum):
    SHORT = "short"
    MEDIUM = "medium"
    LONG = "long"

class RephraseRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Text to rephrase")
    style: RephraseStyle = Field(default=RephraseStyle.FORMAL, description="Rephrasing style")
    preserve_meaning: bool = Field(default=True, description="Whether to preserve original meaning")
    max_tokens: int = Field(default=1000, ge=100, le=2000, description="Maximum tokens for response")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="Temperature for AI generation")

class ContentGenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000, description="Content generation prompt")
    context: Optional[str] = Field(default=None, max_length=5000, description="Context text for content generation")
    type: ContentGenerationType = Field(default=ContentGenerationType.NEW, description="Type of content generation")
    tone: ContentTone = Field(default=ContentTone.PROFESSIONAL, description="Tone of the generated content")
    length: ContentLength = Field(default=ContentLength.MEDIUM, description="Desired length of content")
    max_tokens: int = Field(default=800, ge=100, le=2000, description="Maximum tokens for response")
    temperature: float = Field(default=0.7, ge=0.0, le=1.5, description="Temperature for AI generation")

class RephraseResponse(BaseModel):
    original_text: str
    rephrased_text: str
    style: RephraseStyle
    processing_time: float
    tokens_used: Optional[int] = None
    confidence: Optional[float] = None

class ContentGenerationResponse(BaseModel):
    generated_content: str
    prompt: str
    type: ContentGenerationType
    tone: ContentTone
    length: ContentLength
    processing_time: float
    tokens_used: Optional[int] = None

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    groq_available: bool
    version: str = "1.1.0"

class ErrorResponse(BaseModel):
    error: str
    message: str
    timestamp: datetime

@dataclass
class StylePrompt:
    system_prompt: str
    user_template: str
    temperature: float

@dataclass
class ContentPrompt:
    system_prompt: str
    user_template: str
    temperature: float

# Style configurations for rephrasing
STYLE_PROMPTS: Dict[RephraseStyle, StylePrompt] = {
    RephraseStyle.FORMAL: StylePrompt(
        system_prompt=(
            "You are a professional writing assistant. Rephrase the given text in a formal, "
            "professional tone suitable for business or academic contexts. Maintain the original "
            "meaning while improving clarity and professionalism. Only return the rephrased text."
        ),
        user_template="Please rephrase this text in a formal, professional manner:\n\n\"{text}\"",
        temperature=0.5
    ),
    RephraseStyle.CASUAL: StylePrompt(
        system_prompt=(
            "You are a friendly writing assistant. Rephrase the given text in a casual, "
            "conversational tone that sounds natural and approachable. Maintain the original "
            "meaning while making it more relaxed and friendly. Only return the rephrased text."
        ),
        user_template="Please rephrase this text in a casual, conversational way:\n\n\"{text}\"",
        temperature=0.7
    ),
    RephraseStyle.CREATIVE: StylePrompt(
        system_prompt=(
            "You are a creative writing assistant. Rephrase the given text in an engaging, "
            "creative way that captures attention while preserving the core message. Use vivid "
            "language and interesting expressions. Only return the rephrased text."
        ),
        user_template="Please rephrase this text in a creative, engaging manner:\n\n\"{text}\"",
        temperature=0.9
    ),
    RephraseStyle.CONCISE: StylePrompt(
        system_prompt=(
            "You are a concise writing assistant. Rephrase the given text to be as brief and "
            "clear as possible while retaining all important information. Remove redundancy "
            "and unnecessary words. Only return the rephrased text."
        ),
        user_template="Please rephrase this text to be more concise and clear:\n\n\"{text}\"",
        temperature=0.3
    )
}

# Content generation configurations
CONTENT_PROMPTS: Dict[ContentGenerationType, ContentPrompt] = {
    ContentGenerationType.NEW: ContentPrompt(
        system_prompt=(
            "You are a skilled content writer. Create original, engaging content based on the user's prompt. "
            "Write in a clear, well-structured manner with good flow and readability. "
            "Adapt your tone and style based on the specified requirements."
        ),
        user_template="Write content about: {prompt}\n\nTone: {tone}\nLength: {length}",
        temperature=0.8
    ),
    ContentGenerationType.CONTINUE: ContentPrompt(
        system_prompt=(
            "You are a skilled content writer. Continue writing from where the provided text left off. "
            "Maintain consistency in tone, style, and topic. Ensure smooth continuation that flows "
            "naturally from the existing content."
        ),
        user_template="Continue writing from this text:\n\n\"{context}\"\n\nAdditional instructions: {prompt}\nTone: {tone}\nLength: {length}",
        temperature=0.7
    ),
    ContentGenerationType.EXPAND: ContentPrompt(
        system_prompt=(
            "You are a skilled content writer. Expand and elaborate on the provided content. "
            "Add depth, examples, explanations, and additional details while maintaining "
            "the original meaning and structure."
        ),
        user_template="Expand on this content:\n\n\"{context}\"\n\nFocus on: {prompt}\nTone: {tone}\nLength: {length}",
        temperature=0.7
    ),
    ContentGenerationType.BRAINSTORM: ContentPrompt(
        system_prompt=(
            "You are a creative brainstorming assistant. Generate creative ideas, bullet points, "
            "and suggestions based on the topic. Provide diverse perspectives and actionable items. "
            "Format as a well-organized list with brief explanations."
        ),
        user_template="Brainstorm ideas about: {prompt}\n\nContext: {context}\nTone: {tone}\nNumber of ideas based on length: {length}",
        temperature=0.9
    ),
    ContentGenerationType.OUTLINE: ContentPrompt(
        system_prompt=(
            "You are a skilled content strategist. Create a well-structured outline for the given topic. "
            "Include main sections, subsections, and key points. Make it hierarchical and logical. "
            "Provide brief descriptions for each section."
        ),
        user_template="Create an outline for: {prompt}\n\nContext: {context}\nTone: {tone}\nDetail level: {length}",
        temperature=0.6
    ),
    ContentGenerationType.SUMMARIZE: ContentPrompt(
        system_prompt=(
            "You are a skilled summarization assistant. Create a clear, concise summary of the provided content. "
            "Capture the main points, key insights, and essential information while maintaining accuracy. "
            "Structure the summary logically."
        ),
        user_template="Summarize this content:\n\n\"{context}\"\n\nFocus: {prompt}\nTone: {tone}\nLength: {length}",
        temperature=0.5
    ),
}

# Tone modifiers
TONE_MODIFIERS: Dict[ContentTone, str] = {
    ContentTone.PROFESSIONAL: "Use a professional, business-appropriate tone with formal language.",
    ContentTone.CASUAL: "Use a casual, friendly, conversational tone that's approachable and relaxed.",
    ContentTone.CREATIVE: "Use a creative, engaging tone with vivid language and interesting expressions.",
    ContentTone.ACADEMIC: "Use an academic, scholarly tone with precise language and research-oriented approach.",
    ContentTone.PERSUASIVE: "Use a persuasive, compelling tone that aims to convince and influence the reader."
}

# Length guidelines
LENGTH_GUIDELINES: Dict[ContentLength, Dict[str, Union[int, str]]] = {
    ContentLength.SHORT: {
        "tokens": 200,
        "description": "1-2 short paragraphs",
        "brainstorm_items": "5-7 ideas"
    },
    ContentLength.MEDIUM: {
        "tokens": 500,
        "description": "3-5 paragraphs",
        "brainstorm_items": "8-12 ideas"
    },
    ContentLength.LONG: {
        "tokens": 1000,
        "description": "6+ paragraphs",
        "brainstorm_items": "15+ ideas"
    }
}

# Service Classes
class GroqAIService:
    """Main service for handling Groq AI requests"""
    
    def __init__(self, client: Groq):
        self.client = client
        self.model = "llama-3.3-70b-versatile"
    
    async def rephrase_text(
        self, 
        text: str, 
        style: RephraseStyle = RephraseStyle.FORMAL,
        **kwargs
    ) -> Dict:
        """
        Rephrase text using Groq AI
        
        Args:
            text: Text to rephrase
            style: Rephrasing style
            **kwargs: Additional parameters
            
        Returns:
            Dictionary containing rephrased text and metadata
        """
        if not self.client:
            raise HTTPException(
                status_code=500, 
                detail="Groq client not initialized. Check API key."
            )
        
        try:
            start_time = datetime.now()
            
            # Get style configuration
            style_config = STYLE_PROMPTS[style]
            
            # Prepare messages
            messages = [
                {"role": "system", "content": style_config.system_prompt},
                {"role": "user", "content": style_config.user_template.format(text=text)}
            ]
            
            # Make API call
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=kwargs.get('temperature', style_config.temperature),
                max_tokens=kwargs.get('max_tokens', 1000),
                top_p=1,
                stream=False
            )
            
            # Extract rephrased text
            rephrased_text = response.choices[0].message.content.strip()
            
            # Remove quotes if they wrap the entire response
            if (rephrased_text.startswith('"') and rephrased_text.endswith('"')) or \
               (rephrased_text.startswith("'") and rephrased_text.endswith("'")):
                rephrased_text = rephrased_text[1:-1]
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "rephrased_text": rephrased_text,
                "processing_time": processing_time,
                "tokens_used": response.usage.total_tokens if hasattr(response, 'usage') else None,
                "model_used": self.model
            }
            
        except Exception as e:
            logger.error(f"Error rephrasing text: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to rephrase text: {str(e)}"
            )

    async def generate_content(
        self,
        prompt: str,
        content_type: ContentGenerationType = ContentGenerationType.NEW,
        tone: ContentTone = ContentTone.PROFESSIONAL,
        length: ContentLength = ContentLength.MEDIUM,
        context: Optional[str] = None,
        **kwargs
    ) -> Dict:
        """
        Generate content using Groq AI
        
        Args:
            prompt: Content generation prompt
            content_type: Type of content generation
            tone: Tone of the content
            length: Desired length
            context: Optional context text
            **kwargs: Additional parameters
            
        Returns:
            Dictionary containing generated content and metadata
        """
        if not self.client:
            raise HTTPException(
                status_code=500, 
                detail="Groq client not initialized. Check API key."
            )
        
        try:
            start_time = datetime.now()
            
            # Get content generation configuration
            content_config = CONTENT_PROMPTS[content_type]
            tone_modifier = TONE_MODIFIERS[tone]
            length_info = LENGTH_GUIDELINES[length]
            
            # Build system prompt
            system_prompt = f"{content_config.system_prompt}\n\n{tone_modifier}\n\nTarget length: {length_info['description']}"
            
            # Format user message based on content type
            if content_type == ContentGenerationType.BRAINSTORM:
                user_message = content_config.user_template.format(
                    prompt=prompt,
                    context=context or "No additional context provided",
                    tone=tone.value,
                    length=length_info['brainstorm_items']
                )
            else:
                user_message = content_config.user_template.format(
                    prompt=prompt,
                    context=context or "No additional context provided",
                    tone=tone.value,
                    length=length.value
                )
            
            # Prepare messages
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
            
            # Calculate max tokens based on length
            max_tokens = min(
                kwargs.get('max_tokens', length_info['tokens']),
                2000  # Hard limit
            )
            
            # Make API call
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=kwargs.get('temperature', content_config.temperature),
                max_tokens=max_tokens,
                top_p=1,
                stream=False
            )
            
            # Extract generated content
            generated_content = response.choices[0].message.content.strip()
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "generated_content": generated_content,
                "processing_time": processing_time,
                "tokens_used": response.usage.total_tokens if hasattr(response, 'usage') else None,
                "model_used": self.model,
                "content_type": content_type,
                "tone": tone,
                "length": length
            }
            
        except Exception as e:
            logger.error(f"Error generating content: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate content: {str(e)}"
            )

# Initialize service
ai_service = GroqAIService(groq_client) if groq_client else None

# Dependency functions
async def get_ai_service() -> GroqAIService:
    """Get the AI service instance"""
    if not ai_service:
        raise HTTPException(
            status_code=503,
            detail="AI service unavailable. Check Groq API configuration."
        )
    return ai_service

async def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify API key (optional - implement your own auth logic)"""
    # Implement your authentication logic here
    # For now, we'll just pass through
    return credentials

# API Endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(),
        groq_available=groq_client is not None
    )

@app.post("/rephrase", response_model=RephraseResponse)
async def rephrase_text(
    request: RephraseRequest,
    background_tasks: BackgroundTasks,
    service: GroqAIService = Depends(get_ai_service)
):
    """
    Rephrase text using AI
    
    - **text**: Text to rephrase (required)
    - **style**: Rephrasing style (formal, casual, creative, concise)
    - **preserve_meaning**: Whether to preserve original meaning
    - **max_tokens**: Maximum tokens for response
    - **temperature**: Temperature for AI generation
    """
    try:
        logger.info(f"Rephrasing request: style={request.style}, length={len(request.text)}")
        
        # Validate text length
        if len(request.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # Call rephrase service
        result = await service.rephrase_text(
            text=request.text,
            style=request.style,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        # Log successful rephrase (in background)
        background_tasks.add_task(
            log_operation_success,
            operation="rephrase",
            details={
                "original_length": len(request.text),
                "rephrased_length": len(result["rephrased_text"]),
                "style": request.style,
                "processing_time": result["processing_time"]
            }
        )
        
        return RephraseResponse(
            original_text=request.text,
            rephrased_text=result["rephrased_text"],
            style=request.style,
            processing_time=result["processing_time"],
            tokens_used=result.get("tokens_used")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in rephrase endpoint: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred"
        )

@app.post("/generate-content", response_model=ContentGenerationResponse)
async def generate_content(
    request: ContentGenerationRequest,
    background_tasks: BackgroundTasks,
    service: GroqAIService = Depends(get_ai_service)
):
    """
    Generate content using AI
    
    - **prompt**: Content generation prompt (required)
    - **context**: Optional context text
    - **type**: Type of content generation (new, continue, expand, brainstorm, outline, summarize)
    - **tone**: Tone of the generated content (professional, casual, creative, academic, persuasive)
    - **length**: Desired length (short, medium, long)
    - **max_tokens**: Maximum tokens for response
    - **temperature**: Temperature for AI generation
    """
    try:
        logger.info(f"Content generation request: type={request.type}, tone={request.tone}, length={request.length}")
        
        # Validate prompt
        if len(request.prompt.strip()) == 0:
            raise HTTPException(status_code=400, detail="Prompt cannot be empty")
        
        # Validate context for content types that require it
        if request.type in [ContentGenerationType.CONTINUE, ContentGenerationType.EXPAND, ContentGenerationType.SUMMARIZE]:
            if not request.context or len(request.context.strip()) == 0:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Context is required for {request.type} content generation"
                )
        
        # Call content generation service
        result = await service.generate_content(
            prompt=request.prompt,
            content_type=request.type,
            tone=request.tone,
            length=request.length,
            context=request.context,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        # Log successful generation (in background)
        background_tasks.add_task(
            log_operation_success,
            operation="content_generation",
            details={
                "prompt_length": len(request.prompt),
                "context_length": len(request.context or ""),
                "generated_length": len(result["generated_content"]),
                "type": request.type,
                "tone": request.tone,
                "length": request.length,
                "processing_time": result["processing_time"]
            }
        )
        
        return ContentGenerationResponse(
            generated_content=result["generated_content"],
            prompt=request.prompt,
            type=request.type,
            tone=request.tone,
            length=request.length,
            processing_time=result["processing_time"],
            tokens_used=result.get("tokens_used")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in content generation endpoint: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred"
        )

@app.post("/rephrase/batch")
async def rephrase_batch(
    requests: List[RephraseRequest],
    service: GroqAIService = Depends(get_ai_service)
):
    """
    Rephrase multiple texts in batch
    Limited to 10 requests per batch
    """
    if len(requests) > 10:
        raise HTTPException(
            status_code=400,
            detail="Batch size limited to 10 requests"
        )
    
    results = []
    for req in requests:
        try:
            result = await service.rephrase_text(
                text=req.text,
                style=req.style,
                temperature=req.temperature,
                max_tokens=req.max_tokens
            )
            
            results.append(RephraseResponse(
                original_text=req.text,
                rephrased_text=result["rephrased_text"],
                style=req.style,
                processing_time=result["processing_time"],
                tokens_used=result.get("tokens_used")
            ))
            
        except Exception as e:
            results.append({
                "error": str(e),
                "original_text": req.text,
                "style": req.style
            })
    
    return {"results": results}

@app.post("/generate-content/batch")
async def generate_content_batch(
    requests: List[ContentGenerationRequest],
    service: GroqAIService = Depends(get_ai_service)
):
    """
    Generate content for multiple prompts in batch
    Limited to 5 requests per batch due to higher token usage
    """
    if len(requests) > 5:
        raise HTTPException(
            status_code=400,
            detail="Batch size limited to 5 requests for content generation"
        )
    
    results = []
    for req in requests:
        try:
            result = await service.generate_content(
                prompt=req.prompt,
                content_type=req.type,
                tone=req.tone,
                length=req.length,
                context=req.context,
                temperature=req.temperature,
                max_tokens=req.max_tokens
            )
            
            results.append(ContentGenerationResponse(
                generated_content=result["generated_content"],
                prompt=req.prompt,
                type=req.type,
                tone=req.tone,
                length=req.length,
                processing_time=result["processing_time"],
                tokens_used=result.get("tokens_used")
            ))
            
        except Exception as e:
            results.append({
                "error": str(e),
                "prompt": req.prompt,
                "type": req.type
            })
    
    return {"results": results}

@app.get("/styles")
async def get_available_styles():
    """Get available rephrasing styles and their descriptions"""
    return {
        "styles": [
            {
                "key": RephraseStyle.FORMAL,
                "name": "Formal",
                "description": "Professional and business-appropriate tone"
            },
            {
                "key": RephraseStyle.CASUAL,
                "name": "Casual",
                "description": "Conversational and friendly tone"
            },
            {
                "key": RephraseStyle.CREATIVE,
                "name": "Creative",
                "description": "Engaging and expressive style"
            },
            {
                "key": RephraseStyle.CONCISE,
                "name": "Concise",
                "description": "Brief and to-the-point"
            }
        ]
    }

@app.get("/content-types")
async def get_content_types():
    """Get available content generation types and their descriptions"""
    return {
        "types": [
            {
                "key": ContentGenerationType.NEW,
                "name": "New Content",
                "description": "Create completely new content from scratch",
                "requires_context": False
            },
            {
                "key": ContentGenerationType.CONTINUE,
                "name": "Continue Writing",
                "description": "Continue from where the provided text left off",
                "requires_context": True
            },
            {
                "key": ContentGenerationType.EXPAND,
                "name": "Expand Ideas",
                "description": "Elaborate and expand on existing content",
                "requires_context": True
            },
            {
                "key": ContentGenerationType.BRAINSTORM,
                "name": "Brainstorm",
                "description": "Generate creative ideas and bullet points",
                "requires_context": False
            },
            {
                "key": ContentGenerationType.OUTLINE,
                "name": "Create Outline",
                "description": "Generate a structured outline for the topic",
                "requires_context": False
            },
            {
                "key": ContentGenerationType.SUMMARIZE,
                "name": "Summarize",
                "description": "Create a concise summary of provided content",
                "requires_context": True
            }
        ]
    }

@app.get("/tones")
async def get_content_tones():
    """Get available content tones and their descriptions"""
    return {
        "tones": [
            {
                "key": ContentTone.PROFESSIONAL,
                "name": "Professional",
                "description": "Business-appropriate, formal tone"
            },
            {
                "key": ContentTone.CASUAL,
                "name": "Casual",
                "description": "Friendly, conversational tone"
            },
            {
                "key": ContentTone.CREATIVE,
                "name": "Creative",
                "description": "Imaginative and engaging style"
            },
            {
                "key": ContentTone.ACADEMIC,
                "name": "Academic",
                "description": "Scholarly, research-oriented tone"
            },
            {
                "key": ContentTone.PERSUASIVE,
                "name": "Persuasive",
                "description": "Convincing and compelling tone"
            }
        ]
    }

@app.get("/lengths")
async def get_content_lengths():
    """Get available content lengths and their descriptions"""
    return {
        "lengths": [
            {
                "key": ContentLength.SHORT,
                "name": "Short",
                "description": LENGTH_GUIDELINES[ContentLength.SHORT]["description"]
            },
            {
                "key": ContentLength.MEDIUM,
                "name": "Medium",
                "description": LENGTH_GUIDELINES[ContentLength.MEDIUM]["description"]
            },
            {
                "key": ContentLength.LONG,
                "name": "Long",
                "description": LENGTH_GUIDELINES[ContentLength.LONG]["description"]
            }
        ]
    }

# Background task functions
async def log_operation_success(operation: str, details: Dict):
    """Log successful AI operation"""
    logger.info(f"{operation} success: {details}")

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return {
        "error": exc.detail,
        "status_code": exc.status_code,
        "timestamp": datetime.now().isoformat()
    }

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return {
        "error": "Internal server error",
        "message": "An unexpected error occurred",
        "timestamp": datetime.now().isoformat()
    }

# CLI Interface (enhanced with content generation)
class GroqChatbot:
    """Command-line chatbot interface with content generation"""
    
    def __init__(self, api_key: str):
        self.client = Groq(api_key=api_key)
        self.ai_service = GroqAIService(self.client)
        self.messages = [
            {"role": "system", "content": "You are a helpful assistant with rephrasing and content generation capabilities."}
        ]
    
    def chat(self):
        """Start interactive chat session"""
        print("Groq AI Assistant with Rephrase & Content Generation is ready!")
        print("Commands:")
        print("- 'exit' or 'quit': Exit the chat")
        print("- 'rephrase [style] [text]': Rephrase text (styles: formal, casual, creative, concise)")
        print("- 'generate [type] [prompt]': Generate content (types: new, continue, expand, brainstorm, outline)")
        print("- Just type normally for regular chat")
        print()
        
        while True:
            user_input = input("You: ").strip()
            
            if user_input.lower() in {"exit", "quit"}:
                print("Goodbye!")
                break
            
            # Check for rephrase command
            if user_input.startswith("rephrase "):
                self.handle_rephrase_command(user_input)
                continue
            
            # Check for generate command
            if user_input.startswith("generate "):
                self.handle_generate_command(user_input)
                continue
            
            # Regular chat
            self.handle_regular_chat(user_input)
    
    def handle_rephrase_command(self, command: str):
        """Handle rephrase commands"""
        try:
            parts = command.split(" ", 2)
            if len(parts) < 3:
                print("Usage: rephrase [style] [text]")
                print("Styles: formal, casual, creative, concise")
                return
            
            style = parts[1].lower()
            text = parts[2]
            
            if style not in [s.value for s in RephraseStyle]:
                print(f"Invalid style. Available: {', '.join([s.value for s in RephraseStyle])}")
                return
            
            # Use asyncio to run the async rephrase method
            result = asyncio.run(self.ai_service.rephrase_text(
                text, RephraseStyle(style)
            ))
            
            print(f"\nOriginal: {text}")
            print(f"Rephrased ({style}): {result['rephrased_text']}")
            print(f"Processing time: {result['processing_time']:.2f}s\n")
            
        except Exception as e:
            print(f"Error rephrasing: {str(e)}\n")
    
    def handle_generate_command(self, command: str):
        """Handle content generation commands"""
        try:
            parts = command.split(" ", 2)
            if len(parts) < 3:
                print("Usage: generate [type] [prompt]")
                print("Types: new, continue, expand, brainstorm, outline, summarize")
                return
            
            content_type = parts[1].lower()
            prompt = parts[2]
            
            if content_type not in [t.value for t in ContentGenerationType]:
                print(f"Invalid type. Available: {', '.join([t.value for t in ContentGenerationType])}")
                return
            
            # Use asyncio to run the async generate method
            result = asyncio.run(self.ai_service.generate_content(
                prompt, ContentGenerationType(content_type)
            ))
            
            print(f"\nPrompt: {prompt}")
            print(f"Generated content ({content_type}):")
            print(f"{result['generated_content']}")
            print(f"Processing time: {result['processing_time']:.2f}s\n")
            
        except Exception as e:
            print(f"Error generating content: {str(e)}\n")
    
    def handle_regular_chat(self, user_input: str):
        """Handle regular chat messages"""
        try:
            self.messages.append({"role": "user", "content": user_input})
            
            response = self.client.chat.completions.create(
                messages=self.messages,
                model="llama-3.3-70b-versatile"
            )
            
            bot_reply = response.choices[0].message.content
            print(f"Groq: {bot_reply}\n")
            
            self.messages.append({"role": "assistant", "content": bot_reply})
            
        except Exception as e:
            print(f"Error: {str(e)}\n")

# Main execution
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Groq AI Content & Rephrase Service")
    parser.add_argument("--mode", choices=["server", "chat"], default="server", help="Run mode")
    parser.add_argument("--host", default="0.0.0.0", help="Server host")
    parser.add_argument("--port", default=8000, type=int, help="Server port")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    
    args = parser.parse_args()
    
    if not GROQ_API_KEY:
        print("Error: GROQ_API_KEY environment variable is required")
        print("Set it with: export GROQ_API_KEY='your-api-key'")
        exit(1)
    
    if args.mode == "server":
        print(f"Starting Groq AI Content & Rephrase Service on {args.host}:{args.port}")
        print("Available endpoints:")
        print("  - POST /rephrase: Rephrase text")
        print("  - POST /generate-content: Generate new content")
        print("  - GET /styles: Get rephrase styles")
        print("  - GET /content-types: Get content generation types")
        print("  - GET /tones: Get content tones")
        print("  - GET /lengths: Get content lengths")
        print("  - GET /health: Health check")
        uvicorn.run(
            "main:app",  # Adjust this if your file is named differently
            host=args.host,
            port=args.port,
            reload=args.reload
        )
    elif args.mode == "chat":
        chatbot = GroqChatbot(GROQ_API_KEY)
        chatbot.chat()