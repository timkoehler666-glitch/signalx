import json
import os
import threading
import unittest
from unittest.mock import patch
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from http.server import ThreadingHTTPServer
import server


class ServiceTests(unittest.TestCase):
    def setUp(self):
        server.CACHE.clear()
        self.http = ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        self.thread = threading.Thread(target=self.http.serve_forever, daemon=True)
        self.thread.start()
        self.env = patch.dict(os.environ, {'BRIDGE_TOKEN': 'x' * 40, 'BAOSTOCK_LICENSE_CONFIRMED': 'false'})
        self.env.start()

    def tearDown(self):
        self.http.shutdown()
        self.http.server_close()
        self.thread.join()
        self.env.stop()

    def request(self, path, auth=True):
        req = Request(f'http://127.0.0.1:{self.http.server_port}' + path,
                      headers={'Authorization': 'Bearer ' + 'x' * 40} if auth else {})
        try:
            with urlopen(req, timeout=3) as r:
                return r.status, json.load(r)
        except HTTPError as e:
            return e.code, json.load(e)

    def test_auth_and_license_never_call_provider(self):
        with patch.object(server, 'provider_query') as provider:
            self.assertEqual(self.request('/v1/history', False)[0], 401)
            self.assertEqual(self.request('/v1/history')[0], 403)
            self.assertEqual(self.request('/health', False)[0], 200)
            provider.assert_not_called()

    def test_validation_and_cache(self):
        os.environ['BAOSTOCK_LICENSE_CONFIRMED'] = 'true'
        with patch.object(server, 'provider_query', return_value={'status': 'ok', 'rows': []}) as provider:
            self.assertEqual(self.request('/v1/history?code=sh.600519&start=2025-01-01&end=2025-02-01')[0], 200)
            self.assertEqual(self.request('/v1/history?code=sh.600519&start=2025-01-01&end=2025-02-01')[0], 200)
            self.assertEqual(provider.call_count, 1)
            for query in ['code=../../secret', 'code=sh.600519&end=2099-01-01',
                          'code=sh.600519&start=2025-02-01&end=2025-01-01',
                          'code=sh.600519&code=sz.000001', 'code=sh.600519&extra=1']:
                self.assertEqual(self.request('/v1/history?' + query)[0], 400)
            self.assertEqual(provider.call_count, 1)

    def test_failures_not_cached(self):
        os.environ['BAOSTOCK_LICENSE_CONFIRMED'] = 'true'
        with patch.object(server, 'provider_query', side_effect=RuntimeError('provider error')) as provider:
            for _ in range(2):
                self.assertEqual(self.request('/v1/history?code=sh.600519')[0], 502)
            self.assertEqual(provider.call_count, 2)
            self.assertFalse(server.CACHE)


if __name__ == '__main__':
    unittest.main()
