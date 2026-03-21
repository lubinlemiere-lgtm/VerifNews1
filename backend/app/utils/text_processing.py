import re

from bs4 import BeautifulSoup


def strip_html(html: str) -> str:
    """Remove HTML tags and return clean text."""
    if not html:
        return ""
    soup = BeautifulSoup(html, "html.parser")
    return soup.get_text(separator=" ", strip=True)


def extractive_summary(text: str, num_sentences: int = 2, max_chars: int = 280) -> str:
    """TF-IDF weighted extractive summary: pick the most informative sentences.

    Scores each sentence by the average TF-IDF weight of its words,
    with a slight position bias (earlier sentences get a small boost).
    Keeps the final summary concise and readable (max 280 chars by default).
    """
    if not text:
        return ""

    text = text.strip()
    sentences = re.split(r"(?<=[.!?])\s+", text)
    meaningful = [s for s in sentences if len(s.split()) >= 6]

    if not meaningful:
        return text[:max_chars].rsplit(" ", 1)[0] + "..." if len(text) > max_chars else text

    if len(meaningful) <= num_sentences:
        result = " ".join(meaningful)
        if len(result) > max_chars:
            result = result[:max_chars].rsplit(" ", 1)[0] + "..."
        return result

    # Compute word frequencies (simple TF)
    all_words: list[str] = []
    for s in meaningful:
        all_words.extend(w.lower() for w in re.findall(r"[a-zA-Z\u00C0-\u024F]{3,}", s))

    if not all_words:
        selected = meaningful[:num_sentences]
        return " ".join(selected)[:max_chars]

    word_freq: dict[str, int] = {}
    for w in all_words:
        word_freq[w] = word_freq.get(w, 0) + 1

    # Stop words to ignore in scoring
    stop_words = {
        "the", "and", "for", "are", "but", "not", "you", "all", "can", "her",
        "was", "one", "our", "out", "has", "have", "had", "its", "his", "how",
        "that", "this", "with", "from", "they", "been", "said", "each", "which",
        "their", "will", "other", "about", "many", "then", "them", "these",
        "some", "would", "into", "more", "also", "than", "were", "what",
        "when", "there", "could", "after", "des", "les", "une", "est", "dans",
        "que", "par", "pour", "sur", "avec", "qui", "pas", "plus",
    }

    # Score each sentence
    scored: list[tuple[float, int, str]] = []
    for idx, sent in enumerate(meaningful):
        words = [w.lower() for w in re.findall(r"[a-zA-Z\u00C0-\u024F]{3,}", sent)]
        content_words = [w for w in words if w not in stop_words]
        if not content_words:
            score = 0.0
        else:
            score = sum(word_freq.get(w, 0) for w in content_words) / len(content_words)
        # Position bias: first sentences get a small boost
        position_boost = 1.0 + max(0, (5 - idx)) * 0.1
        scored.append((score * position_boost, idx, sent))

    # Select top sentences, keep original order
    scored.sort(key=lambda x: x[0], reverse=True)
    top = sorted(scored[:num_sentences], key=lambda x: x[1])

    result = " ".join(t[2] for t in top)
    if len(result) > max_chars:
        result = result[:max_chars].rsplit(" ", 1)[0] + "..."
    return result


CLICKBAIT_PATTERNS = [
    r"you won'?t believe",
    r"shocking",
    r"mind.?blowing",
    r"this (?:one )?trick",
    r"what happens next",
    r"jaw.?dropping",
    r"number \d+ will",
    r"\d+ reasons? (?:why|you)",
    r"click here",
    r"doctors? (?:hate|don'?t want)",
]

CLICKBAIT_REGEX = re.compile("|".join(CLICKBAIT_PATTERNS), re.IGNORECASE)

OPINION_MARKERS = [
    "opinion",
    "editorial",
    "op-ed",
    "commentary",
    "column",
    "blog",
    "perspective",
    "analysis:",
]


def is_clickbait(title: str) -> bool:
    """Check if a title matches clickbait patterns."""
    return bool(CLICKBAIT_REGEX.search(title))


def is_opinion(title: str, tags: list[str] | None = None) -> bool:
    """Check if content is opinion/editorial based on title or tags."""
    title_lower = title.lower()
    for marker in OPINION_MARKERS:
        if marker in title_lower:
            return True
    if tags:
        tags_lower = [t.lower() for t in tags]
        for marker in OPINION_MARKERS:
            if marker in tags_lower:
                return True
    return False
