import json
import sys

import numpy as np
from rapidfuzz import fuzz, process

from common import FILLER, load_segs, load_songs, norm

sys.stdout.reconfigure(encoding="utf-8")

WORKDIR, LANG = sys.argv[1:3]
MIN_SCORE = float(sys.argv[3]) if len(sys.argv) > 3 else 72
WINDOW = 3          # transcript segments glued together per comparison
MAX_GAP = 75        # seconds between hits that still belong to the same performance
MIN_HITS = 2


def is_hallucination(seg: dict) -> bool:
    # Silent waits come back as confident-sounding filler or one phrase repeated many times.
    if FILLER.search(seg["text"].lower()):
        return True
    silent = seg["no_speech"] > 0.6 and seg["logprob"] < -0.8
    return silent or seg["compression"] > 2.4 or seg["logprob"] < -1.2


songs = load_songs(WORKDIR)
lines, owners = [], []
for song in songs:
    for raw in song["text"].split("\n"):
        n = norm(raw)
        # Very short lines ("Алілуя", "Амэн") match everything sung or spoken at Mass.
        if len(n) >= 18:
            lines.append(n)
            owners.append(song)

segs = load_segs(WORKDIR, LANG)
total = len(segs)
segs = [s for s in segs if not is_hallucination(s)]
print(f"{LANG}: segments kept: {len(segs)} of {total}")

queries = [norm(" ".join(s["text"] for s in segs[i:i + WINDOW])) for i in range(len(segs))]
scores = process.cdist(queries, lines, scorer=fuzz.partial_ratio, workers=-1, score_cutoff=MIN_SCORE)
hits = []
for i in range(len(segs)):
    j = int(np.argmax(scores[i]))
    if scores[i][j] >= MIN_SCORE and len(queries[i]) >= 15:
        # Keep every song that ties for the best line, so near-identical songs all surface as candidates.
        best = scores[i][j]
        alts = {owners[k]["id"]: owners[k] for k in np.flatnonzero(scores[i] >= best - 3)}
        hits.append((segs[i]["start"], segs[min(i + WINDOW, len(segs)) - 1]["end"], owners[j], float(best), j, alts))

performances = []
for start, end, song, score, line, alts in hits:
    cur = performances[-1] if performances else None
    if cur and cur["song"]["id"] == song["id"] and start - cur["end"] <= MAX_GAP:
        cur["end"] = max(cur["end"], end)
        cur["hits"] += 1
        cur["lines"].add(line)
        cur["score"] = max(cur["score"], score)
        cur["alts"].update(alts)
    else:
        performances.append({"song": song, "start": start, "end": end, "hits": 1, "lines": {line}, "score": score, "alts": dict(alts)})

result = []
for p in performances:
    if p["hits"] < MIN_HITS or len(p["lines"]) < 2:
        continue
    result.append({
        "id": p["song"]["id"], "title": p["song"]["title"],
        "start": max(0, int(p["start"]) - 5), "end": int(p["end"]) + 5,
        "hits": p["hits"], "lines": len(p["lines"]), "score": round(p["score"]),
        "alternatives": [k for k in p["alts"] if k != p["song"]["id"]],
    })

# A stray hit of another song mid-verse splits one performance in two; glue the halves back together.
merged = []
for r in result:
    prev = merged[-1] if merged else None
    if prev and prev["id"] == r["id"] and r["start"] <= prev["end"] + MAX_GAP:
        prev["end"] = max(prev["end"], r["end"])
        prev["hits"] += r["hits"]
        prev["lines"] = max(prev["lines"], r["lines"])
        prev["score"] = max(prev["score"], r["score"])
        prev["alternatives"] += [a for a in r["alternatives"] if a not in prev["alternatives"]]
    else:
        merged.append(r)

json.dump(merged, open(f"{WORKDIR}/matches-{LANG}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{LANG}: performances: {len(merged)}")
