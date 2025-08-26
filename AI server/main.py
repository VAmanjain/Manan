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
# Enhanced Style configurations for rephrasing
STYLE_PROMPTS: Dict[RephraseStyle, StylePrompt] = {
    RephraseStyle.FORMAL: StylePrompt(
        system_prompt=(
            "You are a professional writing assistant specializing in formal communication. "
            "Transform the given text into polished, professional language suitable for business correspondence, "
            "academic papers, or official documents. Maintain the original meaning and key information while "
            "enhancing clarity, precision, and formality. Use appropriate business vocabulary and eliminate "
            "colloquialisms. Structure sentences for maximum clarity and impact."
        ),
        user_template="Transform this text into formal, professional language:\n\n\"{text}\"\n\nEnsure the tone is appropriate for business or academic contexts while preserving all key information.",
        temperature=0.4
    ),
    RephraseStyle.CASUAL: StylePrompt(
        system_prompt=(
            "You are a conversational writing assistant who excels at making text sound natural and approachable. "
            "Rephrase the given text using everyday language that feels like a friendly conversation. "
            "Use contractions, simple vocabulary, and a warm tone while maintaining the original meaning. "
            "Make it sound like something you'd say to a friend or colleague in an informal setting."
        ),
        user_template="Rewrite this text in a casual, friendly conversational style:\n\n\"{text}\"\n\nMake it sound natural and approachable, like you're talking to a friend.",
        temperature=0.7
    ),
    RephraseStyle.CREATIVE: StylePrompt(
        system_prompt=(
            "You are a creative writing specialist who transforms ordinary text into engaging, memorable content. "
            "Use vivid imagery, compelling metaphors, varied sentence structures, and dynamic vocabulary. "
            "Capture the reader's attention while preserving the core message. Employ literary techniques "
            "like alliteration, rhythm, and descriptive language to make the text more captivating and memorable."
        ),
        user_template="Transform this text into creative, engaging content that captures attention:\n\n\"{text}\"\n\nUse vivid language, interesting expressions, and creative techniques while maintaining the core message.",
        temperature=0.9
    ),
    RephraseStyle.CONCISE: StylePrompt(
        system_prompt=(
            "You are an expert in concise communication who eliminates wordiness without losing meaning. "
            "Remove redundant phrases, unnecessary qualifiers, and verbose constructions. "
            "Use active voice, strong verbs, and precise nouns. Combine related ideas efficiently and "
            "eliminate filler words while ensuring all essential information remains intact and clear."
        ),
        user_template="Make this text as concise and clear as possible while retaining all important information:\n\n\"{text}\"\n\nEliminate redundancy and wordiness, but keep all key points.",
        temperature=0.2
    )
}

