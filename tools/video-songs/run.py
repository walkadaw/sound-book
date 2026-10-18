"""Find songbook songs in a YouTube recording and review them in the browser, down to the SQL that stores them.

    python tools/video-songs/run.py "<YouTube link>" [--cookies cookies.txt | --browser firefox | --audio recording.mp3]

Any Python 3 starts it: the first run builds venv/ with uv and every run then continues inside it.
Everything for a video lives in work/<video id>/. Finished steps (download, transcript) are skipped on the next run,
so running the same link again reopens its review page with the marks made so far.
"""
import argparse
import glob
import gzip
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request
import webbrowser

from server import make_server

HERE = os.path.dirname(os.path.abspath(__file__))
VENV = os.path.join(HERE, "venv")
VENV_PYTHON = os.path.join(VENV, "Scripts", "python.exe")
SONGS_URL = "https://holysongs.ru/api/song/get"
CHUNK_SECONDS = 1800  # transcribe.py derives each chunk's offset from this


def say(text):
    print(f"\n== {text}", flush=True)


def run(*cmd):
    if subprocess.run([str(c) for c in cmd], env={**os.environ, "PYTHONUNBUFFERED": "1"}).returncode != 0:
        sys.exit(f"Шаг не удался: {' '.join(map(str, cmd[:3]))} …")


def enter_venv():
    if os.path.normcase(os.path.abspath(sys.prefix)) == os.path.normcase(VENV):
        return
    if not os.path.exists(VENV_PYTHON):
        if not shutil.which("uv"):
            sys.exit("Нужен uv: winget install astral-sh.uv")
        print("Готовлю окружение Python, это один раз…", flush=True)
        subprocess.run(["uv", "venv", "-q", "--python", "3.12", VENV], check=True)
        subprocess.run(["uv", "pip", "install", "-q", "--python", VENV_PYTHON, "-r", os.path.join(HERE, "requirements.txt")], check=True)
    # Arguments go over as a list, never through cmd.exe, which would split a link at its "&".
    try:
        code = subprocess.run([VENV_PYTHON, os.path.abspath(__file__), *sys.argv[1:]]).returncode
    except KeyboardInterrupt:
        code = 130
    sys.exit(code)


def video_id(link):
    link = link.strip()
    if re.fullmatch(r"[\w-]{11}", link):
        return link
    url = urllib.parse.urlparse(link)
    host = url.hostname or ""
    if host.endswith("youtu.be"):
        found = url.path.strip("/").split("/")[0]
    else:
        found = (urllib.parse.parse_qs(url.query).get("v") or [""])[0]
        if not found:
            m = re.search(r"/(?:shorts|live|embed)/([\w-]{11})", url.path)
            found = m.group(1) if m else ""
    if not re.fullmatch(r"[\w-]{11}", found):
        sys.exit(f"Не похоже на ссылку на видео YouTube: {link}")
    return found


def label_of(video, work):
    # The label is part of every clip id the marks are stored under, so it is fixed on the first run.
    path = f"{work}/meta.json"
    if os.path.exists(path):
        return json.load(open(path, encoding="utf-8"))["label"]
    try:
        url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video}&format=json"
        with urllib.request.urlopen(url, timeout=15) as r:
            label = json.load(r)["title"]
    except (OSError, ValueError, KeyError):
        label = video
    json.dump({"label": label}, open(path, "w", encoding="utf-8"), ensure_ascii=False)
    return label


def audio_file(video, work, args):
    if args.audio:
        if not os.path.isfile(args.audio):
            sys.exit(f"Нет такого файла: {args.audio}")
        return args.audio
    done = [p for p in glob.glob(f"{work}/audio.*") if not p.endswith((".part", ".ytdl"))]
    if done:
        return done[0]
    say("Скачиваю звук с YouTube")
    # YouTube changes often and an older yt-dlp stops working, so it is refreshed before each download.
    if shutil.which("uv"):
        subprocess.run(["uv", "pip", "install", "-q", "-U", "--python", sys.executable, "yt-dlp"])
    cmd = [sys.executable, "-m", "yt_dlp", "-f", "bestaudio/best", "--no-playlist", "--js-runtimes", "node",
           "-o", f"{work}/audio.%(ext)s"]
    if args.cookies:
        cmd += ["--cookies", args.cookies]
    if args.browser:
        cmd += ["--cookies-from-browser", args.browser]
    if subprocess.run(cmd + [f"https://www.youtube.com/watch?v={video}"]).returncode != 0:
        sys.exit("\nНе удалось скачать звук. Если YouTube просит войти, передайте cookies (--cookies cookies.txt"
                 " или --browser firefox) или скачайте звук сами и передайте его через --audio файл.mp3")
    return [p for p in glob.glob(f"{work}/audio.*") if not p.endswith((".part", ".ytdl"))][0]


