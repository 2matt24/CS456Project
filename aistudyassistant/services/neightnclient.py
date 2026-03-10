"""Client helpers for external summarization via n8n (Gemini workflow)."""

from __future__ import annotations

import json
import os
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
            raise SummarizationError(
                "Summarizer is not configured. Set N8N_SUMMARIZER_WEBHOOK_URL."
            )

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
            raise SummarizationError(
                "n8n webhook response does not include a summary field"
            )

        return summary


def _extract_summary(payload: dict) -> Optional[str]:
    """Accept common n8n response formats and extract summary text."""

    if not isinstance(payload, dict):
        return None

    # direct response shape: {"summary": "..."}
    summary = payload.get("summary")
    if isinstance(summary, str) and summary.strip():
        return summary.strip()

    # alternative shape often used by wrapper nodes
    data = payload.get("data")
    if isinstance(data, dict):
        nested = data.get("summary")
        if isinstance(nested, str) and nested.strip():
            return nested.strip()

    # optional OpenAI/Gemini-style forwarding format
    choices = payload.get("choices")
    if isinstance(choices, list) and choices:
        first = choices[0]
        if isinstance(first, dict):
            message = first.get("message")
            if isinstance(message, dict):
                content = message.get("content")
                if isinstance(content, str) and content.strip():
                    return content.strip()

    return None