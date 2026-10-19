"""Add a batch of translations for one lesson into translations/<lesson>.json.

    python scripts/add_translations.py <lesson-id> <fields> <batch.txt>

<fields> names the columns of each line, separated by commas, e.g.
    th,vi,fa            meanings in three languages
    en,tr,th,vi,fa,ex   five meanings + English example translation
Lines map to the lesson's words in order (as in public/data/lessons/<id>.json), columns separated
by " | ". Lines starting with "G " map to the grammar cards in order and hold an English hint.
Existing translations are kept unless the batch provides the same field.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main(lesson_id, fields, batch_path):
    fields = fields.split(",")
    with open(os.path.join(ROOT, "public", "data", "lessons", f"{lesson_id}.json"), encoding="utf-8") as f:
        lesson = json.load(f)
    lines = [l.rstrip("\n") for l in open(batch_path, encoding="utf-8") if l.strip()]
    word_lines = [l for l in lines if not l.startswith("G ")]
    grammar_lines = [l[2:] for l in lines if l.startswith("G ")]
    if len(word_lines) != len(lesson["words"]):
        sys.exit(f"{lesson_id}: {len(word_lines)} lines for {len(lesson['words'])} words")
    if grammar_lines and len(grammar_lines) != len(lesson["grammar"]):
        sys.exit(f"{lesson_id}: {len(grammar_lines)} grammar lines for {len(lesson['grammar'])} cards")

    path = os.path.join(ROOT, "translations", f"{lesson_id}.json")
    overlay = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
    overlay.setdefault("words", {})
    overlay.setdefault("grammar", {})
    for w, line in zip(lesson["words"], word_lines):
        cols = [c.strip() for c in line.split(" | ")]
        if len(cols) != len(fields):
            sys.exit(f"{w['word']}: expected {len(fields)} columns, got {len(cols)}: {line}")
        entry = overlay["words"].setdefault(w["id"], {})
        for field, value in zip(fields, cols):
            if field == "ex":
                entry.setdefault("en", {})["example"] = value
            elif field == "info":
                if value:
                    entry.setdefault("en", {})["info"] = value
            else:
                entry.setdefault(field, {})["meaning"] = value
    for g, hint in zip(lesson["grammar"], grammar_lines):
        overlay["grammar"].setdefault(g["id"], {})["en"] = hint.strip()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(overlay, f, ensure_ascii=False, indent=1)
    print(f"{lesson_id}: {len(word_lines)} words, {len(grammar_lines)} grammar hints -> {os.path.relpath(path, ROOT)}")


if __name__ == "__main__":
    main(*sys.argv[1:4])