def split(audio, work):
    chunks = f"{work}/chunks"
    if glob.glob(f"{chunks}/c*.wav"):
        return
    say("Готовлю звук к распознаванию")
    tmp = chunks + ".tmp"
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(tmp)
    # 16 kHz mono for Whisper; the filters lift quiet singing over crowd and wind noise.
    run("ffmpeg", "-v", "error", "-i", audio, "-af", "highpass=f=80,dynaudnorm=f=250:g=15:m=30", "-ac", "1", "-ar", "16000",
        "-c:a", "pcm_s16le", "-f", "segment", "-segment_time", CHUNK_SECONDS, f"{tmp}/c%02d.wav")
    os.replace(tmp, chunks)


def fetch_songs(work):
    say("Беру список песен из песенника")
    try:
        with urllib.request.urlopen(SONGS_URL, timeout=30) as r:
            body = r.read()
        # The API gzips its body whether or not the client asked for it.
        if body[:2] == b"\x1f\x8b":
            body = gzip.decompress(body)
        json.loads(body)["songs"]
        open(f"{work}/songs.json", "wb").write(body)
    except (OSError, ValueError, KeyError) as e:
        if not os.path.exists(f"{work}/songs.json"):
            sys.exit(f"Не удалось получить песни с {SONGS_URL}: {e}")
        print(f"Не удалось обновить песни ({e}), беру сохранённый список")


def render(site):
    template = open(f"{HERE}/review.html", encoding="utf-8").read()
    data = open(f"{site}/data.json", encoding="utf-8").read().replace("</", "<\\/")
    open(f"{site}/index.html", "w", encoding="utf-8").write(template.replace("__DATA__", data))


def serve(site, port, open_browser):
    for p in range(port, port + 20):
        try:
            server = make_server(site, p)
        except OSError:
            continue
        # YouTube refuses to embed into a page opened by IP address (error 150 "Video unavailable"), so it is localhost.
        url = f"http://localhost:{p}/"
        say(f"Страница проверки: {url}  (Ctrl+C — остановить)")
        if open_browser:
            webbrowser.open(url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        return
    sys.exit(f"Порты {port}–{port + 19} заняты")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    enter_venv()
    ap = argparse.ArgumentParser(description="Найти песни из песенника в видео YouTube и проверить их на странице.")
    ap.add_argument("link", help="ссылка на видео YouTube или его id")
    ap.add_argument("--audio", help="свой файл со звуком этого видео вместо скачивания")
    ap.add_argument("--cookies", help="cookies.txt аккаунта YouTube, если YouTube просит войти")
    ap.add_argument("--browser", help="взять cookies из браузера: firefox, chrome, edge…")
    ap.add_argument("--model", default="large-v3", help="модель Whisper (по умолчанию large-v3)")
    ap.add_argument("--lang", default="be,ru", help="языки пения через запятую (по умолчанию be,ru); каждый язык — отдельное распознавание")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--no-open", action="store_true", help="не открывать браузер")
    args = ap.parse_args()
    langs = [l.strip() for l in args.lang.split(",") if l.strip()]
    if not langs or any(l not in ("be", "ru") for l in langs):
        sys.exit(f"--lang: ожидаются be, ru или be,ru, а не «{args.lang}»")

    video = video_id(args.link)
    work = os.path.join(HERE, "work", video)
    site = os.path.join(work, "site")
    os.makedirs(site, exist_ok=True)
    label = label_of(video, work)
    print(f"Видео: {label} ({video})")

    split(audio_file(video, work, args), work)
    say("Распознаю текст (на GPU это несколько минут на час записи)")
    run(sys.executable, f"{HERE}/transcribe.py", args.model, ",".join(langs), work)
    fetch_songs(work)
    say("Ищу песни в распознанном тексте")
    for lang in langs:
        run(sys.executable, f"{HERE}/match.py", work, lang)
        run(sys.executable, f"{HERE}/scan.py", work, lang)
    run(sys.executable, f"{HERE}/build.py", work, video, label, f"{site}/data.json", ",".join(langs))
    render(site)
    serve(site, args.port, not args.no_open)


if __name__ == "__main__":
    main()
