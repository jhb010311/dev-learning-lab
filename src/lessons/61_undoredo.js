Lab.register({
  id: 'undoredo', nav: 'Undo와 Redo 로그', cat: '데이터베이스', mode: 'step',
  title: '커밋 직후 전원이 꺼져도 데이터가 남는 이유',
  intro: 'DB는 데이터를 바꿀 때 데이터 파일을 곧바로 고치지 않습니다. 메모리에서 먼저 바꾸고, "되돌리는 데 필요한 기록(Undo)"과 "다시 적용하는 데 필요한 기록(Redo)"을 남깁니다.',
  terms: ['Undo 로그와 Redo 로그', 'ACID', 'MVCC(다중 버전 동시성 제어)', '트랜잭션'], ranks: ['dbengine', 'isolation'],
  controls: [
    { id: 'what', label: '일어나는 일', type: 'select', value: 'crashAfter', options: [['commit', '정상 커밋'], ['rollback', '커밋하지 않고 롤백'], ['crashAfter', '커밋 직후 서버가 꺼짐 (데이터 파일에 쓰기 전)'], ['crashBefore', '커밋 전에 서버가 꺼짐']] },
  ],
  presets: [
    { t: '처음 설정으로', q: '커밋 직후 데이터 파일에 쓰기 전에 서버가 꺼지면 재시작 뒤 값은 어떻게 되나', d: '커밋 직후 장애. 데이터 파일에는 옛 값인데 재시작하면 새 값입니다.', v: { what: 'crashAfter' } },
    { t: '커밋 전에 장애', q: '커밋 전에 서버가 꺼지면', d: '재시작하면 변경이 없던 일이 됩니다.', v: { what: 'crashBefore' } },
    { t: '롤백', q: '커밋하지 않고 롤백하면', d: 'Undo 로그에 남겨 둔 이전 값으로 되돌립니다.', v: { what: 'rollback' } },
    { t: '정상 커밋', q: '정상적으로 커밋하면', d: '커밋 시점에 디스크에 쓰는 것은 로그뿐입니다.', v: { what: 'commit' } },
  ],
  code: function (c) {
    return 'START TRANSACTION;\nUPDATE account SET balance = 500 WHERE id = 1;   -- 원래 1000\n' + (c.what === 'rollback' ? 'ROLLBACK;' : c.what === 'crashBefore' ? '-- (여기서 서버가 꺼짐)' : 'COMMIT;' + (c.what === 'crashAfter' ? '\n-- (커밋 응답 직후 서버가 꺼짐)' : ''));
  },
  label: function (c) { return { commit: '정상 커밋', rollback: '롤백', crashAfter: '커밋 직후 장애', crashBefore: '커밋 전 장애' }[c.what]; },
  columns: ['최종 잔액', '되돌리는 데 쓴 것', '다시 적용하는 데 쓴 것', '보장된 성질'],
  simulate: function (c) {
    var ev = [], sum = [], S = { mem: '1000', logbuf: '(비어 있음)', file: '1000', redo: '(비어 있음)', undo: '(비어 있음)', tx: '진행 전', flow: '' }, W = c.what, fin, usedU = '쓰지 않음', usedR = '쓰지 않음', prop;
    // flow: 그 단계에서 일어나는 옮겨 쓰기 (commit: 로그 버퍼 → 디스크의 Redo 로그, replay: Redo 로그 → 메모리). 그 단계에만 화살표로 보인다
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(S)) }); S.flow = ''; }
    push('계좌 1의 잔액은 1000입니다. 이 값은 디스크의 데이터 파일에 있고, 메모리(버퍼 풀)에도 같은 값이 올라와 있습니다.', '');
    S.tx = '진행 중'; S.undo = '계좌 1의 이전 값 = 1000'; push('UPDATE가 시작됩니다. 먼저 바꾸기 전의 값 1000을 Undo 로그에 기록합니다. 되돌려야 할 때와, 다른 트랜잭션이 바뀌기 전 값(이전 버전)을 읽어야 할 때(MVCC) 쓰입니다.', '');
    S.mem = '500 (아직 디스크에 안 씀)'; push('메모리에 올라와 있는 데이터를 500으로 바꿉니다. 디스크의 데이터 파일은 여전히 1000입니다. 데이터 파일을 매번 바로 고치면 디스크 이곳저곳에 써야 해서 느리기 때문에, 나중에 모아서 씁니다.', '');
    S.logbuf = '"계좌 1을 500으로"'; push('무엇을 어떻게 바꿨는지를 Redo 로그로 남깁니다. 먼저 메모리의 로그 버퍼에 적고, 디스크의 Redo 로그 파일에는 나중에 써 넣습니다. 로그는 파일 끝에 이어 붙이기만 하면 되어서 데이터 파일을 고치는 것보다 훨씬 빠릅니다.', '');
    if (W === 'rollback') {
      S.mem = '1000'; S.tx = '롤백됨'; S.undo = '(사용 후 정리 대상)'; usedU = 'Undo 로그'; fin = '1000'; prop = '원자성';
      push('ROLLBACK: Undo 로그에 남겨 둔 이전 값 1000으로 메모리의 데이터를 되돌립니다. 트랜잭션이 한 일이 전부 취소됩니다.', 'good');
      sum.push('롤백은 Undo 로그로 합니다. "전부 반영되거나 전부 취소된다"(원자성)를 Undo 로그가 받쳐 줍니다.');
    } else if (W === 'crashBefore') {
      S.redo = '"계좌 1을 500으로" (일부가 디스크에 써졌을 수 있음, 커밋 표시 없음)'; S.mem = '(사라짐)'; S.logbuf = '(사라짐)'; S.tx = '커밋 전에 멈춤 (서버 꺼짐)'; push('커밋하기 전에 서버가 꺼졌습니다. 메모리의 내용은 모두 사라집니다. 디스크에는 데이터 파일(1000), 그리고 디스크까지 써진 로그만 남습니다.', 'bad');
      S.mem = '(재시작 중)'; S.logbuf = '(비어 있음)'; S.tx = '커밋되지 않음 (복구가 찾아냄)'; push('서버가 다시 시작됩니다. 복구 과정이 Redo 로그를 읽어 디스크에 남은 변경을 다시 적용한 뒤, 커밋 표시가 없는 트랜잭션을 찾아냅니다.', '');
      S.mem = '1000'; S.tx = '롤백됨 (복구 과정에서)'; usedU = 'Undo 로그'; usedR = 'Redo 로그 (복구 시작 단계)'; fin = '1000'; prop = '원자성';
      push('커밋되지 않은 트랜잭션의 변경은 Undo 로그를 이용해 되돌립니다. 잔액은 1000입니다. 사용자는 커밋 성공 응답을 받은 적이 없으므로 이 결과가 맞습니다.', 'good');
      sum.push('커밋되지 않은 변경은 장애 뒤에 남지 않습니다. 복구 과정이 Undo 로그로 되돌립니다.');
    } else {
      S.redo = '"계좌 1을 500으로" + 커밋 표시 (디스크에 기록 완료)'; S.logbuf = '(디스크에 써 넣음)'; S.tx = '커밋됨'; S.flow = 'commit';
      push('COMMIT: Redo 로그를 디스크에 확실히 써 넣습니다(fsync). 이것이 끝나야 사용자에게 "커밋 성공"을 응답합니다. 이 시점에도 데이터 파일은 1000 그대로입니다. 커밋할 때 디스크에 쓰는 것은 로그뿐입니다.', 'good');
      if (W === 'commit') {
        S.file = '500'; S.mem = '500'; usedR = '쓰지 않음 (장애가 없었음)'; fin = '500'; prop = '지속성';
        push('얼마 뒤 백그라운드 작업이 메모리의 바뀐 데이터를 데이터 파일에 옮겨 씁니다(플러시). 이제 데이터 파일도 500입니다. 그 뒤에는 해당 Redo 로그가 더 필요 없어집니다.', '');
        sum.push('커밋의 속도는 로그를 디스크에 쓰는 속도로 정해집니다. 데이터 파일 반영은 나중에 모아서 합니다.');
      } else {
        S.mem = '(사라짐)'; S.logbuf = '(사라짐)'; push('커밋 응답 직후, 데이터 파일에 옮겨 쓰기 전에 서버가 꺼졌습니다. 메모리의 500은 사라졌고 데이터 파일에는 1000이 남아 있습니다. 사용자는 이미 "성공"을 받았습니다.', 'bad');
        S.mem = '(재시작 중)'; S.logbuf = '(비어 있음)'; push('서버가 다시 시작됩니다. 복구 과정이 디스크의 Redo 로그를 마지막 체크포인트부터 읽습니다.', '');
        S.mem = '500'; S.file = '500'; S.flow = 'replay'; usedR = 'Redo 로그'; fin = '500'; prop = '지속성';
        push('Redo 로그에 "계좌 1을 500으로"와 커밋 표시가 있습니다. 이 변경을 다시 적용합니다. 잔액은 500으로 복구됩니다. 커밋된 데이터는 잃지 않았습니다.', 'good');
        sum.push('커밋된 변경은 데이터 파일에 아직 쓰이지 않았더라도 Redo 로그에서 복구됩니다. "커밋된 것은 장애가 나도 남는다"(지속성)를 Redo 로그가 받쳐 줍니다.');
      }
    }
    sum.push('이렇게 데이터보다 로그를 먼저 디스크에 쓰는 방식을 WAL(Write-Ahead Logging)이라고 합니다. Undo는 "되돌리기"와 "이전 버전 보여 주기", Redo는 "다시 적용하기"를 맡습니다.');
    return { events: ev, summary: sum, row: [fin, usedU, usedR, prop] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 시작합니다.'); return; }
    H.table(v, ['위치', '내용'], [
      { cells: ['메모리 (버퍼 풀)', { v: s.mem, cls: s.mem.indexOf('500') === 0 ? 'hot' : s.mem.indexOf('사라') >= 0 ? 'bad' : '' }] },
      { cells: ['메모리: Redo 로그 버퍼', { v: s.logbuf, cls: s.logbuf.indexOf('사라') >= 0 ? 'bad' : '' }] },
      { cells: ['디스크: 데이터 파일', { v: s.file, cls: s.file === '500' ? 'good' : '' }] },
      { cells: ['디스크: Redo 로그', { v: s.redo, cls: s.redo.indexOf('커밋 표시 (') >= 0 ? 'good' : '' }] },
      { cells: ['Undo 로그', s.undo] },
    ], '계좌 1의 잔액이 저장된 곳');
  },
  // 그림: 위는 꺼지면 사라지는 메모리, 아래는 남는 디스크. 변경이 어디까지 기록됐는지가 커밋과 복구를 가른다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { mem: '1000', logbuf: '(비어 있음)', file: '1000', redo: '(비어 있음)', undo: '(비어 있음)', tx: '진행 전', flow: '' }, gone = s.mem.indexOf('사라') >= 0, redoOk = s.redo.indexOf('커밋 표시 (') >= 0;
    P.size(680, 322);
    P.box('tx', 16, 16, 648, 36, { cls: s.tx === '커밋됨' ? 'good' : /롤백|멈춤|않음/.test(s.tx) ? 'bad' : 'plain', title: '트랜잭션 상태', right: s.tx });
    P.region('ram', 16, 66, 648, 84, '메모리: 서버가 꺼지면 사라짐');
    P.box('mem', 28, 98, 300, 42, { cls: gone ? 'bad' : s.mem.indexOf('500') === 0 ? 'hot' : 'plain', title: '버퍼 풀에 올라온 잔액', sub: s.mem });
    P.box('logbuf', 340, 98, 312, 42, { cls: s.logbuf.indexOf('사라') >= 0 ? 'bad' : s.logbuf.indexOf('"') === 0 ? 'hot' : 'plain', title: 'Redo 로그 버퍼', sub: s.logbuf });
    P.region('disk', 16, 164, 648, 142, '로그와 데이터 파일 (디스크에 써진 것은 서버가 꺼져도 남음)');
    P.box('redo', 28, 198, 624, 30, { cls: redoOk ? 'good' : 'plain', title: 'Redo 로그', right: s.redo });
    P.box('undo', 28, 232, 624, 30, { cls: 'plain', title: 'Undo 로그', right: s.undo });
    P.box('file', 28, 266, 624, 30, { cls: s.file === '500' ? 'good' : 'plain', title: '데이터 파일', right: s.file });
    if (s.flow === 'commit') P.arrow('wr', 'logbuf:b:0.5', 'redo:t:0.8', { cls: 'good' });
    if (s.flow === 'replay') P.arrow('rp', 'redo:t:0.2', 'mem:b:0.4', { cls: 'good' });
    P.note('커밋은 "데이터 파일에 썼다"가 아니라 "Redo 로그에 기록했다"는 뜻입니다. 메모리의 값이 사라져도 Redo 로그가 남아 있으면 다시 만들어 낼 수 있고, 커밋되지 않은 변경은 Undo 로그의 이전 값으로 되돌립니다.');
  },
  assume: 'MySQL InnoDB의 구조를 단순화했습니다. Undo 로그의 변경 자체도 Redo 로그로 보호된다는 점, Redo 로그 버퍼는 그림에 따로 두었지만, 디스크에 쓰는 여러 단계(운영체제의 캐시 등) 같은 세부는 생략했습니다. 커밋 때마다 Redo 로그를 디스크에 쓰는 것은 기본 설정(innodb_flush_log_at_trx_commit=1)의 동작입니다. 실제 DB에 장애를 일으켜 확인한 결과가 아니라 MySQL 공식 문서의 설명을 옮긴 것입니다.',
});
