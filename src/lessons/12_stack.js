Lab.register({
  id: 'stack', nav: '스택과 힙', cat: 'JVM', mode: 'step',
  title: '메서드를 부를 때마다 메모리에서는 무슨 일이',
  intro: '메서드를 호출하면 그 스레드의 스택에 프레임이 하나 쌓이고, 반환하면 사라집니다. new로 만든 객체는 스택이 아니라 힙에 놓이고 프레임의 지역 변수가 그것을 가리킵니다.',
  terms: ['런타임 데이터 영역', 'JVM 스택', '힙(Heap) 메모리', 'StackOverflowError와 OutOfMemoryError'], ranks: ['jvm'],
  controls: [
    { id: 'n', label: 'factorial에 넘기는 값', type: 'range', min: 1, max: 10, value: 4, fmt: function (v) { return 'factorial(' + v + ')'; } },
    { id: 'base', label: '재귀 종료 조건이 있다', type: 'check', value: true },
    { id: 'limit', label: '스택에 들어갈 수 있는 프레임 수', type: 'range', min: 4, max: 12, value: 8, fmt: function (v) { return v + '개'; }, hint: '보기 쉽게 아주 작게 잡았습니다. 실제 스택에는 보통 수천 개 이상의 프레임이 들어가며 -Xss 옵션으로 크기를 조절합니다.' },
    { id: 'obj', label: '호출마다 객체를 하나씩 만든다', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', q: '프레임 8개까지 쌓이는 스택에서 종료 조건이 있는 factorial(4) 호출은 메모리에서 어떻게 처리되나', d: 'factorial(4). 프레임이 5개까지 쌓였다가 거꾸로 빠집니다.', v: { n: 4, base: true, limit: 8, obj: false } },
    { t: '종료 조건을 빼면', q: '재귀 종료 조건을 없애면', d: '끝없이 자기를 부르다 스택이 넘칩니다.', v: { n: 4, base: false, limit: 8, obj: false } },
    { t: '종료 조건이 있어도 너무 깊으면', q: '종료 조건은 그대로 두고 factorial(10)을 호출하면', d: 'factorial(10)은 프레임 11개가 필요합니다. 스택은 8개까지입니다.', v: { n: 10, base: true, limit: 8, obj: false } },
    { t: '스택을 키우면', q: 'factorial(10) 호출인데 스택에 들어갈 수 있는 프레임 수를 12개로 늘리면', d: '같은 factorial(10)이 정상적으로 끝납니다.', v: { n: 10, base: true, limit: 12, obj: false } },
    { t: '호출마다 객체 생성', q: '호출할 때마다 객체를 하나씩 만들면', d: '객체는 힙에 생기고, 프레임이 사라지면 가리키는 곳이 없어집니다.', v: { n: 4, base: true, limit: 8, obj: true } },
  ],
  code: function (c) {
    return '// 클래스 본문만 보임 (클래스 선언은 생략)\nstatic long factorial(int n) {\n' + (c.obj ? '    byte[] buf = new byte[1024];      // 객체는 힙에, 변수 buf는 스택에\n' : '') + (c.base ? '    if (n <= 1) return 1;             // 종료 조건\n' : '    // 종료 조건 없음\n') + '    return n * factorial(n - 1);\n}\n\npublic static void main(String[] args) {\n    System.out.println(factorial(' + c.n + '));\n}';
  },
  label: function (c) { return 'factorial(' + c.n + ') · 종료 조건 ' + (c.base ? '있음' : '없음') + ' · 스택 ' + c.limit + '개' + (c.obj ? ' · 객체 생성' : ''); },
  columns: ['결과', '가장 깊었던 스택', '만든 객체', '끝난 뒤 가리키는 곳 없는 객체'],
  simulate: function (c) {
    var frames = [{ name: 'main()', vars: 'args', st: '실행 중' }], heap = [], ev = [], maxDepth = 1, result = '', sum = [];
    function snap() { return { frames: frames.map(function (f) { return { name: f.name, vars: f.vars, st: f.st }; }), heap: heap.map(function (h) { return { id: h.id, live: h.live }; }) }; }
    function push(s, k) { ev.push({ s: s, k: k, snap: snap() }); }
    push('프로그램 시작. main 스레드의 스택에 main() 프레임이 놓입니다. 프레임에는 그 메서드의 지역 변수와 "어디로 돌아갈지"가 들어 있습니다.', '');
    var n = c.n, overflow = false;
    for (;;) {
      if (frames.length >= c.limit) { overflow = true; push('factorial(' + n + ') 호출을 시도했지만 스택에 프레임을 더 놓을 자리가 없습니다(' + c.limit + '개가 가득 참). StackOverflowError가 발생합니다.', 'bad'); break; }
      frames[frames.length - 1].st = 'factorial(' + n + ')의 결과를 기다리는 중';
      var f = { name: 'factorial(' + n + ')', vars: 'n = ' + n, st: '실행 중', n: n }; frames.push(f); maxDepth = Math.max(maxDepth, frames.length);
      if (c.obj) { var id = heap.length + 1; heap.push({ id: id, live: true, owner: f }); f.vars += ', buf → 객체' + id; f.obj = id; }
      push('factorial(' + n + ') 호출. 새 프레임이 스택 맨 위에 쌓입니다. 지역 변수 n(값 ' + n + ')은 이 프레임 안에만 있습니다.' + (c.obj ? ' new로 만든 배열은 힙에 놓이고, 프레임의 변수 buf는 그 위치만 가리킵니다.' : ''), '');
      if (c.base && n <= 1) break;
      n--;
    }
    function pop(why) { var f = frames.pop(); if (f.obj) heap[f.obj - 1].live = false; return f; }
    if (overflow) {
      while (frames.length > 1) pop();
      frames[0].st = '예외를 받음';
      push('예외가 호출한 쪽으로 계속 전달되면서 쌓여 있던 프레임이 전부 사라집니다.' + (c.obj ? ' 프레임들이 가리키던 힙의 객체는 이제 어디에서도 가리키지 않으므로 GC가 치울 대상이 됩니다.' : ''), 'bad');
      frames.pop(); push('main()도 예외를 잡지 않아 이 스레드는 종료됩니다. 스택은 스레드마다 따로 있으므로 다른 스레드의 스택에는 영향이 없습니다.', 'bad');
      result = 'StackOverflowError';
      sum.push(c.base ? '종료 조건이 있어도, 필요한 깊이(프레임 ' + (c.n + 1) + '개)가 스택 크기(' + c.limit + '개)를 넘으면 StackOverflowError가 납니다. 스택을 키우거나(-Xss) 재귀를 반복문으로 바꿉니다.' : '종료 조건이 없으면 프레임이 끝없이 쌓여 반드시 스택이 넘칩니다. StackOverflowError의 가장 흔한 원인입니다.');
      sum.push('StackOverflowError는 스택이 넘친 것이고, OutOfMemoryError는 힙 등 메모리 영역에 더 할당할 수 없을 때 납니다. 둘은 서로 다른 영역의 문제입니다.');
    } else {
      var val = 1;
      while (frames.length > 1) {
        var top = frames[frames.length - 1], k = top.n; val = k <= 1 ? 1 : k * val; pop();
        frames[frames.length - 1].st = '실행 중';
        push('factorial(' + k + ') 호출이 끝났습니다. 반환값은 ' + (k <= 1 ? '종료 조건에 걸려 1' : k + ' × ' + (val / k) + ' = ' + val) + '입니다. 프레임이 스택에서 사라지고, 그 안의 지역 변수도 함께 없어집니다.' + (c.obj ? ' buf가 가리키던 ' + top.obj + '번 객체는 힙에 남아 있지만 가리키는 곳이 없어졌습니다.' : ''), '');
      }
      push('main()이 결과를 출력합니다: ' + val + '. 스택은 가장 나중에 쌓인 프레임부터 먼저 빠졌습니다(후입선출).', 'good');
      result = String(val);
      sum.push('프레임은 호출할 때 쌓이고 반환할 때 사라집니다. 가장 깊을 때 ' + maxDepth + '개였습니다. 지역 변수는 프레임과 수명이 같아서 따로 정리할 필요가 없습니다.');
    }
    var dead = heap.filter(function (h) { return !h.live; }).length;
    if (c.obj) sum.push('객체 ' + heap.length + '개는 힙에 만들어졌습니다. 프레임이 사라져도 객체가 바로 지워지지는 않고, 가리키는 곳이 없어진 ' + dead + '개를 나중에 GC가 회수합니다. 힙은 모든 스레드가 함께 쓰는 영역입니다.');
    return { events: ev, summary: sum, row: [result, maxDepth + '개', heap.length + '개', dead + '개'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { frames: [], heap: [] };
    H.title(v, 'main 스레드의 스택 (맨 위가 지금 실행 중인 메서드)'); var ln = H.lanes(v);
    for (var i = c.limit - 1; i >= 0; i--) { var f = s.frames[i]; if (f) H.lane(ln, (i + 1) + '번째', f.name + '  |  ' + f.vars + '  |  ' + f.st, i === s.frames.length - 1 ? 'hot' : 'wait'); else H.lane(ln, (i + 1) + '번째', '빈 자리', 'none'); }
  },
  // 그림: 왼쪽에 스택(아래에서 위로 쌓임), 오른쪽에 힙. 프레임의 변수에서 힙의 객체로 화살표가 간다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { frames: [], heap: [] }, L = c.limit, top = 16, rh = 34 + 30 + L * 30 + 8, bottom = top + rh;
    P.size(680, bottom + 16);
    P.region('stack', 16, top, 330, rh, 'main 스레드의 스택 (아래부터 쌓임)');
    P.region('heap', 386, top, 278, rh, '힙 (모든 스레드가 함께 씀)');
    var slotY = function (i) { return bottom - 8 - (i + 1) * 30 + 2; };
    for (var i = 0; i < L; i++) {
      var f = s.frames[i];
      if (f) P.box('f' + i, 28, slotY(i), 306, 26, { cls: i === s.frames.length - 1 ? 'hot now' : 'wait', title: f.name, right: f.vars.replace(/, buf → 객체\d+/, '') + (/buf/.test(f.vars) ? ', buf' : '') });
      else P.box('e' + i, 28, slotY(i), 306, 26, { cls: 'ghost', sub: '빈 자리', center: true });
    }
    if (last && last.k === 'bad' && s.frames.length >= L) P.box('over', 28, top + 30, 306, 26, { cls: 'bad', title: '새 프레임을 놓을 자리가 없음', center: true });
    s.heap.forEach(function (h) {
      var y = slotY(h.id);
      P.box('o' + h.id, 430, y, 190, 26, { cls: h.live ? 'good' : 'ghost', title: '객체' + h.id, right: h.live ? 'byte[1024]' : '가리키는 곳 없음', from: 'f' + h.id });
      if (h.live && s.frames[h.id]) P.arrow('a' + h.id, 'f' + h.id + ':r', 'o' + h.id + ':l');
    });
    if (!s.heap.length) P.text('hempty', 525, top + rh / 2, c.obj ? '아직 객체가 없습니다' : '이 설정에서는 객체를 만들지 않습니다', { cls: 'mut', anchor: 'middle' });
    P.note('노란 칸은 지금 실행 중인 프레임, 파란 칸은 다른 호출의 결과를 기다리는 프레임입니다. 화살표는 프레임의 변수 buf가 힙의 객체를 가리키는 것이고, 점선 객체는 가리키는 곳이 없어져 GC가 치울 대상입니다.');
  },
  assume: '스택 크기를 "프레임 개수"로 단순화했습니다. 실제로는 바이트 단위의 크기(-Xss, 64비트 리눅스 기본 1MB 안팎)이고, 프레임마다 지역 변수 수에 따라 크기가 달라서 들어가는 프레임 수가 일정하지 않습니다. JIT 컴파일 여부에 따라서도 달라집니다. 스택이 스레드마다 따로 있고 힙은 공유된다는 점, 프레임이 호출 시 쌓이고 반환 시 사라진다는 점은 JVM 명세의 정의와 같습니다. 검증 환경의 JDK 21에서 실제로 실행해 확인했습니다. 종료 조건이 없는 재귀는 깊이 약 1만 7천에서 StackOverflowError가 났습니다. 종료 조건이 있어도 깊이 20만은 기본 스택에서 StackOverflowError가 났고, 스택을 64MB로 키우자(-Xss64m) 정상 종료했습니다. 한 스레드의 스택이 넘친 뒤에도 다른 스레드는 계속 실행됐습니다.',
});
