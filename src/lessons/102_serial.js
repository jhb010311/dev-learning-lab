Lab.register({
  id: 'serial', nav: '직렬화', cat: '자바 언어', mode: 'step',
  title: '저장한 객체를 되살리면 무엇이 돌아오나',
  intro: '자바의 기본 직렬화는 객체를 바이트로 바꿔 파일에 쓰고(writeObject), 그 바이트로 객체를 다시 만들어 냅니다(readObject). 그런데 객체의 모든 것이 저장되는 것은 아니고, 아무 객체나 저장할 수 있는 것도 아닙니다. point 값을 50으로 두고 저장한 다음 70으로 바꾸고 나서 되살려 보면서, 무엇이 저장되고 무엇이 저장되지 않는지 확인합니다.',
  terms: ['직렬화와 역직렬화', 'Serializable', 'transient', 'serialVersionUID', 'static'],
  controls: [
    { id: 'cls', label: 'User 클래스', type: 'select', value: 'ok', options: [['ok', 'Serializable을 구현함'], ['no', 'Serializable을 구현하지 않음'], ['field', 'Serializable을 구현했지만, 필드로 가진 Address는 구현하지 않음']] },
    { id: 'fld', label: 'point 필드의 선언', type: 'select', value: 'transient', options: [['plain', 'int point (보통 필드)'], ['transient', 'transient int point'], ['static', 'static int point']] },
    { id: 'chg', label: '저장한 뒤 User 클래스에 생긴 변화', type: 'select', value: 'same', options: [['same', '바꾸지 않음'], ['uid', 'serialVersionUID를 1L에서 2L로 바꿈'], ['auto', 'serialVersionUID를 적지 않은 클래스에 필드를 하나 추가']], show: function (c) { return c.cls === 'ok'; }, hint: '클래스를 고쳐 다시 컴파일한 뒤에, 전에 저장해 둔 파일을 읽는 경우입니다.' },
  ],
  // 저장부터 실패하는 클래스에서는 저장 뒤의 변화가 뜻이 없다
  fix: function (c) { return c.cls !== 'ok' && c.chg !== 'same' ? { chg: 'same' } : null; },
  presets: [
    { t: '처음 설정으로', q: 'Serializable을 구현한 User의 transient int point에 50을 저장하고 되살리면 point는 어떻게 되나', d: 'transient 필드. 50을 저장했는데 되살리면 0입니다.', v: { cls: 'ok', fld: 'transient', chg: 'same' } },
    { t: '보통 필드', q: 'point 필드에서 transient를 빼 보통 필드로 두면', d: '저장할 때의 값 50이 그대로 돌아옵니다.', v: { cls: 'ok', fld: 'plain', chg: 'same' } },
    { t: 'static 필드', q: 'point 필드를 static int point로 바꾸고 저장한 뒤에 값을 70으로 바꾸면', d: '저장된 값이 아니라 지금 클래스가 가진 값 70이 보입니다.', v: { cls: 'ok', fld: 'static', chg: 'same' } },
    { t: 'Serializable을 구현하지 않으면', q: 'User 클래스가 Serializable을 구현하지 않고 point를 보통 필드로 두면', d: '저장할 때 NotSerializableException이 발생합니다.', v: { cls: 'no', fld: 'plain', chg: 'same' } },
    { t: '필드로 가진 객체가 문제라면', q: 'point를 보통 필드로 두고 User는 Serializable을 구현했지만 필드로 가진 Address는 구현하지 않으면', d: 'User가 아니라 Address 때문에 저장에 실패합니다.', v: { cls: 'field', fld: 'plain', chg: 'same' } },
    { t: '저장한 뒤 serialVersionUID를 바꾸면', q: 'point를 보통 필드로 두고 저장한 뒤 serialVersionUID를 1L에서 2L로 바꾸면', d: '되살릴 때 InvalidClassException이 발생합니다.', v: { cls: 'ok', fld: 'plain', chg: 'uid' } },
    { t: 'serialVersionUID 없이 필드를 추가하면', q: 'point를 보통 필드로 두고 serialVersionUID를 적지 않은 클래스에 저장한 뒤 필드를 하나 추가하면', d: '자동으로 계산되는 값이 달라져 역시 되살리지 못합니다.', v: { cls: 'ok', fld: 'plain', chg: 'auto' } },
  ],
  code: function (c) {
    var ser = c.cls !== 'no', P = c.fld === 'static' ? 'User.point' : 'u.point', pad = function (x) { while (x.length < 50) x += ' '; return x; };
    var decl = { plain: pad('    int point;'), transient: pad('    transient int point;') + '// transient: 저장하지 않는다', static: pad('    static int point;') + '// static: 객체가 아니라 클래스에 속한다' }[c.fld];
    var s = c.cls === 'field' ? pad('class Address {') + '// Serializable을 구현하지 않았다\n    String city = "Seoul";\n}\n\n' : '';
    s += 'class User' + (ser ? ' implements Serializable' : '') + ' {\n' + (ser && c.chg !== 'auto' ? '    private static final long serialVersionUID = 1L;\n' : '') + '    String name;\n' + decl.replace(/\s+$/, '') + '\n' + (c.cls === 'field' ? '    Address address = new Address();\n' : '')
      + '    User(String name) {\n        this.name = name;\n        System.out.println("생성자 실행");\n    }\n}\n\n';
    s += 'User u = new User("kim");\n' + P + ' = 50;\ntry (ObjectOutputStream out = new ObjectOutputStream(new FileOutputStream("user.ser"))) {\n' + pad('    out.writeObject(u);') + '// 객체를 바이트로 바꿔 파일에 쓴다\n}\n' + pad(P + ' = 70;') + '// 저장한 뒤에 값을 바꾼다\n\n';
    if (c.chg === 'uid') s += '// ── 여기서 User 클래스를 고쳐 다시 컴파일한다 ──\n//     private static final long serialVersionUID = 2L;\n// 그런 다음 아래 코드로 전에 저장한 파일을 읽는다\n\n';
    if (c.chg === 'auto') s += '// ── 여기서 User 클래스를 고쳐 다시 컴파일한다 ──\n//     String email;          (필드 하나 추가)\n// 그런 다음 아래 코드로 전에 저장한 파일을 읽는다\n\n';
    s += 'try (ObjectInputStream in = new ObjectInputStream(new FileInputStream("user.ser"))) {\n' + pad('    User r = (User) in.readObject();') + '// 파일의 바이트로 객체를 되살린다\n    System.out.println(r.name + " " + ' + (c.fld === 'static' ? 'User.point' : 'r.point') + ');\n}';
    return s;
  },
  label: function (c) { return { ok: 'Serializable', no: 'Serializable 아님', field: '필드 Address가 Serializable 아님' }[c.cls] + ' · ' + { plain: 'int point', transient: 'transient point', static: 'static point' }[c.fld] + { same: '', uid: ' · UID 1 → 2', auto: ' · UID 없이 필드 추가' }[c.chg]; },
  columns: ['저장 (writeObject)', '되살리기 (readObject)', '되살린 뒤 읽은 point', '생성자 실행 횟수'],
  simulate: function (c) {
    var F = c.fld, ev = [], sum = [], P = F === 'static' ? 'User.point' : 'u.point', auto = c.chg === 'auto', uidText = auto ? '자동으로 계산한 값' : '1';
    var st = { ctor: 0, u: null, sp: null, file: null, ver: c.cls === 'no' ? '' : uidText, r: null, save: '?', load: '?', val: '?', ex: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    st.ctor = 1; st.u = { name: 'kim', point: F === 'static' ? null : 0, addr: c.cls === 'field' }; if (F === 'static') st.sp = 0;
    push('new User("kim"): User 객체를 만듭니다. 생성자가 실행되어 "생성자 실행"이 한 번 출력됩니다.' + (c.cls === 'field' ? ' 이 객체는 address 필드로 Address 객체 하나를 가리킵니다.' : ''));
    if (F === 'static') st.sp = 50; else st.u.point = 50;
    push(P + ' = 50: ' + (F === 'static' ? 'point는 static 필드라서 객체 u 안에 있지 않고 User 클래스에 하나만 있습니다. 그 값이 50이 됩니다.' : '객체 u의 point 필드에 50을 넣습니다.'));
    if (c.cls === 'no') {
      st.save = 'NotSerializableException (User)'; st.file = 'fail'; st.ex = 'NotSerializableException: User'; st.load = '하지 못함'; st.val = '없음';
      push('out.writeObject(u): User 클래스가 Serializable을 구현하지 않았습니다. 저장해도 된다고 표시하지 않은 객체이므로 NotSerializableException: User가 발생하고, 프로그램은 여기서 멈춥니다. 그 아래의 코드는 실행되지 않습니다.', 'bad');
    } else if (c.cls === 'field') {
      st.save = 'NotSerializableException (Address)'; st.file = 'fail'; st.ex = 'NotSerializableException: Address'; st.load = '하지 못함'; st.val = '없음';
      push('out.writeObject(u): User는 Serializable이지만, writeObject는 객체가 필드로 가리키는 객체까지 따라가 함께 저장합니다. address가 가리키는 Address가 Serializable을 구현하지 않았으므로 NotSerializableException: Address가 발생하고, 프로그램은 여기서 멈춥니다.', 'bad');
    } else {
      st.save = '성공'; st.file = { uid: uidText, point: F === 'plain' ? 50 : null };
      push('out.writeObject(u): 객체 u의 필드 값을 바이트로 바꿔 파일에 씁니다. ' + (F === 'plain' ? 'name = "kim"과 point = 50이 저장됩니다.' : F === 'transient' ? 'name = "kim"만 저장됩니다. point는 transient로 선언했으므로 건너뜁니다.' : 'name = "kim"만 저장됩니다. static인 point는 객체가 아니라 클래스에 속한 값이라서 저장 대상이 아닙니다.') + ' 어떤 클래스의 객체인지 알 수 있도록 클래스 이름 User와 serialVersionUID(' + (auto ? '적어 두지 않았으므로 클래스의 모양으로부터 자동으로 계산한 값' : '1') + ')도 함께 기록됩니다.', F === 'plain' ? 'good' : '');
      if (F === 'static') st.sp = 70; else st.u.point = 70;
      push(P + ' = 70: 저장한 뒤에 메모리의 값을 70으로 바꿉니다. 이미 써 둔 파일의 내용은 바뀌지 않습니다.');
      if (c.chg === 'uid') { st.ver = '2'; push('User 클래스를 고쳐 다시 컴파일: serialVersionUID를 1L에서 2L로 바꿨습니다. 파일에는 여전히 1이 기록돼 있습니다.'); }
      if (auto) { st.ver = '자동으로 계산한 값 (달라짐)'; push('User 클래스를 고쳐 다시 컴파일: 필드 String email을 추가했습니다. serialVersionUID를 적어 두지 않았으므로 자바가 클래스의 모양(이름, 필드, 메서드 등)으로부터 값을 계산하는데, 필드가 늘어나 그 값이 달라졌습니다.'); }
      if (c.chg === 'same') {
        st.load = '성공'; st.r = { name: 'kim', point: F === 'plain' ? 50 : F === 'transient' ? 0 : null };
        push('in.readObject(): 파일에 기록된 클래스 이름과 serialVersionUID가 지금의 User 클래스와 같은지 확인합니다. 같으므로 새 User 객체를 만들고 저장된 필드 값을 채워 넣습니다. 이때 User의 생성자는 실행되지 않습니다. "생성자 실행"은 다시 출력되지 않습니다.', 'good');
        st.val = F === 'plain' ? '50 (저장할 때의 값)' : F === 'transient' ? '0 (기본값)' : '70 (저장 뒤에 바꾼 값)';
        if (F === 'plain') push('r.point: 50입니다. 파일에 저장해 둔 값이 돌아왔습니다. 저장한 뒤에 70으로 바꾼 것은 원래 객체 u이고, 되살린 r은 u와 다른 새 객체입니다.', 'good');
        if (F === 'transient') push('r.point: 0입니다. transient 필드는 파일에 저장되지 않았으므로 채워 넣을 값이 없습니다. 그 타입의 기본값(int는 0, 참조형이면 null)이 됩니다.', 'bad');
        if (F === 'static') push('User.point: 70입니다. static 필드는 파일에 저장되지 않았고, 되살리는 과정도 이 값을 건드리지 않습니다. 지금 이 프로그램에서 User 클래스가 가지고 있는 값 70이 그대로 보입니다.', 'bad');
      } else {
        st.load = 'InvalidClassException'; st.val = '없음'; st.ex = 'InvalidClassException';
        push('in.readObject(): 파일에 기록된 serialVersionUID와 지금 User 클래스의 serialVersionUID를 비교합니다. ' + (auto ? '저장할 때 계산된 값과 필드를 추가한 지금의 클래스에서 계산한 값이 다릅니다.' : '파일은 1, 지금 클래스는 2입니다.') + ' 서로 맞지 않는 버전의 클래스로 보고 InvalidClassException을 던집니다. 객체는 되살아나지 않습니다.', 'bad');
      }
    }
    if (c.cls === 'no') sum.push('자바의 기본 직렬화는 Serializable을 구현한 클래스의 객체만 저장합니다. Serializable에는 구현할 메서드가 없고, "이 클래스의 객체는 저장해도 된다"는 표시 역할만 합니다.');
    if (c.cls === 'field') sum.push('객체를 저장하면 그 객체가 필드로 가리키는 객체들도 함께 저장됩니다. 그 가운데 하나라도 Serializable이 아니면 전체가 실패합니다. Address도 Serializable로 만들거나, 저장할 필요가 없는 필드라면 transient를 붙입니다.');
    if (st.load === '성공') {
      if (F === 'plain') sum.push('보통의 인스턴스 필드는 저장할 때의 값이 그대로 돌아옵니다. 되살린 객체는 원래 객체와 내용이 같은 다른 객체입니다.');
      if (F === 'transient') sum.push('transient를 붙인 필드는 저장되지 않고, 되살린 객체에서는 기본값이 됩니다. 비밀번호처럼 파일에 남기면 안 되는 값이나, 다시 계산하면 되는 값에 씁니다.');
      if (F === 'static') sum.push('static 필드는 객체의 일부가 아니라 클래스에 속하므로 저장되지 않습니다. 지금 70이 보이는 것은 같은 프로그램 안에서 읽었기 때문이고, 프로그램을 새로 시작해 읽으면 그 프로그램에서 static 필드가 가진 값(따로 넣지 않았다면 0)이 보입니다.');
      sum.push('되살릴 때는 Serializable 클래스의 생성자가 실행되지 않습니다. 생성자에서 하던 값 검사나 준비 작업이 건너뛰어진다는 뜻이므로, 믿을 수 없는 곳에서 온 데이터를 되살리는 것은 위험합니다.');
    }
    if (c.chg === 'uid' && st.save === '성공') sum.push('serialVersionUID는 "저장할 때의 클래스와 읽을 때의 클래스가 서로 맞는 버전인가"를 확인하는 번호입니다. 번호가 다르면 내용을 보지도 않고 거부합니다.');
    if (auto && st.save === '성공') sum.push('serialVersionUID를 적지 않으면 클래스를 조금만 고쳐도 자동으로 계산되는 값이 바뀌어, 전에 저장한 데이터를 읽지 못하게 됩니다. private static final long serialVersionUID = 1L;처럼 직접 적어 두면, 필드를 추가해도 전에 저장한 데이터를 읽을 수 있고 새 필드는 기본값이 됩니다.');
    return { events: ev, summary: sum, row: [st.save, st.load, st.val, st.ctor + '번'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, '실행을 누르면 한 줄씩 진행합니다.'); return; }
    var ln = H.lanes(v);
    H.lane(ln, '저장', s.save, s.save === '성공' ? 'good' : s.save === '?' ? 'none' : 'bad');
    H.lane(ln, '되살리기', s.load, s.load === '성공' ? 'good' : s.load === '?' ? 'none' : s.load === '하지 못함' ? 'wait' : 'bad');  },
  // 그림: 왼쪽에 원래 객체(와 클래스의 static 값), 가운데에 파일에 저장된 내용, 오른쪽에 되살린 객체. 화살표가 저장과 되살리기다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { ctor: 0, u: null, sp: null, file: null, ver: c.cls === 'no' ? '' : c.chg === 'auto' ? '자동으로 계산한 값' : '1', r: null, save: '?', load: '?', val: '?', ex: '' };
    P.size(680, 322);
    P.region('ra', 16, 16, 196, 196, '메모리: 원래 객체');
    P.region('rb', 244, 16, 192, 196, '파일 user.ser');
    P.region('rc', 468, 16, 196, 196, '메모리: 되살린 객체');
    var usub = s.u ? ['name = "kim"'].concat(s.u.point === null ? [] : ['point = ' + s.u.point], s.u.addr ? ['address → Address 객체'] : []) : ['아직 없음'];
    P.box('u', 24, 52, 180, 84, { cls: s.u ? 'wait' : 'ghost', title: 'u (User 객체)', sub: usub });
    if (c.fld === 'static') P.box('sp', 24, 150, 180, 48, { cls: s.sp === null ? 'ghost' : 'hot', title: 'User.point = ' + (s.sp === null ? '?' : s.sp), sub: 'static: 클래스에 하나' });
    var fsub = !s.file ? ['아직 쓰지 않음'] : s.file === 'fail' ? ['저장 실패'] : ['클래스 User', 'UID: ' + (s.file.uid === '1' ? '1' : '자동 계산'), 'name = "kim"', s.file.point === null ? '(point는 없음)' : 'point = ' + s.file.point];
    P.box('f', 252, 52, 176, 110, { cls: !s.file ? 'ghost' : s.file === 'fail' ? 'bad' : 'good', title: '저장된 내용', sub: fsub });
    var rsub = s.r ? ['name = "kim"'].concat(s.r.point === null ? [] : ['point = ' + s.r.point]) : [s.load === 'InvalidClassException' ? '되살리지 못함' : '아직 없음'];
    P.box('r', 476, 52, 180, 84, { cls: s.r ? 'good' : s.load === 'InvalidClassException' ? 'bad' : 'ghost', title: 'r (되살린 객체)', sub: rsub });
    if (s.save !== '?') P.arrow('aw', 'u:r', 'f:l:0.3', { cls: s.save === '성공' ? 'good' : 'bad', label: '저장' });
    if (s.load === '성공' || s.load === 'InvalidClassException') P.arrow('ar', 'f:r:0.3', 'r:l', { cls: s.load === '성공' ? 'good' : 'bad', label: '되살림' });
    P.box('k1', 16, 226, 320, 36, { cls: 'plain', title: '생성자 실행 횟수', right: s.ctor + '번' });
    P.box('k2', 344, 226, 320, 36, { cls: s.ver === '2' || s.ver.indexOf('달라짐') >= 0 ? 'hot' : 'plain', title: '지금 User의 UID', right: s.ver ? P.fit(s.ver, 180) : '없음' });
    P.box('k3', 16, 272, 648, 36, { cls: s.ex ? 'bad' : s.val !== '?' ? 'good' : 'ghost', title: s.ex ? '발생한 예외' : '되살린 뒤 읽은 point', right: s.ex || s.val });
    P.note('왼쪽 화살표가 writeObject(저장), 오른쪽 화살표가 readObject(되살리기)입니다. 파일에 들어가는 것은 객체의 인스턴스 필드 값과, 어떤 클래스의 객체인지 알려 주는 클래스 이름과 serialVersionUID(그림의 UID)입니다.');
  },
  assume: '열다섯 가지 조합마다 화면의 코드와 같은 소스를 이 PC의 JDK 21에서 컴파일하고 실행해, 저장과 되살리기의 성공 여부, 발생한 예외, 되살린 값, 생성자가 실행된 횟수를 대조했습니다. 저장한 뒤 클래스를 고치는 조합은 같은 이름의 User 클래스를 두 벌 따로 컴파일해, 한쪽으로 저장한 파일을 다른 쪽으로 읽었습니다. serialVersionUID를 적어 둔 채 필드를 추가하면 읽을 수 있고 새 필드가 null이라는 것, transient인 참조형 필드가 null이 된다는 것, static 필드를 다른 프로그램에서 읽으면 0이라는 것, Address 필드에 transient를 붙이면 저장된다는 것도 따로 실행해 확인했습니다. 파일에 실제로 기록되는 바이트의 형식은 그림에서 줄였습니다. 생성자가 실행되지 않는 것은 Serializable을 구현한 클래스의 이야기이며, 부모 클래스가 Serializable이 아닌 경우의 규칙, writeObject와 readObject를 직접 정의하는 방법, record의 직렬화는 다루지 않았습니다. 자바의 기본 직렬화는 보안 문제 때문에 새 코드에서는 잘 쓰지 않고 JSON 같은 형식을 주로 쓰지만, 기존 코드와 라이브러리를 이해하려면 이 규칙들을 알아야 합니다.',
});
