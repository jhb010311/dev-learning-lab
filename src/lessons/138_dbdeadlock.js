Lab.register({
  id: 'dbdeadlock', nav: 'DB의 교착 상태', cat: '데이터베이스', mode: 'step',
  title: '두 트랜잭션이 서로를 기다리면 DB는 어떻게 끝내나',
  intro: '트랜잭션 A는 계좌 1에서 2로 100을, 트랜잭션 B는 계좌 2에서 1로 50을 옮깁니다. 둘이 행을 서로 반대 순서로 잠그면 서로를 기다리게 됩니다. 자바 스레드라면 그대로 멈춰 버리지만, MySQL InnoDB는 이 상황을 스스로 찾아내 한쪽을 롤백시키고 오류를 돌려줍니다.',
  terms: ['교착 상태(Deadlock)', '교착 감지와 희생 트랜잭션', '락 대기 시간 초과', '공유 락과 배타 락', '트랜잭션'],
  controls: [
    { id: 'sit', label: '두 트랜잭션이 행을 잠그는 순서', type: 'select', value: 'rev', options: [['rev', '서로 반대 (A는 1 → 2, B는 2 → 1)'], ['same', '같은 순서 (둘 다 1 → 2)'], ['hold', '서로 반대인데 A가 첫 행만 잠근 채 오래 멈춤']] },
    { id: 'heavy', label: '교착 전에 한 일의 양', type: 'select', value: 'eq', options: [['eq', '둘이 같음 (각자 한 행만 고침)'], ['b', 'B가 다른 행 50개를 먼저 고침']], show: function (c) { return c.sit === 'rev'; }, hint: 'InnoDB가 어느 쪽을 롤백시킬지 고를 때 보는 것입니다.' },
    { id: 'after', label: '오류를 받은 쪽의 대응', type: 'select', value: 'giveup', options: [['giveup', '롤백하고 끝낸다'], ['retry', '롤백하고 처음부터 다시 시도한다'], ['commit', '오류를 무시하고 COMMIT한다']], show: function (c) { return c.sit !== 'same'; } },
  ],
  // 보이지 않는 설정은 기본값으로 되돌린다 (결과에 영향을 주지 않는 설정)
  fix: function (c) {
    var f = {};
    if (c.sit !== 'rev' && c.heavy !== 'eq') f.heavy = 'eq';
    if (c.sit === 'same' && c.after !== 'giveup') f.after = 'giveup';
    return f.heavy || f.after ? f : null;
  },
  presets: [
    { t: '처음 설정으로', d: '서로 반대 순서. DB가 교착을 감지해 한쪽을 롤백시키고, 그 이체는 사라집니다.', v: { sit: 'rev', heavy: 'eq', after: 'giveup' } },
    { t: '롤백된 쪽이 다시 시도하면', d: '처음부터 다시 실행해 두 이체가 모두 반영됩니다.', v: { sit: 'rev', heavy: 'eq', after: 'retry' } },
    { t: '같은 순서로 잠그면', d: '한쪽이 잠깐 기다릴 뿐 오류 없이 둘 다 끝납니다.', v: { sit: 'same', heavy: 'eq', after: 'giveup' } },
    { t: 'B가 더 많은 일을 했다면', d: '이번에는 A가 롤백됩니다. 되돌릴 일이 적은 쪽을 고릅니다.', v: { sit: 'rev', heavy: 'b', after: 'giveup' } },
    { t: '교착이 아닌 긴 대기', d: '고리가 없으면 감지되지 않고, 시간 제한까지 기다린 뒤 오류 1205를 받습니다.', v: { sit: 'hold', heavy: 'eq', after: 'giveup' } },
    { t: '시간 초과를 무시하고 커밋하면', d: '앞 문장만 반영되어 50이 사라집니다.', v: { sit: 'hold', heavy: 'eq', after: 'commit' } },
  ],
  code: function (c) {
    var U = 'UPDATE account SET balance = balance ';
    return '-- account 테이블: 계좌 1과 계좌 2의 잔액은 1000씩\n\n-- 트랜잭션 A: 계좌 1에서 2로 100을 옮긴다\nSTART TRANSACTION;\n' + U + '- 100 WHERE id = 1;\n' + (c.sit === 'hold' ? '-- (다음 문장을 보내지 않고 오래 멈춰 있다)\n' : '') + U + '+ 100 WHERE id = 2;\nCOMMIT;\n\n-- 트랜잭션 B: 계좌 2에서 1로 50을 옮긴다 (A와 같은 때에 실행)\nSTART TRANSACTION;\n'
      + (c.sit === 'rev' && c.heavy === 'b' ? "UPDATE account SET memo = 'B' WHERE id BETWEEN 201 AND 250;   -- 다른 행 50개\n" : '')
      + (c.sit === 'same' ? '-- 번호가 작은 계좌부터 잠근다\n' + U + '+ 50 WHERE id = 1;\n' + U + '- 50 WHERE id = 2;' : U + '- 50 WHERE id = 2;\n' + U + '+ 50 WHERE id = 1;') + '\nCOMMIT;'
      + (c.sit === 'same' ? '' : '\n\n-- 오류를 받은 쪽은\n' + { giveup: 'ROLLBACK;                          -- 하고 끝낸다', retry: 'ROLLBACK;                          -- 한 뒤 START TRANSACTION부터 다시 실행한다', commit: 'COMMIT;                            -- 오류를 무시하고 그대로 커밋한다' }[c.after]);
  },
  label: function (c) { return { rev: '반대 순서', same: '같은 순서', hold: '반대 순서 + A가 오래 멈춤' }[c.sit] + (c.sit === 'rev' ? ' · ' + (c.heavy === 'b' ? 'B가 50행 더 고침' : '일의 양 같음') : '') + (c.sit === 'same' ? '' : ' · ' + { giveup: '롤백하고 끝', retry: '다시 시도', commit: '무시하고 커밋' }[c.after]); },
  columns: ['일어난 일', '오류를 받은 쪽', '오류 직후 그 트랜잭션', '최종 잔액 (계좌 1 / 계좌 2)'],
  // 설정에서 결과를 정한다. pick은 교착에서 실제로 롤백된 쪽(A 또는 B)이며, 주지 않으면 대조한 MySQL에서 본 쪽을 쓴다.
  plan: function (c, pick) {
    var sit = c.sit, v = sit === 'rev' ? (pick || (c.heavy === 'b' ? 'A' : 'B')) : sit === 'hold' ? 'B' : '', code = sit === 'rev' ? 1213 : sit === 'hold' ? 1205 : 0;
    var aDone = sit !== 'rev' || v !== 'A' || c.after === 'retry', bDone = sit === 'same' || c.after === 'retry' || (sit === 'rev' && v !== 'B'), half = sit === 'hold' && c.after === 'commit';
    var b1 = 1000 + (aDone ? -100 : 0) + (bDone ? 50 : 0), b2 = 1000 + (aDone ? 100 : 0) + (bDone || half ? -50 : 0);
    return { victim: v, code: code, aDone: aDone, bDone: bDone, half: half, b1: b1, b2: b2,
      row: [{ rev: '교착을 감지함', same: '기다렸다가 진행', hold: '락 대기 시간 초과' }[sit], v ? v + ': 오류 ' + code + (sit === 'rev' && c.heavy === 'eq' ? ' (' + (v === 'B' ? 'A' : 'B') + '일 수도 있음)' : '') : '없음', sit === 'rev' ? '트랜잭션 전체가 롤백됨' : sit === 'hold' ? '문장만 취소, 트랜잭션은 살아 있음' : '-', b1 + ' / ' + b2] };
  },
  simulate: function (c) {
    var p = this.plan(c), sit = c.sit, V = p.victim, S = V === 'A' ? 'B' : 'A', ev = [], sum = [];
    var st = { own: { 1: '', 2: '' }, wait: { A: 0, B: 0 }, ph: { A: 'pre', B: 'pre' }, msg: { A: ['시작 전', ' '], B: ['시작 전', ' '] }, bal: { 1: 1000, 2: 1000 }, det: '기다리는 트랜잭션 없음', cyc: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function set(t, ph, a, b) { st.ph[t] = ph; st.msg[t] = [a, b || ' ']; }
    var first = { A: 1, B: sit === 'same' ? 1 : 2 }, second = { A: 2, B: sit === 'same' ? 2 : 1 }, amt = { A: 100, B: 50 };
    function sql(t, n) { var r = n === 1 ? first[t] : second[t], minus = (t === 'A') === (r === 1); return 'UPDATE … ' + (minus ? '- ' : '+ ') + amt[t] + ' WHERE id = ' + r; }
    function commit(t) { st.bal[1] += t === 'A' ? -100 : 50; st.bal[2] += t === 'A' ? 100 : -50; st.own[1] = st.own[1] === t ? '' : st.own[1]; st.own[2] = st.own[2] === t ? '' : st.own[2]; set(t, 'done', '커밋함', '이체가 반영됨'); }
    var what = { A: '계좌 1에서 2로 100', B: '계좌 2에서 1로 50' };

    if (sit === 'rev' && c.heavy === 'b') { set('B', 'hold', '다른 행 50개를 고침'); push("B: UPDATE account SET memo = 'B' WHERE id BETWEEN 201 AND 250: 트랜잭션 B가 계좌 1, 2와 상관없는 다른 행 50개를 먼저 고칩니다. 교착과는 관계없는 행이지만, B가 지금까지 한 일의 양이 A보다 훨씬 많아집니다.", ''); }
    st.own[1] = 'A'; set('A', 'hold', '계좌 1 락 보유');
    push('A: ' + sql('A', 1) + ': 트랜잭션 A가 계좌 1에서 100을 뺍니다. 행을 고치려면 그 행에 배타 락을 걸어야 하고, 이 락은 A가 커밋하거나 롤백할 때까지 풀리지 않습니다.', '');

    if (sit === 'same') {
      st.wait.B = 1; set('B', 'wait', '쥔 락 없음', '계좌 1을 기다리는 중'); st.det = 'B가 A를 기다림. 고리 없음';
      push('B: ' + sql('B', 1) + ': 트랜잭션 B도 정해진 순서대로 계좌 1부터 고치려 합니다. 그 행의 락을 A가 쥐고 있어 기다립니다. B는 아직 아무 락도 쥐고 있지 않습니다.', '');
      st.own[2] = 'A'; set('A', 'hold', '계좌 1, 2 락 보유');
      push('A: ' + sql('A', 2) + ': A가 계좌 2에 100을 더합니다. B가 계좌 2를 쥐고 있지 않으므로 막히지 않습니다. 기다림이 B에서 A로 한 방향뿐이라 고리가 생기지 않습니다.', '');
      commit('A'); st.det = '기다리는 트랜잭션 없음';
      push('A: COMMIT: A의 이체가 반영되고 A가 쥐던 락이 모두 풀립니다. 잔액은 계좌 1이 900, 계좌 2가 1100입니다.', 'good');
      st.wait.B = 0; st.own[1] = 'B'; set('B', 'hold', '계좌 1 락 보유');
      push('B: 기다리던 문장(' + sql('B', 1) + ')이 이제 실행됩니다. 락이 풀렸기 때문입니다. B는 오류를 받지 않았고 잠깐 기다렸을 뿐입니다.', '');
      st.own[2] = 'B'; set('B', 'hold', '계좌 1, 2 락 보유');
      push('B: ' + sql('B', 2) + ': B가 계좌 2에서 50을 뺍니다. 기다릴 상대가 없습니다.', '');
      commit('B');
      push('B: COMMIT: B의 이체도 반영됩니다. 잔액은 계좌 1이 950, 계좌 2가 1050입니다.', 'good');
    } else {
      st.own[2] = 'B'; set('B', 'hold', '계좌 2 락 보유');
      push('B: ' + sql('B', 1) + ': 트랜잭션 B가 계좌 2에서 50을 뺍니다. 계좌 2의 행에 배타 락을 겁니다. 아직은 서로 다른 행이라 아무도 기다리지 않습니다.', '');
      if (sit === 'rev') {
        st.wait.A = 2; set('A', 'wait', '계좌 1 락 보유', '계좌 2를 기다리는 중'); st.det = 'A가 B를 기다림. 고리 없음';
        push('A: ' + sql('A', 2) + ': A가 계좌 2에 100을 더하려 합니다. 그 행의 락을 B가 쥐고 있어 기다립니다. A는 계좌 1의 락을 쥔 채로 기다립니다.', '');
        st.wait.B = 1; set('B', 'wait', '계좌 2 락 보유', '계좌 1을 기다리는 중'); st.cyc = true; st.det = 'A → B → A. 고리 발견';
        push('B: ' + sql('B', 2) + ': B가 계좌 1에 50을 더하려 합니다. 그 행의 락은 A가 쥐고 있는데, A는 B가 끝나기를 기다리는 중입니다. A는 B를, B는 A를 기다리는 고리가 생겼습니다. 그대로 두면 둘 다 영원히 진행하지 못합니다.', 'bad');
        st.det = '고리 발견. ' + V + '를 롤백시키기로 함';
        push('InnoDB의 교착 감지: InnoDB는 트랜잭션이 락을 기다리게 되면 누가 누구를 기다리는지를 따라가 고리가 있는지 검사합니다. 고리를 찾았으므로 둘 중 하나를 골라 롤백시킵니다. ' + (c.heavy === 'b' ? 'InnoDB는 되돌릴 일이 적은 작은 트랜잭션을 고르려 합니다. B는 행 51개를, A는 행 1개를 고쳤으므로 A를 고릅니다.' : '두 트랜잭션이 한 일의 양이 같을 때 어느 쪽을 고르는지는 문서에 정해져 있지 않습니다. 이 화면은 B가 골라진 경우를 보입니다. 대조한 MySQL에서는 30번 모두 나중에 기다리기 시작한 B였습니다.'), '');
        st.own[first[V]] = ''; st.wait[V] = 0; st.cyc = false; set(V, 'err', '오류 1213', '전체가 롤백됨, 락 없음'); st.det = V + '를 롤백시켜 고리를 끊음';
        push(V + ': 오류 1213 (Deadlock found when trying to get lock; try restarting transaction)을 받습니다. 기다리던 문장만이 아니라 ' + V + '의 트랜잭션 전체가 롤백됩니다. 앞에서 계좌 ' + first[V] + '의 잔액을 고친 것도 취소되고 쥐고 있던 락이 모두 풀립니다. 락 대기 시간 제한(기본 50초)을 채우지 않고 곧바로 일어납니다.', 'bad');
        st.wait[S] = 0; st.own[second[S]] = S; set(S, 'hold', '계좌 1, 2 락 보유'); st.det = '기다리는 트랜잭션 없음';
        push(S + ': 기다리던 문장(' + sql(S, 2) + ')이 실행됩니다. ' + V + '가 롤백되면서 락이 풀렸기 때문입니다. ' + S + '는 오류를 받지 않았고, 교착이 있었다는 것도 알지 못합니다.', '');
        commit(S);
        push(S + ': COMMIT: ' + S + '의 이체(' + what[S] + ')가 반영됩니다. 잔액은 계좌 1이 ' + st.bal[1] + ', 계좌 2가 ' + st.bal[2] + '입니다.', 'good');
        if (c.after === 'giveup') { set(V, 'err', '롤백하고 끝냄', '이체가 반영되지 않음'); push(V + ': ROLLBACK을 보내고 끝냅니다. 이미 InnoDB가 롤백시킨 뒤라 더 취소할 것은 없습니다. ' + V + '의 이체(' + what[V] + ')는 어디에도 반영되지 않았습니다. 사용자의 요청 하나가 사라진 셈입니다.', 'bad'); }
        else if (c.after === 'commit') { set(V, 'err', '오류를 무시하고 커밋', '반영된 것이 없음'); push(V + ': 오류를 무시하고 COMMIT을 보냅니다. COMMIT 자체는 오류 없이 끝나지만, 트랜잭션이 이미 통째로 롤백된 뒤라 반영할 내용이 없습니다. ' + V + '의 이체는 빠졌는데, 오류를 삼킨 코드에서는 성공한 것처럼 보입니다.', 'bad'); }
        else {
          st.own[1] = V; st.own[2] = V; set(V, 'hold', '다시 시도하는 중', '계좌 1, 2 락 보유');
          push(V + ': ROLLBACK을 보낸 뒤 트랜잭션을 처음부터 다시 실행합니다. 두 UPDATE를 다시 보냅니다. ' + S + '가 이미 끝났으므로 이번에는 기다릴 것이 없습니다.', '');
          commit(V);
          push(V + ': COMMIT: 다시 시도한 ' + V + '의 이체(' + what[V] + ')가 반영됩니다. 잔액은 계좌 1이 ' + st.bal[1] + ', 계좌 2가 ' + st.bal[2] + '입니다.', 'good');
        }
      } else {
        set('A', 'hold', '계좌 1 락 보유', '다음 문장을 보내지 않음');
        push('A: 다음 UPDATE를 보내지 않고 멈춰 있습니다. 트랜잭션을 열어 둔 채로 다른 일(예: 외부 서비스의 응답을 기다림)을 하는 경우입니다. 계좌 1의 락은 그대로 쥐고 있습니다.', '');
        st.wait.B = 1; set('B', 'wait', '계좌 2 락 보유', '계좌 1을 기다리는 중'); st.det = 'B가 A를 기다림. 고리 없음';
        push('B: ' + sql('B', 2) + ': 계좌 1의 락을 A가 쥐고 있어 기다립니다. 이번에는 A가 B를 기다리고 있지 않습니다. 고리가 없으므로 교착이 아니고, InnoDB의 교착 감지는 아무 일도 하지 않습니다.', '');
        st.wait.B = 0; set('B', 'err', '오류 1205 (문장만 취소)', '계좌 2 락은 그대로 보유'); st.det = '교착 아님. B가 시간 제한을 넘김';
        push('락 대기 시간 제한(innodb_lock_wait_timeout, 기본 50초)이 지났습니다. B가 오류 1205 (Lock wait timeout exceeded; try restarting transaction)를 받습니다. 교착 때와 달리 취소되는 것은 기다리던 그 문장 하나뿐입니다. B의 트랜잭션은 살아 있고, 계좌 2에서 50을 뺀 변경과 그 행의 락도 그대로 남아 있습니다.', 'bad');
        if (c.after === 'commit') {
          st.bal[2] -= 50; st.own[2] = ''; set('B', 'err', '오류를 무시하고 커밋', '50을 뺀 것만 반영됨'); st.det = '기다리는 트랜잭션 없음';
          push('B: 오류를 무시하고 COMMIT을 보냅니다. 트랜잭션이 살아 있었으므로, 남아 있던 변경인 "계좌 2에서 50을 뺀 것"만 그대로 반영됩니다. 계좌 1에 50을 더하는 문장은 취소됐으므로 50이 사라졌습니다.', 'bad');
        } else {
          st.own[2] = ''; set('B', 'err', '롤백함', c.after === 'retry' ? '잠시 뒤 다시 시도할 예정' : '이체가 반영되지 않음'); st.det = '기다리는 트랜잭션 없음';
          push('B: ROLLBACK: 이제야 계좌 2를 고친 것이 취소되고 그 행의 락이 풀립니다. 오류 1205를 받은 쪽은 이렇게 직접 롤백해야 합니다.' + (c.after === 'giveup' ? ' B의 이체(' + what.B + ')는 반영되지 않았습니다.' : ''), c.after === 'giveup' ? 'bad' : '');
        }
        st.own[2] = 'A'; set('A', 'hold', '계좌 1, 2 락 보유');
        push('A: 뒤늦게 다음 문장(' + sql('A', 2) + ')을 실행합니다. 계좌 2의 락이 풀려 있으므로 바로 실행됩니다.', '');
        commit('A');
        push('A: COMMIT: A의 이체가 반영됩니다. 잔액은 계좌 1이 ' + st.bal[1] + ', 계좌 2가 ' + st.bal[2] + '입니다.', c.after === 'commit' ? '' : 'good');
        if (c.after === 'retry') {
          st.own[1] = 'B'; st.own[2] = 'B'; set('B', 'hold', '다시 시도하는 중', '계좌 1, 2 락 보유');
          push('B: A가 끝난 뒤 트랜잭션을 처음부터 다시 실행합니다. 두 UPDATE를 다시 보냅니다. A가 아직 락을 쥐고 있을 때 곧바로 다시 시도했다면 또 기다리게 됐을 것입니다.', '');
          commit('B');
          push('B: COMMIT: 다시 시도한 B의 이체가 반영됩니다. 잔액은 계좌 1이 ' + st.bal[1] + ', 계좌 2가 ' + st.bal[2] + '입니다.', 'good');
        }
      }
    }
    if (sit === 'rev') {
      sum.push('InnoDB는 교착을 스스로 감지해 한쪽 트랜잭션을 통째로 롤백시키고 오류 1213을 돌려줍니다. 살아남은 쪽은 아무 일도 없었던 것처럼 진행합니다. 교착은 DB가 끝내 주지만, 롤백된 일을 다시 하는 것은 애플리케이션이 해야 합니다.');
      sum.push(c.after === 'retry' ? '오류 1213을 받으면 트랜잭션을 처음부터 다시 실행합니다. 중간부터가 아니라 처음부터여야 합니다. 앞에서 고친 것까지 모두 취소됐기 때문입니다.' : c.after === 'giveup' ? '다시 시도하지 않으면 그 요청은 반영되지 않은 채 사라집니다.' : '교착으로 롤백된 뒤의 COMMIT은 아무것도 반영하지 않습니다. 오류를 무시하는 코드는 실패를 성공처럼 보이게 만듭니다.');
      sum.push(c.heavy === 'b' ? 'InnoDB는 고친 행이 적은 작은 트랜잭션을 롤백 대상으로 고르려 합니다. 되돌리는 비용이 적기 때문입니다. 그래서 어느 쪽이 오류를 받을지는 순서가 아니라 그때까지 한 일의 양에 달려 있습니다.' : '어느 쪽이 롤백될지는 코드에서 정할 수 없습니다. 그러므로 두 트랜잭션 모두 오류 1213을 받을 수 있다고 보고 준비해야 합니다.');
    } else if (sit === 'same') {
      sum.push('모든 트랜잭션이 같은 순서(번호가 작은 계좌부터)로 잠그면 기다림이 한 방향으로만 생겨 고리가 만들어지지 않습니다. 교착을 줄이는 가장 기본적인 방법입니다.');
      sum.push('그래도 인덱스나 갭 락 때문에 예상하지 못한 교착이 생길 수 있으므로, 오류 1213을 받았을 때 다시 시도하는 코드는 함께 둡니다.');
    } else {
      sum.push('락 대기 시간 초과(오류 1205)는 교착이 아닙니다. 상대가 락을 오래 쥐고 있을 뿐 고리가 없으므로, InnoDB는 정해진 시간까지 기다리게 한 뒤 그 문장만 취소합니다.');
      sum.push(c.after === 'commit' ? '오류 1205 뒤에도 트랜잭션은 살아 있어서, 그대로 커밋하면 앞 문장들만 반영된 반쪽짜리 결과가 남습니다. 오류를 받으면 먼저 롤백해야 합니다.' : '오류 1205를 받은 트랜잭션은 끝난 것이 아닙니다. 앞에서 고친 것과 락이 남아 있으므로 직접 ROLLBACK해야 합니다. 그리고 트랜잭션을 열어 둔 채 오래 걸리는 일을 하지 않는 것이 근본적인 해결입니다.');
    }
    return { events: ev, summary: sum, victim: V, row: p.row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 한 단계씩 진행합니다.'); return; }
    H.counters(v, [[String(s.bal[1] + s.bal[2]), '두 계좌의 합']]);
  },
  // 그림: 양옆에 트랜잭션 A와 B, 가운데에 두 행. 행에서 트랜잭션으로 가는 실선은 "락을 쥠", 트랜잭션에서 행으로 가는 점선은 "기다림". 아래에 InnoDB의 교착 감지와 커밋된 잔액.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { own: { 1: '', 2: '' }, wait: { A: 0, B: 0 }, ph: { A: 'pre', B: 'pre' }, msg: { A: ['시작 전', ' '], B: ['시작 전', ' '] }, bal: { 1: 1000, 2: 1000 }, det: '기다리는 트랜잭션 없음', cyc: false };
    var cls = { pre: 'plain', hold: 'hot', wait: 'wait', err: 'bad', done: 'good' };
    P.size(680, 318);
    ['A', 'B'].forEach(function (x) { P.box('T' + x, x === 'A' ? 16 : 464, 92, 200, 70, { cls: s.cyc && s.ph[x] === 'wait' ? 'bad' : cls[s.ph[x]], title: '트랜잭션 ' + x + (x === 'A' ? ' (1 → 2로 100)' : ' (2 → 1로 50)'), sub: s.msg[x] }); });
    [1, 2].forEach(function (r) {
      P.box('R' + r, 252, r === 1 ? 16 : 190, 176, 48, { cls: s.own[r] ? 'hot' : 'plain', title: '계좌 ' + r + '의 행', sub: s.own[r] ? s.own[r] + '가 락을 쥠' : '락 없음', right: String(s.bal[r]) });
      ['A', 'B'].forEach(function (x) {
        var side = x === 'A' ? 'l' : 'r', ts = r === 1 ? 't' : 'b';
        if (s.own[r] === x) P.arrow('e' + x + r, 'R' + r + ':' + side, 'T' + x + ':' + ts, { cls: 'hot', label: '락을 쥠' });
        else if (s.wait[x] === r) P.arrow('e' + x + r, 'T' + x + ':' + ts, 'R' + r + ':' + side, { cls: s.cyc ? 'bad dash' : 'dash', label: '기다림' });
      });
    });
    P.box('det', 16, 262, 440, 40, { cls: s.cyc ? 'bad' : s.det.indexOf('끊음') >= 0 ? 'good' : 'plain', title: 'InnoDB의 교착 감지', sub: s.det });
    P.box('bal', 464, 262, 200, 40, { cls: s.bal[1] + s.bal[2] !== 2000 ? 'bad' : 'plain', title: '커밋된 잔액', right: s.bal[1] + ' / ' + s.bal[2] });
    P.note('실선 화살표는 그 행의 락을 쥐고 있다는 뜻이고, 점선 화살표는 그 락을 기다린다는 뜻입니다. 화살표를 따라가 처음 자리로 돌아오는 고리가 생기면 교착입니다. 행 오른쪽의 숫자는 커밋된 잔액입니다.');
  },
  assume: '열 가지 조합(순서 세 가지에서 의미가 있는 설정만 남긴 것)을 이 PC의 MySQL 8.4.11(InnoDB, 격리 수준 REPEATABLE READ, innodb_deadlock_detect 켜짐, innodb_rollback_on_timeout 꺼짐)에서 세션 두 개로 화면과 같은 순서로 실행해, 어느 쪽이 어떤 오류 코드를 받는지, 오류 직후 그 트랜잭션에 변경과 락이 남아 있는지, 최종 잔액이 화면과 일치하는 것을 확인했습니다. 교착에서는 오류 1213이 몇 밀리초 만에 왔고(락 대기 제한은 20초로 둔 상태), 오류를 받은 세션이 자기가 고쳤던 행을 다시 읽으면 원래 값 1000이었으며 쥐고 있는 레코드 락이 0개였습니다. 락 대기 시간 초과는 기본값 50초를 기다리는 대신 그 세션의 innodb_lock_wait_timeout을 2초로 줄여 실행했고, 2초 뒤 오류 1205가 온 다음에도 그 세션이 고친 값 950과 레코드 락 1개가 남아 있었습니다. 일의 양이 같은 교착에서 어느 쪽이 롤백되는지는 문서가 정해 두지 않았으므로 결과로 단정하지 않습니다. 30번 되풀이했을 때 30번 모두 나중에 기다리기 시작한 B가 롤백됐고, B가 다른 행 50개를 먼저 고친 경우에는 30번 모두 A가 롤백됐습니다. "작은 트랜잭션을 고르려 한다"와 "교착은 트랜잭션 전체를, 락 대기 시간 초과는 그 문장만 롤백한다"는 MySQL 8.4 참조 설명서 17.7.5.2 Deadlock Detection과 17.20.5 InnoDB Error Handling의 설명과도 맞습니다. 서버 설정을 바꾸면 달라지는 것(교착 감지를 끈 경우, innodb_rollback_on_timeout을 켠 경우)은 다루지 않았습니다. 두 트랜잭션이 정확히 엇갈리는 순서를 가정했으며, 실제로는 타이밍에 따라 교착 없이 지나가는 경우가 더 많습니다.',
});
