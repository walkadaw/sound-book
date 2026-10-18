import gzip
import json
import os
import sys
import urllib.parse
import urllib.request
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

MEDIA_URL = "https://holysongs.ru/api/song/media?id="


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, root, **kwargs):
        self.store = os.path.join(root, "verdicts.json")
        super().__init__(*args, directory=root, **kwargs)

    def end_headers(self):
        # The YouTube embed refuses to play (error 153) without a referrer naming the hosting page.
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        super().end_headers()

    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path.startswith("/media?"):
            return self.media()
        if self.path != "/verdicts":
            return super().do_GET()
        body = open(self.store, "rb").read() if os.path.exists(self.store) else b"{}"
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

    def media(self):
        # The site's API sends no CORS headers, so the page asks for a song's recordings through this server.
        song = (urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get("id") or [""])[0]
        if not song.isdigit():
            return self.send_error(400)
        try:
            with urllib.request.urlopen(MEDIA_URL + song, timeout=15) as r:
                body = r.read()
            # The API gzips its body whether or not the client asked for it.
            if body[:2] == b"\x1f\x8b":
                body = gzip.decompress(body)
        except OSError:
            return self.send_error(502)
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/verdicts":
            return self.send_error(404)
        data = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        with open(self.store + ".tmp", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        os.replace(self.store + ".tmp", self.store)
        self.send_response(204)
        self.end_headers()


class Server(ThreadingHTTPServer):
    # On Windows SO_REUSEADDR lets a second server bind a port another run still listens on, and the browser
    # then keeps reaching the old one; without it the bind fails and run.py moves on to the next port.
    allow_reuse_address = os.name != "nt"


def make_server(root, port):
    return Server(("127.0.0.1", port), partial(Handler, root=root))


if __name__ == "__main__":
    make_server(os.path.abspath(sys.argv[1]), int(sys.argv[2]) if len(sys.argv) > 2 else 8765).serve_forever()
