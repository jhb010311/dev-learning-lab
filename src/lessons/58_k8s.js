Lab.register({
  id: 'k8s', nav: '쿠버네티스 자가 치유', cat: '배포와 운영', mode: 'step',
  title: '컨테이너가 죽으면 누가 다시 띄우나',
  intro: '쿠버네티스에는 "이 애플리케이션을 3개 띄워 둬라"처럼 원하는 상태를 적어 둡니다. 쿠버네티스는 실제 상태를 계속 지켜보다가 원하는 상태와 달라지면 스스로 맞춥니다.',
  terms: ['Kubernetes', 'Pod, Deployment, Service', '헬스 체크(Liveness, Readiness)', '오토스케일링', '컨테이너와 이미지'], ranks: ['container', 'deploy', 'cloud'],
  controls: [
    { id: 'what', label: '일어나는 일', type: 'select', value: 'kill', options: [['kill', 'Pod 하나가 갑자기 죽는다'], ['node', '노드(서버) 한 대가 통째로 죽는다'], ['scale', '복제본 수를 3에서 5로 바꾼다'], ['hang', '애플리케이션이 멈췄다 (프로세스는 살아 있음)'], ['notready', '애플리케이션이 잠시 요청을 받을 수 없다 (DB 연결 끊김)']] },
  ],
  presets: [
    { t: '처음 설정으로', d: 'Pod 하나가 죽습니다. 새 Pod가 자동으로 만들어집니다.', v: { what: 'kill' } },
    { t: '노드가 죽으면', d: '그 노드에 있던 Pod가 다른 노드에 다시 만들어집니다.', v: { what: 'node' } },
    { t: '복제본 수를 늘리면', d: '숫자만 바꾸면 쿠버네티스가 모자란 만큼 만듭니다.', v: { what: 'scale' } },
    { t: '프로세스는 살아 있는데 멈췄다면', d: 'liveness 검사가 실패해 컨테이너를 재시작합니다.', v: { what: 'hang' } },
    { t: '잠시 요청을 못 받는 상태라면', d: 'readiness 검사가 실패해 요청만 끊습니다. 재시작하지 않습니다.', v: { what: 'notready' } },
  ],
  code: function (c) {
    return 'apiVersion: apps/v1\nkind: Deployment\nmetadata: { name: shop }\nspec:\n  replicas: ' + (c.what === 'scale' ? '5                 # 3에서 5로 수정' : '3                 # 원하는 상태: 항상 3개') + '\n  template:\n    spec:\n      containers:\n        - name: app\n          image: shop:1.0\n          livenessProbe:        # 실패하면 컨테이너 재시작\n            httpGet: { path: /actuator/health/liveness, port: 8080 }\n          readinessProbe:       # 실패하면 요청 대상에서만 제외\n            httpGet: { path: /actuator/health/readiness, port: 8080 }';
  },
  label: function (c) { return { kill: 'Pod 하나 죽음', node: '노드 한 대 죽음', scale: '복제본 3 → 5', hang: '애플리케이션 멈춤', notready: '잠시 요청 불가' }[c.what]; },
  columns: ['쿠버네티스가 한 일', '사람이 한 일', '복구 후 Pod 수'],
  simulate: function (c) {
    var ev = [], sum = [], want = 3, pods = [{ n: 'shop-a', node: '노드 1', st: '실행 중', svc: true }, { n: 'shop-b', node: '노드 2', st: '실행 중', svc: true }, { n: 'shop-c', node: '노드 2', st: '실행 중', svc: true }], did, human = '없음';
    function push(s, k) { ev.push({ s: s, k: k, snap: { want: want, pods: pods.map(function (p) { return { n: p.n, node: p.node, st: p.st, svc: p.svc }; }) } }); }
    push('평소 상태입니다. Deployment에 "복제본 3개"라고 적혀 있고, 실제로 Pod 3개가 노드 두 대에 나뉘어 실행 중입니다. Service가 요청을 세 Pod에 나눠 보냅니다.', '');
    if (c.what === 'kill') {
      pods[1].st = '죽음'; pods[1].svc = false; push('shop-b의 컨테이너가 메모리 부족으로 죽었습니다. Service는 이 Pod로 요청을 보내지 않게 됩니다. 실제 Pod 수는 2개가 됐습니다.', 'bad');
      push('컨트롤러가 상태를 비교합니다. 원하는 수 3, 실제 2. 하나가 모자랍니다. 누가 알려 주지 않아도 이 비교는 계속 반복되고 있습니다.', '');
      pods[1] = { n: 'shop-d', node: '노드 1', st: '시작 중', svc: false }; push('새 Pod shop-d를 만듭니다. 스케줄러가 여유 있는 노드를 골라 배치하고, 그 노드의 kubelet이 컨테이너를 띄웁니다. 죽은 Pod를 살리는 것이 아니라 새것으로 교체합니다.', '');
      pods[1].st = '실행 중'; pods[1].svc = true; push('shop-d가 준비 상태 검사(readiness)를 통과했습니다. Service가 요청을 보내기 시작합니다. 다시 3개입니다.', 'good');
      did = '새 Pod 1개 생성'; sum.push('Pod는 언제든 죽고 교체될 수 있는 일회용으로 다룹니다. 그래서 Pod 안에 상태(파일, 세션)를 두면 안 되고, Pod의 IP 대신 Service의 고정된 이름으로 접근합니다.');
    }
    if (c.what === 'node') {
      pods[1].st = '죽음'; pods[1].svc = false; pods[2].st = '죽음'; pods[2].svc = false; push('노드 2가 통째로 꺼졌습니다. 그 위에 있던 shop-b, shop-c와 연락이 끊깁니다. 남은 것은 노드 1의 shop-a 하나입니다.', 'bad');
      push('컨트롤 플레인이 노드 2의 응답 없음을 감지하고, 일정 시간 뒤 그 노드의 Pod들을 사라진 것으로 판정합니다. 원하는 수 3, 실제 1.', '');
      pods[1] = { n: 'shop-d', node: '노드 1', st: '시작 중', svc: false }; pods[2] = { n: 'shop-e', node: '노드 3', st: '시작 중', svc: false }; push('모자란 2개를 살아 있는 노드에 새로 만듭니다.', '');
      pods[1].st = '실행 중'; pods[1].svc = true; pods[2].st = '실행 중'; pods[2].svc = true; push('새 Pod들이 준비되어 요청을 받습니다. 그 사이 shop-a 혼자 요청을 감당했습니다.', 'good');
      did = '새 Pod 2개를 다른 노드에 생성'; sum.push('노드 장애에도 견디려면 Pod가 여러 노드에 흩어져 있어야 합니다. 세 개가 모두 한 노드에 있었다면 서비스가 잠시 완전히 멈췄을 것입니다.');
    }
    if (c.what === 'scale') {
      want = 5; human = 'replicas 숫자 수정'; push('운영자가 Deployment의 replicas를 5로 고쳤습니다. 한 일은 "원하는 상태"의 숫자를 바꾼 것뿐입니다. Pod를 직접 만들라는 명령은 하지 않았습니다.', '');
      push('컨트롤러가 비교합니다. 원하는 수 5, 실제 3. 두 개가 모자랍니다.', '');
      pods.push({ n: 'shop-d', node: '노드 1', st: '시작 중', svc: false }); pods.push({ n: 'shop-e', node: '노드 3', st: '시작 중', svc: false }); push('Pod 두 개를 새로 만듭니다.', '');
      pods[3].st = '실행 중'; pods[3].svc = true; pods[4].st = '실행 중'; pods[4].svc = true; push('준비가 끝나 Service의 대상에 추가됩니다. 요청이 5개에 나뉩니다.', 'good');
      did = '새 Pod 2개 생성'; sum.push('쿠버네티스에는 "무엇을 하라"가 아니라 "어떤 상태여야 한다"를 알려 줍니다(선언형). 이 숫자를 CPU 사용률에 따라 자동으로 바꿔 주는 것이 오토스케일러(HPA)입니다.');
    }
    if (c.what === 'hang') {
      pods[1].st = '멈춤 (프로세스는 있음)'; push('shop-b의 애플리케이션이 교착 상태에 빠져 응답하지 않습니다. 프로세스는 살아 있어서 쿠버네티스가 보기에 컨테이너는 "실행 중"입니다. 그대로 두면 이 Pod로 간 요청은 계속 실패합니다.', 'bad');
      pods[1].st = 'liveness 검사 실패'; pods[1].svc = false; push('kubelet이 주기적으로 보내는 liveness 검사가 연속으로 실패합니다. "이 컨테이너는 스스로 회복할 수 없는 상태"라고 판단합니다.', '');
      pods[1].st = '컨테이너 재시작 중'; push('kubelet이 그 컨테이너를 강제로 종료하고 같은 Pod 안에서 다시 시작합니다.', '');
      pods[1].st = '실행 중'; pods[1].svc = true; push('애플리케이션이 다시 떠서 검사를 통과하고 요청을 받습니다.', 'good');
      did = '컨테이너 재시작'; sum.push('liveness 검사는 "재시작하면 나아지는 문제"를 잡기 위한 것입니다. DB 연결 같은 외부 의존성을 liveness에 넣으면 DB 장애 때 모든 Pod가 끝없이 재시작되므로, 애플리케이션 자체의 상태만 보게 합니다.');
    }
    if (c.what === 'notready') {
      pods[1].st = 'readiness 검사 실패'; pods[1].svc = false; push('shop-b가 DB 연결을 잃어 지금은 요청을 처리할 수 없습니다. readiness 검사가 실패합니다. 쿠버네티스는 이 Pod를 Service의 요청 대상에서 뺍니다. 컨테이너는 그대로 둡니다.', 'bad');
      push('요청은 나머지 두 Pod로만 갑니다. shop-b는 재시작되지 않고 스스로 회복하기를 기다립니다. Pod 수는 여전히 3개라서 새 Pod도 만들지 않습니다.', '');
      pods[1].st = '실행 중'; pods[1].svc = true; push('shop-b가 DB에 다시 연결됐습니다. readiness 검사를 통과하자 Service가 다시 요청을 보냅니다.', 'good');
      did = '요청 대상에서 뺐다가 다시 포함'; sum.push('readiness 검사는 "잠깐 못 받을 뿐 곧 괜찮아지는 상태"를 다룹니다. 기동 직후 준비가 덜 됐을 때나 배포 중에도 같은 원리로 요청을 막습니다. liveness는 재시작, readiness는 요청 차단이라는 차이가 핵심입니다.');
    }
    sum.push('컨트롤러는 원하는 상태와 실제 상태를 끊임없이 비교해 차이를 메웁니다. 이 반복이 쿠버네티스의 기본 동작 원리입니다.');
    return { events: ev, summary: sum, row: [did, human, pods.length + '개'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 시작합니다.'); return; }
    H.table(v, ['Pod', '노드', '상태', 'Service가 요청을 보내는가'], s.pods.map(function (p) { return { cls: p.st === '죽음' ? 'gone' : '', cells: [p.n, p.node, { v: p.st, cls: p.st === '실행 중' ? 'good' : p.st === '죽음' || p.st.indexOf('실패') >= 0 || p.st.indexOf('멈춤') >= 0 ? 'bad' : 'hot' }, { v: p.svc ? '예' : '아니오', cls: p.svc ? '' : 'bad' }] }; }), 'Pod 목록');
  },
  // 그림: 위에 Deployment(원하는 상태)와 Service, 아래에 노드 세 대와 그 위의 Pod. Service의 화살표는 요청이 가는 Pod.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { want: 3, pods: [] }, alive = s.pods.filter(function (p) { return p.st === '실행 중'; }).length, to = s.pods.filter(function (p) { return p.svc; }).length, nodeDown = c.what === 'node' && shown.length >= 2;
    P.size(680, 330);
    P.box('dep', 16, 16, 300, 44, { cls: 'plain', title: 'Deployment (원하는 상태)', right: 'Pod ' + s.want + '개' });
    P.box('svc', 364, 16, 300, 44, { cls: 'wait', title: 'Service (요청을 나눠 보냄)', right: to + '곳으로' });
    P.text('cmp', 16, 84, '실제로 실행 중인 Pod ' + alive + '개' + (alive < s.want ? '. 원하는 수보다 모자람' : '. 원하는 수와 같음'), { cls: alive < s.want ? 'bad' : 'good' });
    ['노드 1', '노드 2', '노드 3'].forEach(function (name, i) {
      var x = 16 + i * 222, k = 0;
      P.region('node' + i, x, 100, 204, 214, name + (nodeDown && i === 1 ? ' (꺼짐)' : ''));
      s.pods.forEach(function (p) {
        if (p.node !== name) return; var id = 'pod_' + p.n, st = p.st;
        P.box(id, x + 12, 136 + k * 56, 180, 48, { cls: st === '실행 중' ? 'good' : st === '죽음' || st.indexOf('실패') >= 0 || st.indexOf('멈춤') >= 0 ? 'bad' : 'hot', title: p.n, sub: st });
        if (p.svc) P.arrow('rq_' + p.n, 'svc:b:' + (0.2 + i * 0.3), id + (k ? ':r' : ':t'), { cls: 'good' });
        k++;
      });
    });
    P.note('초록 화살표는 Service가 요청을 보내는 Pod입니다. 새 Pod는 준비가 끝난 뒤에야 화살표가 연결됩니다.');
  },
  assume: '복제본 3개, 노드 세 대의 단순한 구성입니다. 감지와 복구에 걸리는 시간은 표시하지 않았습니다(노드 장애는 감지 후 Pod를 옮기기까지 기본 설정으로 수 분이 걸립니다). Deployment, 컨트롤러, 두 가지 검사의 동작은 쿠버네티스 공식 문서의 설명을 따랐습니다. 실제 클러스터에서 실행한 결과는 아닙니다.',
});
