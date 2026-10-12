// 기초개념 "설정 파일" 실습의 모형 결과를 실제 스프링 부트 실행 결과(config_basic_probe.out.txt)와 대조한다
// 결과 표의 세 항목, 화면의 코드(Probe가 컴파일해 실행한 소스와 같은 글인지), 단계 문장이 기대는 사실을 본다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('config_basic');
const lines = fs.readFileSync(path.join(__dirname, 'config_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
const head = lines.filter(l => l.startsWith('# ') && !l.startsWith('# norecompile')), body = lines.filter(l => !l.startsWith('# '));
const nrLine = lines.find(l => l.startsWith('# norecompile => '));
console.log(head[0]);
const parse = v => { const f = {}; v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); }); return f; };
// Probe가 쓴 소스에서 package, import 줄을 빼고 앞뒤 빈 줄을 정리한다
const unesc = s => s.replace(/\\n/g, '\n');
const strip = src => unesc(src).split('\n').filter(l => !/^(package|import) /.test(l)).join('\n').trim();
let ok = 0, extraOk = 0, extraAll = 0;
const check = (name, pass, k) => { extraAll++; if (pass) extraOk++; else console.log('사실 불일치: ' + (k ? k + ' / ' : '') + name); };
const hashes = {};
for (const ln of body) {
  const i0 = ln.indexOf(' => '), k = ln.slice(0, i0), v = ln.slice(i0 + 4), [prop, defS] = k.split('|'), def = defS === 'true';
  if (v.startsWith('COMPILE_ERROR')) { console.log('컴파일 오류: ' + k + ' ' + v); continue; }
  const f = parse(v), c = { prop, def };
  const sim = lesson.simulate(c);
  // 실제 값: name에 들어온 값은 표준 출력, 시작은 종료 코드, 오류는 표준 오류의 예외
  const out = unesc(f.stdout).replace(/\n$/, '');
  const startOk = f.exit === '0';
  const real = [startOk ? out : '들어오지 못함', startOk ? '성공' : '실패 (시작하다 멈춤)',
    startOk ? '없음' : (/Could not resolve placeholder 'shop\.name'/.test(f.lastCause) ? "shop.name 값을 찾을 수 없음 (Could not resolve placeholder 'shop.name')" : '?' + f.lastCause)];
  let good = true;
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) { good = false; console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | ')); }
  // 화면의 코드 = Probe가 실행한 파일들(설정 파일, ShopInfo, App)
  const want = lesson.code.call(lesson, c);
  const got = [strip(f.props), strip(f.shop), strip(f.app)].join('\n\n');
  if (want !== got) { good = false; console.log('화면의 코드가 Probe가 실행한 소스와 다름: ' + k + '\n--- 화면\n' + want + '\n--- 실행\n' + got); }
  if (good) ok++;
  // 단계 문장이 기대는 사실들
  const ins = parse(f.inspect.replace(/¦/g, '|')), val = { kim: 'kim-shop', lee: 'lee-shop' }[prop], fail = sim.row[1] !== '성공';
  const srcAll = unesc(f.shop + f.app);
  hashes[k] = { s: f.hashShop, a: f.hashApp };
  check('우리 소스(ShopInfo, App)에 new ShopInfo()나 name에 값을 넣는 줄(name =)이 없다', !/new ShopInfo\s*\(/.test(srcAll) && !/\bname\s*=[^=]/.test(srcAll.replace(/@Value\([^)]*\)/g, '')), k);
  check('줄 있는 조합에서 스프링은 classpath의 application.properties를 설정 출처로 읽고 Environment의 shop.name이 파일의 값이다', prop === 'none' || (/application\.properties/.test(ins.propSource) && /optional:classpath:\//.test(ins.propSource) && ins.envShop === val), k);
  check('줄이 없고 시작에 성공한 조합에서는 Environment에 shop.name이 없다(null)', prop !== 'none' || fail || ins.envShop === 'null', k);
  check('성공한 조합에서는 SpringApplication.run이 끝났을 때 ShopInfo 객체가 이미 만들어져 있고 name 필드 값이 화면에 찍힌 글과 같다', fail || (ins.shopInfoMade === 'true' && ins.field === out), k);
  check('성공한 조합은 종료 코드 0, 표준 오류가 비어 있다', fail || (f.exit === '0' && f.stderrLines === '0'), k);
  check('실패한 조합(줄 없음, 기본값 없음)은 종료 코드 1이고 표준 출력에 아무것도 찍히지 않았다', !fail || (f.exit === '1' && out === ''), k);
  check('실패는 SpringApplication.run 줄에서 일어나 main이 예외로 끝난다(스택에 App.main과 SpringApplication.run)', !fail || (f.frameMain === 'true' && f.frameRun === 'true'), k);
  check("실패의 예외는 BeanCreationException(shopInfo), 원인은 PlaceholderResolutionException의 Could not resolve placeholder 'shop.name' in value \"${shop.name}\"", !fail || (/BeanCreationException: Error creating bean with name 'shopInfo'/.test(f.stderrFirst) && /PlaceholderResolutionException: Could not resolve placeholder 'shop\.name' in value "\$\{shop\.name\}"/.test(f.lastCause)), k);
  check('실패를 Inspect(SpringApplication.run)로 불러도 같은 예외 사슬이다', !fail || (/BeanCreationException>org\.springframework\.util\.PlaceholderResolutionException/.test(ins.chain)), k);
  check('기본값이 있고 줄이 없으면 name은 no-name이다', !(prop === 'none' && def) || out === 'no-name', k);
  check('기본값이 있어도 줄이 있으면 파일의 값이 쓰인다', !(prop !== 'none' && def) || out === val, k);
  check('ShopInfo 소스에 @Value가 한 곳이고 생성자가 기본 생성자 하나(스프링이 new로 만든 객체)다', fail || ins.ctor === '1', k);
}
// 기본값을 붙이고 떼는 것은 ShopInfo 소스만 바꾼다. 설정 파일의 값만 바꾸면(kim→lee) 컴파일 결과가 같다
check('설정 파일의 shop.name 줄만 kim→lee로 바꾼 두 조합의 ShopInfo.class와 App.class가 같다(다시 컴파일할 것이 없다)', hashes['kim|false'].s === hashes['lee|false'].s && hashes['kim|false'].a === hashes['lee|false'].a);
check('기본값 유무는 ShopInfo.class를 바꾸고 App.class는 바꾸지 않는다', hashes['kim|false'].s !== hashes['kim|true'].s && hashes['kim|false'].a === hashes['kim|true'].a);
// 컴파일 없이 파일만 고쳐 다시 실행
const nr = parse(nrLine.slice('# norecompile => '.length));
check('kim-shop으로 컴파일한 클래스 폴더에서 application.properties만 lee-shop으로 고쳐 다시 실행하면 lee-shop이 찍히고 클래스 파일은 그대로다',
  nr.exit === '0' && unesc(nr.stdout).trim() === 'lee-shop' && nr.classesBefore === nr.classesAfter);
console.log('일치 ' + ok + ' / ' + body.length);
console.log('화면 문장이 기대는 사실 ' + extraOk + ' / ' + extraAll);
