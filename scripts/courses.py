"""Course structure: which .apkg feeds which lesson.

A2: one deck = one lesson.
A1.2: several decks are merged and de-duplicated into one lesson per Modul
(words, then the Modul's grammar cloze and sentence cards).
Word selectors:
  ("tag", deck, "L1", [themes])  -> words tagged 德语::L1::<theme> (Lektion 1-3 deck)
  ("range", deck, [(a, b), ...]) -> words at positions a..b (inclusive) in the deck's word order
  ("gtag", deck, [topics])       -> words tagged 德语::语法::<topic> (Lektion 1-3 deck)
  ("all", deck)                  -> every word of the deck
"""

A2 = [
    # (apkg, lesson id, Modul title, unit title)
    ("德语_A2L1.apkg", "a2l1", "Modul 1", "Teil 1"),
    ("德语_A2L1_Teil2.apkg", "a2l1-teil2", "Modul 1", "Teil 2"),
    ("德语_A2L2.apkg", "a2l2", "Modul 2", "Teil 1"),
    ("德语_A2L2_Teil2_v2.apkg", "a2l2-teil2", "Modul 2", "Teil 2"),
    ("德语_A2L3.apkg", "a2l3", "Modul 3", "Teil 1"),
    ("德语_A2L3_Teil2.apkg", "a2l3-teil2", "Modul 3", "Teil 2"),
]

A12_DECKS = {
    "L13": "德语_Lektion1-3.apkg",
    "L2N": "德语_补页_L2.apkg",
    "L3M": "德语_L3M3-M4.apkg",
    "L4M1": "德语_L4M1.apkg",
    "L4M2": "德语_L4M2.apkg",
    "L4M3": "德语_L4M3.apkg",
    "L4M4": "德语_L4M4.apkg",
}

# Grammar cards of the Lektion 1-3 deck are tagged by topic only (德语::语法::<topic>).
L13_GRAMMAR = {
    "L1": ["Wechselpräp", "stehen-stellen", "物主冠词", "方位介词", "方位", "房间格", "Genitiv-s", "楼层", "语序", "发音", "doch"],
    "L2": ["Dativ代词", "介词Dativ", "双宾语", "生病句型", "祈使句", "可分动词", "序数词"],
    "L3": ["werden", "weil-denn", "obwohl", "dass", "deshalb"],
}

