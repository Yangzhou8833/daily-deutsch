"""Read the "德语词汇 v2" / "德语语法填空 v2" notes out of an .apkg into plain dicts."""
import html
import json
import os
import re
import sqlite3
import tempfile
import zipfile

VOCAB_MODEL = "德语词汇 v2"
GRAMMAR_MODEL = "德语语法填空 v2"

# Chinese grammar labels in the Info field -> German grammar terms (shared by every class language).
INFO_TERMS = [
    ("从句动词句尾", "Verb am Satzende"),
    ("后接倒装", "danach Inversion"),
    ("副词位置", "Position wie Adverb"),
    ("并列连词", "Konjunktion (Position 0)"),
    ("不定代词", "Indefinitpronomen"),
    ("无比较级", "keine Steigerung"),
    ("固定短语", "feste Wendung"),
    ("不用复数", "nur Singular"),
    ("口语也", "umgangssprachlich auch"),
    ("疑问词", "Fragewort"),
    ("不可分", "untrennbar"),
    ("可分", "trennbar"),
    ("副词", "Adverb"),
    ("习语", "Redewendung"),
    ("倒装", "Inversion"),
    ("口语", "umgangssprachlich"),
    ("连词", "Konjunktion"),
    ("代词", "Pronomen"),
    ("介词", "Präposition"),
    ("形容词", "Adjektiv"),
    ("（", " ("),
    ("）", ")"),
    ("，", ", "),
]
HAN = re.compile(r"[一-鿿]")


def clean(s):
    s = re.sub(r"<br\s*/?>", " ", s or "")
    s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def germanize_info(info):
    """Replace known Chinese labels. Returns (text, fully_converted)."""
    for zh, de in INFO_TERMS:
        info = info.replace(zh, de)
    info = re.sub(r"\s+", " ", info).strip()
    return info, not HAN.search(info)


def lesson_meta(path):
    stem = os.path.splitext(os.path.basename(path))[0].replace("德语_", "")
    stem = re.sub(r"_v\d+$", "", stem)
    slug = re.sub(r"[^a-z0-9]+", "-", stem.lower()).strip("-")
    m = re.match(r"(A\d)L(\d+)(?:_Teil(\d+))?$", stem) or re.match(r"()L(\d+)M(\d+)$", stem)
    if m and stem.startswith("A"):
        title = f"{m.group(1)} · Lektion {m.group(2)}" + (f" · Teil {m.group(3)}" if m.group(3) else "")
    elif m:
        title = f"Lektion {m.group(2)} · Modul {m.group(3)}"
    else:
        title = stem
    return slug, title


def read_apkg(path):
    z = zipfile.ZipFile(path)
    tmp = tempfile.mkdtemp()
    z.extract("collection.anki2", tmp)
    db = sqlite3.connect(os.path.join(tmp, "collection.anki2"))
    models = json.loads(db.execute("select models from col").fetchone()[0])
    words, grammar = [], []
    for guid, mid, flds in db.execute("select guid, mid, flds from notes order by id"):
        name = models[str(mid)]["name"]
        f = flds.split("\x1f")
        if name == VOCAB_MODEL:
            word, article, plural, meaning, info, ex, ex_zh, gap, sol, level = (clean(x) for x in f[:10])
            is_noun = article in ("der", "die", "das")
            if is_noun:
                plural = None if (not plural or HAN.search(plural)) else plural
                info_de, info_zh = None, None
            else:
                plural = None
                info_de, ok = germanize_info(info) if info else (None, True)
                info_zh = None if ok else info  # still needs translation
                if not ok:
                    info_de = None
            words.append({
                "id": guid,
                "word": word,
                "article": article if is_noun else None,
                "plural": plural,
                "info": info_de,
                "info_src": info_zh,
                "level": level or None,
                "meaning": {"zh": meaning},
                "example": ex,
                "example_tr": {"zh": ex_zh},
                "cloze": gap.replace("＿＿＿", "___") if gap else None,
                "answer": sol or None,
            })
        elif name == GRAMMAR_MODEL:
            text, hint = (clean(x) for x in f[:2])
            grammar.append({"id": guid, "text": text, "hint": {"zh": hint} if hint else {}})
    db.close()
    return words, grammar
