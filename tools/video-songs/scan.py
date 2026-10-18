import json
import sys

import numpy as np
from rapidfuzz import fuzz, process

from common import FILLER, load_segs, load_songs, norm

sys.stdout.reconfigure(encoding="utf-8")
WORKDIR, LANG = sys.argv[1:3]
WIN, STEP, MIN_LINES, LINE_SCORE = 120, 30, 4, 70


songs = load_songs(WORKDIR)
lines, owner = [], []
for s in songs:
    for n in dict.fromkeys(norm(l) for l in s["text"].split("\n")):
        if len(n) >= 12:
            lines.append(n)
            owner.append(s["id"])
owner = np.array(owner)
titles = {s["id"]: s["title"] for s in songs}

segs = [s for s in load_segs(WORKDIR, LANG) if not FILLER.search(s["text"].lower())]
texts = [norm(s["text"]) for s in segs]
uniq = list(dict.fromkeys(t for t in texts if len(t) >= 8))
idx = {t: i for i, t in enumerate(uniq)}
sc = process.cdist(uniq, lines, scorer=fuzz.partial_ratio, workers=-1, score_cutoff=LINE_SCORE)
starts = np.array([s["start"] for s in segs])

found = []
end_time = int(starts.max()) if len(starts) else 0
for t in range(0, end_time, STEP):
    rows = sorted({idx[texts[i]] for i in np.flatnonzero((starts >= t) & (starts < t + WIN)) if texts[i] in idx})
    if not rows:
        continue
    hit_lines = np.flatnonzero(sc[rows].max(axis=0) >= LINE_SCORE)
    ids, counts = np.unique(owner[hit_lines], return_counts=True)
    if not len(ids):
        continue
    order = np.argsort(-counts)
    top, n1 = ids[order[0]], counts[order[0]]
    n2 = counts[order[1]] if len(order) > 1 else 0
    # Songs sharing Marian phrases tie on line counts; keep the leader and list close rivals instead of dropping both.
    rivals = [str(ids[k]) for k in order[1:] if counts[k] >= MIN_LINES and counts[k] >= 0.7 * n1]
    if n1 >= MIN_LINES and (n1 >= 2 * n2 or rivals):
        # Pin the span to the segments that actually matched this song, not the whole window.
        song_lines = hit_lines[owner[hit_lines] == top]
        matched = [i for i in np.flatnonzero((starts >= t) & (starts < t + WIN))
                   if texts[i] in idx and sc[idx[texts[i]], song_lines].max() >= LINE_SCORE]
        s0, s1 = segs[matched[0]]["start"], segs[matched[-1]]["end"]
        # One long invented segment can brush against many lines at once; real singing spans several segments.
        if len(matched) < 2 or s1 - s0 < 10:
            continue
        if found and found[-1]["id"] == top and s0 <= found[-1]["end"] + 75:
            found[-1]["end"] = max(found[-1]["end"], s1)
            found[-1]["lines"] = max(found[-1]["lines"], int(n1))
            found[-1]["rivals"] += [r for r in rivals if r not in found[-1]["rivals"]]
        else:
            found.append({"id": str(top), "title": titles[str(top)], "start": s0, "end": s1, "lines": int(n1), "rivals": rivals})

json.dump(found, open(f"{WORKDIR}/scan-{LANG}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{LANG}: second pass: {len(found)} windows")
