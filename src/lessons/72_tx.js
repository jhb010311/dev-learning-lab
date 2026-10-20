Lab.register({
  id: 'tx', nav: '트랜잭션 기본', cat: '데이터베이스', mode: 'step',
  title: '출금은 됐는데 입금이 안 됐다면',
  why: '여러 문장을 따로따로 실행하면 중간에 오류가 났을 때 이미 반영된 앞 문장을 애플리케이션이 직접 찾아 되돌려야 하고, 그 되돌리는 코드마저 실패하거나 서버가 꺼지면 어긋난 데이터가 그대로 남는다. 트랜잭션은 시작과 커밋 사이의 변경을 DB가 한 단위로 관리해서, 실패하면 DB가 모두 취소하고 커밋한 뒤에는 장애가 나도 남아 있게 한다.',
  use: '주문을 저장하면서 재고를 줄이고 포인트를 차감하는 처리처럼 여러 테이블을 함께 바꾸는 곳에 쓴다. 스프링에서는 서비스 메서드에 @Transactional을 붙여, 메서드가 정상으로 끝나면 커밋하고 런타임 예외가 나면 롤백하게 하는 방식이 흔하다. 외부 결제 API 호출이나 다른 서버의 DB 변경은 DB 트랜잭션으로 되돌릴 수 없어서, 취소 요청을 따로 보내는 보상 처리를 둔다.',
  intro: 'A 계좌에서 1,000원을 빼고 B 계좌에 1,000원을 더하는 이체는 SQL 두 문장입니다. 두 문장 사이에서 오류가 나거나 서버가 꺼지면 돈이 사라질 수 있습니다. 여러 문장을 하나로 묶어 전부 반영하거나 전부 취소하게 하는 것이 트랜잭션입니다. 두 문장을 묶지 않았을 때와 묶었을 때의 결과를 비교합니다.',
  terms: ['트랜잭션', 'ACID', 'Undo 로그와 Redo 로그', '@Transactional'], ranks: ['dbengine', 'txspring', 'isolation'],
  controls: [
    { id: 'mode', label: '실행 방식', type: 'select', value: 'auto', options: [['auto', '트랜잭션 없이 (문장마다 바로 확정)'], ['tx', '두 문장을 트랜잭션으로 묶음']] },
    { id: 'fail', label: '출금과 입금 사이에 생기는 일', type: 'select', value: 'ex', options: [['none', '아무 일 없음'], ['ex', '애플리케이션에서 오류(예외) 발생'], ['crash', '서버가 꺼짐']] },
    { id: 'peek', label: '다른 사용자가 중간에 두 계좌의 합계를 조회한다', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', q: '트랜잭션 없이 문장마다 바로 확정하다가 출금과 입금 사이에 애플리케이션에서 오류(예외)가 발생하면 어떻게 되나', d: '트랜잭션 없이 중간에 오류. 1,000원이 사라집니다.', v: { mode: 'auto', fail: 'ex', peek: false } },
    { t: '트랜잭션으로 묶으면', q: '두 문장을 트랜잭션으로 묶으면', d: '같은 오류에서 출금까지 취소됩니다.', v: { mode: 'tx', fail: 'ex', peek: false } },
    { t: '묶은 상태에서 서버가 꺼지면', q: '두 문장을 트랜잭션으로 묶은 상태에서 출금과 입금 사이에 서버가 꺼지면', d: '커밋하지 않은 변경은 남지 않습니다.', v: { mode: 'tx', fail: 'crash', peek: false } },
    { t: '문제가 없을 때', q: '두 문장을 트랜잭션으로 묶은 상태에서 출금과 입금 사이에 아무 일도 없으면', d: '어느 방식이든 결과는 같습니다.', v: { mode: 'tx', fail: 'none', peek: false } },
    { t: '중간에 다른 사람이 조회하면', q: '출금과 입금 사이에 아무 일도 없는데 다른 사용자가 중간에 두 계좌의 합계를 조회하면', d: '트랜잭션 없이: 합계가 1,000원 모자란 순간이 보입니다.', v: { mode: 'auto', fail: 'none', peek: true } },
    { t: '묶은 상태에서 중간 조회', q: '두 문장을 트랜잭션으로 묶고 아무 일도 없는데 다른 사용자가 중간에 두 계좌의 합계를 조회하면', d: '커밋 전의 변경은 다른 사람에게 보이지 않습니다.', v: { mode: 'tx', fail: 'none', peek: true } },
  ],
  code: function (c) {
    var w = "UPDATE account SET balance = balance - 1000 WHERE id = 'A';   -- 출금\n", d = "UPDATE account SET balance = balance + 1000 WHERE id = 'B';   -- 입금\n", gap = c.fail === 'ex' ? '-- (여기서 애플리케이션 오류 발생)\n' : c.fail === 'crash' ? '-- (여기서 서버가 꺼짐)\n' : '', skip = "-- UPDATE account SET balance = balance + 1000 WHERE id = 'B';   -- 입금: 실행되지 못함";
    if (c.mode === 'auto') return '-- 자동 커밋: 문장 하나가 끝날 때마다 바로 확정된다\n' + w + gap + (c.fail === 'none' ? d : skip);
    return 'START TRANSACTION;\n' + w + gap + (c.fail === 'none' ? d + 'COMMIT;      -- 여기서 둘 다 한꺼번에 확정' : skip + '\n' + (c.fail === 'ex' ? 'ROLLBACK;    -- 오류를 감지하고 지금까지 한 것을 전부 취소' : '-- COMMIT에 도달하지 못함 → DB가 알아서 취소'));
  },
  label: function (c) { return (c.mode === 'auto' ? '트랜잭션 없음' : '트랜잭션') + ' · ' + { none: '문제 없음', ex: '중간에 오류', crash: '중간에 서버 꺼짐' }[c.fail] + (c.peek ? ' · 중간 조회' : ''); },
  columns: ['최종 A', '최종 B', '합계 (처음 6,000)', '중간에 다른 사람이 본 합계'],
  // 실제 실행 결과와 대조하는 데 쓰는 순수 계산
  result: function (c) { var auto = c.mode === 'auto', ok = c.fail === 'none'; return { mid: auto ? 'A=4000, B=1000' : 'A=5000, B=1000', final: ok ? 'A=4000, B=2000' : auto ? 'A=4000, B=1000' : 'A=5000, B=1000' }; },
  simulate: function (c) {
    var auto = c.mode === 'auto', ev = [], sum = [], S = { A: 5000, B: 1000, pA: null, pB: null, tx: auto ? '없음 (자동 커밋)' : '시작 전', seen: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(S)) }); }
    push('A 계좌 5,000원, B 계좌 1,000원. 합계는 6,000원입니다. A에서 B로 1,000원을 이체합니다.', '');
    if (!auto) { S.tx = '진행 중'; push('START TRANSACTION: 지금부터 하는 변경을 한 묶음으로 다루겠다고 DB에 알립니다. 묶음이 끝날 때까지 변경은 확정되지 않습니다.', ''); }
    if (auto) { S.A = 4000; push('출금: A를 4,000원으로 바꿉니다. 여러 문장을 묶는 트랜잭션이 없으므로, 이 문장 하나가 끝나자마자 확정(커밋)됩니다. 되돌릴 수 없습니다. 이 순간 DB에 확정된 합계는 5,000원입니다. A에서 빠진 1,000원은 아직 어디에도 없습니다.', ''); }
    else { S.pA = 4000; push('출금: A를 4,000원으로 바꿉니다. 아직 확정 전입니다. 이 트랜잭션 안에서만 4,000원으로 보이고, DB에 확정된 값은 여전히 5,000원입니다.', ''); }
    var midSum = auto ? 5000 : 6000;
    if (c.peek) { S.seen = '다른 사용자가 본 값: A=' + (auto ? 4000 : 5000) + ', B=1000, 합계 ' + midSum; push('이 순간 다른 사용자가 두 계좌를 조회합니다. ' + (auto ? '출금은 이미 확정됐고 입금은 아직이라, 합계가 5,000원으로 보입니다. 1,000원이 어디에도 없는 순간이 밖에 드러났습니다.' : '커밋되지 않은 변경은 다른 사용자에게 보이지 않습니다. 이체 전의 값 그대로 합계 6,000원이 보입니다.'), auto ? 'bad' : 'good'); }
    if (c.fail === 'none') {
      if (auto) { S.B = 2000; push('입금: B를 2,000원으로 바꿉니다. 이것도 바로 확정됩니다. 합계는 다시 6,000원입니다.', 'good'); }
      else { S.pB = 2000; push('입금: B를 2,000원으로 바꿉니다. 아직 확정 전입니다.', ''); S.A = 4000; S.B = 2000; S.pA = null; S.pB = null; S.tx = '커밋됨'; push('COMMIT: 두 변경이 한꺼번에 확정됩니다. 이 순간부터 다른 사용자에게도 새 값이 보입니다. 커밋된 내용은 서버가 꺼져도 남습니다.', 'good'); }
    } else {
      var what = c.fail === 'ex' ? '애플리케이션에서 오류가 발생해 입금 문장을 실행하지 못했습니다.' : '서버가 꺼져서 입금 문장을 실행하지 못했습니다.';
      if (auto) push(what + ' 출금은 이미 확정돼 있습니다. A에서는 1,000원이 빠졌는데 B에는 들어가지 않았습니다. 1,000원이 사라졌습니다.', 'bad');
      else { S.pA = null; S.tx = c.fail === 'ex' ? '롤백됨' : '롤백됨 (재시작 후 DB가 취소)'; push(what + (c.fail === 'ex' ? ' 애플리케이션이 ROLLBACK을 보냅니다.' : ' 커밋에 도달하지 못했으므로, DB는 다시 시작할 때 끝나지 않은 트랜잭션을 찾아 취소합니다.') + ' 출금이 없던 일이 됩니다. A는 5,000원 그대로입니다.', 'good'); }
    }
    var total = S.A + S.B;
    if (auto && c.fail !== 'none') sum.push('여러 문장이 "전부 되거나 전부 안 되거나"여야 하는데 일부만 반영됐습니다. 트랜잭션은 이것을 보장하는 장치입니다(원자성).');
    if (!auto && c.fail !== 'none') sum.push('트랜잭션으로 묶으면 중간에 무슨 일이 생겨도 커밋 전의 변경은 남지 않습니다. 오류면 롤백하고, 서버가 꺼졌으면 DB가 복구하면서 취소합니다.');
    if (c.peek) sum.push(auto ? '묶지 않으면 중간 상태가 다른 사용자에게 그대로 보입니다.' : '커밋 전의 변경은 다른 트랜잭션에 보이지 않습니다(격리성). 얼마나 엄격하게 가릴지는 격리 수준으로 정하며, 그 내용은 "격리 수준" 실습에서 다룹니다.');
    sum.push('트랜잭션의 네 가지 성질(ACID): 전부 아니면 전무(원자성), 규칙에 맞는 상태 유지(일관성), 진행 중인 변경은 서로 안 보임(격리성), 커밋된 것은 남음(지속성). 스프링의 @Transactional은 메서드 시작에 트랜잭션을 열고, 정상 종료에 커밋, 런타임 예외에 롤백(체크 예외는 기본 설정에서 커밋)을 대신 해 주는 것입니다. 이때 스프링은 START TRANSACTION 문장을 보내는 대신 JDBC 커넥션의 자동 커밋을 꺼서(setAutoCommit(false)) 트랜잭션을 엽니다.');
    return { events: ev, summary: sum, row: [S.A + '원', S.B + '원', total + '원' + (total !== 6000 ? ' (1,000원 사라짐)' : ''), c.peek ? midSum + '원' : '조회 안 함'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { A: 5000, B: 1000, pA: null, pB: null, tx: '', seen: '' };
    H.counters(v, [[s.tx || '-', '트랜잭션 상태']]);
  },
  // 그림: 왼쪽은 DB에 확정되어 모두가 보는 값, 오른쪽은 이 트랜잭션 안에서만 보이는 아직 확정되지 않은 값.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { A: 5000, B: 1000, pA: null, pB: null, tx: '', seen: '' }, total = s.A + s.B, auto = sim.c.mode === 'auto';
    P.size(680, 300);
    P.region('db', 16, 16, 392, 200, 'DB에 확정된 값 (모두에게 보임)');
    P.box('A', 28, 54, 178, 60, { cls: s.A === 5000 ? 'plain' : 'hot', title: 'A 계좌', sub: s.A + '원' });
    P.box('B', 218, 54, 178, 60, { cls: s.B === 1000 ? 'plain' : 'hot', title: 'B 계좌', sub: s.B + '원' });
    P.text('sum', 28, 148, '합계 ' + total + '원' + (total !== 6000 ? ' (1,000원이 어디에도 없음)' : ''), { cls: total !== 6000 ? 'bad' : 'good' });
    P.region('tx', 432, 16, 232, 200, auto ? '트랜잭션 없음 (문장마다 바로 확정)' : '이 트랜잭션 안에서만 보이는 값');
    P.box('pA', 444, 54, 208, 38, { cls: s.pA === null ? 'ghost' : 'hot', title: 'A', right: s.pA === null ? '-' : s.pA + '원 (커밋 전)' });
    P.box('pB', 444, 98, 208, 38, { cls: s.pB === null ? 'ghost' : 'hot', title: 'B', right: s.pB === null ? '-' : s.pB + '원 (커밋 전)' });
    P.text('txs', 444, 170, '상태: ' + (s.tx || '-'), { cls: s.tx.indexOf('롤백') >= 0 ? 'bad' : s.tx.indexOf('커밋됨') >= 0 ? 'good' : 'mut' });
    if (s.tx === '커밋됨') P.arrow('cm', 'tx:l', 'db:r', { cls: 'good', label: '커밋' });
    P.box('seen', 16, 232, 648, 40, { cls: !s.seen ? 'ghost' : s.seen.indexOf('5000') >= 0 && s.seen.indexOf('합계 5000') >= 0 ? 'bad' : 'good', title: '다른 사용자가 중간에 본 값', right: s.seen ? s.seen.replace('다른 사용자가 본 값: ', '') : '조회 안 함' });
    P.note('트랜잭션으로 묶으면 오른쪽 칸은 이 트랜잭션에만 보이는 변경이고, 커밋하는 순간 모두에게 보이게 됩니다. 묶지 않으면 문장 하나하나가 곧바로 모두에게 반영되어, 중간에 멈추면 반쯤 바뀐 상태가 남습니다.');
  },
  assume: '열두 가지 조합의 최종 잔액과 중간 조회 결과를 실제 SQL 엔진(SQLite)에서 연결 두 개로 실행해 확인했습니다. "서버가 꺼짐"은 커밋하지 않은 채 연결을 끊는 것으로 재현했습니다. 중간 조회에서 커밋 전 값이 보이지 않는 것은 대부분의 DB 기본 설정에서의 동작이며, 가장 낮은 격리 수준에서는 보일 수 있습니다.',
});
