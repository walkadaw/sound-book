import ctypes
import glob
import json
import os
import sys
import time
import wave

import numpy as np

# CTranslate2 on Windows looks for cuBLAS/cuDNN DLLs on PATH, so expose the pip-installed ones.
site = os.path.join(sys.prefix, "Lib", "site-packages", "nvidia")
for sub in ("cublas", "cudnn"):
    bin_dir = os.path.join(site, sub, "bin")
    if os.path.isdir(bin_dir):
        os.add_dll_directory(bin_dir)
        os.environ["PATH"] = bin_dir + os.pathsep + os.environ["PATH"]

from faster_whisper import WhisperModel

# Windows puts an idle laptop to sleep after a few minutes even under GPU load; hold it awake (the screen may
# still lock and turn off) for as long as this process runs. Closing the lid still sleeps it.
ES_CONTINUOUS, ES_SYSTEM_REQUIRED = 0x80000000, 0x00000001
ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)

CHUNK_SECONDS = 1800
MODEL = sys.argv[1]
LANGS = sys.argv[2].split(",")
WORKDIR = sys.argv[3]

model = WhisperModel(MODEL, device="cuda", compute_type="float16")
for lang in LANGS:
    os.makedirs(f"{WORKDIR}/out/{lang}", exist_ok=True)

for lang, path in [(lang, path) for lang in LANGS for path in sorted(glob.glob(f"{WORKDIR}/chunks/c*.wav"))]:
    idx = int(os.path.basename(path)[1:3])
    out_path = f"{WORKDIR}/out/{lang}/c{idx:02d}.jsonl"
    if os.path.exists(out_path):
        continue
    t0 = time.time()
    # Decode the 16 kHz mono PCM chunk ourselves: faster-whisper 1.2.1 passes an argument PyAV 19 no longer accepts.
    with wave.open(path) as w:
        audio = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    # Sequential decoding without VAD: the batched VAD pipeline dropped most of the sung parts over music.
    # Not conditioning on previous text keeps one misheard verse from looping through the rest of the chunk.
    segments, _ = model.transcribe(audio, language=lang, beam_size=5, vad_filter=False, condition_on_previous_text=False)
    offset = idx * CHUNK_SECONDS
    rows = [
        # Without VAD, Whisper invents text over silent waits; these scores let the matcher drop such segments.
        {
            "start": round(s.start + offset, 2), "end": round(s.end + offset, 2), "text": s.text.strip(),
            "no_speech": round(s.no_speech_prob, 3), "logprob": round(s.avg_logprob, 3),
            "compression": round(s.compression_ratio, 2),
        }
        for s in segments
    ]
    with open(out_path + ".tmp", "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    os.replace(out_path + ".tmp", out_path)
    print(f"{lang} c{idx:02d}: {len(rows)} segments in {time.time() - t0:.0f}s", flush=True)
