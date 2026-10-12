Lab.register({
  id: 'jit', nav: 'JIT 워밍업', cat: 'JVM', mode: 'step',
  title: '배포 직후의 첫 요청들은 왜 느린가',
  intro: '자바 코드는 바이트코드로 컴파일되어 JVM이 한 줄씩 해석하며 실행합니다. JVM은 자주 실행되는 메서드를 찾아내 기계어로 다시 컴파일하고(JIT), 그 뒤로는 훨씬 빨라집니다.',
  terms: ['JIT 컴파일러', '바이트코드', 'JVM(자바 가상 머신)', '클래스 로더'], ranks: ['jvm', 'tuning', 'deploy'],
  controls: [
    { id: 'mode', label: '실행 방식', type: 'select', value: 'jit', options: [['jit', '기본 설정 (해석하다가 JIT 컴파일)'], ['int', 'JIT를 끔 (-Xint, 계속 해석만)'], ['warm', '요청을 받기 전에 미리 호출해 둠 (워밍업)']] },
  ],
  presets: [
    { t: '처음 설정으로', q: '실행 방식이 기본 설정 (해석하다가 JIT 컴파일)인 배포 직후의 첫 요청들은 왜 느리나', d: '첫 묶음은 5.8ms, 그다음부터는 1.4ms 안팎입니다.', v: { mode: 'jit' } },
    { t: 'JIT를 끄면', q: '실행 방식을 JIT를 끔 (-Xint, 계속 해석만) 쪽으로 바꾸면', d: '끝까지 빨라지지 않습니다. 묶음마다 약 29ms.', v: { mode: 'int' } },
    { t: '미리 워밍업하면', q: '실행 방식을 요청을 받기 전에 미리 호출해 둠 (워밍업) 쪽으로 바꾸면', d: '사용자의 첫 요청부터 빠릅니다.', v: { mode: 'warm' } },
  ],
  DATA: { jit: [5765, 1694, 1369, 1651, 1484, 1368, 1535, 1403, 1373, 1436, 1609, 1725], int: [28000, 31416, 28925, 25281, 36973, 28376, 28920, 29169, 26738, 31654, 28077, 32120] },
  code: function (c) {
    return 'static long work(int n) {                  // 측정한 메서드\n    long s = 0;\n    for (int i = 0; i < n; i++) s += (i * 31L) ^ (s >>> 3);\n    return s;\n}\n\n' + (c.mode === 'warm' ? '// 기동 직후, 요청을 받기 전에\nfor (int k = 0; k < 2000; k++) work(1000);   // 미리 호출해 JIT 컴파일을 끝내 둔다\nreadiness.set(true);                        // 그 뒤에 "준비 완료"를 알린다\n\n' : '') + 'for (int batch = 1; batch <= 12; batch++) {\n    long t = System.nanoTime();\n    for (int k = 0; k < 2000; k++) work(1000);          // 묶음 하나 = 2,000번 호출\n    print((System.nanoTime() - t) / 1000 + "마이크로초");\n}\n\n// 실행: java ' + (c.mode === 'int' ? '-Xint ' : '') + 'JitWarmup.java';
  },
  label: function (c) { return { jit: '기본 설정', int: 'JIT 끔 (-Xint)', warm: '미리 워밍업' }[c.mode]; },
  columns: ['첫 묶음', '마지막 묶음', '가장 느린 묶음 ÷ 가장 빠른 묶음'],
  simulate: function (c) {
    var D = c.mode === 'int' ? this.DATA.int : c.mode === 'warm' ? this.DATA.jit.slice(1).concat([1377]) : this.DATA.jit, ev = [], sum = [], f = function (us) { return (Math.round(us / 100) / 10) + 'ms'; };
    function push(s, k, n) { ev.push({ s: s, k: k, snap: { n: n } }); }
    push('자바 컴파일러(javac)는 소스를 기계어가 아니라 바이트코드로 바꿉니다. 프로그램이 시작되면 JVM의 인터프리터가 이 바이트코드를 한 명령씩 해석해 실행합니다. 어떤 CPU에서든 돌아가지만, 기계어를 직접 실행하는 것보다 훨씬 느립니다.', '', 0);
    if (c.mode === 'warm') push('요청을 받기 전에 work()를 2,000번 미리 호출했습니다. 이때 JVM이 이 메서드를 "자주 실행되는 코드"로 판단해 기계어로 컴파일해 둡니다. 이 느린 구간은 사용자가 겪지 않습니다.', 'good', 0);
    D.forEach(function (us, i) {
      var s = (i + 1) + '번째 묶음: ' + f(us) + '.';
      if (c.mode === 'jit' && i === 0) s += ' 처음에는 인터프리터로 실행됩니다. JVM은 메서드가 몇 번 불렸는지, 반복문이 몇 번 돌았는지를 세고 있다가, 기준을 넘자 이 메서드를 기계어로 컴파일합니다. 이 묶음에는 해석 실행과 컴파일 시간이 모두 들어 있습니다.';
      if (c.mode === 'jit' && i === 1) s += ' 컴파일된 기계어로 실행되기 시작했습니다. 첫 묶음보다 3~4배 빠릅니다. JVM은 실행하면서 모은 정보(어느 분기가 자주 타는지 등)로 한 번 더 강하게 최적화합니다.';
      if (c.mode === 'int' && i === 0) s += ' -Xint 옵션으로 JIT 컴파일러를 껐습니다. 모든 호출을 인터프리터가 해석합니다.';
      if (c.mode === 'int' && i === 3) s += ' 아무리 반복해도 빨라지지 않습니다.';
      if (c.mode === 'warm' && i === 0) s += ' 사용자가 보는 첫 묶음부터 이미 컴파일된 코드로 실행됩니다.';
      push(s, c.mode === 'int' ? 'bad' : c.mode === 'jit' && i === 0 ? 'bad' : 'good', i + 1);
    });
    var mx = Math.max.apply(null, D), mn = Math.min.apply(null, D);
    if (c.mode === 'jit') sum.push('같은 코드인데 처음과 나중의 속도가 다릅니다. JVM은 모든 코드를 미리 컴파일하지 않고, 실제로 자주 실행되는 부분만 골라 실행 중에 컴파일합니다(Just-In-Time). 실행 정보를 보고 최적화하므로 충분히 달궈진 뒤에는 미리 컴파일한 언어에 가까운 속도가 납니다.');
    if (c.mode === 'int') sum.push('JIT 없이 해석만 하면 컴파일된 뒤(약 1.4ms)보다 20배가량 느립니다(약 29ms). 자바의 실제 성능은 JIT 컴파일러에서 나옵니다.');
    if (c.mode === 'warm') sum.push('워밍업은 느린 구간을 사용자 요청이 오기 전에 미리 치르는 것입니다. 배포 직후 주요 API를 내부에서 몇 번 호출하거나, 준비 완료 신호(readiness)를 워밍업 뒤에 보내는 식으로 적용합니다.');
    sum.push('배포 직후에는 JIT 컴파일 전인 데다 클래스 로딩, 커넥션 풀 채우기, 캐시가 비어 있는 것까지 겹쳐 첫 요청들이 유독 느립니다. 새 서버에 트래픽을 한꺼번에 넘기지 않고 조금씩 늘리는 이유이기도 합니다. 성능을 잴 때도 처음 구간은 버리고 충분히 달궈진 뒤의 값을 봅니다.');
    return { events: ev, summary: sum, D: D, row: [f(D[0]), f(D[11]), (Math.round(mx / mn * 10) / 10) + '배'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], n = last ? last.snap.n : 0, D = sim.D, mx = 37000;
    H.title(v, '묶음별 소요 시간 (묶음 하나 = 2,000번 호출, 막대는 37ms 기준)'); var ln = H.lanes(v);
    D.forEach(function (us, i) { if (i < n) H.lane(ln, (i + 1) + '번째', (Math.round(us / 100) / 10) + 'ms', us > 20000 ? 'bad' : us > 3000 ? 'hot' : 'good', Math.max(0.01, us / mx)); else H.lane(ln, (i + 1) + '번째', '', 'none'); });
  },
  assume: '모든 숫자는 이 PC의 JDK 21에서 위 코드를 실제로 실행해 잰 값입니다(기본 설정 두 번 실행 중 첫 번째, -Xint 한 번). "미리 워밍업"은 기본 설정 측정값에서 첫 묶음을 워밍업으로 보고 그 뒤의 값을 보여 준 것입니다. 수치는 CPU와 실행 시점에 따라 달라지지만, 첫 구간이 느리고 그 뒤로 빨라지는 모양은 같습니다. 기본 설정의 JVM은 가벼운 컴파일(C1)과 강한 최적화 컴파일(C2)을 단계적으로 적용합니다.',
});
