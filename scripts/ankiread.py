"""Read vocabulary, grammar cloze and sentence notes out of the lesson .apkg files.

Two generations of note types exist:
- v2 ("德语词汇 v2", "德语语法填空 v2", "德语补充句 v2"): structured fields, used since A2.
- old ("德语词汇（带例句）…", "德语填空" / "德语语法填空 …", "德语句型（中→德）…"): the article
  is part of the word and plural / extra notes are mixed into one Chinese "Info" field.
Everything is normalised to the site's Word / GrammarCard / Sentence shape.
"""
import html
import json
import os
import re
import sqlite3
import tempfile
import zipfile

HAN = re.compile(r"[一-鿿]")
ARTICLE = re.compile(r"^(der|die|das)(?:/(der|die|das))?\s+(.+)$")

# Chinese grammar labels -> German grammar terms (shared by every explanation language).
INFO_TERMS = [
    ("从句动词句尾", "Verb am Satzende"),
    ("后接倒装", "danach Inversion"),
    ("副词位置", "Position wie Adverb"),
    ("并列连词", "Konjunktion (Position 0)"),
    ("不定代词", "Indefinitpronomen"),
    ("无比较级", "keine Steigerung"),
    ("固定短语", "feste Wendung"),
    ("口语也", "umgangssprachlich auch"),
    ("可分动词", "trennbar"),
    ("形容词/副词", "Adjektiv/Adverb"),
    ("加强否定", "verstärkte Verneinung"),
    ("通常不加冠词", "meist ohne Artikel"),
    ("不加冠词", "ohne Artikel"),
    ("疑问词", "Fragewort"),
    ("不可分", "untrennbar"),
    ("可分", "trennbar"),
    ("副词", "Adverb"),
    ("形容词", "Adjektiv"),
    ("习语", "Redewendung"),
    ("倒装", "Inversion"),
    ("口语", "umgangssprachlich"),
    ("连词", "Konjunktion"),
    ("代词", "Pronomen"),
    ("介词", "Präposition"),
    ("情态", "Modalverb"),
    ("反身", "reflexiv"),
    ("反义", "Gegenteil:"),
    ("固定", "feste Wendung"),
    ("规则", "regelmäßig"),
    ("动词", "Verb"),
    ("第四格", "Akkusativ"),
    ("第三格", "Dativ"),
    ("中性", "neutral"),
    ("阴性", "f.:"),
    ("来自", "von"),
    ("症状", "Symptome:"),
    ("读作", "Aussprache"),
    ("读", "Aussprache"),
    ("缩写", "Abk."),
    ("搭配", ""),
    ("（", " ("),
    ("）", ")"),
    ("，", ", "),
    ("；", "; "),
    ("｜", "; "),
]


def clean(s):
    s = re.sub(r"<br\s*/?>", " ", s or "")
    s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def germanize(info):
    """Replace known Chinese labels. Returns (text, fully_converted)."""
    for zh, de in INFO_TERMS:
        info = info.replace(zh, de)
    info = re.sub(r"\s+", " ", info).strip(" ;,")
    info = re.sub(r"\s+([;,)])", r"\1", info)
    return info, not HAN.search(info)


def umlaut(s):
    """Umlaut on the last a / o / u / au (der Garten -> Gärten, das Haus -> Häus)."""
    m = re.search(r"(au|Au|a|o|u|A|O|U)(?=[^aouäöüAOUÄÖÜ]*$)", s)
    if not m:
        return s
    table = {"au": "äu", "Au": "Äu", "a": "ä", "o": "ö", "u": "ü", "A": "Ä", "O": "Ö", "U": "Ü"}
    return s[: m.start()] + table[m.group(1)] + s[m.end():]


def plural_from_note(word, note):
    """'复数 -en' / '复数 ⁻er' / '复数 –' / '复数 Museen' / 'die Feste' / 'die -märkte' -> 'die …' or None."""
    note = note.strip()
    m = re.match(r"^die\s+-(\S+)$", note)
    if m:  # compound shorthand: der Weihnachtsmarkt, 'die -märkte'
        tail = m.group(1)
        stem = tail.replace("ä", "a").replace("ö", "o").replace("ü", "u")[:3].lower()
        i = word.lower().rfind(stem)
        return f"die {word[:i]}{tail}" if i > 0 else None
    if note.startswith("die "):
        return note
    m = re.match(r"^复数\s*(.*)$", note)
    if not m:
        return None
    rest = m.group(1).strip()
    if rest in ("–", "-", ""):
        return f"die {word}"
    if rest.startswith("⁻"):
        return f"die {umlaut(word)}{rest[1:]}"
    if rest.startswith("-"):
        return f"die {word}{rest[1:]}"
    if re.match(r"^[A-ZÄÖÜ]\w+$", rest):
        return f"die {rest}"
    return None


