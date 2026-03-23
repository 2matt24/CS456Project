from __future__ import annotations

import json
import os
import re
from collections import Counter
from typing import Optional
from urllib import error, request


class SummarizationError(Exception):
    """Raised when external summarization cannot be completed."""


class N8NClient:
    """Minimal HTTP client for calling an n8n summarization webhook."""

    def __init__(self):
        self.webhook_url = os.getenv("N8N_SUMMARIZER_WEBHOOK_URL", "").strip()
        self.webhook_key = os.getenv("N8N_SUMMARIZER_WEBHOOK_KEY", "").strip()
        timeout = os.getenv("N8N_SUMMARIZER_TIMEOUT_SECONDS", "20").strip()
        try:
            self.timeout_seconds = max(1, int(timeout))
        except ValueError:
            self.timeout_seconds = 20

    def summarize_text(self, text: str, max_sentences: int = 3) -> str:
        if not text or not text.strip():
            raise SummarizationError("content is required")

        if not self.webhook_url:
            return _fallback_summary(text, max_sentences)

        payload = {
            "content": text,
            "maxSentences": max_sentences,
            "provider": "gemini",
            "task": "summarize_notes",
        }

        headers = {"Content-Type": "application/json"}
        if self.webhook_key:
            headers["X-Webhook-Key"] = self.webhook_key

        req = request.Request(
            self.webhook_url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=self.timeout_seconds) as response:
                body = response.read().decode("utf-8")
                status = response.status
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise SummarizationError(
                f"n8n webhook returned HTTP {exc.code}: {detail or 'no response body'}"
            ) from exc
        except error.URLError as exc:
            raise SummarizationError(f"Unable to reach n8n webhook: {exc.reason}") from exc

        if status < 200 or status >= 300:
            raise SummarizationError(f"n8n webhook returned status {status}")

        try:
            payload = json.loads(body) if body else {}
        except json.JSONDecodeError as exc:
            raise SummarizationError("n8n webhook returned non-JSON response") from exc

        summary = _extract_summary(payload)
        if not summary:
            raise SummarizationError("Invalid response from AI workflow")

        return summary


def _extract_summary(payload: dict) -> Optional[str]:
    if not isinstance(payload, dict):
        return None

    summary = payload.get("summary")
    if isinstance(summary, str) and summary.strip():
        return summary.strip()

    content = payload.get("content")
    if isinstance(content, str) and content.strip():
        return content.strip()

    data = payload.get("data")
    if isinstance(data, dict):
        nested = data.get("summary")
        if isinstance(nested, str) and nested.strip():
            return nested.strip()

    return None


def _fallback_summary(text: str, max_sentences: int) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip()
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", cleaned) if s.strip()]
    if not sentences:
        return cleaned[:500]
    if len(sentences) <= max_sentences:
        return " ".join(sentences)

    words = re.findall(r"[A-Za-z']+", cleaned.lower())
    stopwords = {
        'the','a','an','and','or','but','if','then','than','for','from','to','of','in','on','at','by','with','is','are','was','were','be','been','being','it','this','that','these','those','as','into','about','over','after','before','during','through','between','we','you','they','he','she','i','my','our','your','their'
    }
    freq = Counter(word for word in words if len(word) > 2 and word not in stopwords)
    ranked = []
    for idx, sentence in enumerate(sentences):
        sentence_words = re.findall(r"[A-Za-z']+", sentence.lower())
        score = sum(freq[word] for word in sentence_words)
        ranked.append((score, idx, sentence))
    best = sorted(ranked, key=lambda item: (-item[0], item[1]))[:max_sentences]
    ordered = [sentence for _, _, sentence in sorted(best, key=lambda item: item[1])]
    return " ".join(ordered)


_client = N8NClient()


def summarize_text(text: str, max_sentences: int = 3) -> str:
    return _client.summarize_text(text, max_sentences)
