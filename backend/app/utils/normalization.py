import re


def normalize_identifier(value: str) -> str:
    if not value:
        return value
    value = value.upper()
    value = re.sub(r"[^A-Z0-9/-]", "", value)
    return value


def validate_identifier(value: str):
    if not value:
        return
    if not re.fullmatch(r"[A-Z0-9/-]+", value):
        raise ValueError("Invalid identifier format")
