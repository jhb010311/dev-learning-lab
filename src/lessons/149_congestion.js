Lab.register({
  id: 'congestion', nav: '흐름 제어와 혼잡 제어', cat: '네트워크', mode: 'step',
  title: 'TCP는 한 번에 얼마나 보낼지를 어떻게 정하나',
  intro: 'TCP는 보낼 데이터가 많아도 한꺼번에 쏟아 보내지 않습니다. 받는 쪽이 감당할 수 있는 양(수신 윈도)과 네트워크가 감당할 수 있다고 짐작한 양(혼잡 윈도) 가운데 작은 쪽까지만 보냅니다. 앞의 것을 지키는 일이 흐름 제어, 뒤의 것을 조절하는 일이 혼잡 제어입니다.',
  terms: ['흐름 제어와 혼잡 제어', '수신 윈도와 혼잡 윈도', '느린 시작과 혼잡 회피', 'TCP와 UDP'],
  controls: [
    { id: 'loss', label: '가는 길에 생기는 일', type: 'select', value: 'dup', options: [['none', '유실 없음'], ['dup', '한 조각이 사라짐 (같은 ACK 세 번으로 알아챔)'], ['rto', '보낸 것이 모두 사라짐 (타임아웃으로 알아챔)']] },
    { id: 'at', label: '유실이 일어나는 왕복', type: 'range', min: 3, max: 10, value: 6, step: 1, fmt: function (v) { return v + '번째'; }, show: function (c) { return c.loss !== 'none'; } },
    { id: 'ssth', label: '처음 문턱값 (ssthresh)', type: 'select', value: '8', options: [['8', '8조각'], ['16', '16조각'], ['64', '64조각 (충분히 크게)']] },
    { id: 'rwnd', label: '받는 쪽의 수신 윈도', type: 'select', value: '64', options: [['64', '64조각'], ['12', '12조각'], ['6', '6조각 (받는 쪽이 느림)']] },
  ],
  fix: function (c) { return c.loss === 'none' && +c.at !== 6 ? { at: 6 } : null; },
  presets: [
    { t: '처음 설정으로', q: '처음 문턱값 8조각, 수신 윈도 64조각인 TCP가 6번째 왕복에서 한 조각이 사라지면 보내는 양은 어떻게 달라지나', d: '두 배씩 늘다가 문턱값부터는 하나씩 늘고, 유실을 알아채면 절반으로 줄입니다.', v: { loss: 'dup', at: 6, ssth: '8', rwnd: '64' } },
    { t: '같은 유실을 타임아웃으로', q: '한 조각이 사라지는 대신 보낸 것이 모두 사라져 타임아웃으로 알아채면', d: '절반이 아니라 1조각부터 다시 시작합니다.', v: { loss: 'rto', at: 6, ssth: '8', rwnd: '64' } },
    { t: '유실이 없으면', q: '가는 길에 유실이 없으면', d: '문턱값까지는 두 배씩, 그 뒤로는 하나씩 계속 늘립니다.', v: { loss: 'none', at: 6, ssth: '8', rwnd: '64' } },
    { t: '받는 쪽이 느리면', q: '유실이 없는 길에서 처음 문턱값을 16조각으로, 수신 윈도를 6조각으로 바꾸면', d: '혼잡 윈도가 커져도 수신 윈도인 6조각까지만 보냅니다.', v: { loss: 'none', at: 6, ssth: '16', rwnd: '6' } },
    { t: '문턱값이 아주 크면', q: '유실이 일어나는 왕복을 7번째로, 처음 문턱값을 64조각으로 바꾸면', d: '느린 시작이 유실을 만날 때까지 두 배씩 이어집니다.', v: { loss: 'dup', at: 7, ssth: '64', rwnd: '64' } },
    { t: '수신 윈도 12조각에서 유실', q: '유실이 일어나는 왕복을 8번째로, 처음 문턱값을 16조각으로, 수신 윈도를 12조각으로 바꾸면', d: '절반의 기준은 혼잡 윈도가 아니라 실제로 보낸 양입니다.', v: { loss: 'dup', at: 8, ssth: '16', rwnd: '12' } },
  ],
  code: function (c) {
    var s = '// RFC 5681의 규칙을 조각(세그먼트) 단위로 옮긴 것. 프로그램이 아니라 운영체제의 TCP가 하는 일이다\nlet cwnd = 1;                  // 혼잡 윈도: 네트워크가 감당한다고 짐작한 양. 1조각에서 시작\nlet ssthresh = ' + c.ssth + ';' + (String(c.ssth).length < 2 ? ' ' : '') + '             // 문턱값: 여기까지는 빠르게, 넘으면 조심스럽게\nlet acked = 0;                 // 혼잡 회피에서 센 ACK 수\nconst rwnd = ' + c.rwnd + ';' + (String(c.rwnd).length < 2 ? ' ' : '') + '               // 수신 윈도: 받는 쪽이 ACK에 실어 알려 준 여유\n\nfunction canSend() {           // 한 번에 보낼 수 있는 양\n  return Math.min(cwnd, rwnd); // 둘 가운데 작은 쪽\n}\nfunction onAck() {             // 새 데이터를 받았다는 ACK가 하나 올 때마다\n  if (cwnd < ssthresh) cwnd += 1;                        // 느린 시작: 한 왕복에 두 배\n  else if (++acked >= cwnd) { acked = 0; cwnd += 1; }    // 혼잡 회피: 한 왕복에 1조각\n}';
    if (c.loss === 'dup') s += '\nfunction onThreeDuplicateAcks(flight) {   // 같은 ACK가 세 번 = 한 조각이 사라짐\n  ssthresh = Math.max(Math.floor(flight / 2), 2);       // 보낸 양의 절반\n  cwnd = ssthresh;  acked = 0;                           // 절반에서 이어 간다\n}';
    if (c.loss === 'rto') s += '\nfunction onTimeout(flight) {              // 재전송 타이머가 끝날 때까지 ACK가 없음\n  ssthresh = Math.max(Math.floor(flight / 2), 2);       // 보낸 양의 절반\n  cwnd = 1;  acked = 0;                                  // 1조각부터 다시 (느린 시작)\n}';
    return s;
  },
  label: function (c) { return (c.loss === 'none' ? '유실 없음' : (c.loss === 'dup' ? '한 조각 유실' : '모두 유실(타임아웃)') + ' ' + c.at + '번째 왕복') + ' · 문턱값 ' + c.ssth + ' · 수신 윈도 ' + c.rwnd; },
  columns: ['왕복마다 보낸 양', '유실 직후의 문턱값', '유실 직후의 혼잡 윈도', '열두 번 동안 보낸 양', '수신 윈도에 막힌 왕복'],
  ROUNDS: 12,
  // 왕복 한 번 단위로 계산한다. 그 왕복에 보낸 조각 수만큼 ACK가 돌아온다고 보고 식으로 한 번에 반영한다.
  rounds: function (c) {
    var loss = c.loss, at = +c.at, rwnd = +c.rwnd, cwnd = 1, ssth = +c.ssth, acked = 0, out = [];
    for (var r = 1; r <= this.ROUNDS; r++) {
      var flight = Math.min(cwnd, rwnd), o = { r: r, cwnd: cwnd, ssth: ssth, rwnd: rwnd, flight: flight, phase: cwnd < ssth ? 'ss' : 'ca', capped: rwnd < cwnd, lost: loss !== 'none' && r === at, need: 0, grew: false };
      if (o.lost) {
        ssth = Math.max(Math.floor(flight / 2), 2); cwnd = loss === 'dup' ? ssth : 1; acked = 0; o.phase = 'loss';
      } else if (cwnd < ssth) {
        var need = ssth - cwnd;
        if (flight <= need) cwnd += flight; else { cwnd = ssth; acked += flight - need; o.need = need; }
        o.grew = true;
      } else {
        acked += flight;
        if (acked >= cwnd) { acked -= cwnd; cwnd += 1; o.grew = true; }
      }
      o.nextCwnd = cwnd; o.nextSsth = ssth; out.push(o);
    }
    return out;
  },
  simulate: function (c) {
    var R = this.rounds(c), ev = [], sum = [], rows = [], st = { rows: rows, cwnd: 1, ssth: +c.ssth }, total = 0, capped = 0, hit = null, firstCap = true, told = {};
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    R.forEach(function (o) {
      total += o.flight; if (o.capped) capped++;
      var head = '왕복 ' + o.r + ': ' + (o.r === 1 ? '혼잡 윈도는 ' + o.cwnd + '조각, 수신 윈도는 ' + o.rwnd + '조각입니다. 둘 가운데 작은 쪽인 혼잡 윈도만큼, ' + o.flight + '조각을 보냅니다.' : '혼잡 윈도 ' + o.cwnd + '조각, 수신 윈도 ' + o.rwnd + '조각' + (o.cwnd === o.rwnd ? '으로 둘이 같아 ' : ' 가운데 작은 쪽인 ' + (o.capped ? '수신 윈도만큼, ' : '혼잡 윈도만큼, ')) + o.flight + '조각을 보냅니다.');
      if (o.r === 1) head += ' 연결을 막 맺었을 때는 네트워크가 얼마나 감당할지 모르므로 1조각부터 시작합니다.';
      if (o.capped && firstCap) { head += ' 혼잡 윈도에 여유가 있어도 받는 쪽이 감당할 수 있는 양을 넘겨 보내지 않습니다. 이것이 흐름 제어입니다.'; firstCap = false; }
      rows.push({ r: o.r, phase: o.phase, cwnd: o.cwnd, rwnd: o.rwnd, flight: o.flight, ssth: o.ssth, capped: o.capped });
      if (o.lost) {
        hit = o; told = {};
        push(head + (c.loss === 'dup' ? ' 그런데 맨 앞 조각 하나가 가는 길에 사라졌습니다. 뒤따라 도착한 조각마다 받는 쪽은 "아직 그 앞 조각을 기다린다"는 같은 ACK를 되풀이해 보냅니다.' : ' 그런데 네트워크가 심하게 막혀 보낸 것이 모두 사라졌습니다. ACK가 하나도 돌아오지 않은 채 재전송 타이머가 끝납니다.'), 'bad');
        st.cwnd = o.nextCwnd; st.ssth = o.nextSsth;
        push(c.loss === 'dup' ? '같은 ACK가 세 번 왔습니다. 보내는 쪽은 타이머를 기다리지 않고 사라진 조각을 바로 다시 보냅니다(빠른 재전송). 유실은 네트워크가 막혔다는 신호로 봅니다. 문턱값을 방금 보낸 양 ' + o.flight + '조각의 절반인 ' + o.nextSsth + '조각으로 낮추고, 혼잡 윈도도 ' + o.nextCwnd + '조각으로 줄입니다. ACK가 계속 오고 있으니 길이 완전히 막힌 것은 아니라고 보아, 1조각까지 내리지는 않습니다.' : '타임아웃입니다. ACK가 전혀 오지 않았으므로 네트워크가 심하게 막혔다고 봅니다. 문턱값을 방금 보낸 양 ' + o.flight + '조각의 절반인 ' + o.nextSsth + '조각으로 낮추고, 혼잡 윈도는 1조각으로 되돌려 느린 시작부터 다시 합니다.', 'hot');
        return;
      }
      var tail;
      if (o.phase === 'ss') tail = (told.ss ? ' 느린 시작이 이어집니다. ' : ' 혼잡 윈도가 문턱값 ' + o.ssth + '조각보다 작으므로 느린 시작입니다. ACK가 하나 돌아올 때마다 1조각씩 늘립니다. ') + (o.need ? 'ACK ' + o.need + '개까지는 하나에 1조각씩 늘려 문턱값 ' + o.ssth + '조각에 닿고, 거기서부터는 혼잡 회피로 넘어갑니다.' : 'ACK ' + o.flight + '개를 받아 ' + o.nextCwnd + '조각이 됩니다.' + (o.flight === o.cwnd ? ' 한 왕복에 두 배입니다.' : ' 돌아온 ACK가 혼잡 윈도보다 적어 두 배까지는 늘지 않습니다.'));
      else tail = (told.ca ? ' 혼잡 회피가 이어집니다. ' : ' 혼잡 윈도가 문턱값 ' + o.ssth + '조각 이상이므로 혼잡 회피입니다. 이제는 ACK가 혼잡 윈도만큼 모여야 1조각을 늘립니다. ') + (o.grew ? '이번 왕복에서 ' + o.nextCwnd + '조각이 됩니다.' + (o.capped || told.ca ? '' : ' 한 왕복에 1조각씩, 조심스럽게 늘립니다.') : '이번 왕복에 돌아온 ACK는 ' + o.flight + '개뿐이라 아직 그대로입니다.');
      st.cwnd = o.nextCwnd; st.ssth = o.nextSsth;
      told[o.phase] = true;
      push(head + tail, o.phase === 'ca' ? 'good' : '');
    });
    var flights = R.map(function (o) { return o.flight; });
    if (hit && c.loss === 'dup') sum.push('같은 ACK 세 번으로 유실을 알아채면 문턱값과 혼잡 윈도를 보낸 양의 절반(' + hit.nextSsth + '조각)으로 줄이고 거기서부터 하나씩 다시 늘립니다. 늘렸다가 유실을 만나면 줄이기를 되풀이하므로, 보내는 양을 그리면 톱니 모양이 됩니다.');
    if (hit && c.loss === 'rto') sum.push('타임아웃으로 유실을 알아채면 혼잡 윈도를 1조각으로 되돌립니다. 문턱값(' + hit.nextSsth + '조각)까지는 다시 두 배씩 늘고 그 뒤로는 하나씩 늡니다. 같은 유실을 같은 ACK 세 번으로 알아챘다면 열두 번 동안 ' + this.rounds({ loss: 'dup', at: c.at, ssth: c.ssth, rwnd: c.rwnd }).reduce(function (a, o) { return a + o.flight; }, 0) + '조각을 보냈을 것입니다. 타임아웃 쪽이 더 크게 물러섭니다.');
    if (!hit) sum.push('유실이 없으면 느린 시작으로 문턱값까지 빠르게 올라간 뒤 혼잡 회피로 조금씩 계속 늘립니다. 보내는 쪽은 네트워크의 한계를 미리 알 수 없으므로, 유실이 생길 때까지 늘려 보는 방법으로 한계를 찾습니다.');
    if (capped) sum.push('수신 윈도가 혼잡 윈도보다 작았던 왕복이 ' + capped + '번입니다. 그때는 혼잡 윈도가 아무리 커도 수신 윈도만큼만 보냈습니다. 흐름 제어는 받는 쪽을, 혼잡 제어는 그 사이의 네트워크를 넘치지 않게 하는 서로 다른 장치이고, 실제로 보내는 양은 둘 가운데 작은 쪽이 정합니다.');
    else sum.push('이 설정에서는 수신 윈도가 늘 넉넉해서 보내는 양을 혼잡 윈도가 정했습니다.');
    if (hit && hit.capped) sum.push('유실 뒤의 문턱값은 혼잡 윈도(' + hit.cwnd + '조각)의 절반이 아니라 실제로 보내 놓은 양(' + hit.flight + '조각)의 절반입니다. 수신 윈도에 막혀 있던 동안에는 혼잡 윈도만큼 보내 본 적이 없기 때문입니다.');
    return { events: ev, summary: sum, R: R, top: Math.max.apply(null, R.map(function (o) { return o.cwnd; })),
      row: [flights.join(' '), hit ? hit.nextSsth + '조각' : '유실 없음', hit ? hit.nextCwnd + '조각' : '유실 없음', total + '조각', capped + '번'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 왕복 한 번씩 진행합니다. 조각은 TCP가 한 번에 실어 보내는 데이터 한 덩어리(세그먼트)입니다.'); return; }
    H.counters(v, [[s.cwnd + '조각', '혼잡 윈도 (다음 왕복)']]);
    var name = { ss: '느린 시작', ca: '혼잡 회피', loss: '유실' };
    H.table(v, ['왕복', '단계', '혼잡 윈도', '수신 윈도', '보낸 양', '문턱값'], s.rows.map(function (r) { return { cells: [String(r.r), { v: name[r.phase], cls: r.phase === 'loss' ? 'bad' : r.phase === 'ca' ? 'good' : '' }, String(r.cwnd), String(r.rwnd), { v: String(r.flight), cls: r.capped ? 'hot' : '' }, String(r.ssth)] }; }), '왕복마다의 값 (노란 칸은 수신 윈도에 막힌 양)');
  },
  // 그림: 가로는 왕복 번호, 세로는 조각 수인 막대 그래프. 색 막대는 그 왕복에 보낸 양, 점선 막대는 혼잡 윈도, 가로줄은 문턱값과 수신 윈도.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], cwnd: 1, ssth: +sim.c.ssth }, top = sim.top, base = 252, full = 186, rwnd = +sim.c.rwnd;
    function hOf(x) { return Math.max(3, Math.round(x / top * full)); }
    P.size(680, 284);
    P.text('ya', 16, 24, '조각 수 (맨 위가 ' + top + ')', { cls: 'mut' });
    for (var r = 1; r <= 12; r++) P.text('x' + r, 64 + (r - 1) * 52, 272, String(r), { cls: 'mut', anchor: 'middle' });
    P.box('axis', 40, base, 624, 2, { cls: 'plain' });
    if (s.ssth <= top) { P.box('ssl', 40, base - hOf(s.ssth) - 1, 624, 2, { cls: 'hot' }); }
    P.text('sst', 664, 24, '문턱값 ' + s.ssth + (s.ssth > top ? ' (그림보다 위)' : ' (노란 줄)'), { anchor: 'end' });
    if (rwnd <= top) P.box('rwl', 40, base - hOf(rwnd) - 1, 624, 2, { cls: 'wait' });
    P.text('rwt', 664, 44, '수신 윈도 ' + rwnd + (rwnd > top ? ' (그림보다 위)' : ' (파란 줄)'), { cls: 'mut', anchor: 'end' });
    s.rows.forEach(function (o, k) {
      var x = 44 + k * 52, h = hOf(o.flight), cur = k === s.rows.length - 1;
      if (o.capped) P.box('g' + o.r, x, base - hOf(o.cwnd), 40, hOf(o.cwnd), { cls: 'ghost' });
      P.box('b' + o.r, x, base - h, 40, h, { cls: (o.phase === 'loss' ? 'bad' : o.phase === 'ca' ? 'good' : 'wait') + (cur ? ' now' : '') });
      P.text('n' + o.r, x + 20, base - (o.capped ? hOf(o.cwnd) : h) - 5, o.capped ? o.flight + '/' + o.cwnd : String(o.flight), { anchor: 'middle', bold: cur });
    });
    if (!s.rows.length) P.text('hint', 352, 150, '실행을 누르면 왕복마다 막대가 하나씩 생깁니다', { cls: 'mut', anchor: 'middle' });
    P.note('막대 하나가 왕복 한 번에 보낸 양입니다. 파란 막대는 느린 시작, 초록 막대는 혼잡 회피, 빨간 막대는 유실이 일어난 왕복입니다. 점선 막대는 수신 윈도에 막혀 다 쓰지 못한 혼잡 윈도이고, 그때 숫자는 "보낸 양/혼잡 윈도"입니다.');
  },
  assume: '실제 TCP를 실행한 결과가 아니라 RFC 5681의 규칙을 옮긴 개념 모형입니다. 운영체제 안의 혼잡 윈도는 프로그램에서 들여다보거나 조작할 수 없어 실행으로 대조하지 못했습니다. 그 대신 모형의 수치를, 같은 규칙을 ACK 하나 단위로 따로 옮긴 계산과 153가지 설정에서 대조했습니다(모형은 왕복 단위의 식으로 계산합니다). 옮긴 규칙은 보낼 수 있는 양이 두 윈도 가운데 작은 쪽이라는 것(RFC 5681 3.1절), 느린 시작의 식 (2)와 혼잡 회피의 권장 방식(3.1절), 유실 뒤의 문턱값인 식 (4)(3.1절), 타임아웃 뒤 1조각(3.1절), 같은 ACK 세 번 뒤 빠른 회복을 마친 값(3.2절)입니다. 단순화한 것: 크기를 바이트가 아니라 조각 수로 세고 절반은 내림했습니다. 처음 혼잡 윈도는 1조각으로 두었습니다(표준이 허용하는 상한은 2~4조각이고 요즘 운영체제는 10조각을 쓰기도 합니다, RFC 6928). 조각마다 ACK가 하나씩 온다고 보았고(실제로는 두 조각에 하나씩 보내기도 합니다), 수신 윈도는 변하지 않는다고 보았으며(실제로는 받는 프로그램이 읽는 속도에 따라 ACK마다 달라집니다), 빠른 회복 도중에 윈도를 잠시 부풀리는 동작은 생략했습니다. 처음 문턱값은 충분히 크게 잡는 것이 표준의 권고이고, 8과 16은 변화를 보기 위한 값입니다. 수신 윈도에 막힌 동안에도 식대로 혼잡 윈도를 늘렸는데, 실제 구현은 혼잡 윈도를 다 쓰지 못하는 동안에는 늘리지 않기도 합니다(애플리케이션이 보낼 것이 적어 혼잡 윈도를 다 쓰지 않는 경우에 대해 RFC 7661이 그렇게 정합니다). 리눅스와 윈도의 기본 알고리즘은 CUBIC이어서(RFC 9438) 늘리는 곡선과 줄이는 비율이 이 모형과 다릅니다.',
});
