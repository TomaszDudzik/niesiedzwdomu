"""
Shared logging setup for backend jobs.

Logs to both stderr (for Next.js to capture) and a rotating file in logs/.
"""

from __future__ import annotations

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

LOGS_DIR = Path(__file__).resolve().parent.parent.parent / "logs"
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"


def setup_logging(name: str, level: int = logging.INFO) -> None:
    """Configure root logger with stderr + file handlers.

    Args:
        name: Log file name (without extension), e.g. "generate_image", "scraper".
    """
    LOGS_DIR.mkdir(exist_ok=True)

    root = logging.getLogger()
    root.setLevel(level)

    # Don't add handlers twice if called multiple times
    if root.handlers:
        return

    formatter = logging.Formatter(LOG_FORMAT)

    # stderr handler (captured by Next.js execFile)
    stderr_handler = logging.StreamHandler(sys.stderr)
    stderr_handler.setFormatter(formatter)
    root.addHandler(stderr_handler)

    # File handler with rotation (5 MB per file, keep 3 backups)
    file_handler = RotatingFileHandler(
        LOGS_DIR / f"{name}.log",
        maxBytes=5 * 1024 * 1024,
        backupCount=3,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)
