Lab.register({
  id: 'config_basic', nav: '설정 파일', cat: '기초개념', mode: 'step', basic: true, deep: ['config', 'autoconf'],
  title: '설정 파일은 무엇이고, 코드에 적는 것과 무엇이 다른가',
  why: '같은 프로그램을 내 컴퓨터, 시험용 서버, 실제 서버에 띄우면 DB 주소와 포트가 곳마다 다르다. 스프링 부트의 설정 파일은 이런 값을 코드 밖으로 빼서, 한 번 만든 jar 파일 하나를 그대로 두고 곳마다 설정만 바꿔 쓰게 한다.',
  use: 'DB 접속 주소(spring.datasource.url), 서버 포트(server.port), 로그를 얼마나 자세히 찍을지 같은 값을 적는다. 개발용과 운영용 값이 다르면 application-dev.properties처럼 프로파일마다 파일을 나누고, 비밀번호처럼 코드 저장소에 올리면 안 되는 값은 환경 변수로 넘기는 일이 많다.',
  intro: '설정 파일은 코드와 따로 둔 글 파일입니다. 스프링 부트에서는 application.properties라는 이름이고, 안에는 "이름=값" 줄을 적습니다(shop.name=kim-shop). 포트 번호나 접속 주소처럼 환경마다 달라지는 값을 코드에 직접 적으면 값이 바뀔 때마다 코드를 고쳐 다시 컴파일해야 하므로, 값은 이 파일에 두고 코드는 이름만 적습니다. 코드에서 값이 필요한 필드 위에 @Value("${이름}") 줄을 적으면, 스프링이 객체를 만들 때 설정 파일에서 그 이름의 값을 찾아 필드에 넣어 줍니다. ${이름:기본값} 꼴로 : 뒤에 기본값을 적어 두면 설정에 그 이름이 없을 때 그 값을 씁니다. 이 실습은 설정 파일의 shop.name 줄을 바꾸거나 지우고, @Value에 기본값을 붙이거나 떼면서 java 명령으로 프로그램을 실행해, name 필드에 어떤 값이 들어오는지, 프로그램이 제대로 시작하는지를 봅니다. (ShopInfo, App, shop.name은 이 실습에서 예시로 지은 이름입니다.)',
  terms: ['application.properties', '@Value', '${...} 자리 표시자', '외부화 설정과 프로파일'],
  controls: [
    { id: 'prop', label: 'application.properties의 shop.name 줄', type: 'select', value: 'kim', options: [['kim', 'shop.name=kim-shop'], ['lee', 'shop.name=lee-shop'], ['none', '그 줄을 지운다']] },
    { id: 'def', label: '@Value에 기본값을 적는다: ${shop.name:no-name}', type: 'check', value: false },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '설정 파일의 shop.name=kim-shop 줄에 적힌 값은 어떻게 name 필드로 들어오고, 실행하면 무슨 일이 일어나나', d: '설정 파일에 이름과 값이 있고 코드는 이름만 적습니다. 스프링이 객체를 만들 때 name에 kim-shop 값을 넣어 줍니다.', v: { prop: 'kim', def: false } },
    { t: '설정 파일의 값을 바꾸면', q: '설정 파일의 shop.name=kim-shop 줄을 shop.name=lee-shop 줄로 바꾸면', d: '파일의 한 줄만 고쳤고 코드는 그대로입니다. name에 lee-shop 값이 들어옵니다.', v: { prop: 'lee', def: false } },
    { t: '그 줄을 지우면', q: '설정 파일에서 shop.name 줄을 지우면', d: '찾을 값이 없어 스프링이 시작하다 멈춥니다. println이 찍는 글이 없습니다.', v: { prop: 'none', def: false } },
    { t: '줄은 지웠지만 기본값을 적으면', q: '설정 파일에서 shop.name 줄은 지웠지만 @Value 줄에 기본값을 적어 두면(${shop.name:no-name})', d: '설정에 이름이 없으니 no-name 기본값을 씁니다. 오류 없이 시작합니다.', v: { prop: 'none', def: true } },
    { t: '기본값도 있고 설정 파일에도 값이 있으면', q: '@Value 줄에 기본값을 적고(${shop.name:no-name}), 설정 파일에도 shop.name=kim-shop 줄이 있으면', d: '설정 파일에 이름이 있으면 그 값을 쓰고 기본값은 쓰이지 않습니다.', v: { prop: 'kim', def: true } },
  ],
  VAL: { kim: 'kim-shop', lee: 'lee-shop' },
  code: function (c) {
    var out = ['# application.properties'];
    if (c.prop !== 'none') out.push('# 설정: 이름=값 꼴로 코드 밖에 적는 값', 'shop.name=' + this.VAL[c.prop]);
    out.push('', '@Component', 'class ShopInfo {', '    // 받기: 설정에서 shop.name 값을 찾아 name에 넣는다', '    @Value("${shop.name' + (c.def ? ':no-name' : '') + '}")', '    String name;', '}', '',
      '@SpringBootApplication', 'public class App {', '    public static void main(String[] args) {', '        // 스프링을 시작한다. ctx는 스프링이 만든 객체를 보관한 곳이다',
      '        ApplicationContext ctx = SpringApplication.run(App.class, args);', '        ShopInfo info = ctx.getBean(ShopInfo.class);', '        System.out.println(info.name);', '    }', '}');
    return out.join('\n');
  },
  label: function (c) { return { kim: '설정 파일 shop.name=kim-shop', lee: '설정 파일 shop.name=lee-shop', none: '설정 파일에 shop.name 줄 없음' }[c.prop] + ' · ' + (c.def ? '기본값 no-name 있음' : '기본값 없음'); },
  columns: ['name에 들어온 값', '시작', '오류'],
  simulate: function (c) {
    var ev = [], sum = [], has = c.prop !== 'none', val = has ? this.VAL[c.prop] : '', fail = !has && !c.def;
    var kind = has ? (c.def ? 'foundDef' : (c.prop === 'kim' ? 'found' : 'foundLee')) : (c.def ? 'dflt' : 'fail');
    // file: 설정 파일의 shop.name 값(없으면 ''), list: 스프링이 읽어 둔 설정 목록의 값 또는 null(아직 안 읽음), made: ShopInfo 객체가 만들어졌는가, name: 필드의 값,
    // out: 화면에 찍힌 글, exit: 프로세스 종료 코드(끝나기 전에는 null)
    var st = { file: val, phase: 'main', read: false, made: false, name: null, bad: false, out: null, exit: null };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var NOFILE = 'shop.name 이름';
    push('컴퓨터에서 java 명령으로 App 클래스를 실행하면, 자바가 App 클래스의 main 메서드를 부릅니다. main 메서드의 첫 줄 SpringApplication.run(App.class, args) 줄이 스프링 부트를 시작합니다.', '');
    st.phase = 'read'; st.read = true;
    if (has) {
      push('스프링 부트가 시작하면서 클래스 파일이 있는 곳에서 application.properties 파일을 찾아 읽습니다. 이 파일은 자바 코드가 아니라 "이름=값" 줄이 모인 글 파일입니다. shop.name=' + val + ' 줄을 읽어, 스프링의 설정 목록에 shop.name = ' + val + ' 한 쌍을 적어 둡니다.' + (c.prop === 'lee' && !c.def ? ' 처음 설정과 다른 곳은 이 줄의 값뿐입니다. ShopInfo와 App 코드는 그대로여서 다시 컴파일할 것이 없습니다.' : ''), '');
    } else {
      push('스프링 부트가 시작하면서 가장 먼저 클래스 파일이 있는 곳에서 application.properties 파일을 찾아 읽습니다. 이 파일은 자바 코드가 아니라 "이름=값" 줄이 모인 글 파일입니다. 그런데 이 파일에는 이름=값 줄이 하나도 없습니다(맨 위의 # 줄은 사람이 읽는 설명이라 설정이 아닙니다). 스프링의 설정 목록에 ' + NOFILE + '은 없습니다.', '');
    }
    st.phase = 'make';
    push('다음으로 스프링은 App 클래스가 있는 패키지부터 클래스를 훑어 @Component가 붙은 ShopInfo 클래스를 찾고, 그 객체를 만들기 시작합니다. 우리가 쓴 코드에는 new ShopInfo()라는 줄이 없습니다. 객체는 스프링이 main 메서드의 SpringApplication.run 줄 안에서 만듭니다.', '');
    st.phase = 'value';
    if (kind === 'found' || kind === 'foundLee') {
      st.made = true; st.name = val;
      push('객체를 만드는 동안 name 필드 위의 @Value("${shop.name}") 줄을 읽습니다. ${ } 안은 "설정 목록에서 이 이름의 값을 찾아 오라"는 뜻입니다. ' + NOFILE + '으로 설정 목록을 찾으니 ' + val + ' 값이 있어, 스프링이 name 필드에 그 값을 넣습니다. 우리가 쓴 코드에는 name에 값을 넣는 줄도 없습니다.', 'good');
    } else if (kind === 'foundDef') {
      st.made = true; st.name = val;
      push('객체를 만드는 동안 name 필드 위의 @Value("${shop.name:no-name}") 줄을 읽습니다. ${ } 안은 "설정 목록에서 이 이름의 값을 찾아 오라"는 뜻이고, : 뒤의 no-name 값은 "이름이 없을 때 쓸 값"입니다. ' + NOFILE + '으로 설정 목록을 찾으니 ' + val + ' 값이 있어, 스프링이 name 필드에 그 값을 넣습니다. 설정에 이름이 있으므로 : 뒤의 기본값은 쓰이지 않습니다.', 'good');
    } else if (kind === 'dflt') {
      st.made = true; st.name = 'no-name';
      push('객체를 만드는 동안 name 필드 위의 @Value("${shop.name:no-name}") 줄을 읽습니다. ' + NOFILE + '으로 설정 목록을 찾았지만 없습니다. 이 줄에는 : 뒤에 no-name 기본값이 적혀 있으므로, 스프링이 name 필드에 그 값을 넣습니다. 설정에 이름이 없어도 객체 만들기가 멈추지 않습니다.', 'good');
    } else {
      st.bad = true;
      push('객체를 만드는 동안 name 필드 위의 @Value("${shop.name}") 줄을 읽고 ' + NOFILE + '으로 설정 목록을 찾았지만 없습니다. 이 줄에는 이름이 없을 때 쓸 기본값이 적혀 있지 않아, 스프링은 name 필드에 넣을 값을 정할 수 없습니다. ${shop.name} 부분을 값으로 바꾸지 못했다는 뜻의 예외(Could not resolve placeholder \'shop.name\')를 일으키고 객체 만들기를 멈춥니다.', 'bad');
    }
    if (fail) {
      st.phase = 'end'; st.exit = 1;
      push('예외가 SpringApplication.run 줄 안에서 일어났고, 이 예외를 받는 코드가 없습니다. 그래서 main 메서드는 다음 줄인 ctx.getBean 줄과 System.out.println 줄에 가지 못하고 예외로 끝나며, java 프로세스가 오류로 끝납니다(종료 코드 1). println이 찍은 글은 없고, 예외의 내용(스택 트레이스)은 표준 오류로 출력됩니다.', 'bad');
    } else {
      st.phase = 'get';
      push('SpringApplication.run 줄이 끝나고 main 메서드가 다음 줄로 갑니다. ctx.getBean 줄이 스프링이 만들어 보관해 둔 ShopInfo 객체를 꺼내고, 변수 info가 그 객체를 가리킵니다. 이 객체의 name 필드 값은 이미 ' + st.name + '입니다.', '');
      st.phase = 'print'; st.out = st.name;
      push('System.out.println(info.name) 줄이 name에 들어 있는 글을 화면에 찍습니다. 화면에 ' + st.name + ' 한 줄이 찍힙니다.', 'good');
      st.phase = 'end'; st.exit = 0;
      push('main 메서드가 끝납니다. 이 프로젝트에는 요청을 기다릴 웹 서버가 없으므로 java 프로세스도 그대로 끝납니다(종료 코드 0).', '');
    }
    // 요약: 첫 줄은 이 설정(물음)의 답
    if (kind === 'found') {
      sum.push('설정 파일은 코드와 따로 둔 "이름=값" 글 파일(application.properties)입니다. 코드는 필드 위에 @Value("${이름}")만 적고, 스프링이 객체를 만들 때 설정 파일에서 그 이름의 값을 찾아 필드에 넣어 줍니다. 값을 코드에 직접 적은 것과 다른 곳은 값이 코드 밖의 파일에 있다는 점입니다.');
      sum.push('이 프로그램의 코드에는 kim-shop이라는 글자가 한 번도 나오지 않습니다. 값이 필요한 코드는 이름만 알고, 값은 설정 파일에 있습니다.');
    } else if (kind === 'foundLee') {
      sum.push('설정 파일의 한 줄을 shop.name=lee-shop 줄로 고치자 name에 lee-shop 값이 들어왔습니다. 고친 것은 파일뿐이고 ShopInfo와 App 코드는 그대로여서 다시 컴파일하지 않았습니다.');
      sum.push('포트 번호나 접속 주소처럼 환경마다 달라지는 값을 코드에 적으면 환경마다 코드를 고쳐 컴파일해야 합니다. 값을 설정 파일에 두면 같은 코드로 파일만 바꿔 실행할 수 있습니다.');
    } else if (kind === 'foundDef') {
      sum.push('@Value에 no-name 기본값을 적어도, 설정 파일에 shop.name 줄이 있으면 name에는 그 줄의 ' + val + ' 값이 들어옵니다. 기본값은 설정에 그 이름이 없을 때만 쓰입니다.');
      sum.push('기본값은 설정 파일을 빠뜨렸을 때를 대비한 안전장치입니다. 있는 설정이 기본값에 가려지지는 않습니다.');
    } else if (kind === 'dflt') {
      sum.push('설정 파일에 shop.name 줄이 없어도 @Value에 no-name 기본값을 적어 두었으므로 오류 없이 시작했고, name에 no-name 값이 들어왔습니다.');
      sum.push('기본값을 적어 두면 설정이 빠져도 프로그램이 멈추지 않습니다. 기본값을 적지 않으면 설정이 빠졌을 때 시작 단계에서 바로 알 수 있습니다.');
    } else {
      sum.push('설정 파일에서 shop.name 줄을 지우고 @Value에 기본값도 적지 않으면, 스프링이 name에 넣을 값을 정하지 못해 시작하다 멈춥니다. main 메서드는 println 줄에 가지 못해 println이 찍은 글이 없고, 프로세스가 오류로 끝납니다.');
      sum.push('이 오류는 객체를 만드는 순간, 곧 프로그램이 시작할 때 납니다. 값이 필요한 줄을 실행하고 나서야 알게 되는 것이 아니라, 설정이 빠졌다는 것을 시작하자마자 알려 줍니다.');
    }
    var nameCol = fail ? '들어오지 못함' : st.name, errCol = fail ? "shop.name 값을 찾을 수 없음 (Could not resolve placeholder 'shop.name')" : '없음';
    return { events: ev, summary: sum, kind: kind, row: [nameCol, fail ? '실패 (시작하다 멈춤)' : '성공', errCol] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 java가 main 메서드를 실행하는 것부터 시작합니다.'); return; }
    var c = sim.c;
    var fileTxt = s.file ? 'shop.name=' + s.file : '이름=값 줄 없음';
    var listTxt = !s.read ? '아직 읽지 않음' : s.file ? 'shop.name = ' + s.file : '비어 있음';
    var nameTxt = s.name !== null ? s.name : s.bad ? '넣을 값을 정하지 못함' : s.phase === 'value' || s.phase === 'make' ? '아직 없음' : '객체 없음';
    var pTxt = s.exit === null ? '실행 중' : s.exit === 0 ? '끝남 (종료 코드 0)' : '오류로 끝남 (종료 코드 1)';
    H.table(v, ['부분', '상태'], [
      { cls: '', cells: ['application.properties', fileTxt] },
      { cls: s.read ? '' : 'gone', cells: ['스프링의 설정 목록', { v: listTxt, cls: s.read && s.file ? 'good' : '' }] },
      { cls: s.made || s.bad ? '' : 'gone', cells: ['ShopInfo의 name', { v: nameTxt, cls: s.bad ? 'bad' : s.name !== null ? 'good' : '' }] },
      { cls: s.out !== null ? '' : 'gone', cells: ['println이 찍은 글', { v: s.out !== null ? s.out : '없음', cls: s.out !== null ? 'good' : '' }] },
      { cls: '', cells: ['java 프로세스', { v: pTxt, cls: s.exit === 1 ? 'bad' : s.exit === 0 ? 'good' : '' }] },
    ], 'java 프로세스와 설정 파일');
  },
  // 그림: 위에 App의 main 메서드, 가운데 줄에 왼쪽부터 설정 파일, 스프링(설정 목록), ShopInfo 객체. 파일의 값이 스프링의 설정 목록으로 읽히고, 스프링이 ShopInfo를 만들며 name에 값을 넣는지, 값을 찾지 못해 어디서 멈추는지를 화살표로 보인다. 맨 아래에 결과 칸 둘.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, ph = s ? s.phase : '';
    P.size(680, 288);
    var end = s && s.exit !== null;
    P.region('jp', 240, 8, 436, 210, 'java 프로세스' + (end ? (s.exit === 0 ? ': 끝남' : ': 오류로 끝남') : s ? ': 실행 중' : ''));
    var mnSub = !s ? '아직 실행 전' : ph === 'main' || ph === 'read' || ph === 'make' || ph === 'value' ? 'SpringApplication.run 실행 중' : ph === 'get' ? 'ctx.getBean 실행 중' : ph === 'print' ? 'println 실행 중' : s.exit === 0 ? '끝남' : '예외로 끝남';
    P.box('mn', 250, 36, 416, 44, { cls: end ? (s.exit === 0 ? 'plain' : 'bad') : s ? 'hot now' : 'ghost', title: 'App의 main 메서드', sub: mnSub });
    P.box('pf', 2, 112, 188, 92, { cls: ph === 'read' ? 'hot now' : s ? 'plain' : 'ghost', title: 'application.properties', sub: [s && s.file ? 'shop.name=' + s.file : s ? '이름=값 줄 없음' : ' '] });
    var spSub = !s || !s.read ? [' '] : s.file ? ['설정 목록', 'shop.name = ' + s.file] : ['설정 목록은 비어 있음'];
    P.box('sp', 250, 112, 170, 92, { cls: s && s.bad ? 'bad' : s && s.read ? (ph === 'read' || ph === 'make' || ph === 'value' ? (s.file ? 'good now' : 'hot now') : (s.file ? 'good' : 'plain')) : 'ghost', title: '스프링', sub: spSub });
    var siSub = !s ? [' '] : s.name !== null ? ['name = ' + s.name] : s.bad ? ['만들다 멈춤'] : ph === 'make' || ph === 'value' ? ['만드는 중'] : ['아직 없음'];
    P.box('si', 468, 112, 190, 92, { cls: s && s.bad ? 'bad' : s && s.name !== null ? (ph === 'value' ? 'good now' : 'good') : 'ghost', title: 'ShopInfo 객체', sub: siSub });
    if (s && ph === 'read') P.arrow('rd', 'pf:r:0.5', 'sp:l:0.5', { cls: 'hot', label: '읽음' });
    if (s && ph === 'make') P.arrow('mk', 'sp:r:0.35', 'si:l:0.35', { cls: 'hot' });
    if (s && ph === 'value') P.arrow('vl', 'sp:r:0.65', 'si:l:0.65', { cls: s.bad ? 'bad' : 'good' });
    var prog = !s ? '아직 없음' : s.exit === 0 ? '끝까지 실행됨' : s.exit === 1 ? '시작하다 멈춤' : '실행 중';
    P.box('n1', 14, 236, 322, 36, { cls: s && s.out !== null ? 'good' : s && s.exit === 1 ? 'bad' : 'ghost', title: 'println이 찍은 글', right: s && s.out !== null ? s.out : s && s.exit === 1 ? '없음' : '아직 없음' });
    P.box('n2', 344, 236, 322, 36, { cls: s && s.exit === 0 ? 'good' : s && s.exit === 1 ? 'bad' : 'ghost', title: '프로그램', right: prog });
  },
  assume: '스프링 부트 4.1.1(스프링 프레임워크 7.0.9)을 JDK 21.0.12.1에서 실행한 결과입니다. 여섯 가지 조합을 모두, 화면의 코드와 같은 구조의 소스(패키지 app의 ShopInfo와 App, 그리고 클래스 파일과 같은 폴더에 둔 application.properties)를 컴파일하고 java 명령으로 app.App의 main 메서드부터 새 프로세스로 실행해 대조했습니다. 대조한 것은 결과 표의 세 항목입니다. name에 들어온 값은 프로세스가 표준 출력에 찍은 글로, 시작 성공 여부는 종료 코드(0과 1)와 표준 출력으로, 오류는 표준 오류에 나온 예외의 이름과 메시지로 정했습니다. 대조 실행에는 스프링 부트의 로그와 배너를 끄는 실행 인자(--logging.level.root=OFF, --spring.main.banner-mode=off)를 주었습니다. 그래서 결과 표와 그림의 "println이 찍은 글"은 System.out.println이 표준 출력에 찍은 글만 뜻합니다. 이 인자 없이 실행하면 화면에 스프링 부트의 배너와 로그 줄도 함께 나오며, 그 경우는 대조하지 않았습니다. 값을 찾지 못한 조합에서는 표준 출력이 비어 있었고, 표준 오류에 예외의 스택 트레이스(36줄)가 나왔습니다. 설정 파일을 지운 조합에서는 파일에서 shop.name 줄과 바로 위 설명 줄만 지우고 맨 위의 # application.properties 줄은 남겼습니다. 단계 문장이 기대는 사실도 실행으로 확인했습니다. 설정 파일을 둔 조합에서 스프링이 클래스패스의 application.properties를 설정 출처로 읽고(Config resource class path resource [application.properties]) 그 안의 shop.name 값이 스프링의 Environment에 들어 있는 것, SpringApplication.run이 끝났을 때 ShopInfo 객체가 이미 만들어져 name 필드에 값이 들어 있는 것, 우리 소스에 new ShopInfo()나 name에 값을 넣는 줄이 없는 것, shop.name 줄이 없고 기본값도 없을 때 예외(BeanCreationException, 원인은 PlaceholderResolutionException의 Could not resolve placeholder \'shop.name\' in value "${shop.name}")가 SpringApplication.run 줄에서 나와 main이 다음 줄에 가지 못하고 종료 코드 1로 끝나며 표준 출력에 아무것도 찍히지 않는 것, 같은 컴파일 결과(ShopInfo.class 파일과 App.class 파일의 해시가 같음)에서 application.properties만 kim-shop에서 lee-shop으로 고쳐 다시 실행하면 컴파일 없이 lee-shop이 나오는 것입니다. shop.name 줄을 지우고 기본값을 적은 조합에서는 파일에 이름=값 줄이 하나도 없어 스프링의 설정 출처 목록에 application.properties가 오르지 않는 것을 관찰했습니다. 단계 문장은 그 사실을 "설정 목록에 shop.name 이름이 없다"까지만 말합니다. 클래스패스는 라이브러리 폴더 전체가 아니라 spring-boot-starter가 들여오는 21개 jar만 줬고(스프링 부트 기초개념 실습과 같은 목록, 웹 라이브러리 없음), 자식 프로세스의 작업 폴더는 빈 임시 폴더로 했습니다(스프링 부트는 작업 폴더의 application.properties와 config 폴더도 읽기 때문입니다). 환경 변수 중 SPRING_과 SHOP_으로 시작하는 것은 자식 프로세스에서 뺐습니다. 문서가 정한 것은 스프링 부트 문서 Externalized Configuration 절(application.properties를 시작할 때 클래스패스 맨 위, 클래스패스의 /config 패키지, 현재 폴더, 현재 폴더의 config 폴더에서 찾아 읽는다는 것, 같은 코드를 환경마다 다르게 쓰려고 설정을 코드 밖에 둔다는 것, ${이름:기본값}에서 : 뒤가 기본값이라는 것)과 스프링 프레임워크 문서 Using @Value 절(@Value("${...}")로 외부 설정값을 넣는다는 것, 기본값 문법, 스프링 부트가 application.properties의 값을 읽는 PropertySourcesPlaceholderConfigurer를 기본으로 등록한다는 것, 이 설정자가 있으면 ${} 자리를 풀지 못할 때 초기화가 실패한다는 것)입니다. 스프링 프레임워크만 쓰고 이 설정자를 두지 않으면 풀지 못한 ${shop.name} 글자가 값으로 그대로 들어간다고 문서에 적혀 있지만, 이 실습은 스프링 부트에서만 실행했습니다. 값이 없을 때 BeanCreationException과 PlaceholderResolutionException이 나온다는 것은 문서가 정한 것이 아니라 이 버전에서 관찰한 동작입니다. 화면의 코드는 package와 import 줄을 줄였고, ShopInfo와 App이 같은 패키지에 있다고 가정했습니다. 두 클래스는 실제로는 파일이 따로이고, application.properties도 보통은 src/main/resources에 두며 빌드가 클래스 파일 옆으로 복사합니다(여기서는 직접 그 폴더에 두었습니다). 이 실습이 다루지 않는 것은 application.yml, 여러 곳에 같은 이름이 있을 때의 우선순위, 환경 변수와 실행 인자로 값을 바꾸는 것, 프로파일별 파일, @ConfigurationProperties입니다. 우선순위는 "세부 동작 실습: 설정 우선순위"에서, 설정을 보고 스프링 부트가 알아서 빈을 만드는 일은 "세부 동작 실습: 스프링 부트 자동 설정"에서 다룹니다.',
});
