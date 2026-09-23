#!/usr/bin/env python3
"""Laya deterministic gate for the Lance landing page — stdlib only, no model,
no torch, runs in <5s locally and in CI.

Canonical full version (deterministic + Laya judgments): Developer/laya-audit/audit.py
This file mirrors its deterministic landing checks; keep them in sync.
Exit 1 on any FAIL, 0 with WARNs.
"""
import os
import re
import sys
from html.parser import HTMLParser


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self._in_title = False
        self.metas = {}
        self.h1s = []
        self._in_h1 = False
        self._skip = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title":
            self._in_title = True
        elif tag == "meta":
            key = a.get("name") or a.get("property") or ""
            if key and "content" in a:
                self.metas[key.lower()] = a["content"]
        elif tag == "h1":
            self._in_h1 = True
        elif tag in ("script", "style"):
            self._skip = True

    def handle_endtag(self, tag):
        self._in_title = self._in_title and tag != "title"
        self._in_h1 = self._in_h1 and tag != "h1"
        if tag in ("script", "style"):
            self._skip = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        if self._in_h1:
            self.h1s.append(data.strip())


def main():
    landing = sys.argv[1] if len(sys.argv) > 1 else "landing"
    raw = open(os.path.join(landing, "index.html"), encoding="utf-8").read()
    p = Page()
    p.feed(raw)
    fails, warns = [], []

    def check(cid, ok, level, evidence):
        (fails if not ok and level == "fail" else warns if not ok else []).append(
            (cid, evidence)) if not ok else None
        return ok

    check("title", 10 < len(p.title) < 70, "warn", p.title)
    desc = p.metas.get("description", "")
    check("metadesc", 50 <= len(desc) <= 200, "warn", f"{len(desc)} chars")
    check("canonical", 'rel="canonical"' in raw, "fail", "canonical link")
    check("og-image", 'property="og:image"' in raw, "fail", "og:image")
    check("schema", "ld+json" in raw, "fail", "JSON-LD block")
    check("schema-product", "SoftwareApplication" in raw, "fail", "SoftwareApplication")
    check("faq", 'id="faq"' in raw and "FAQPage" in raw, "fail", "FAQ section + FAQPage")
    check("author", 'name="author"' in raw or 'rel="author"' in raw, "fail", "author signal")
    check("fresh", bool(re.search(r"20\d\d|v\d+\.\d+", raw)), "warn", "date/version signal")
    check("h1-single", len([h for h in p.h1s if h]) >= 1, "warn", f"h1s={p.h1s}"[:120])
    for name, want in [("robots.txt", "GPTBot"), ("sitemap.xml", "<url>")]:
        fp = os.path.join(landing, name)
        check(name, os.path.exists(fp) and want in open(fp, errors="replace").read(),
              "fail", name)
    fp = os.path.join(landing, "llms.txt")
    check("llms.txt", os.path.exists(fp), "warn", "llms.txt hedge")

    print(f"laya-gate: {len(fails)} FAIL, {len(warns)} warn")
    for cid, ev in fails + warns:
        print(f"[{'FAIL' if (cid, ev) in fails else 'WARN'}] {cid}: {ev}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
