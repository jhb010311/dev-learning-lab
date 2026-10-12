Lab.register({
  id: 'kafka', nav: 'Kafka 파티션과 컨슈머', cat: '메시지 큐', mode: 'step',
  title: '컨슈머를 늘렸는데 왜 처리량이 그대로인가',
  intro: '토픽은 여러 파티션으로 나뉘고, 같은 그룹의 컨슈머들이 파티션을 나눠 맡습니다. 파티션 하나는 그룹 안에서 한 컨슈머만 읽을 수 있습니다.',
  terms: ['Kafka의 토픽, 파티션, 오프셋', '컨슈머 그룹과 리밸런싱', 'Consumer Lag', '메시지 전달 보장', '메시지 큐', '멱등성과 멱등키'], ranks: ['mq', 'msa'],
  controls: [
    { id: 'p', label: '파티션 수', type: 'range', min: 1, max: 6, value: 3, fmt: function (v) { return v + '개'; } },
    { id: 'c', label: '컨슈머 수 (같은 그룹)', type: 'range', min: 1, max: 6, value: 2, fmt: function (v) { return v + '개'; } },
    { id: 'r', label: '초당 들어오는 메시지', type: 'range', min: 30, max: 300, step: 30, value: 120, fmt: function (v) { return v + '건'; } },
    { id: 'k', label: '컨슈머 하나가 초당 처리하는 양', type: 'range', min: 10, max: 100, step: 10, value: 50, fmt: function (v) { return v + '건'; } },
    { id: 'commit', label: '오프셋을 커밋하는 시점', type: 'select', value: 'after', options: [['after', '메시지를 처리한 뒤에 커밋'], ['before', '메시지를 처리하기 전에 커밋']] },
    { id: 'crash', label: '컨슈머 하나가 처리 도중 죽는다', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', q: '파티션 3개에 컨슈머 2개를 두고 초당 120건이 들어오는데 컨슈머 하나가 초당 50건을 처리하면 어떻게 되나', d: '파티션 3개에 컨슈머 2개. 처리 능력이 모자라 메시지가 밀립니다.', v: { p: 3, c: 2, r: 120, k: 50, commit: 'after', crash: false } },
    { t: '컨슈머를 3개로', q: '컨슈머 수를 3개로 늘리면', d: '파티션마다 컨슈머가 하나씩 붙어 밀림이 사라집니다.', v: { p: 3, c: 3, r: 120, k: 50, commit: 'after', crash: false } },
    { t: '컨슈머를 6개로 늘려도', q: '파티션은 3개 그대로 두고 컨슈머 6개, 초당 들어오는 메시지 240건으로 늘리면', d: '파티션이 3개뿐이라 3개는 할 일이 없습니다.', v: { p: 3, c: 6, r: 240, k: 50, commit: 'after', crash: false } },
    { t: '파티션도 6개로', q: '컨슈머 6개, 초당 메시지 240건인데 파티션 수도 6개로 늘리면', d: '이제 6개가 모두 일합니다.', v: { p: 6, c: 6, r: 240, k: 50, commit: 'after', crash: false } },
    { t: '처리 도중 컨슈머가 죽으면 (처리 후 커밋)', q: '오프셋을 처리한 뒤에 커밋하는 채로 컨슈머 3개 중 하나가 처리 도중 죽으면', d: '다른 컨슈머가 이어받으면서 일부를 다시 처리합니다.', v: { p: 3, c: 3, r: 120, k: 50, commit: 'after', crash: true } },
    { t: '처리 도중 컨슈머가 죽으면 (처리 전 커밋)', q: '컨슈머 3개 중 하나가 처리 도중 죽는데 오프셋을 메시지를 처리하기 전에 커밋하면', d: '이미 커밋된 메시지는 처리되지 않은 채 건너뜁니다.', v: { p: 3, c: 3, r: 120, k: 50, commit: 'before', crash: true } },
  ],
  code: function (c) {
    return '// 토픽 orders: 파티션 ' + c.p + '개\n// 컨슈머 그룹 order-service: 컨슈머 ' + c.c + '개\n\nwhile (true) {\n    ConsumerRecords<String, Order> records = consumer.poll(Duration.ofMillis(500));\n' + (c.commit === 'before' ? '    consumer.commitSync();               // 먼저 "여기까지 읽었다"고 기록\n    for (var r : records) {\n        handle(r.value());               // 그다음 처리\n    }\n' : '    for (var r : records) {\n        handle(r.value());               // 먼저 처리\n    }\n    consumer.commitSync();               // 그다음 "여기까지 읽었다"고 기록\n') + '}';
  },
  label: function (c) { return '파티션 ' + c.p + ' · 컨슈머 ' + c.c + ' · 유입 ' + c.r + ' · 처리 ' + c.k + ' · ' + (c.commit === 'after' ? '처리 후 커밋' : '처리 전 커밋') + (c.crash ? ' · 장애' : ''); },
  columns: ['초당 처리량', '10초 뒤 밀린 메시지', '노는 컨슈머', '중복 처리', '유실'],
  assign: function (P, cons) { var own = []; for (var i = 0; i < P; i++) own.push(cons[i % cons.length]); return own; },
  calc: function (c, cons) {
    var own = this.assign(c.p, cons), per = c.r / c.p, parts = [], total = 0, lag = 0;
    for (var i = 0; i < c.p; i++) { var n = own.filter(function (x) { return x === own[i]; }).length, done = Math.min(per, c.k / n); parts.push({ id: i, own: own[i], inflow: per, done: done, lag: Math.round((per - done) * 10) }); total += done; lag += Math.round((per - done) * 10); }
    var idle = cons.filter(function (x) { return own.indexOf(x) < 0; });
    return { parts: parts, total: Math.round(total), lag: lag, idle: idle, cons: cons.slice() };
  },
  simulate: function (c) {
    var ev = [], cons = [], sum = [], dup = 0, lost = 0;
    for (var i = 1; i <= c.c; i++) cons.push(i);
    var A = this.calc(c, cons), cur = A, note = '';
    function push(s, k, stage) { ev.push({ s: s, k: k, snap: { st: cur, stage: stage, note: note } }); }
    push('컨슈머 ' + c.c + '개가 같은 그룹으로 토픽을 구독합니다. 그룹 코디네이터가 파티션 ' + c.p + '개를 컨슈머들에게 나눠 줍니다. 파티션 하나는 그룹 안에서 한 컨슈머만 맡습니다.' + (A.idle.length ? ' 파티션보다 컨슈머가 많아서 컨슈머 ' + A.idle.join(', ') + '번은 맡을 파티션이 없습니다.' : ''), A.idle.length ? 'bad' : '', 1);
    push('메시지가 초당 ' + c.r + '건 들어와 파티션마다 ' + Math.round(c.r / c.p) + '건씩 쌓입니다(키가 고르게 퍼진다고 가정). 컨슈머는 하나당 초당 ' + c.k + '건을 처리하고, 여러 파티션을 맡은 컨슈머는 그 능력을 나눠 씁니다. 그룹 전체의 처리량은 초당 ' + A.total + '건입니다.', A.total < c.r ? 'bad' : 'good', 2);
    push('10초가 지났습니다. ' + (A.lag ? '처리가 유입을 따라가지 못해 메시지 ' + A.lag + '건이 읽히지 않은 채 밀려 있습니다(컨슈머 랙). 이 상태가 계속되면 랙은 끝없이 늘어납니다.' : '모든 파티션에서 들어오는 만큼 처리하고 있어 밀린 메시지가 없습니다.'), A.lag ? 'bad' : 'good', 3);
    if (c.crash) {
      var dead = cons[0], after = c.commit === 'after';
      note = '컨슈머 ' + dead + '번: 오프셋 100~104 다섯 건을 가져옴. 그중 100, 101, 102를 처리한 시점에 죽음. 커밋된 오프셋은 ' + (after ? '100 (아직 커밋 전)' : '105 (처리 전에 이미 커밋)');
      push('컨슈머 ' + dead + '번이 메시지 다섯 건(오프셋 100~104)을 가져와 세 건을 처리한 순간 죽었습니다. ' + (after ? '처리를 다 끝낸 뒤 커밋할 예정이었으므로, 브로커에 기록된 위치는 아직 100입니다.' : '처리하기 전에 먼저 커밋했으므로, 브로커에는 이미 105까지 읽었다고 기록돼 있습니다.'), 'bad', 4);
      var rest = cons.slice(1);
      if (!rest.length) { cur = { parts: A.parts.map(function (p) { return { id: p.id, own: null, inflow: p.inflow, done: 0, lag: Math.round(p.inflow * 10) }; }), total: 0, lag: c.r * 10, idle: [], cons: [] }; push('남은 컨슈머가 없습니다. 아무도 읽지 않으므로 메시지는 브로커에 계속 쌓이기만 합니다. 메시지는 사라지지 않고 보관 기간 동안 남아 있어, 컨슈머가 다시 뜨면 이어서 읽습니다.', 'bad', 5); }
      else { cur = this.calc(c, rest); push('브로커가 컨슈머 ' + dead + '번의 응답이 끊긴 것을 감지하고 파티션을 다시 나눕니다(리밸런싱). 리밸런싱 중에는 해당 파티션의 소비가 잠시 멈춥니다. 남은 컨슈머 ' + rest.length + '개가 파티션을 나눠 맡아 처리량은 초당 ' + cur.total + '건이 됩니다.', cur.total < c.r ? 'bad' : '', 5); }
      if (after) { dup = 3; push('파티션을 이어받은 컨슈머는 마지막으로 커밋된 위치인 100부터 다시 읽습니다. 100, 101, 102는 이미 처리된 메시지인데 한 번 더 처리됩니다. 유실은 없지만 중복이 3건 생겼습니다(최소 한 번 전달).', 'bad', 6); }
      else { lost = 2; push('파티션을 이어받은 컨슈머는 커밋된 위치인 105부터 읽습니다. 103과 104는 커밋만 되고 처리되지 않았는데, 아무도 다시 읽지 않습니다. 중복은 없지만 2건이 유실됐습니다(최대 한 번 전달).', 'bad', 6); }
    }
    if (A.idle.length) sum.push('한 그룹에서 동시에 일할 수 있는 컨슈머 수는 파티션 수를 넘지 못합니다. 처리량을 더 올리려면 파티션부터 늘려야 합니다. 파티션은 늘릴 수는 있어도 줄일 수 없고, 늘리면 같은 키의 메시지가 가는 파티션이 바뀔 수 있습니다.');
    else if (A.lag) sum.push('랙이 쌓입니다. 컨슈머를 파티션 수까지 늘리거나, 컨슈머 하나의 처리 속도를 올려야 합니다. 랙은 컨슈머가 따라가고 있는지를 보여 주는 핵심 지표입니다.');
    if (c.crash) sum.push(c.commit === 'after' ? '처리 후 커밋은 메시지를 잃지 않는 대신 같은 메시지를 두 번 처리할 수 있습니다. 실무에서는 대부분 이 방식을 쓰고, 중복이 와도 결과가 같도록 컨슈머를 멱등하게 만듭니다(예: 처리한 메시지 ID를 기록해 두고 걸러내기).' : '처리 전 커밋은 중복이 없는 대신 메시지를 잃을 수 있습니다. 조금 빠져도 되는 로그나 통계에만 씁니다.');
    sum.push('순서는 같은 파티션 안에서만 보장됩니다. 같은 주문의 이벤트를 순서대로 처리해야 하면 주문 ID를 키로 줘서 같은 파티션에 들어가게 합니다.');
    return { events: ev, summary: sum, row: [A.total + '건', A.lag + '건', A.idle.length + '개', dup + '건', lost + '건'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 파티션 배정부터 시작합니다.'); return; }
    var st = s.st, show = s.stage >= 2, lagOn = s.stage >= 3;
    H.table(v, ['파티션', '담당 컨슈머', '초당 유입', '초당 처리', '10초 뒤 밀린 메시지'], st.parts.map(function (p) { return { cells: ['파티션 ' + p.id, { v: p.own ? '컨슈머 ' + p.own : '없음', cls: p.own ? '' : 'bad' }, show ? Math.round(p.inflow) + '건' : '-', show ? Math.round(p.done) + '건' : '-', { v: lagOn ? p.lag + '건' : '-', cls: lagOn && p.lag ? 'bad' : lagOn ? 'good' : '' }] }; }), '토픽 orders');
    H.title(v, '컨슈머 그룹'); var ln = H.lanes(v);
    for (var i = 1; i <= c.c; i++) { var mine = st.parts.filter(function (p) { return p.own === i; }), alive = st.cons.indexOf(i) >= 0;
      if (!alive) H.lane(ln, '컨슈머 ' + i, '죽음', 'bad');
      else if (!mine.length) H.lane(ln, '컨슈머 ' + i, '맡은 파티션 없음 (대기)', 'none');
      else { var inflow = mine.length * c.r / c.p; H.lane(ln, '컨슈머 ' + i, '파티션 ' + mine.map(function (p) { return p.id; }).join(', ') + ' 담당 · 유입 ' + Math.round(inflow) + '건 / 처리 능력 ' + c.k + '건', inflow > c.k ? 'bad' : '', show ? Math.min(1, inflow / c.k) : undefined); } }
    if (s.note) H.text(v, s.note);
  },
  // 그림: 왼쪽에 토픽의 파티션, 오른쪽에 컨슈머 그룹. 화살표는 "이 파티션을 이 컨슈머가 맡는다"는 뜻.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, st = s ? s.st : { parts: [], cons: [] }, stage = s ? s.stage : 0, rows = Math.max(c.p, c.c), rh = 42 + rows * 42;
    P.size(680, rh + 32);
    P.region('topic', 16, 16, 340, rh, '토픽 orders (파티션 ' + c.p + '개)');
    P.region('group', 430, 16, 234, rh, '컨슈머 그룹');
    if (!s) { P.text('hint', 186, 16 + rh / 2, '실행을 누르면 파티션을 나눠 줍니다', { cls: 'mut', anchor: 'middle' }); }
    st.parts.forEach(function (p, i) {
      P.box('pt' + p.id, 28, 52 + i * 42, 316, 34, { cls: !p.own ? 'bad' : stage >= 3 && p.lag ? 'bad' : 'wait', title: '파티션 ' + p.id, right: !p.own ? '읽는 컨슈머 없음' : stage >= 3 ? (p.lag ? '밀린 메시지 ' + p.lag + '건' : '밀린 메시지 없음') : stage >= 2 ? '초당 ' + Math.round(p.inflow) + '건 들어옴' : '' });
      if (p.own) P.arrow('own' + p.id, 'pt' + p.id + ':r', 'cs' + p.own + ':l', { cls: 'mut' });
    });
    for (var j = 1; j <= c.c; j++) {
      var alive = st.cons.indexOf(j) >= 0, mine = st.parts.filter(function (p) { return p.own === j; }), load = mine.length * c.r / c.p;
      P.box('cs' + j, 442, 52 + (j - 1) * 42, 210, 34, { cls: s && !alive ? 'bad' : !mine.length ? 'ghost' : load > c.k ? 'hot' : 'good', title: '컨슈머 ' + j, right: s && !alive ? '죽음' : !mine.length ? '맡은 파티션 없음' : stage >= 2 ? '초당 ' + c.k + '건 처리' : mine.length + '개 담당' });
    }
    P.note('화살표는 파티션을 맡은 컨슈머를 가리킵니다. 파티션 하나는 한 컨슈머만 맡으므로, 파티션보다 컨슈머가 많으면 남는 컨슈머(점선)는 할 일이 없습니다. 노란 컨슈머는 들어오는 양이 처리 능력보다 많아 밀리고 있습니다.');
  },
  assume: '메시지 키가 고르게 퍼져 파티션마다 같은 양이 들어온다고 가정했고, 파티션은 컨슈머에게 차례로 하나씩 돌아가며 배정된다고 단순화했습니다(실제 배정 전략은 설정에 따라 다릅니다). 리밸런싱에 걸리는 시간과 그동안의 지연은 수치로 넣지 않았습니다. 죽은 컨슈머의 예(다섯 건 중 세 건 처리)는 커밋 시점에 따른 차이를 보이기 위한 고정된 상황입니다. 파티션 하나를 그룹 안에서 한 컨슈머만 읽는다는 규칙과 전달 보장의 정의는 Kafka 공식 문서를 따랐습니다.',
});
