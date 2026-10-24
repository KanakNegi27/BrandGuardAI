import json
import logging
import requests
from typing import Dict, Any, List, Optional
from abc import ABC, abstractmethod
from app.config import Config

logger = logging.getLogger(__name__)

ANALYSIS_SYSTEM_PROMPT = """You are BrandGuard AI, an enterprise brand governance and compliance engine.
Your mission is to evaluate marketing copy against official company guidelines and verified reference facts.

CRITICAL INSTRUCTIONS:
1. Treat all findings as professional recommendations, NOT unquestionable dogmas.
2. Ground all evaluations strictly in the provided Approved Brand Guidelines and Verified Facts.
3. If a promotional claim is not substantiated by the provided reference set, classify it as "Unsupported by available references" — DO NOT declare it categorically false, invent counter-facts, or create fake citations.
4. ONLY cite reference IDs that exist in the provided approved reference library. NEVER invent or hallucinate reference IDs.
5. Suggested corrections must preserve the author's original message and intent without inventing new claims or data.
6. Return your evaluation strictly as valid JSON matching the following schema.

JSON SCHEMA:
{
  "findings": [
    {
      "issue_category": "Brand Voice & Tone" | "Unsupported Claim" | "Prohibited Terminology" | "Missing Disclaimer" | "Restricted Claim" | "Product Naming",
      "severity": "Low" | "Medium" | "High" | "Critical",
      "affected_text": "<exact excerpt from text>",
      "explanation": "<clear explanation citing relevant brand guideline>",
      "reference_ids": [<integer IDs from provided reference set only>],
      "suggested_correction": "<cautious rewrite preserving intent>",
      "confidence": <float between 0.50 and 1.00>,
      "recommended_action": "revise" | "remove" | "add_disclaimer" | "verify_source"
    }
  ],
  "overall_summary": "<brief 1-2 sentence assessment of brand alignment>"
}
"""

class BaseAIProvider(ABC):
    @abstractmethod
    def is_configured(self) -> bool:
        pass

    @abstractmethod
    def analyze_content(self, text: str, references: List[Dict[str, Any]]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_model_identifier(self) -> str:
        pass


class GeminiProvider(BaseAIProvider):
    def __init__(self, api_key: str = None, model: str = None):
        self.api_key = api_key or Config.GEMINI_API_KEY
        self.model = model or Config.GEMINI_MODEL or 'gemini-1.5-flash'

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    def get_model_identifier(self) -> str:
        return f"google/{self.model}"

    def analyze_content(self, text: str, references: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not self.is_configured():
            raise RuntimeError("Gemini API key is not configured.")

        # Prepare references context
        ref_context = "\n".join([
            f"- [ID: {r['id']}] [{r['code']}] {r['title']}: {r['content']}"
            for r in references
        ])

        user_prompt = f"""EVALUATE THIS SUBMISSION:
\"\"\"{text}\"\"\"

APPROVED REFERENCE LIBRARY:
{ref_context}

Return strict JSON only."""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{ANALYSIS_SYSTEM_PROMPT}\n\n{user_prompt}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json"
            }
        }

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=20)
            if response.status_code != 200:
                logger.error(f"Gemini API returned status {response.status_code}: {response.text}")
                raise RuntimeError(f"Gemini API error (Status {response.status_code})")

            data = response.json()
            raw_text = data['candidates'][0]['content']['parts'][0]['text']
            parsed = json.loads(raw_text)
            return parsed
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
            raise


class OpenAIProvider(BaseAIProvider):
    def __init__(self, api_key: str = None, model: str = None, base_url: str = None):
        self.api_key = api_key or Config.OPENAI_API_KEY
        self.model = model or Config.OPENAI_MODEL or 'gpt-4o-mini'
        self.base_url = (base_url or Config.OPENAI_BASE_URL or 'https://api.openai.com/v1').rstrip('/')

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    def get_model_identifier(self) -> str:
        return f"openai/{self.model}"

    def analyze_content(self, text: str, references: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not self.is_configured():
            raise RuntimeError("OpenAI API key is not configured.")

        ref_context = "\n".join([
            f"- [ID: {r['id']}] [{r['code']}] {r['title']}: {r['content']}"
            for r in references
        ])

        user_prompt = f"""EVALUATE THIS SUBMISSION:
\"\"\"{text}\"\"\"

APPROVED REFERENCE LIBRARY:
{ref_context}"""

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        payload = {
            "model": self.model,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ]
        }

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=20)
            if response.status_code != 200:
                logger.error(f"OpenAI API returned status {response.status_code}: {response.text}")
                raise RuntimeError(f"OpenAI API error (Status {response.status_code})")

            data = response.json()
            raw_text = data['choices'][0]['message']['content']
            parsed = json.loads(raw_text)
            return parsed
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {e}")
            raise


class FallbackAIProvider(BaseAIProvider):
    """Fallback provider when no AI keys are configured or provider is disabled."""
    def is_configured(self) -> bool:
        return False

    def get_model_identifier(self) -> str:
        return "deterministic-rule-engine-v1"

    def analyze_content(self, text: str, references: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "findings": [],
            "overall_summary": "AI Provider is not configured. Deterministic rule validation executed."
        }


def get_ai_provider() -> BaseAIProvider:
    provider_type = Config.AI_PROVIDER.lower()
    if provider_type == 'gemini':
        p = GeminiProvider()
        if p.is_configured():
            return p
    elif provider_type == 'openai':
        p = OpenAIProvider()
        if p.is_configured():
            return p

    # Check if any provider has credentials even if AI_PROVIDER was not explicitly set
    if Config.GEMINI_API_KEY:
        return GeminiProvider()
    if Config.OPENAI_API_KEY:
        return OpenAIProvider()

    return FallbackAIProvider()
