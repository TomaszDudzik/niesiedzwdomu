"""
HTML cleaner: strips noise, extracts readable text.
Preserves headings as markdown-style markers for LLM context.
Preserves links as markdown [text](url) so LLM can extract event URLs.
"""

from __future__ import annotations

from urllib.parse import urljoin

from bs4 import BeautifulSoup, Tag

# Tags that are pure noise — remove entirely
REMOVE_TAGS = [
    "script", "style", "noscript", "iframe", "svg",
    "nav", "footer", "header", "aside",
    "form", "button", "input", "select", "textarea",
]

# CSS classes/ids that typically contain ads or navigation
REMOVE_PATTERNS = [
    "cookie", "consent", "gdpr", "popup", "modal",
    "sidebar", "widget", "social-share", "breadcrumb",
    "advertisement", "ad-", "newsletter-signup",
]


def clean_html(raw_html: str, base_url: str = "") -> str:
    """Convert raw HTML to clean readable text for LLM extraction.

    Preserves:
    - Headings as ## Heading
    - Links as [text](url) — so LLM can extract event detail URLs
    """
    soup = BeautifulSoup(raw_html, "html.parser")

    # Remove noise tags
    for tag_name in REMOVE_TAGS:
        for tag in soup.find_all(tag_name):
            tag.decompose()

    # Remove elements matching noise patterns (class or id)
    to_remove = []
    for element in soup.find_all(True):
        if not isinstance(element, Tag) or element.attrs is None:
            continue
        classes = " ".join(element.get("class", []))
        el_id = element.get("id", "") or ""
        combined = f"{classes} {el_id}".lower()
        if any(pattern in combined for pattern in REMOVE_PATTERNS):
            to_remove.append(element)
    for element in to_remove:
        element.decompose()

    # Convert links to markdown [text](url) — preserves URLs for LLM
    for link in soup.find_all("a"):
        href = link.get("href", "")
        text = link.get_text(strip=True)
        if href and text and not href.startswith("#") and not href.startswith("javascript"):
            full_url = urljoin(base_url, href) if base_url else href
            link.replace_with(f"[{text}]({full_url})")

    # Convert headings to markdown markers (helps LLM understand structure)
    for level in range(1, 7):
        for heading in soup.find_all(f"h{level}"):
            prefix = "#" * level
            heading.replace_with(f"\n{prefix} {heading.get_text(strip=True)}\n")

    # Extract text, normalize whitespace
    text = soup.get_text(separator="\n")
    lines = [line.strip() for line in text.splitlines()]
    lines = [line for line in lines if line]  # remove blank lines
    cleaned = "\n".join(lines)

    # Trim to reasonable size for LLM
    if len(cleaned) > 15000:
        cleaned = cleaned[:15000] + "\n\n[...trimmed...]"

    return cleaned
