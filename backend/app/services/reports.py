from __future__ import annotations

from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.services.common import get_project_config


def render_report(template_name: str, context: dict) -> str:
    template_dir = Path(__file__).resolve().parents[1] / "templates"
    env = Environment(loader=FileSystemLoader(template_dir), autoescape=select_autoescape(["html"]))
    return env.get_template(template_name).render(**context)
