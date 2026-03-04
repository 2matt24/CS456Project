from __future__ import annotations

import re
from collections import Counter
from typing import List

STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "if", "then", "else", "to", "of", "in",
    "on", "for", "with", "at", "by", "from", "up", "about", "into", "over", "after",
    "is", "are", "was", "were", "be", "been", "being", "as", "that", "this", "these",
    "those", "it", "its", "i", "you", "we", "they", "he", "she", "them", "our", "your",
}


_sentence_pattern = re.compile(r"(?<=[.!?])\s+")
_word_pattern = re.compile(r"[a-zA-Z']+")


def _split_sentences(text: str) -> List[str]:
    stripped = text.strip()
    if not stripped:
        return []

    parts = [segment.strip() for segment in _sentence_pattern.split(stripped)]
    return [part for part in parts if part]


def summarize_text(text: str, max_sentences: int = 3) -> str:
    """Create an extractive summary from plain text.

    The strategy is simple and deterministic:
    1. split text into sentences,
    2. score sentences by non-stop-word frequency,
    3. return highest-scoring sentences in original order.
    """

    if not text or not text.strip():
        return ""

    sentences = _split_sentences(text)
    if len(sentences) <= max_sentences:
        return " ".join(sentences)

    words = [w.lower() for w in _word_pattern.findall(text)]
    frequencies = Counter(word for word in words if word not in STOP_WORDS)

    if not frequencies:
        return " ".join(sentences[:max_sentences])

    scored = []
    for idx, sentence in enumerate(sentences):
        sentence_words = [w.lower() for w in _word_pattern.findall(sentence)]
        if not sentence_words:
            score = 0
        else:
            score = sum(frequencies.get(word, 0) for word in sentence_words)
        scored.append((score, idx, sentence))

    top = sorted(scored, key=lambda item: (-item[0], item[1]))[:max_sentences]
    top_sorted_by_position = sorted(top, key=lambda item: item[1])

    return " ".join(sentence for _, _, sentence in top_sorted_by_position)