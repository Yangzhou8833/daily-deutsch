"""Turn the lesson .apkg files + translation overlays into the site's JSON data.

    python scripts/build_data.py [apkg_dir]

Course structure lives in courses.py. Translations live in translations/*.json, keyed by
Anki note guid ({"words": {id: {lang: {meaning, example, info}}}, "grammar": {id: {lang: hint}}}),
so a word keeps its translations wherever it is placed. Writes public/data/index.json and
public/data/lessons/<id>.json, and reports words that no unit picked up.
"""
import datetime
import glob
import json
import os
import sys

from ankiread import read_apkg
from courses import A12, A12_DECKS, A2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APKG_DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(ROOT)
OUT = os.path.join(ROOT, "public", "data")
LANGS = ["zh", "en", "tr", "th", "vi", "fa"]


def load_overlays():
    words, grammar = {}, {}
    for path in sorted(glob.glob(os.path.join(ROOT, "translations", "*.json"))):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        for wid, langs in data.get("words", {}).items():
            for lang, t in langs.items():
                words.setdefault(wid, {}).setdefault(lang, {}).update(t)
        for gid, langs in data.get("grammar", {}).items():
            grammar.setdefault(gid, {}).update(langs)
    return words, grammar


OVERLAY_WORDS, OVERLAY_GRAMMAR = load_overlays()


def finish_word(w):
    """Apply translations and drop build-only fields."""
    for lang, t in OVERLAY_WORDS.get(w["id"], {}).items():
        if t.get("meaning"):
            w["meaning"][lang] = t["meaning"]
        if t.get("example"):
            w["example_tr"][lang] = t["example"]
        if t.get("info") and w["info_src"]:
            w.setdefault("info_tr", {"zh": w["info_src"]})[lang] = t["info"]
    if w["info_src"] and "info_tr" not in w:
        w["info_tr"] = {"zh": w["info_src"]}
    for k in ("info_src", "tags", "order"):
        w.pop(k, None)
    return w


def finish_grammar(g):
    g["hint"].update(OVERLAY_GRAMMAR.get(g["id"], {}))
    g.pop("tags", None)
    return g


def finish_sentence(s):
    s.pop("tags", None)
    return s


def mtime(path):
    return datetime.date.fromtimestamp(os.path.getmtime(path)).isoformat()


def write_lesson(index, lesson, course, lektion, order):
    words, grammar, sentences = lesson["words"], lesson["grammar"], lesson.get("sentences", [])
    langs = [l for l in LANGS if words and all(l in w["meaning"] for w in words)] or ["zh"]
    lesson.update(langs=langs, sentences=sentences, course=course, lektion=lektion)
    with open(os.path.join(OUT, "lessons", f"{lesson['id']}.json"), "w", encoding="utf-8") as f:
        json.dump(lesson, f, ensure_ascii=False, separators=(",", ":"))
    index.append({
        "id": lesson["id"], "title": lesson["title"], "course": course, "lektion": lektion, "order": order,
        "date": lesson["date"], "langs": langs, "words": len(words), "grammar": len(grammar), "sentences": len(sentences),
    })
    print(f"  {lesson['id']:28} {len(words):4}w {len(grammar):3}g {len(sentences):4}s  {','.join(langs)}")


def build_a2(index):
    print("A2")
    # newest Lektion first on the home page; units inside a Lektion stay in order
    lektionen = list(dict.fromkeys(l[2] for l in A2))[::-1]
    ordered = [x for lek in lektionen for x in A2 if x[2] == lek]
    for order, (apkg, lid, lektion, title) in enumerate(ordered):
        path = os.path.join(APKG_DIR, apkg)
        words, grammar, sentences = read_apkg(path)
        lesson = {
            "id": lid, "title": title, "date": mtime(path),
            "words": [finish_word(w) for w in words],
            "grammar": [finish_grammar(g) for g in grammar],
            "sentences": [finish_sentence(s) for s in sentences],
        }
        write_lesson(index, lesson, "A2", lektion, order)


def select(items, selector, kind):
    """Pick items (words / grammar / sentences) of one deck matching a selector."""
    how = selector[0]
    if how == "all":
        return items
    if how == "range":
        return [w for w in items if any(a <= w["order"] <= b for a, b in selector[2])]
    if how == "gtag":
        return [w for w in items if any(f"德语::语法::{t}" in w["tags"] for t in selector[2])]
    if how == "tag" and kind == "words":
        lek, themes = selector[2], selector[3]
        return [w for w in items if any(f"德语::{lek}::{t}" in w["tags"] for t in themes)]
    if how == "tag":  # sentences of one Lektion
        return [x for x in items if any(t.startswith(f"德语::{selector[2]}::") or t == f"德语::{selector[2]}" for t in x["tags"])]
    if how == "tags":  # grammar topics
        return [x for x in items if any(f"德语::语法::{t}" in x["tags"] for t in selector[2])]
    raise ValueError(selector)


def build_a12(index):
    print("A1.2")
    decks = {key: read_apkg(os.path.join(APKG_DIR, f)) for key, f in A12_DECKS.items()}
    dates = {key: mtime(os.path.join(APKG_DIR, f)) for key, f in A12_DECKS.items()}
    used, seen = set(), set()  # word ids placed; headwords placed (de-duplication)
    order = 0
    for lek in A12:
        for slug, title, selectors in lek["units"]:
            words, deck_dates = [], []
            for sel in selectors:
                deck_words = decks[sel[1]][0]
                deck_dates.append(dates[sel[1]])
                for w in select(deck_words, sel, "words"):
                    key = f"{w['article'] or ''} {w['word']}".strip().lower()
                    used.add(w["id"])
                    if key in seen:
                        continue
                    seen.add(key)
                    words.append(finish_word(dict(w, meaning=dict(w["meaning"]), example_tr=dict(w["example_tr"]))))
            lesson = {"id": f"a12-{lek['lektion'].lower()}-{slug}", "title": title, "date": max(deck_dates), "words": words, "grammar": []}
            write_lesson(index, lesson, "A1.2", lek["title"], order)
            order += 1
        grammar = [finish_grammar(dict(g, hint=dict(g["hint"]))) for sel in lek["grammar"] for g in select(decks[sel[1]][1], sel, "grammar")]
        sentences = [finish_sentence(dict(s)) for sel in lek["sentences"] for s in select(decks[sel[1]][2], sel, "sentences")]
        lesson = {"id": f"a12-{lek['lektion'].lower()}-grammatik", "title": "Grammatik & Sätze", "date": max(dates.values()),
                  "words": [], "grammar": grammar, "sentences": sentences}
        write_lesson(index, lesson, "A1.2", lek["title"], order)
        order += 1

    for key, (words, _, _) in decks.items():
        missing = [w["word"] for w in words if w["id"] not in used]
        if missing:
            print(f"  ! {key}: {len(missing)} words in no unit: {', '.join(missing[:20])}")


def main():
    lessons_dir = os.path.join(OUT, "lessons")
    os.makedirs(lessons_dir, exist_ok=True)
    for old in glob.glob(os.path.join(lessons_dir, "*.json")):
        os.remove(old)
    index = []
    build_a2(index)
    build_a12(index)
    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as f:
        json.dump({"courses": ["A2", "A1.2"], "lessons": index}, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
