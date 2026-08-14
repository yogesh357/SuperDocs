import os
import hashlib
import json
import time
from typing import Dict, Any, Type, Optional
from pydantic import BaseModel
import google.generativeai as genai
from backend.app.config import settings

# Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)
 
GEMINI_COSTS = {
    "gemini-flash-latest": {"input": 0.075 / 1_000_000, "output": 0.30 / 1_000_000},
    "gemini-1.5-flash": {"input": 0.075 / 1_000_000, "output": 0.30 / 1_000_000},
    "gemini-1.5-pro": {"input": 1.25 / 1_000_000, "output": 5.00 / 1_000_000}
}

def get_file_hash(file_path: str) -> str:
    """Calculate SHA-256 hash of a file."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            sha256.update(chunk)
    return sha256.hexdigest()

def extract_text_from_file(file_path: str) -> str:
    """Extract text from TXT or PDF files."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".txt":
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    elif ext == ".pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(file_path)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text
        except ImportError:
            # Fallback if pypdf is not installed yet
            return f"[PDF text extraction fallback: {os.path.basename(file_path)}]"
        except Exception as e:
            return f"[Error extracting text: {str(e)}]"
    else:
        # Fallback text read
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception as e:
            return f"[Unsupported file type or read error: {str(e)}]"

def call_gemini_structured(
    prompt: str,
    response_schema: Type[BaseModel],
    model_name: str = "gemini-flash-latest",
    temperature: float = 0.1
) -> tuple[Dict[str, Any], int, int, float]:
    """
    Call Gemini API and guarantee response adheres to Pydantic schema.
    Returns: (parsed_json_dict, input_tokens, output_tokens, cost_usd)
    """
    start_time = time.time()
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            model = genai.GenerativeModel(model_name)
            
            # Configure model to return structured JSON matching our Pydantic schema
            generation_config = {
                "response_mime_type": "application/json",
                "response_schema": response_schema,
                "temperature": temperature
            }
            
            response = model.generate_content(
                prompt,
                generation_config=generation_config
            )
            
            # Calculate tokens
            input_tokens = 0
            output_tokens = 0
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                input_tokens = response.usage_metadata.prompt_token_count
                output_tokens = response.usage_metadata.candidates_token_count
                
            # Calculate cost
            rates = GEMINI_COSTS.get(model_name, GEMINI_COSTS["gemini-flash-latest"])
            cost = (input_tokens * rates["input"]) + (output_tokens * rates["output"])
            
            try:
                parsed_data = json.loads(response.text)
                return parsed_data, input_tokens, output_tokens, cost
            except Exception as json_err:
                print(f"JSON parsing of Gemini response failed: {response.text}")
                return {"error": "Failed to parse JSON response from LLM", "raw_text": response.text}, input_tokens, output_tokens, cost
                
        except Exception as e:
            err_str = str(e).lower()
            if ("429" in err_str or "quota" in err_str or "rate limit" in err_str) and attempt < max_retries - 1:
                # Quota exceeded or rate limited. Sleep and retry with backoff.
                sleep_time = (attempt + 1) * 3
                print(f"Gemini API rate limited/quota exceeded. Retrying in {sleep_time}s... (Attempt {attempt+1}/{max_retries})")
                time.sleep(sleep_time)
                continue
                
            print(f"Error calling Gemini API: {str(e)}")
            return {"error": str(e)}, 0, 0, 0.0
