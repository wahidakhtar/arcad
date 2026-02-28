import re

def normalize_ckt(value: str | None) -> str | None:
    if not value:
        return value
    # Remove all whitespace (including NBSP and unicode spaces)
    cleaned = re.sub(r"\s+", "", value)
    return cleaned.upper()
