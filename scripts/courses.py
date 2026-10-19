"""Course structure: which .apkg feeds which lesson / themed unit.

A2: one deck = one lesson.
A1.2: several decks are merged, de-duplicated and split into themed units per Lektion.
Unit word selectors:
  ("tag", deck, "L1", [themes])  -> words tagged 德语::L1::<theme> (Lektion 1-3 deck)
  ("range", deck, [(a, b), ...]) -> words at positions a..b (inclusive) in the deck's word order
  ("gtag", deck, [topics])       -> words tagged 德语::语法::<topic> (Lektion 1-3 deck)
  ("all", deck)                  -> every word of the deck
Each Lektion also gets a "Grammatik & Sätze" unit with its grammar cloze and sentence cards.
"""

A2 = [
    # (apkg, lesson id, Lektion title, unit title)
    ("德语_A2L1.apkg", "a2l1", "Lektion 1", "Teil 1"),
    ("德语_A2L1_Teil2.apkg", "a2l1-teil2", "Lektion 1", "Teil 2"),
    ("德语_A2L2.apkg", "a2l2", "Lektion 2", "Teil 1"),
    ("德语_A2L2_Teil2_v2.apkg", "a2l2-teil2", "Lektion 2", "Teil 2"),
    ("德语_A2L3.apkg", "a2l3", "Lektion 3", "Teil 1"),
    ("德语_A2L3_Teil2.apkg", "a2l3-teil2", "Lektion 3", "Teil 2"),
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
        "lektion": "L1",
        "title": "Lektion 1 · Wohnen",
        "units": [
            ("wohnformen", "Wohnformen & Wohnorte", [("tag", "L13", "L1", ["住宅类型", "居住地点"])]),
            ("zimmer", "Zimmer", [("tag", "L13", "L1", ["房间", "房间daszimmer全是中性复数不变", "描述房间的形容词"])]),
            ("moebel", "Möbel & Haushalt", [("tag", "L13", "L1", ["家具与家用物品"])]),
            ("stadt", "In der Stadt", [("tag", "L13", "L1", ["城市设施", "城市地点", "方位词"])]),
            ("wohnungssuche", "Wohnungssuche & Miete", [("tag", "L13", "L1", ["找房词汇", "租房核心词汇"])]),
            ("hallig", "Leben auf der Hallig", [("tag", "L13", "L1", ["Hallig课文", "动词"])]),
        ],
        "grammar": [("tags", "L13", L13_GRAMMAR["L1"])],
        "sentences": [("tag", "L13", "L1")],
    },
    {
        "lektion": "L2",
        "title": "Lektion 2 · Feste & Gesundheit",
        "units": [
            ("feste", "Feste & Feiertage", [("tag", "L13", "L2", ["节日", "节日活动"]), ("range", "L2N", [(0, 38)])]),
            ("feiern", "Geschenke & Feiern", [("tag", "L13", "L2", ["礼物"]), ("range", "L2N", [(39, 75), (133, 144)])]),
            ("glueck", "Silvester & Glückssymbole", [("range", "L2N", [(76, 104)])]),
            ("dativ-verben", "Verben mit Dativ", [("tag", "L13", "L2", ["第三格动词"]), ("range", "L2N", [(105, 132)])]),
            ("dativ-akkusativ", "Verben mit Dativ und Akkusativ", [("tag", "L13", "L2", ["双宾语动词"])]),
            ("verben", "Trennbare & reflexive Verben", [("gtag", "L13", ["可分动词", "反身动词"])]),
            ("telefon", "Am Telefon & bei der Arbeit", [("tag", "L13", "L2", ["工作场景", "电话用语"])]),
            ("koerper", "Der Körper", [("tag", "L13", "L2", ["身体部位"]), ("range", "L2N", [(174, 174), (183, 184)])]),
            ("symptome", "Symptome & Krankheiten", [("tag", "L13", "L2", ["症状", "疾病"]), ("range", "L2N", [(160, 164), (180, 180), (188, 188), (192, 192)])]),
            (
                "arzt",
                "Beim Arzt & Medikamente",
                [
                    ("tag", "L13", "L2", ["医疗", "药品"]),
                    ("range", "L2N", [(145, 159), (165, 173), (175, 179), (181, 182), (185, 187), (189, 191), (193, 193)]),
                ],
            ),
        ],
        "grammar": [("tags", "L13", L13_GRAMMAR["L2"]), ("all", "L2N")],
        "sentences": [("tag", "L13", "L2"), ("all", "L2N")],
    },
    {
        "lektion": "L3",
        "title": "Lektion 3 · Arbeit & Beruf",
        "units": [
            ("berufe", "Berufe", [("tag", "L13", "L3", ["职业名称"])]),
            ("lebenslauf", "Der Lebenslauf", [("tag", "L13", "L3", ["简历高频词", "简历动词"])]),
            ("gefuehle", "Gefühle", [("tag", "L13", "L3", ["情绪词", "情绪身体反应"])]),
            ("arbeitsbedingungen", "Arbeitsbedingungen", [("tag", "L13", "L3", ["工作条件"])]),
            ("berufswechsel", "Berufswechsel", [("tag", "L13", "L3", ["转行相关词汇"])]),
            ("traumberuf", "Traumberuf & Berufswahl", [("range", "L3M", [(0, 36)])]),
            ("arbeitswelt", "Arbeitswelt im Wandel", [("range", "L3M", [(37, 72)])]),
            ("arbeitsorte", "Arbeitsorte & Bewerbung", [("range", "L3M", [(73, 98)])]),
            ("taetigkeiten", "Tätigkeiten & Berufe", [("range", "L3M", [(99, 144)])]),
            ("aufgaben", "Aufgaben im Job", [("range", "L3M", [(145, 179)])]),
            ("nomen", "Berufe & Nomen aus Verben", [("range", "L3M", [(180, 209)])]),
            ("zufrieden", "Zufrieden im Job?", [("range", "L3M", [(210, 262)])]),
            ("duzen", "Duzen oder Siezen?", [("range", "L3M", [(263, 297)])]),
            ("hoeflich", "Telefonieren & Höflichkeit", [("range", "L3M", [(298, 341)])]),
        ],
        "grammar": [("tags", "L13", L13_GRAMMAR["L3"]), ("all", "L3M")],
        "sentences": [("tag", "L13", "L3"), ("all", "L3M")],
    },
    {
        "lektion": "L4",
        "title": "Lektion 4 · Wetter & Mode",
        "units": [
            ("wetter-1", "Wetter: Sonne, Regen, Gewitter", [("range", "L4M1", [(0, 34)])]),
            ("wetter-2", "Wetter: Schnee, Wind, Temperatur", [("range", "L4M1", [(35, 80)])]),
            ("wetter-reden", "Über das Wetter reden", [("range", "L4M1", [(81, 116)])]),
            ("klima", "Klima, Jahreszeiten & Smalltalk", [("range", "L4M1", [(117, 149)])]),
            ("kleidung", "Kleidungsstücke", [("range", "L4M1", [(150, 196)])]),
            ("kleidung-beschreiben", "Kleidung beschreiben & anziehen", [("range", "L4M1", [(197, 226)])]),
            ("material", "Material, Muster & Accessoires", [("range", "L4M2", [(0, 42)])]),
            ("diebstahl", "Personen beschreiben", [("range", "L4M2", [(43, 79)])]),
            ("bild", "Bildbeschreibung & Eindrücke", [("range", "L4M2", [(80, 106)])]),
            ("shoppen", "Shoppen & Geschäfte", [("range", "L4M3", [(0, 46)])]),
            ("kaufhaus", "Im Kaufhaus", [("range", "L4M3", [(47, 100)])]),
            ("secondhand", "Secondhand & Verkaufen", [("range", "L4M3", [(101, 141)])]),
            ("aussehen", "Aussehen", [("range", "L4M4", [(0, 22)])]),
            ("charakter", "Charakter & Gefühle", [("range", "L4M4", [(23, 62)])]),
            ("schoenheit", "Schönheit & Schönheits-OP", [("range", "L4M4", [(63, 100)])]),
            ("eindruck", "Eindruck & Vergleiche", [("range", "L4M4", [(101, 137)])]),
        ],
        "grammar": [("all", "L4M1"), ("all", "L4M2"), ("all", "L4M3"), ("all", "L4M4")],
        "sentences": [("all", "L4M1"), ("all", "L4M2"), ("all", "L4M3"), ("all", "L4M4")],
    },
]
