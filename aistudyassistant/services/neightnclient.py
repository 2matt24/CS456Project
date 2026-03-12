

from __future__ import annotations

import json
import os
from typing import Any, Optional
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
            raise SummarizationError(
                "Summarizer is not configured. Set N8N_SUMMARIZER_WEBHOOK_URL."
            )

        payload = {
            "content": text,
            "text": text,
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
            headers={**headers, "Accept": "application/json, text/plain"},
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

        if not body or not body.strip():
            raise SummarizationError("n8n webhook returned an empty response")

        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            # Some workflows return plain text rather than JSON.
            return body.strip()

        summary = _extract_summary(payload)
        if not summary:
            raise SummarizationError("Invalid response from AI workflow")

        return summary


def _extract_summary(payload: Any) -> Optional[str]:
    """Accept common n8n response formats and extract summary text."""

    if isinstance(payload, str) and payload.strip():
        return payload.strip()

    if isinstance(payload, list):
        for item in payload:
            nested_summary = _extract_summary(item)
            if nested_summary:
                return nested_summary
        return None

    if not isinstance(payload, dict):
        return None

    for key in ("summary", "content", "text", "output", "message", "response"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    for key in ("data", "result", "body", "json", "message"):
        nested_summary = _extract_summary(payload.get(key))
        if nested_summary:
            return nested_summary

    if "choices" in payload and isinstance(payload["choices"], list):
        nested_summary = _extract_summary(payload["choices"])
        if nested_summary:
            return nested_summary

    return None

_client = N8NClient()

def summarize_text(text: str, max_sentences: int = 3) -> str:
    return _client.summarize_text(text, max_sentences)
