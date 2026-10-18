"""Turn the lesson .apkg files + translation overlays into the site's JSON data.

    python scripts/build_data.py [apkg_dir]

Reads every 德语_*.apkg that uses the "德语词汇 v2" note type, merges
translations/<lesson>.json, and writes public/data/index.json and
public/data/lessons/<lesson>.json.
"""
import datetime
import glob
import json
import os
import sys

from ankiread import lesson_meta, read_apkg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APKG_DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(ROOT)
OUT = os.path.join(ROOT, "public", "data")
LANGS = ["zh", "en", "tr"]


def load_overlay(slug):
    path = os.path.join(ROOT, "translations", f"{slug}.json")
    if not os.path.exists(path):
        return {"words": {}, "grammar": {}}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def merge(words, grammar, overlay):
    for w in words:
        for lang, t in overlay["words"].get(w["id"], {}).items():
            if t.get("meaning"):
                w["meaning"][lang] = t["meaning"]
            if t.get("example"):
                w["example_tr"][lang] = t["example"]
            if t.get("info") and w["info_src"]:
                w.setdefault("info_tr", {"zh": w["info_src"]})[lang] = t["info"]
        if w["info_src"] and "info_tr" not in w:
            w["info_tr"] = {"zh": w["info_src"]}
        del w["info_src"]
    for g in grammar:
        for lang, hint in overlay["grammar"].get(g["id"], {}).items():
            g["hint"][lang] = hint


def main():
    os.makedirs(os.path.join(OUT, "lessons"), exist_ok=True)
    index = []
    for path in sorted(glob.glob(os.path.join(APKG_DIR, "德语_*.apkg"))):
        words, grammar = read_apkg(path)
        if not words:
            continue  # older note types, not supported yet
        slug, title = lesson_meta(path)
        merge(words, grammar, load_overlay(slug))
        date = datetime.date.fromtimestamp(os.path.getmtime(path)).isoformat()
        langs = [l for l in LANGS if all(l in w["meaning"] for w in words)]
        lesson = {"id": slug, "title": title, "date": date, "langs": langs, "words": words, "grammar": grammar}
        with open(os.path.join(OUT, "lessons", f"{slug}.json"), "w", encoding="utf-8") as f:
            json.dump(lesson, f, ensure_ascii=False, separators=(",", ":"))
        index.append({"id": slug, "title": title, "date": date, "langs": langs,
                      "words": len(words), "grammar": len(grammar)})
        print(f"{slug:16} {len(words):4} words {len(grammar):3} grammar  langs={','.join(langs)}")
    index.sort(key=lambda l: l["date"], reverse=True)
    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as f:
        json.dump({"lessons": index}, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
