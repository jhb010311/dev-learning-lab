Lab.register({
  id: 'container', nav: '컨테이너와 가상 머신', cat: '배포와 운영', mode: 'step',
  title: '컨테이너는 왜 가볍고 빨리 뜨나',
  intro: '같은 애플리케이션을 여러 개 띄울 때, 가상 머신은 인스턴스마다 운영체제를 통째로 올리고 컨테이너는 호스트의 커널을 함께 씁니다. 방식과 개수를 바꿔 가며 올라가는 것들과 메모리 사용을 비교하고, 컨테이너에 메모리 제한을 걸었을 때 무슨 일이 생기는지도 보세요.',
  terms: ['컨테이너와 이미지', '컨테이너와 가상 머신의 차이', '네임스페이스와 cgroups'], ranks: ['container', 'cloud', 'deploy'],
  controls: [
    { id: 'kind', label: '격리 방식', type: 'select', value: 'container', options: [['vm', '가상 머신'], ['container', '컨테이너']] },
    { id: 'n', label: '띄울 인스턴스 수', type: 'range', min: 1, max: 6, value: 3, fmt: function (v) { return v + '개'; } },
    { id: 'limit', label: '컨테이너 메모리 제한', type: 'select', value: '1024', options: [['256', '256MB'], ['512', '512MB'], ['1024', '1GB']], show: function (c) { return c.kind === 'container'; }, hint: '애플리케이션은 실행 중 약 400MB를 씁니다.' },
  ],
  presets: [
    { t: '처음 설정으로', d: '컨테이너 3개. 호스트의 커널을 함께 씁니다.', v: { kind: 'container', n: 3, limit: '1024' } },
    { t: '같은 것을 가상 머신으로', d: '인스턴스마다 운영체제가 하나씩 더 올라갑니다.', v: { kind: 'vm', n: 3, limit: '1024' } },
    { t: '6개로 늘리면', d: '가상 머신. 운영체제가 차지하는 몫이 6배가 됩니다.', v: { kind: 'vm', n: 6, limit: '1024' } },
    { t: '컨테이너 6개', d: '애플리케이션이 쓰는 만큼만 늘어납니다.', v: { kind: 'container', n: 6, limit: '1024' } },
    { t: '메모리 제한을 256MB로', d: '애플리케이션이 400MB를 쓰려다 강제 종료됩니다.', v: { kind: 'container', n: 1, limit: '256' } },
  ],
  code: function (c) {
    if (c.kind === 'vm') return '# 가상 머신 ' + c.n + '대\n# 각 VM: 가상 하드웨어 + 게스트 OS(커널 포함) + JDK + app.jar\n\n$ ssh vm-1\n$ java -jar app.jar';
    return '# Dockerfile\nFROM eclipse-temurin:21-jre           # JRE가 들어 있는 기본 이미지\nCOPY build/libs/app.jar app.jar\nENTRYPOINT ["java", "-jar", "app.jar"]\n\n# 실행 (컨테이너 ' + c.n + '개)\n$ docker run -d --memory=' + c.limit + 'm my-app:1.0';
  },
  label: function (c) { return (c.kind === 'vm' ? '가상 머신 ' : '컨테이너 ') + c.n + '개' + (c.kind === 'container' ? ' · 제한 ' + c.limit + 'MB' : ''); },
  columns: ['올라간 운영체제(커널)', '메모리 사용', '인스턴스 하나가 뜨는 데 걸리는 일', '결과'],
  simulate: function (c) {
    var vm = c.kind === 'vm', APP = 400, OS = 1024, ev = [], layers = [], inst = [], mem = 0, killed = false, sum = [];
    function push(s, k) { ev.push({ s: s, k: k, snap: { layers: layers.slice(), inst: inst.slice(), mem: mem } }); }
    layers.push(['하드웨어 (CPU, 메모리, 디스크)', '']); layers.push(['호스트 운영체제 (커널)', '']); mem = OS;
    push('물리 서버 한 대에 호스트 운영체제가 떠 있습니다. 여기에 애플리케이션 인스턴스 ' + c.n + '개를 서로 격리해서 띄우려 합니다.', '');
    if (vm) {
      layers.push(['하이퍼바이저 (가상 하드웨어를 만들어 줌)', 'hot']); push('하이퍼바이저가 물리 자원을 나눠 가짜 컴퓨터(가상 하드웨어)를 만듭니다.', '');
      for (var i = 1; i <= c.n; i++) { inst.push(['VM ' + i, '게스트 OS 부팅 중', 'b']); mem += OS; push('VM ' + i + ': 가상 하드웨어 위에서 게스트 운영체제를 처음부터 부팅합니다. 커널을 올리고 시스템 서비스를 시작하는 데 수십 초가 걸리고, 운영체제만으로 메모리를 약 1GB 씁니다.', ''); inst[i - 1] = ['VM ' + i, '게스트 OS(커널) + JDK + app', 'd']; mem += APP; push('VM ' + i + ': 부팅이 끝난 뒤 그 안에서 애플리케이션을 실행합니다. 이 VM은 자기만의 커널을 가지고 있어 다른 VM과 완전히 분리됩니다.', ''); }
      sum.push('운영체제(커널)가 호스트 1개 + 게스트 ' + c.n + '개 올라갔습니다. 전체 메모리 약 ' + mem + 'MB 중 게스트 운영체제 몫이 ' + c.n * OS + 'MB입니다.');
      sum.push('가상 머신은 인스턴스마다 운영체제를 통째로 가지므로 무겁고 느리게 뜨지만, 커널까지 분리되어 격리가 강합니다. 다른 종류의 운영체제도 올릴 수 있습니다.');
    } else {
      layers.push(['컨테이너 런타임 (Docker 등)', 'hot']); push('컨테이너 런타임은 가상 하드웨어를 만들지 않습니다. 호스트 커널의 기능으로 프로세스를 격리해서 실행할 뿐입니다.', '');
      for (var j = 1; j <= c.n; j++) {
        inst.push(['컨테이너 ' + j, '이미지 준비', 'b']); push('컨테이너 ' + j + ': 이미지(애플리케이션과 실행에 필요한 파일 묶음)를 읽기 전용으로 깔고, 그 위에서 프로세스를 시작합니다. 운영체제를 부팅하지 않으므로 프로세스 하나를 띄우는 시간이면 됩니다. 같은 이미지는 컨테이너끼리 공유합니다.', '');
        if (+c.limit < APP) { inst[j - 1] = ['컨테이너 ' + j, 'OOMKilled (메모리 제한 초과)', 'r']; killed = true; push('컨테이너 ' + j + ': 애플리케이션이 400MB를 쓰려 했지만 제한이 ' + c.limit + 'MB입니다. 커널(cgroups)이 제한을 넘은 프로세스를 강제로 종료합니다. 자바의 OutOfMemoryError가 아니라 프로세스가 통째로 사라집니다.', 'bad'); }
        else { inst[j - 1] = ['컨테이너 ' + j, '프로세스(JDK + app) · 제한 ' + c.limit + 'MB', 'd']; mem += APP; push('컨테이너 ' + j + ': 실행 중입니다. 네임스페이스 덕분에 이 프로세스는 자기만의 파일 시스템, 네트워크, 프로세스 목록을 가진 것처럼 보이지만, 실제로는 호스트 커널 위의 평범한 프로세스입니다.', 'good'); }
      }
      sum.push('운영체제(커널)는 호스트 1개뿐입니다. 전체 메모리 약 ' + mem + 'MB이며 컨테이너마다 애플리케이션이 쓰는 만큼만 더해졌습니다.');
      sum.push('컨테이너는 커널을 공유하므로 가볍고 빨리 뜹니다. 대신 격리는 가상 머신보다 약하고, 호스트와 같은 종류의 커널에서만 동작합니다. "보이는 범위"는 네임스페이스가, "쓸 수 있는 자원량"은 cgroups가 나눕니다.');
      if (killed) sum.push('메모리 제한보다 많이 쓰면 컨테이너가 강제 종료됩니다(OOMKilled). JVM의 힙 크기는 컨테이너 제한 안에 들어오도록 맞춰야 합니다. 요즘 JVM은 컨테이너 제한을 인식해 기본 힙 크기를 정하지만, 힙 외에 쓰는 메모리도 있어서 여유를 둬야 합니다.');
    }
    return { events: ev, summary: sum, row: [(vm ? 1 + c.n : 1) + '개', '약 ' + mem + 'MB', vm ? '운영체제 부팅 + 앱 시작' : '프로세스 시작', killed ? '강제 종료 (OOMKilled)' : '정상 실행'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { layers: [], inst: [], mem: 0 };
    H.counters(v, [[s.inst.length, '띄운 인스턴스'], ['약 ' + s.mem + 'MB', '메모리 사용']]);
    H.title(v, '인스턴스 (위쪽 층)'); H.slots(v, s.inst.map(function (x) { return [x[0] + ': ' + x[1], x[2]]; }), '아직 없음');
    H.title(v, '아래쪽 층 (위에서 아래로 쌓인 순서의 반대)'); var ln = H.lanes(v);
    s.layers.slice().reverse().forEach(function (l, i) { H.lane(ln, (s.layers.length - i) + '층', l[0], l[1] || ''); });
  },
  // 그림: 아래에서 위로 쌓이는 층. 가상 머신은 인스턴스마다 운영체제 층이 하나씩 더 있고, 컨테이너는 프로세스만 있다.
  draw: function (P, sim, shown) {
    var c = sim.c, vm = c.kind === 'vm', last = shown[shown.length - 1], s = last ? last.snap : { layers: [], inst: [], mem: 0 }, n = c.n, w = (648 - (n - 1) * 8) / n;
    P.size(680, 330);
    P.text('kc', 16, 60, '운영체제(커널) ' + (s.layers.length >= 2 ? 1 + (vm ? s.inst.length : 0) : 0) + '개', { bold: true });
    P.text('mem', 664, 60, '메모리 사용 약 ' + s.mem + 'MB', { anchor: 'end', cls: 'mut' });
    s.layers.forEach(function (l, i) { P.box('layer' + i, 16, 280 - i * 38, 648, 34, { cls: l[1] === 'hot' ? 'hot' : 'plain', title: l[0], center: true }); });
    s.inst.forEach(function (x, j) {
      var ix = 16 + j * (w + 8), state = x[1];
      P.region('ins' + j, ix, 80, w, 118, x[0]);
      if (vm) {
        P.box('os' + j, ix + 7, 154, w - 14, 34, { cls: state.indexOf('부팅') >= 0 ? 'hot' : 'wait', title: '게스트 OS', center: true });
        if (state.indexOf('app') >= 0) P.box('app' + j, ix + 7, 114, w - 14, 34, { cls: 'good', title: 'JDK + app', center: true });
      } else P.box('app' + j, ix + 7, 138, w - 14, 50, state.indexOf('OOM') >= 0 ? { cls: 'bad', title: 'OOMKilled', sub: '제한 초과', center: true } : state.indexOf('이미지') >= 0 ? { cls: 'hot', title: '이미지 준비', sub: ' ', center: true } : { cls: 'good', title: 'JDK + app', sub: '제한 ' + c.limit + 'MB', center: true });
    });
    if (!s.layers.length) P.text('hint', 340, 180, '실행을 누르면 아래층부터 쌓습니다', { cls: 'mut', anchor: 'middle' });
    P.note(vm ? '아래에서 위로 쌓인 층입니다. 가상 머신은 인스턴스마다 파란 "게스트 OS" 층을 하나씩 따로 가집니다. 그만큼 무겁고 뜨는 데 오래 걸리지만 서로 완전히 분리됩니다.' : '아래에서 위로 쌓인 층입니다. 컨테이너에는 게스트 OS 층이 없고, 모든 컨테이너가 맨 아래의 호스트 커널 하나를 함께 씁니다. 점선 상자는 서로 격리된 범위입니다.');
  },
  assume: '메모리 수치(게스트 운영체제 약 1GB, 애플리케이션 약 400MB)와 부팅 시간은 차이의 방향을 보이기 위한 대략적인 예시이며 실제 값은 구성에 따라 크게 다릅니다. 컨테이너가 호스트 커널을 공유하고 네임스페이스와 cgroups로 격리된다는 점, 제한을 넘으면 커널이 프로세스를 종료한다는 점은 Docker와 리눅스 커널 문서의 설명을 따랐습니다. 윈도우나 맥의 Docker Desktop은 내부에 리눅스 가상 머신을 하나 두고 그 안에서 컨테이너를 돌립니다.',
});
