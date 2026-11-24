#!/usr/bin/env python3
"""Open the mock-interview page for a job_search folder.

    open_interview.py                              # current folder
    open_interview.py ~/Documents/job_search       # that folder

One detached server on 127.0.0.1:PORT serves this repo's pages and reads
interview data files under your home folder. The port is fixed so the page's
localStorage stays stable; the server exits after IDLE_SECONDS with no requests.
"""

import argparse
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import threading
import time
import zipfile
from urllib.parse import parse_qs, quote, unquote, urlsplit
import xml.etree.ElementTree as ET

REPO = Path(__file__).resolve().parent.parent
PAGE_TYPES = {'.html', '.js', '.css', '.json', '.png', '.jpg', '.svg', '.ico', '.woff', '.woff2'}
TEXT_TYPES = {'.txt', '.md', '.json', '.csv'}
IDLE_SECONDS = 3 * 60 * 60
SKIP_DIRS = {'node_modules', '__pycache__', '.git'}
PORT = int(os.environ.get('OPENINTERVIEW_PORT', '8766'))
SIGNATURE = b'openinterview'


def default_root():
    """Home, or on WSL with this repo on the Windows side, the Windows user folder."""
    parts = REPO.parts
    if len(parts) > 4 and parts[1] == 'mnt' and len(parts[2]) == 1 and parts[3] == 'Users':
        return Path(*parts[:5])
    return Path.home()


ROOT = Path(os.environ.get('OPENINTERVIEW_ROOT') or default_root()).expanduser().resolve()

# Which subfolders map to which data categories in interview-chat.html.
DATA_FOLDERS = {
    'resumes': ['resume_versions'],
    'jobs': ['applications_listings'],
    'questions': ['interview-prep_behavioral', 'interview-prep_questions', 'interview-prep_guides'],
    'brandStatements': ['personal-prep_values'],
    'analyses': ['resume_analysis', 'resume_guidelines'],
}


def safe_child(root, relative, allowed):
    """Resolve relative under root; refuse dotfiles, traversal, and unexpected types."""
    parts = Path(relative).parts
    if not parts or any(p.startswith('.') or p == '..' for p in parts):
        return None
    path = (root / relative).resolve()
    if not path.is_relative_to(root) or not path.is_file() or path.suffix.lower() not in allowed:
        return None
    return path


def extract_docx(path):
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    try:
        with zipfile.ZipFile(path) as z:
            xml = z.read('word/document.xml')
        root = ET.fromstring(xml)
        return '\n'.join(
            ''.join(t.text or '' for t in p.findall('.//w:t', ns))
            for p in root.findall('.//w:p', ns)
        )
    except Exception as e:
        return f'[Could not read DOCX: {e}]'


def extract_pdf(path):
    try:
        import pypdf
        reader = pypdf.PdfReader(str(path))
        return '\n'.join(page.extract_text() or '' for page in reader.pages)
    except Exception as e:
        return f'[Could not read PDF (install pypdf): {e}]'


def extract_rtf(path):
    if sys.platform == 'darwin' and shutil.which('textutil'):
        try:
            result = subprocess.run(
                ['textutil', '-convert', 'txt', '-stdout', str(path)],
                capture_output=True, text=True, timeout=10
            )
            return result.stdout or f'[textutil returned empty for {path.name}]'
        except Exception as e:
            return f'[Could not read RTF: {e}]'
    return '[RTF extraction requires macOS textutil]'


def extract_text(path):
    ext = path.suffix.lower()
    try:
        if ext in TEXT_TYPES:
            return path.read_text(encoding='utf-8', errors='ignore')
        if ext == '.docx':
            return extract_docx(path)
        if ext == '.pdf':
            return extract_pdf(path)
        if ext == '.rtf':
            return extract_rtf(path)
    except Exception as e:
        return f'[Error reading {path.name}: {e}]'
    return ''


def scan_job_folder(base):
    """Return interview data found under base."""
    result = {key: [] for key in DATA_FOLDERS}
    if not base.is_dir():
        return result
    for key, folder_names in DATA_FOLDERS.items():
        for name in folder_names:
            folder = base / name
            if not folder.is_dir():
                continue
            for directory, subdirs, filenames in os.walk(folder):
                subdirs[:] = sorted(d for d in subdirs if not d.startswith('.') and d not in SKIP_DIRS)
                for filename in sorted(filenames):
                    if filename.startswith('.'):
                        continue
                    p = Path(directory) / filename
                    text = extract_text(p)
                    if text:
                        result[key].append({
                            'title': p.stem,
                            'path': p.relative_to(ROOT).as_posix(),
                            'content': text,
                        })
    return result


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

        if route == '/_interview_data':
            query = parse_qs(urlsplit(self.path).query)
            try:
                rel = query.get('dir', [''])[0]
                base = (ROOT / rel).resolve()
                if not base.is_relative_to(ROOT):
                    raise PermissionError
                data = scan_job_folder(base)
                body = json.dumps(data).encode()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(body)))
                self.send_header('Cache-Control', 'no-store')
                self.end_headers()
                return self.wfile.write(body)
            except (PermissionError, FileNotFoundError):
                body = json.dumps({'error': 'folder not found'}).encode()
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                return self.wfile.write(body)

        if route.startswith('/_local/'):
            path = safe_child(ROOT, route[len('/_local/'):], TEXT_TYPES)
            mime = 'text/plain'
        else:
            relative = route.lstrip('/') or 'interview-chat.html'
            path = None if relative.startswith('api/') else safe_child(REPO, relative, PAGE_TYPES)
            mime = None

        if not path:
            return self.send_error(404)

        body = path.read_bytes()
        self.send_response(200)
        if mime:
            self.send_header('Content-Type', f'{mime}; charset=utf-8')
        else:
            self.send_header('Content-Type', self.guess_type(str(path)))
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
    parser.add_argument('folder', type=Path, nargs='?', default=Path('.'), help='job_search folder to load')
    parser.add_argument('--no-open', action='store_true', help='print the URL only')
    parser.add_argument('--_serve', action='store_true', help=argparse.SUPPRESS)
    args = parser.parse_args()

    if args._serve:
        return serve(PORT)

    folder = args.folder.expanduser().resolve()
    if not folder.exists():
        parser.error(f'not found: {folder}')
    if not folder.is_relative_to(ROOT) or any(p.startswith('.') for p in folder.relative_to(ROOT).parts):
        parser.error(f'it must be under {ROOT} and not hidden (set OPENINTERVIEW_ROOT to change)')

    state = ping(PORT)
    if state == 'other':
        raise SystemExit(f'Port {PORT} is used by another program; set OPENINTERVIEW_PORT to a free port.')
    if state == 'down':
        log = Path.home() / '.cache' / 'openinterview.log'
        log.parent.mkdir(parents=True, exist_ok=True)
        with log.open('ab') as out:
            subprocess.Popen([sys.executable, str(Path(__file__).resolve()), '--_serve'],
                             stdin=subprocess.DEVNULL, stdout=out, stderr=out, start_new_session=True, close_fds=True)
        for _ in range(100):
            if ping(PORT) == 'up':
                break
            time.sleep(0.05)
        else:
            raise SystemExit(f'Server did not start; see {log}')

    rel_dir = folder.relative_to(ROOT).as_posix()
    query = 'dir=' + quote('' if rel_dir == '.' else rel_dir)
    url = f'http://127.0.0.1:{PORT}/interview-chat.html?{query}'
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
