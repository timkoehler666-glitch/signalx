import contextlib
import datetime as dt
import io
import json
import os
import sys


def query(params):
    import baostock as bs
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        if os.environ.get('BAOSTOCK_API_KEY'):
            bs.set_API_key(os.environ['BAOSTOCK_API_KEY'])
        login = bs.login()
        if login.error_code != '0':
            return {'status': 'error'}
        try:
            if params.get('mode') == 'connection_check':
                return {'status': 'ok', 'source': 'BaoStock', 'connected': True, 'marketDataRequested': False}
            fields = 'date,code,open,high,low,close,preclose,volume,amount,adjustflag,turn,tradestatus,pctChg,peTTM,pbMRQ,psTTM,pcfNcfTTM,isST'
            result = bs.query_history_k_data_plus(params['code'], fields, start_date=params['start'],
                                                 end_date=params['end'], frequency='d', adjustflag='3')
            rows = []
            while result.error_code == '0' and result.next():
                row = dict(zip(result.fields, result.get_row_data()))
                if row.get('code') != params['code'] or not params['start'] <= row.get('date', '') <= params['end']:
                    raise ValueError('Unexpected identity or date')
                rows.append(row)
            if result.error_code != '0':
                return {'status': 'error'}
            return {'status': 'ok', 'source': 'BaoStock', 'code': params['code'], 'currency': 'CNY',
                    'adjustment': 'unadjusted', 'fetchedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
                    'rows': rows, 'financialStatementsIncluded': False}
        finally:
            bs.logout()


if __name__ == '__main__':
    try:
        print(json.dumps(query(json.loads(sys.argv[1])), allow_nan=False))
    except Exception:
        print(json.dumps({'status': 'error'}))
        sys.exit(1)
