import glob
import json
import re

# Whisper's stock filler over silence and over the waits between songs, in both transcript languages.
FILLER = re.compile(r"субтитр|симон|редактор|дзякуй за прагляд|спасибо за просмотр|продолжение следует")


def norm(s):
    s = s.lower().replace("ё", "е").replace("ў", "у").replace("і", "и").replace("'", "").replace("’", "")
    s = re.sub(r"прыпеу:?|приспев:?|\d+\.", " ", s)
    s = re.sub(r"[^\w\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def load_songs(workdir):
    songs = json.load(open(f"{workdir}/songs.json", encoding="utf-8"))["songs"]
    for s in songs:
        s["id"] = str(s["id"])
    return songs


def load_segs(workdir, lang):
    segs = []
    for path in sorted(glob.glob(f"{workdir}/out/{lang}/c*.jsonl")):
        segs += [json.loads(l) for l in open(path, encoding="utf-8")]
    return segs