def parse_noun_info(word, info):
    """Old-format noun Info -> (plural, extra note). Extra note may still contain Chinese."""
    parts = [p.strip() for p in re.split(r"[｜；]| / (?=-in)", info) if p.strip()]
    plural, extra = None, []
    for p in parts:
        if re.match(r"^(不用复数|只用单数|口语，不用复数)", p) or p.startswith("不用复数"):
            extra.append("nur Singular" + ("; umgangssprachlich" if "口语" in p else ""))
            if "读" in p:
                extra.append(p.split("，", 1)[-1])
        elif p in ("永远复数", "只用复数", "复数") or p.startswith("复数 (Pl"):
            plural = f"die {word}"
            extra.append("nur Plural")
        elif p.startswith("复数 (Sg"):
            extra.append("nur Singular")
        elif p == "复数形式不变":
            plural = f"die {word}"
        elif plural is None and (pl := plural_from_note(word, p.split("，")[0].split(" / ")[0])):
            plural = pl
            if "，" in p:
                extra.append(p.split("，", 1)[1])
        else:
            extra.append(p)
    return plural, "; ".join(extra)


def make_cloze(word, example, plural=None, info=""):
    """Find the headword (or an inflected form) in the example; return (cloze, answer) or (None, None)."""
    if not example:
        return None, None
    phrase = re.sub(r"^sich\s+", "", word)
    if " " in phrase and phrase in example:  # fixed phrase used verbatim
        return example.replace(phrase, "___", 1), phrase
    tokens = re.findall(r"[A-Za-zÄÖÜäöüß-]+", example)
    forms = {phrase}
    if plural:
        forms.add(plural.replace("die ", ""))
    forms.update(re.findall(r"(?:hat|ist)\s+(\w+)", info))  # Perfekt participle from the note
    for t in tokens:
        if t in forms:
            return example.replace(t, "___", 1), t
    # inflected form: same stem (case-insensitive), at most a few letters longer/shorter
    base = phrase.split(" ")[0]
    stem = re.sub(r"(en|n|e)$", "", base).lower()
    if len(stem) >= 4:
        hits = [t for t in tokens if t.lower().startswith(stem) and len(t) - len(stem) <= 4]
        if len(hits) == 1:
            return re.sub(rf"\b{re.escape(hits[0])}\b", "___", example, count=1), hits[0]
    return None, None


def _open(path):
    z = zipfile.ZipFile(path)
    tmp = tempfile.mkdtemp()
    z.extract("collection.anki2", tmp)
    db = sqlite3.connect(os.path.join(tmp, "collection.anki2"))
    models = {k: v["name"] for k, v in json.loads(db.execute("select models from col").fetchone()[0]).items()}
    return db, models


def _info(word, info, article):
    """Normalise a non-noun / leftover note into (german_info, chinese_leftover)."""
    if not info:
        return None, None
    de, ok = germanize(info)
    return (de, None) if ok else (None, info)


def read_apkg(path):
    """Returns (words, grammar, sentences). Each word/grammar card keeps its Anki guid as id,
    plus 'tags' (list) and 'order' (position among the deck's words) for grouping."""
    db, models = _open(path)
    words, grammar, sentences = [], [], []
    for guid, mid, flds, tags in db.execute("select guid, mid, flds, tags from notes order by id"):
        name = models[str(mid)]
        f = [clean(x) for x in flds.split("\x1f")]
        tags = tags.split()
        if name == "德语词汇 v2":
            word, article, plural, meaning, info, ex, ex_zh, gap, sol, level = f[:10]
            noun = article in ("der", "die", "das")
            if noun:
                plural = None if (not plural or HAN.search(plural)) else plural
                info_de, info_zh = None, None
            else:
                plural = None
                info_de, info_zh = _info(word, info, None)
            cloze, answer = (re.sub("＿+", "___", gap), sol) if gap and "＿" in gap and sol else (None, None)
            words.append(_word(guid, word, article if noun else None, plural, info_de, info_zh, level, meaning, ex, ex_zh, cloze, answer, tags, len(words)))
        elif name.startswith("德语词汇"):  # old format: 'das Haus', meaning, info, example, example_zh
            raw, meaning, info, ex, ex_zh = f[:5]
            m = ARTICLE.match(raw)
            if m:
                article, word = m.group(1), m.group(3)
                plural, extra = parse_noun_info(word, info)
                if m.group(2):
                    extra = f"auch {m.group(2)}" + (f"; {extra}" if extra else "")
                info_de, info_zh = _info(word, extra, article)
            else:
                article, word, plural = None, raw, None
                info_de, info_zh = _info(word, info, None)
            cloze, answer = make_cloze(word, ex, plural, info)
            words.append(_word(guid, word, article, plural, info_de, info_zh, None, meaning, ex, ex_zh, cloze, answer, tags, len(words)))
        elif "填空" in name:  # grammar cloze: Text + (Hinweis | Back Extra)
            text, hint = f[0], f[1] if len(f) > 1 else ""
            grammar.append({"id": guid, "text": text, "hint": {"zh": hint} if hint else {}, "tags": tags})
        elif "句" in name:  # sentence cards: Chinese -> German
            zh, de = f[0], f[1]
            if zh and de:
                sentences.append({"id": guid, "zh": zh, "de": de, "tags": tags})
    db.close()
    return words, grammar, sentences


def _word(guid, word, article, plural, info, info_zh, level, meaning, ex, ex_zh, cloze, answer, tags, order):
    return {
        "id": guid,
        "word": word,
        "article": article,
        "plural": plural,
        "info": info,
        "info_src": info_zh,
        "level": level or None,
        "meaning": {"zh": meaning},
        "example": ex,
        "example_tr": {"zh": ex_zh} if ex_zh else {},
        "cloze": cloze,
        "answer": answer,
        "tags": tags,
        "order": order,
    }
