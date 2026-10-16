"""Private BaoStock bridge. Data access stays off until separately licensed."""
import datetime as dt
import hmac
import json
import os
import re
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

CACHE = {}
LOCK = threading.Lock()


def validated(params):
    code = params.get('code', '')
    if not re.fullmatch(r'(sh\.(600|601|603|605|688)\d{3}|sz\.(000|001|002|003|300|301)\d{3})', code):
        raise ValueError('Unsupported A-share code')
    end = dt.date.fromisoformat(params.get('end', str(dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).date())))
    start = dt.date.fromisoformat(params.get('start', str(end - dt.timedelta(days=30))))
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).date()
    if start > end or end > today or (end - start).days > 1096:
        raise ValueError('Invalid date range; maximum 1096 days')
    return {'code': code, 'start': str(start), 'end': str(end)}


def provider_query(params):
    # Isolate SDK sessions and enforce a hard timeout even if its socket hangs.
    run = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'worker.py'), json.dumps(params)],
                         capture_output=True, text=True, timeout=20)
    if run.returncode != 0:
        raise RuntimeError('BaoStock query failed')
    data = json.loads(run.stdout)
    if data.get('status') != 'ok':
        raise RuntimeError('BaoStock returned an error')
    return data


def history(params):
    key = json.dumps(params, sort_keys=True)
    with LOCK:
        cached = CACHE.get(key)
        if cached and time.monotonic() - cached[0] < 21600:
            return cached[1]
        result = provider_query(params)
        if len(CACHE) >= 256:
            CACHE.pop(next(iter(CACHE)))
        CACHE[key] = (time.monotonic(), result)
        return result


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass  # Never log authorization or query details.

    def respond(self, status, data):
        body = json.dumps(data, ensure_ascii=False, allow_nan=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/health':
            return self.respond(200, {'status': 'ok', 'service': 'kinkgox-baostock', 'dataEnabled': os.environ.get('BAOSTOCK_LICENSE_CONFIRMED') == 'true'})
        token = os.environ.get('BRIDGE_TOKEN', '')
        if len(token) < 32 or not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + token):
            return self.respond(401, {'error': 'unauthorized'})
        if parsed.path == '/v1/connection-check':
            if not REQUEST_LIMIT.acquire(blocking=False):
                return self.respond(429, {'error': 'busy'})
            try:
                return self.respond(200, provider_query({'mode': 'connection_check'}))
            except (subprocess.TimeoutExpired, RuntimeError, ValueError):
                return self.respond(502, {'error': 'provider_connection_unavailable'})
            finally:
                REQUEST_LIMIT.release()
        if parsed.path != '/v1/history':
            return self.respond(404, {'error': 'not_found'})
        if os.environ.get('BAOSTOCK_LICENSE_CONFIRMED') != 'true':
            return self.respond(403, {'error': 'commercial_rights_unconfirmed'})
        try:
            raw = parse_qs(parsed.query, keep_blank_values=True)
            if set(raw) - {'code', 'start', 'end'} or any(len(v) != 1 for v in raw.values()):
                raise ValueError('Invalid parameters')
            params = validated({k: v[0] for k, v in raw.items()})
        except ValueError:
            return self.respond(400, {'error': 'invalid_parameters'})
        if not REQUEST_LIMIT.acquire(blocking=False):
            return self.respond(429, {'error': 'busy'})
        try:
            return self.respond(200, history(params))
        except (subprocess.TimeoutExpired, RuntimeError, ValueError):
            return self.respond(502, {'error': 'provider_unavailable'})
        finally:
            REQUEST_LIMIT.release()


REQUEST_LIMIT = threading.BoundedSemaphore(4)

if __name__ == '__main__':
    ThreadingHTTPServer(('0.0.0.0', int(os.environ.get('PORT', '8080'))), Handler).serve_forever()