# Enhanced Content generation configurations
CONTENT_PROMPTS: Dict[ContentGenerationType, ContentPrompt] = {
    ContentGenerationType.NEW: ContentPrompt(
        system_prompt=(
            "You are a versatile content creator who produces original, well-structured content tailored to specific needs. "
            "Create engaging material with clear organization, smooth transitions, and compelling opening and closing statements. "
            "Use relevant examples, concrete details, and logical flow. Adapt your writing style precisely to match "
            "the requested tone and length requirements. Ensure your content is informative, actionable, and memorable."
        ),
        user_template="Create original content about: {prompt}\n\nRequired tone: {tone}\nTarget length: {length}\n\nMake it engaging, well-structured, and valuable to readers.",
        temperature=0.8
    ),
    ContentGenerationType.CONTINUE: ContentPrompt(
        system_prompt=(
            "You are a skilled continuation writer who seamlessly extends existing content. "
            "Analyze the provided text's tone, style, vocabulary level, and subject matter. Match these elements precisely "
            "while advancing the narrative or argument naturally. Maintain consistency in perspective, tense, and voice. "
            "Create smooth transitions and logical progression from the existing content. Avoid repetition of already-covered points."
        ),
        user_template="Continue writing naturally from this text:\n\n\"{context}\"\n\nSpecific instructions: {prompt}\nMaintain this tone: {tone}\nTarget length for continuation: {length}\n\nEnsure seamless flow and consistency with the existing content.",
        temperature=0.6
    ),
    ContentGenerationType.EXPAND: ContentPrompt(
        system_prompt=(
            "You are an expert content developer who adds depth and richness to existing material. "
            "Take the provided content and elaborate with relevant examples, detailed explanations, supporting evidence, "
            "practical applications, and additional context. Maintain the original structure and key points while "
            "significantly enhancing value. Add subsections, bullet points, or numbered lists where appropriate for clarity."
        ),
        user_template="Expand and elaborate on this content with additional depth and detail:\n\n\"{context}\"\n\nSpecific focus areas: {prompt}\nTone to maintain: {tone}\nDesired expanded length: {length}\n\nAdd examples, explanations, and practical insights while preserving the original message.",
        temperature=0.7
    ),
    ContentGenerationType.BRAINSTORM: ContentPrompt(
        system_prompt=(
            "You are a creative brainstorming facilitator who generates diverse, actionable ideas. "
            "Provide a variety of creative solutions, approaches, and perspectives on the given topic. "
            "Include both conventional and innovative ideas. Organize your suggestions logically with clear categories. "
            "For each idea, provide a brief explanation of its potential value or application. "
            "Encourage further exploration with thought-provoking questions or next steps."
        ),
        user_template="Generate diverse brainstorming ideas for: {prompt}\n\nAdditional context: {context}\nApproach with this tone: {tone}\nNumber of ideas (based on {length}): Provide comprehensive brainstorming\n\nOrganize ideas into categories and include brief explanations for each suggestion.",
        temperature=0.95
    ),
    ContentGenerationType.OUTLINE: ContentPrompt(
        system_prompt=(
            "You are a content strategist who creates comprehensive, hierarchical outlines. "
            "Develop a logical structure with main sections, subsections, and key points. "
            "Include brief descriptions for each section explaining what should be covered. "
            "Ensure logical flow and comprehensive coverage of the topic. "
            "Use proper formatting with clear hierarchy (I, II, III / A, B, C / 1, 2, 3)."
        ),
        user_template="Create a detailed outline for: {prompt}\n\nRelevant context: {context}\nIntended tone: {tone}\nOutline detail level ({length}): Provide appropriate depth\n\nStructure with main sections, subsections, and brief descriptions of what each part should cover.",
        temperature=0.5
    ),
    ContentGenerationType.SUMMARIZE: ContentPrompt(
        system_prompt=(
            "You are a professional summarization specialist who distills complex content into clear, actionable summaries. "
            "Identify and extract the most important points, key insights, main arguments, and essential information. "
            "Organize the summary logically with clear structure. Use bullet points or numbered lists when appropriate. "
            "Maintain the original meaning while making the content more accessible and digestible. "
            "Highlight any actionable items, conclusions, or recommendations."
        ),
        user_template="Create a comprehensive summary of this content:\n\n\"{context}\"\n\nSpecific focus or angle: {prompt}\nSummary tone: {tone}\nSummary length: {length}\n\nCapture all key points, main insights, and important details while making it clear and well-organized.",
        temperature=0.4
    ),
}

# Enhanced Tone modifiers with more specific guidance
TONE_MODIFIERS: Dict[ContentTone, str] = {
    ContentTone.PROFESSIONAL: (
        "Adopt a professional, authoritative tone using formal language, industry-appropriate terminology, "
        "and structured presentation. Maintain objectivity and focus on facts, benefits, and actionable insights. "
        "Use confident but respectful language suitable for business contexts."
    ),
    ContentTone.CASUAL: (
        "Write in a relaxed, conversational tone that feels approachable and friendly. Use everyday language, "
        "contractions, and personal pronouns. Make it feel like a helpful conversation with a knowledgeable friend. "
        "Keep it warm and engaging without being overly formal."
    ),
    ContentTone.CREATIVE: (
        "Employ an imaginative, dynamic tone with colorful language, creative analogies, and engaging storytelling elements. "
        "Use varied sentence structures, vivid descriptions, and unexpected comparisons to capture attention. "
        "Be expressive and memorable while maintaining clarity."
    ),
    ContentTone.ACADEMIC: (
        "Use a scholarly, analytical tone with precise terminology, evidence-based arguments, and logical structure. "
        "Include appropriate citations concepts, maintain objectivity, and demonstrate depth of knowledge. "
        "Write with authority while acknowledging complexity and nuance."
    ),
    ContentTone.PERSUASIVE: (
        "Craft compelling, influential content designed to convince and motivate action. Use strong arguments, "
        "emotional appeals where appropriate, concrete benefits, and clear calls to action. "
        "Build credibility while creating urgency and desire."
    )
}

# Enhanced Length guidelines with more specific direction
LENGTH_GUIDELINES: Dict[ContentLength, Dict[str, Union[int, str]]] = {
    ContentLength.SHORT: {
        "tokens": 250,
        "description": "1-2 focused paragraphs with key points only",
        "brainstorm_items": "5-8 well-explained ideas",
        "detail_level": "Concise but complete coverage of essential points"
    },
    ContentLength.MEDIUM: {
        "tokens": 600,
        "description": "3-5 well-developed paragraphs with examples and details",
        "brainstorm_items": "10-15 diverse ideas with explanations",
        "detail_level": "Comprehensive coverage with supporting details and examples"
    },
    ContentLength.LONG: {
        "tokens": 1200,
        "description": "6+ detailed paragraphs with thorough exploration",
        "brainstorm_items": "20+ creative ideas organized in categories",
        "detail_level": "In-depth analysis with multiple examples, subsections, and comprehensive coverage"
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