A12 = [
    {
        "modul": 1,
        "title": "Modul 1 · Wohnen",
        # word selectors in order; words stay grouped by theme (comment) inside the Modul
        "words": [
            ("tag", "L13", "L1", ["住宅类型", "居住地点"]),  # Wohnformen & Wohnorte
            ("tag", "L13", "L1", ["房间", "房间daszimmer全是中性复数不变", "描述房间的形容词"]),  # Zimmer
            ("tag", "L13", "L1", ["家具与家用物品"]),  # Möbel & Haushalt
            ("tag", "L13", "L1", ["城市设施", "城市地点", "方位词"]),  # In der Stadt
            ("tag", "L13", "L1", ["找房词汇", "租房核心词汇"]),  # Wohnungssuche & Miete
            ("tag", "L13", "L1", ["Hallig课文", "动词"]),  # Leben auf der Hallig
        ],
        "grammar": [("tags", "L13", ["Wechselpräp", "stehen-stellen", "物主冠词", "方位介词", "方位", "房间格", "Genitiv-s", "楼层", "语序", "发音", "doch"])],
        "sentences": [("tag", "L13", "L1")],
    },
    {
        "modul": 2,
        "title": "Modul 2 · Feste & Gesundheit",
        # word selectors in order; words stay grouped by theme (comment) inside the Modul
        "words": [
            ("tag", "L13", "L2", ["节日", "节日活动"]),  # Feste & Feiertage
            ("range", "L2N", [(0, 38)]),
            ("tag", "L13", "L2", ["礼物"]),  # Geschenke & Feiern
            ("range", "L2N", [(39, 75), (133, 144)]),
            ("range", "L2N", [(76, 104)]),  # Silvester & Glückssymbole
            ("tag", "L13", "L2", ["第三格动词"]),  # Verben mit Dativ
            ("range", "L2N", [(105, 132)]),
            ("tag", "L13", "L2", ["双宾语动词"]),  # Verben mit Dativ und Akkusativ
            ("gtag", "L13", ["可分动词", "反身动词"]),  # Trennbare & reflexive Verben
            ("tag", "L13", "L2", ["工作场景", "电话用语"]),  # Am Telefon & bei der Arbeit
            ("tag", "L13", "L2", ["身体部位"]),  # Der Körper
            ("range", "L2N", [(174, 174), (183, 184)]),
            ("tag", "L13", "L2", ["症状", "疾病"]),  # Symptome & Krankheiten
            ("range", "L2N", [(160, 164), (180, 180), (188, 188), (192, 192)]),
            ("tag", "L13", "L2", ["医疗", "药品"]),  # Beim Arzt & Medikamente
            ("range", "L2N", [(145, 159), (165, 173), (175, 179), (181, 182), (185, 187), (189, 191), (193, 193)]),
        ],
        "grammar": [("tags", "L13", ["Dativ代词", "介词Dativ", "双宾语", "生病句型", "祈使句", "可分动词", "序数词"]), ("all", "L2N")],
        "sentences": [("tag", "L13", "L2"), ("all", "L2N")],
    },
    {
        "modul": 3,
        "title": "Modul 3 · Arbeit & Beruf",
        # word selectors in order; words stay grouped by theme (comment) inside the Modul
        "words": [
            ("tag", "L13", "L3", ["职业名称"]),  # Berufe
            ("tag", "L13", "L3", ["简历高频词", "简历动词"]),  # Der Lebenslauf
            ("tag", "L13", "L3", ["情绪词", "情绪身体反应"]),  # Gefühle
            ("tag", "L13", "L3", ["工作条件"]),  # Arbeitsbedingungen
            ("tag", "L13", "L3", ["转行相关词汇"]),  # Berufswechsel
            ("range", "L3M", [(0, 36)]),  # Traumberuf & Berufswahl
            ("range", "L3M", [(37, 72)]),  # Arbeitswelt im Wandel
            ("range", "L3M", [(73, 98)]),  # Arbeitsorte & Bewerbung
            ("range", "L3M", [(99, 144)]),  # Tätigkeiten & Berufe
            ("range", "L3M", [(145, 179)]),  # Aufgaben im Job
            ("range", "L3M", [(180, 209)]),  # Berufe & Nomen aus Verben
            ("range", "L3M", [(210, 262)]),  # Zufrieden im Job?
            ("range", "L3M", [(263, 297)]),  # Duzen oder Siezen?
            ("range", "L3M", [(298, 341)]),  # Telefonieren & Höflichkeit
        ],
        "grammar": [("tags", "L13", ["werden", "weil-denn", "obwohl", "dass", "deshalb"]), ("all", "L3M")],
        "sentences": [("tag", "L13", "L3"), ("all", "L3M")],
    },
    {
        "modul": 4,
        "title": "Modul 4 · Wetter & Mode",
        # word selectors in order; words stay grouped by theme (comment) inside the Modul
        "words": [
            ("range", "L4M1", [(0, 34)]),  # Wetter: Sonne, Regen, Gewitter
            ("range", "L4M1", [(35, 80)]),  # Wetter: Schnee, Wind, Temperatur
            ("range", "L4M1", [(81, 116)]),  # Über das Wetter reden
            ("range", "L4M1", [(117, 149)]),  # Klima, Jahreszeiten & Smalltalk
            ("range", "L4M1", [(150, 196)]),  # Kleidungsstücke
            ("range", "L4M1", [(197, 226)]),  # Kleidung beschreiben & anziehen
            ("range", "L4M2", [(0, 42)]),  # Material, Muster & Accessoires
            ("range", "L4M2", [(43, 79)]),  # Personen beschreiben
            ("range", "L4M2", [(80, 106)]),  # Bildbeschreibung & Eindrücke
            ("range", "L4M3", [(0, 46)]),  # Shoppen & Geschäfte
            ("range", "L4M3", [(47, 100)]),  # Im Kaufhaus
            ("range", "L4M3", [(101, 141)]),  # Secondhand & Verkaufen
            ("range", "L4M4", [(0, 22)]),  # Aussehen
            ("range", "L4M4", [(23, 62)]),  # Charakter & Gefühle
            ("range", "L4M4", [(63, 100)]),  # Schönheit & Schönheits-OP
            ("range", "L4M4", [(101, 137)]),  # Eindruck & Vergleiche
        ],
        "grammar": [("all", "L4M1"), ("all", "L4M2"), ("all", "L4M3"), ("all", "L4M4")],
        "sentences": [("all", "L4M1"), ("all", "L4M2"), ("all", "L4M3"), ("all", "L4M4")],
    },
]
