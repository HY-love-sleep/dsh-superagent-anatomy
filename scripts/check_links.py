#!/usr/bin/env python3
"""Repo guards for dsh-superagent-anatomy.

1. Every relative link in a tracked .md/.html file resolves on disk.
2. No upstream citation points at a moving ref: links into
   deepseek-ai/dsh-superagent-prototype must use a full commit sha
   (main/master will silently rot).

Exit code 0 = clean, 1 = problems (printed one per line).
Run locally: python3 scripts/check_links.py
"""
from __future__ import annotations

import os
import re
import subprocess
import sys

UPSTREAM = "deepseek-ai/dsh-superagent-prototype"
MOVING_REFS = {"main", "master", "HEAD", "latest"}

LINK_RE = re.compile(r"\[[^\]]*\]\(<?([^)>\s]+)>?\)")
HTML_ATTR_RE = re.compile(r'(?:src|href)="([^"]+)"')
UPSTREAM_RE = re.compile(
    rf"github\.com/{re.escape(UPSTREAM)}/(?:blob|tree|raw)/([^/?#)\s]+)"
)


def repo_root() -> str:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        return out
    except Exception:
        return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def tracked_files(root: str) -> list[str]:
    try:
        out = subprocess.run(
            ["git", "ls-files"], cwd=root, capture_output=True, text=True, check=True
        ).stdout.splitlines()
        return [f for f in out if f.endswith((".md", ".html"))]
    except Exception:
        found = []
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in {".git", "node_modules"}]
            for name in filenames:
                if name.endswith((".md", ".html")):
                    found.append(os.path.relpath(os.path.join(dirpath, name), root))
        return found


def check(root: str) -> list[str]:
    problems: list[str] = []
    for rel in sorted(tracked_files(root)):
        path = os.path.join(root, rel)
        if not os.path.exists(path):
            continue
        text = open(path, encoding="utf-8").read()

        targets = [m.group(1) for m in LINK_RE.finditer(text)]
        if rel.endswith(".html"):
            targets += [m.group(1) for m in HTML_ATTR_RE.finditer(text)]

        for target in targets:
            if target.startswith(("http://", "https://", "mailto:", "//", "data:", "#")):
                continue
            local = target.split("#")[0].split("?")[0]
            if not local:
                continue
            resolved = os.path.normpath(os.path.join(os.path.dirname(path), local))
            if not os.path.exists(resolved):
                problems.append(f"{rel}: broken relative link -> {target}")

        for m in UPSTREAM_RE.finditer(text):
            if m.group(1) in MOVING_REFS:
                problems.append(
                    f"{rel}: unpinned upstream link (use a commit sha) -> {m.group(0)}"
                )
    return problems


def main() -> int:
    root = repo_root()
    problems = check(root)
    if problems:
        print(f"{len(problems)} problem(s):")
        for p in problems:
            print("  " + p)
        return 1
    print(f"ok: {len(tracked_files(root))} files, no broken links, no unpinned upstream refs")
    return 0


if __name__ == "__main__":
    sys.exit(main())
