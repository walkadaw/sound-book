import json
import sys
import urllib.request

import numpy as np
from rapidfuzz import fuzz, process

from common import FILLER, load_segs, load_songs, norm

sys.stdout.reconfigure(encoding="utf-8")
WORKDIR, VIDEO, LABEL, OUT = sys.argv[1:5]
LANGS = sys.argv[5].split(",")

songs = load_songs(WORKDIR)
titles = {s["id"]: s["title"] for s in songs}
lyrics = {s["id"]: s["text"] for s in songs}
# Whisper's stock filler over silence ("Субтитры …") is noise in the side-by-side reading.
segs = {lang: [s for s in load_segs(WORKDIR, lang) if not FILLER.search(s["text"].lower())] for lang in LANGS}


def near(a, b):
    return a["id"] == b["id"] and a["start"] - 60 <= b["end"] and b["start"] <= a["end"] + 60


# Every transcript hears the whole recording, so a song found in several of them stays with the language listed first.
first = []
for lang in LANGS:
    for m in json.load(open(f"{WORKDIR}/matches-{lang}.json", encoding="utf-8")):
        same = next((f for f in first if near(f, m)), None)
        if not same:
            first.append(dict(m, lang=lang))
        # The kept clip's id carries the reviewer's marks, but it is read from the transcript that heard the song better.
        elif (m["score"], m["lines"]) > (same["score"], same["lines"]):
            same["lang"] = lang
clips = []
for m in first:
    conf = "high" if m["score"] >= 90 and m["lines"] >= 3 else "mid" if m["score"] >= 82 else "low"
    clips.append({"start": m["start"], "end": m["end"], "song": m["id"], "conf": conf, "pass": 1, "alts": m["alternatives"],
                  "lang": m["lang"]})
scan = [dict(f, lang=lang) for lang in LANGS for f in json.load(open(f"{WORKDIR}/scan-{lang}.json", encoding="utf-8"))]
kept = []
for f in scan:
    # Skip what the line-by-line pass, or the second pass over another transcript, already found around the same time.
    if any(near(m, f) for m in first + kept):
        continue
    # A second-pass hit nested inside another second-pass hit it lists as a rival is the same performance.
    if any(g is not f and f["id"] in g["rivals"] and g["start"] <= f["start"] and f["end"] <= g["end"] for g in scan):
        continue
    kept.append(f)
    clips.append({"start": max(0, int(f["start"]) - 5), "end": int(f["end"]) + 5, "song": f["id"],
                  "conf": "mid" if f["lines"] >= 6 else "low", "pass": 2, "alts": f["rivals"], "lang": f["lang"]})


# Stretches no song accounts for: songs missing from the songbook, or speech, which the reviewer dismisses.
song_lines = {sid: [n for n in dict.fromkeys(norm(l) for l in text.split("\n")) if len(n) >= 12] for sid, text in lyrics.items()}
all_lines = [(sid, n) for sid, ns in song_lines.items() for n in ns]
heard = {lang: [s for s in segs[lang] if s["no_speech"] <= 0.6 or s["logprob"] >= -0.8] for lang in LANGS}
seg_scores = {lang: process.cdist([norm(s["text"]) for s in heard[lang]], [n for _, n in all_lines], scorer=fuzz.partial_ratio,
                                  workers=-1) for lang in LANGS}
line_owner = np.array([sid for sid, _ in all_lines])


spans = []
for c in clips:
    cols = line_owner == c["song"]
    h, sc = heard[c["lang"]], seg_scores[c["lang"]]
    # Short lines ("Марыя", "Амэн") brush against half the songbook, so they never place a song.
    hits = [h[i]["start"] for i in range(len(h)) if c["start"] <= h[i]["start"] <= c["end"]
            and len(norm(h[i]["text"])) >= 12 and sc[i][cols].max() >= 70]
    # A lone hit is chance; the performance runs from the first to the last hit that has a neighbour.
    hits = [t for t in hits if any(t != u and abs(t - u) <= 15 for u in hits)]
    if hits:
        spans.append((hits[0], hits[-1]))

# The stretches are cut from the first transcript; any of them times the gaps between songs equally well.
base = heard[LANGS[0]]
# Whatever lies between a song's first and last sung lines belongs to that song, however badly it was heard.
inside = [any(a <= s["start"] <= b for a, b in spans) for s in base]


def rows_in(lang, run):
    first, last = base[run[0]]["start"], base[run[-1]]["start"]
    return [i for i, s in enumerate(heard[lang]) if first <= s["start"] <= last]


def confidence(lang, run):
    probs = [heard[lang][i]["logprob"] for i in rows_in(lang, run)]
    return sum(probs) / len(probs) if probs else -np.inf


runs = []
for i in range(len(base)):
    if inside[i]:
        continue
    if runs and base[i]["start"] - base[runs[-1][-1]]["end"] <= 30 and not any(inside[runs[-1][-1]:i]):
        runs[-1].append(i)
    else:
        runs.append([i])
for run in runs:
    start, end = int(base[run[0]]["start"]), int(base[run[-1]]["end"]) + 1
    if end - start < 15 or len(run) < 3:
        continue
    # Whisper forced into the wrong language is less sure of itself, so the more confident transcript is the one sung.
    lang = max(LANGS, key=lambda l: confidence(l, run))
    # The songs whose lines come closest, offered as starting points for matching by hand.
    near_lines = np.flatnonzero(seg_scores[lang][rows_in(lang, run)].max(axis=0) >= 60)
    ids, counts = np.unique(line_owner[near_lines], return_counts=True)
    alts = [str(ids[k]) for k in np.argsort(-counts)[:3]]
    clips.append({"start": start, "end": end, "song": None, "conf": "none", "pass": 0, "alts": alts, "lang": lang})

for c in clips:
    c["id"] = f"{LABEL}-{c['start']}-{c['song'] or 'none'}"
    c["year"] = LABEL
    c["video"] = VIDEO
    c["title"] = titles[c["song"]] if c["song"] else ""
clips.sort(key=lambda c: c["start"])
# The whole transcript goes to the page once; each clip shows it in its own language, scrolled to the clip's bounds.
transcripts = {lang: [[round(s["start"]), s["text"]] for s in segs[lang] if s["text"]] for lang in LANGS}


def video_meta(video):
    # The media rows carry the video's own title and channel, as the admin form fills them from oEmbed.
    url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video}&format=json"
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            d = json.load(r)
        return {"title": d.get("title") or LABEL, "author": d.get("author_name")}
    except (OSError, ValueError):
        return {"title": LABEL, "author": None}


json.dump({"clips": clips, "titles": titles, "lyrics": lyrics, "transcripts": transcripts, "videos": {LABEL: VIDEO},
           "meta": {VIDEO: video_meta(VIDEO)}}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
print(len(clips), "clips;", sum(c["pass"] == 1 for c in clips), "first pass;", len({c["song"] for c in clips if c["song"]}), "songs;",
      sum(not c["song"] for c in clips), "unmatched")
