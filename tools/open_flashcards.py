#!/usr/bin/env python3
"""Open a local CSV in the flashcard pages (learn.html → learn-google / learn-chinese-tts).

    openflashcards                      # every card file in this folder, in a dropdown
    openflashcards ~/study/spanish      # ... in that folder
    openflashcards words.csv            # open that file (dropdown lists its folder)
    openflashcards words.csv --vocab    # Vocabulary Drill: click = known, right-click = speak
    openflashcards words.csv --tts      # TTS reader

One detached server on 127.0.0.1:PORT serves this repo's pages and card files
under your home folder; later runs reuse it. The port is fixed because the pages
keep known marks in localStorage, which is per origin. The server exits after
IDLE_SECONDS with no requests.
"""

import argparse
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import socket
import subprocess
import sys
import threading
import time
from urllib.parse import parse_qs, quote, unquote, urlsplit

REPO = Path(__file__).resolve().parent.parent
CARD_TYPES = {'.csv': 'text/csv', '.tsv': 'text/tab-separated-values', '.txt': 'text/plain'}
PAGE_TYPES = {'.html', '.js', '.css', '.json', '.png', '.jpg', '.svg', '.ico', '.mp3', '.woff', '.woff2'}
IDLE_SECONDS = 3 * 60 * 60
LIST_LIMIT = 2000
SKIP_DIRS = {'node_modules', '__pycache__'}
PORT = int(os.environ.get('OPENFLASHCARDS_PORT', '8765'))
SIGNATURE = b'openflashcards'


def list_cards(home, relative):
    """Card files under ~/relative (recursive), as paths relative to that folder."""
    if any(p.startswith('.') or p == '..' for p in Path(relative).parts):
        raise PermissionError
    root = (home / relative).resolve()
    if not root.is_relative_to(home) or not root.is_dir():
        raise FileNotFoundError
    files = []
    for directory, subdirs, names in os.walk(root):
        subdirs[:] = sorted(d for d in subdirs if not d.startswith('.') and d not in SKIP_DIRS)
        for name in sorted(names):
            if not name.startswith('.') and Path(name).suffix.lower() in CARD_TYPES:
                files.append((Path(directory) / name).relative_to(root).as_posix())
                if len(files) >= LIST_LIMIT:
                    return files, True
    return files, False


def safe_child(root, relative, allowed):
    """Resolve relative under root; refuse dotfiles, traversal, symlinks out, and other types."""
    parts = Path(relative).parts
    if not parts or any(p.startswith('.') or p == '..' for p in parts):
        return None
    path = (root / relative).resolve()
    if not path.is_relative_to(root) or not path.is_file() or path.suffix.lower() not in allowed:
        return None
    return path


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_GET(self):
        self.server.last_request = time.monotonic()
        host = self.headers.get('Host', '')
        if host not in (f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'):
            return self.send_error(403)
        route = unquote(urlsplit(self.path).path)
        if route == '/_ping':
            self.send_response(200)
            self.send_header('Content-Length', str(len(SIGNATURE)))
            self.end_headers()
            return self.wfile.write(SIGNATURE)
        if route == '/_list':
            try:
                files, truncated = list_cards(Path.home().resolve(), parse_qs(urlsplit(self.path).query).get('dir', [''])[0])
                data, status = {'files': files, 'truncated': truncated}, 200
            except (PermissionError, FileNotFoundError):
                data, status = {'error': 'folder not found'}, 404
            body = json.dumps(data).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            return self.wfile.write(body)
        if route.startswith('/_local/'):
            path = safe_child(Path.home().resolve(), route[len('/_local/'):], CARD_TYPES)
            mime = CARD_TYPES.get(path.suffix.lower()) if path else None
        else:
            relative = route.lstrip('/') or 'learn.html'
            path = None if relative.startswith('api/') else safe_child(REPO, relative, PAGE_TYPES)
            mime = None
        if not path:
            return self.send_error(404)
        body = path.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', (mime + '; charset=utf-8') if mime else (self.guess_type(str(path))))
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_HEAD(self):
        self.send_error(405)


def serve(port):
    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    server.last_request = time.monotonic()

    def watchdog():
        while time.monotonic() - server.last_request < IDLE_SECONDS:
            time.sleep(60)
        server.shutdown()
    threading.Thread(target=watchdog, daemon=True).start()
    server.serve_forever(poll_interval=0.5)


def ping(port):
    try:
        with socket.create_connection(('127.0.0.1', port), timeout=0.3) as s:
            s.sendall(f'GET /_ping HTTP/1.0\r\nHost: 127.0.0.1:{port}\r\n\r\n'.encode())
            return 'up' if s.recv(4096).rstrip().endswith(SIGNATURE) else 'other'
    except OSError:
        return 'down'


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('file', type=Path, nargs='?', default=Path('.'), help='a .csv/.tsv/.txt of cards, or a folder of them (default: current folder)')
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--vocab', action='store_true', help='open in Vocabulary Drill (learn-google)')
    mode.add_argument('--tts', action='store_true', help='open in the TTS reader (learn-chinese-tts)')
    parser.add_argument('--no-open', action='store_true', help='print the URL only')
    parser.add_argument('--_serve', action='store_true', help=argparse.SUPPRESS)
    args = parser.parse_args()

    if args._serve:
        return serve(PORT)
    file = args.file.expanduser().resolve()
    if not file.exists():
        parser.error(f'not found: {file}')
    if file.is_file() and file.suffix.lower() not in CARD_TYPES:
        parser.error(f'expected .csv, .tsv or .txt, got {file.suffix or "no extension"}')
    home = Path.home().resolve()
    if not file.is_relative_to(home) or any(p.startswith('.') for p in file.relative_to(home).parts):
        parser.error('it must be under your home folder and not hidden')
    folder = file if file.is_dir() else file.parent

    state = ping(PORT)
    if state == 'other':
        raise SystemExit(f'Port {PORT} is used by another program; set OPENFLASHCARDS_PORT to a free port.')
    if state == 'down':
        log = Path.home() / '.cache' / 'openflashcards.log'
        log.parent.mkdir(parents=True, exist_ok=True)
        with log.open('ab') as out:
            subprocess.Popen([sys.executable, str(Path(__file__).resolve()), '-', '--_serve'],
                             stdin=subprocess.DEVNULL, stdout=out, stderr=out, start_new_session=True, close_fds=True)
        for _ in range(100):
            if ping(PORT) == 'up':
                break
            time.sleep(0.05)
        else:
            raise SystemExit(f'Server did not start; see {log}')

    rel_dir = folder.relative_to(home).as_posix()
    query = 'dir=' + quote('' if rel_dir == '.' else rel_dir)
    if file.is_file():
        query += '&csv=' + quote('/_local/' + file.relative_to(home).as_posix()) + '&name=' + quote(file.name)
    if args.vocab or args.tts:
        query = 'mode=' + ('tts' if args.tts else 'vocab') + '&' + query
    url = f'http://127.0.0.1:{PORT}/learn.html?{query}'
    print(url)
    if not args.no_open:
        if sys.platform == 'darwin':
            if subprocess.run(['open', '-a', 'Google Chrome', url], capture_output=True).returncode:
                subprocess.run(['open', url])
        else:
            import webbrowser
            webbrowser.open(url)


if __name__ == '__main__':
    main()
