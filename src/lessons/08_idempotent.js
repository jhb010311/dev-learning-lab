Lab.register({
  id: 'idem', nav: '재시도와 멱등성', cat: 'HTTP', mode: 'step',
  title: '응답을 못 받아서 다시 보냈더니',
  intro: '네트워크에서는 요청이나 응답이 사라질 수 있고, 클라이언트는 응답이 없으면 같은 요청을 다시 보냅니다. HTTP 메서드에 따라 여러 번 실행돼도 결과가 같은 것(멱등)과 그렇지 않은 것이 있습니다.',
  terms: ['안전한 메서드와 멱등한 메서드', 'HTTP 메서드', '멱등성과 멱등키', 'HTTP 상태 코드'], ranks: ['rest', 'http'],
  controls: [
    { id: 'm', label: '보내는 요청', type: 'select', value: 'POST', options: [['GET', 'GET /orders/1 (조회)'], ['PUT', 'PUT /orders/1 (수량을 3으로 교체)'], ['DELETE', 'DELETE /orders/1 (삭제)'], ['POST', 'POST /orders (새 주문 생성)'], ['PATCH', 'PATCH /orders/1 (수량을 1 증가)']] },
    { id: 'lost', label: '네트워크에서 사라지는 것', type: 'select', value: 'res', options: [['none', '없음 (정상)'], ['req', '요청 (서버에 도착하지 못함)'], ['res', '응답 (서버는 처리했는데 응답이 사라짐)']] },
    { id: 'n', label: '사라지는 횟수', type: 'range', min: 1, max: 3, value: 1, fmt: function (v) { return v + '번'; }, show: function (c) { return c.lost !== 'none'; } },
    { id: 'key', label: '멱등키(Idempotency-Key) 헤더를 함께 보낸다', type: 'check', value: false, show: function (c) { return c.m === 'POST' || c.m === 'PATCH'; } },
  ],
  presets: [
    { t: '처음 설정으로', q: 'POST /orders로 새 주문을 만드는 요청의 응답이 1번 사라져 다시 보내면 어떻게 되나', d: 'POST의 응답이 한 번 사라집니다. 주문이 두 건 만들어집니다.', v: { m: 'POST', lost: 'res', n: 1, key: false } },
    { t: '같은 상황에서 PUT', q: '응답이 1번 사라지는 같은 상황에서 PUT /orders/1로 수량을 3으로 교체하면', d: '두 번 실행돼도 결과는 한 번 실행한 것과 같습니다.', v: { m: 'PUT', lost: 'res', n: 1, key: false } },
    { t: 'DELETE를 다시 보내면', q: '응답이 1번 사라지는 같은 상황에서 DELETE /orders/1로 삭제하면', d: '두 번째 응답 코드는 다르지만 서버 상태는 같습니다.', v: { m: 'DELETE', lost: 'res', n: 1, key: false } },
    { t: '증가시키는 PATCH', q: 'PATCH /orders/1로 수량을 1 증가시키는데 응답이 2번 사라지면', d: '재시도한 만큼 수량이 더 올라갑니다.', v: { m: 'PATCH', lost: 'res', n: 2, key: false } },
    { t: 'POST에 멱등키를 붙이면', q: 'POST /orders에 멱등키(Idempotency-Key) 헤더를 함께 보내고 응답이 2번 사라지면', d: '서버가 같은 요청임을 알아보고 한 번만 처리합니다.', v: { m: 'POST', lost: 'res', n: 2, key: true } },
    { t: '요청이 사라진 경우', q: 'POST /orders에서 응답이 아니라 요청이 서버에 도착하지 못하고 사라지면', d: '서버가 처리한 적이 없으므로 재시도해도 문제없습니다.', v: { m: 'POST', lost: 'req', n: 1, key: false } },
  ],
  code: function (c) {
    var k = c.key && (c.m === 'POST' || c.m === 'PATCH') ? 'Idempotency-Key: 7f3a9c12\n' : '';
    var req = { GET: 'GET /orders/1 HTTP/1.1\n', PUT: 'PUT /orders/1 HTTP/1.1\n' + 'Content-Type: application/json\n\n{ "quantity": 3 }\n', DELETE: 'DELETE /orders/1 HTTP/1.1\n', POST: 'POST /orders HTTP/1.1\n' + k + 'Content-Type: application/json\n\n{ "item": "키보드", "quantity": 2 }\n', PATCH: 'PATCH /orders/1 HTTP/1.1\n' + k + 'Content-Type: application/json\n\n{ "quantityDelta": 1 }\n' }[c.m];
    return req + '\n// 클라이언트: 응답이 3초 안에 오지 않으면\n// 같은 요청을 그대로 다시 보낸다' + (k ? '\n\n// 서버: 처음 보는 멱등키면 처리하고 응답을 키와 함께 저장,\n// 이미 본 키면 처리하지 않고 저장해 둔 응답을 돌려준다' : '');
  },
  label: function (c) { return c.m + ((c.m === 'POST' || c.m === 'PATCH') && c.key ? ' + 멱등키' : '') + ' · ' + (c.lost === 'none' ? '유실 없음' : (c.lost === 'req' ? '요청' : '응답') + ' ' + c.n + '번 유실'); },
  columns: ['보낸 횟수', '서버가 실행한 횟수', '서버 상태', '한 번 실행한 것과 같은가'],
  simulate: function (c) {
    var M = c.m, useKey = c.key && (M === 'POST' || M === 'PATCH'), losses = c.lost === 'none' ? 0 : c.n, ev = [], rows = [];
    var orders = [{ id: 1, item: '마우스', qty: 2 }], nextId = 2, sent = 0, exec = 0, saved = null;
    function state() { return orders.map(function (o) { return { cells: [String(o.id), o.item, String(o.qty)] }; }); }
    function push(s, k) { ev.push({ s: s, k: k, snap: { orders: state(), rows: rows.slice(), sent: sent, exec: exec, saved: saved } }); }
    function apply() {
      exec++;
      if (M === 'GET') return '200 OK (주문 1: 수량 ' + orders[0].qty + ')';
      if (M === 'PUT') { orders[0].qty = 3; return '200 OK (수량 3)'; }
      if (M === 'DELETE') { var i = orders.map(function (o) { return o.id; }).indexOf(1); if (i < 0) return '404 Not Found (이미 없음)'; orders.splice(i, 1); return '204 No Content'; }
      if (M === 'POST') { orders.push({ id: nextId, item: '키보드', qty: 2 }); return '201 Created (주문 ' + nextId++ + ')'; }
      orders[0].qty++; return '200 OK (수량 ' + orders[0].qty + ')';
    }
    function one(expect) { var o = [{ id: 1, item: '마우스', qty: 2 }]; if (M === 'PUT') o[0].qty = 3; if (M === 'DELETE') o = []; if (M === 'POST') o.push({ id: 2, item: '키보드', qty: 2 }); if (M === 'PATCH') o[0].qty = 3; return JSON.stringify(o); }
    push('처음 서버 상태입니다. 주문 1(마우스, 수량 2)이 있습니다.', '');
    for (var a = 1; a <= losses + 1; a++) {
      sent++; var lose = a <= losses, tag = a === 1 ? '첫 요청' : (a - 1) + '번째 재시도';
      if (lose && c.lost === 'req') { rows.push({ cells: [String(a), '서버에 도착 못 함', { v: '응답 없음 (타임아웃)', cls: 'bad' }] }); push(tag + ': 요청이 서버에 닿기 전에 사라졌습니다. 서버는 아무것도 하지 않았습니다. 클라이언트는 응답이 없어 다시 보내기로 합니다.', ''); continue; }
      var res, dup = false;
      if (useKey && saved) { res = saved; dup = true; } else { res = apply(); if (useKey) saved = res; }
      var did = dup ? '처리하지 않음 (이미 본 멱등키)' : '실행함';
      if (lose) { rows.push({ cells: [String(a), did, { v: res + ' → 응답이 사라짐', cls: 'bad' }] }); push(tag + ': 서버가 요청을 ' + (dup ? '받았지만 이미 처리한 멱등키라 다시 실행하지 않았습니다' : '처리했습니다(' + res + ')') + '. 그런데 응답이 돌아오는 길에 사라졌습니다. 클라이언트는 서버가 처리했는지 알 수 없어서 같은 요청을 다시 보냅니다.', exec > 1 && (M === 'POST' || M === 'PATCH') ? 'bad' : ''); }
      else { rows.push({ cells: [String(a), did, { v: res, cls: 'good' }] }); push(tag + ': ' + (dup ? '서버가 멱등키 7f3a9c12를 이미 처리한 것을 확인하고, 다시 실행하지 않은 채 저장해 둔 응답(' + res + ')을 돌려줍니다.' : '서버가 요청을 처리하고 ' + res + ' 응답을 돌려줍니다.') + ' 이번에는 응답이 클라이언트에 도착했습니다.', exec > 1 && (M === 'POST' || M === 'PATCH') ? 'bad' : 'good'); }
    }
    var same = JSON.stringify(orders.map(function (o) { return { id: o.id, item: o.item, qty: o.qty }; })) === one(), idem = M !== 'POST' && M !== 'PATCH';
    var st = orders.length ? orders.map(function (o) { return '주문 ' + o.id + ' 수량 ' + o.qty; }).join(', ') : '주문 없음';
    var sum = [];
    if (same && exec > 1) sum.push(M + ' 요청은 멱등해서 ' + exec + '번 실행돼도 서버 상태가 한 번 실행한 것과 같습니다.' + (M === 'DELETE' ? ' 두 번째부터 응답 코드는 404로 달라지지만, 멱등성은 응답이 아니라 서버 상태를 기준으로 합니다.' : '') + (M === 'GET' ? ' GET은 서버 상태를 바꾸지 않는 안전한 메서드이기도 합니다.' : ''));
    if (!same) sum.push(M === 'POST' ? 'POST는 멱등하지 않습니다. 실행될 때마다 새 주문이 생겨서 같은 주문이 ' + (orders.length - 1) + '건 만들어졌습니다. 결제나 주문에서 중복 처리가 생기는 전형적인 경로입니다.' : '수량을 "1 증가"시키는 PATCH는 멱등하지 않습니다. 실행된 횟수만큼 더 올라갔습니다. 같은 변경을 "수량을 3으로" 같은 절댓값으로 표현하면 멱등해집니다.');
    if (useKey && sent > exec) sum.push('멱등키 덕분에 서버가 재시도를 같은 요청으로 알아보고 한 번만 실행했습니다. 멱등하지 않은 요청을 안전하게 재시도하려면 이런 장치가 필요합니다.');
    if (c.lost === 'req') sum.push('요청이 사라진 경우는 서버가 실행한 적이 없으므로 어떤 메서드든 재시도해도 됩니다. 문제는 클라이언트 입장에서 요청이 사라진 것인지 응답이 사라진 것인지 구별할 수 없다는 점입니다.');
    if (c.lost === 'none') sum.push('유실이 없으면 어떤 메서드든 한 번만 실행됩니다.');
    return { events: ev, summary: sum, row: [sent + '번', exec + '번', st, same ? '같음' : '다름'], idem: idem };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { orders: [], rows: [], sent: 0, exec: 0, saved: null };
    H.table(v, ['시도', '서버가 한 일', '응답'], s.rows, '요청 기록');
    if (s.saved) H.text(v, '서버가 기억하는 멱등키: 7f3a9c12 → ' + s.saved);
  },
  // 그림: 같은 요청을 두 번 보낼 때 요청이나 응답이 중간에 사라지는 모습. 서버가 실제로 몇 번 실행했는지가 핵심.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], orders: [], sent: 0, exec: 0 }, msgs = [];
    s.rows.forEach(function (r) {
      var no = P.v(r.cells[0]), exec = P.v(r.cells[1]), res = P.v(r.cells[2]), lostRes = res.indexOf('응답이 사라짐') >= 0;
      if (exec.indexOf('도착 못 함') >= 0) { msgs.push({ f: 'c', lost: true, s: no + '번째 전송' }); return; }
      msgs.push({ f: 'c', t: 's', s: no + '번째 전송' });
      msgs.push({ f: 's', s: exec, cls: exec.indexOf('처리하지 않음') === 0 ? 'good' : 'hot' });
      if (lostRes) msgs.push({ f: 's', lost: true, s: res.split(' → ')[0] }); else msgs.push({ f: 's', t: 'c', s: res, cls: P.c(r.cells[2]) });
    });
    var end = P.seq([['c', '클라이언트', 'wait'], ['s', '서버', 'wait']], msgs, { keep: 7 }), y = end + 14;
    P.box('ex', 16, y, 318, 34, { cls: s.exec > 1 ? 'bad' : 'plain', title: '서버가 실제로 실행한 횟수', right: s.exec + '번' });
    P.box('sn', 346, y, 318, 34, { cls: 'plain', title: '클라이언트가 보낸 횟수', right: s.sent + '번' });
    (s.orders || []).slice(0, 4).forEach(function (o, i) { P.box('od' + i, 16 + i * 164, y + 44, 156, 34, { cls: 'wait', title: '주문 ' + P.v(o.cells[0]), right: P.v(o.cells[1]) + ' ' + P.v(o.cells[2]) + '개' }); });
    P.size(680, y + 44 + 34 + 16);
    P.note('빨간 점선은 가는 도중에 사라진 요청이나 응답입니다. 맨 아래 상자는 DB에 남은 주문입니다.');
  },
  assume: '멱등성의 정의는 HTTP 표준(RFC 9110)을 따랐습니다. 같은 요청을 여러 번 보냈을 때 서버에 의도한 효과가 한 번 보낸 것과 같으면 멱등이며, GET·HEAD·OPTIONS·TRACE(안전한 메서드)와 PUT·DELETE가 여기에 속합니다. POST와 PATCH는 표준상 멱등이 보장되지 않습니다(PATCH는 내용에 따라 멱등하게 설계할 수도 있습니다). Idempotency-Key 헤더는 결제 API 등에서 널리 쓰이는 관례이며, 아직 표준으로 확정된 것은 아닙니다.',
});
