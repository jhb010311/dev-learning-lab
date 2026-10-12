// 기초개념 "빈" 실습의 모형 결과를 실제 스프링 프레임워크 실행 결과(bean_basic_probe.out.txt)와 대조한다
// 결과 표의 네 항목, 화면의 코드(Probe가 실행한 소스와 같은 글인지), 단계 문장이 기대는 사실(객체가 만들어지는 때, getBean이 새로 만들지 않는 것 등)을 본다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('bean_basic');
const lines = fs.readFileSync(path.join(__dirname, 'bean_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
// Probe에만 있는 줄(//@probe)과 package, import 줄을 빼고, 앞뒤 빈 줄을 정리한다
const strip = src => src.replace(/\\n/g, '\n').split('\n').filter(l => !l.includes('//@probe') && !/^(package|import) /.test(l)).join('\n').trim();
let ok = 0, extraOk = 0, extraAll = 0;
for (const ln of lines.slice(1)) {
  const i0 = ln.indexOf(' => '), k = ln.slice(0, i0), v = ln.slice(i0 + 4), [comp, get] = k.split('|'), f = {};
  // 소스(greeter=, main=)는 끝에 있고 | 를 포함하지 않는다. 예외 메시지에도 | 는 없다
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  const c = { comp: comp === 'true', get };
  const sim = lesson.simulate(c);
  const outs = f.out ? f.out.split(';') : [];
  const excSimple = f.exc === '-' ? '' : f.exc.split(':')[0].split('.').pop();
  const real = [excSimple ? excSimple + '으로 멈춤' : outs[0], outs.length > 1 ? outs[1] : '실행되지 않음', f.started + '개', (+f.end - +f.started) + '개'];
  let good = true;
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) { good = false; console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | ')); }
  const want = lesson.code.call(lesson, c), got = strip(f.greeter) + '\n\n' + strip(f.main);
  if (want !== got) { good = false; console.log('화면의 코드가 Probe가 실행한 소스와 다름: ' + k + '\n--- 화면\n' + want + '\n--- 실행\n' + got); }
  if (good) ok++;
  // 단계 문장이 기대는 사실들
  const bean = get === 'bean', comps = c.comp;
  const checks = {
    '스프링이 객체를 만드는 때는 시작할 때다(시작 직후의 수 = @Component가 있으면 1, 없으면 0)': f.started === (comps ? '1' : '0'),
    'getBean을 두 번 불러도 객체가 새로 만들어지지 않는다(끝난 뒤의 수 = 시작 직후의 수)': !bean || !comps || f.end === f.started,
    'new로 만든 객체는 컨테이너에 들어가지 않는다(끝난 뒤 컨테이너의 Greeter 빈 수 = 시작 직후의 수)': f.beansEnd === f.started,
    'new 조합에서는 우리 코드가 new를 두 번 실행했다(끝난 뒤의 수 - 시작 직후의 수 = 2)': bean || (+f.end - +f.started) === 2,
    '@Component가 있으면 컨테이너에 등록된 이름은 greeter 하나이고 싱글톤이다, 없으면 비어 있다': comps ? (f.names === 'greeter' && f.singleton === 'true') : f.names === '',
    '@Component가 없고 getBean을 부르면 NoSuchBeanDefinitionException으로 멈추고 출력은 없다(종료 코드 1)': !(bean && !comps) || (/^org\.springframework\.beans\.factory\.NoSuchBeanDefinitionException: No qualifying bean of type 'app\.Greeter' available/.test(f.exc) && f.out === '' && f.exit === '1'),
    '예외가 없는 조합은 정상 종료(종료 코드 0)하고 오류 출력이 없다': (bean && !comps) || (f.exit === '0' && f.exc === '-' && f.stderrOther === '-'),
    'getBean 조합의 화면 코드에는 new Greeter()라는 줄이 없다': !bean || !/new Greeter\(\)/.test(strip(f.main)),
    '출력: a == b는 getBean이면 true, new이면 false': (bean && !comps) || outs[1] === (bean ? 'true' : 'false'),
  };
  for (const [name, pass] of Object.entries(checks)) { extraAll++; if (pass) extraOk++; else console.log('사실 불일치: ' + k + ' / ' + name); }
}
console.log('일치 ' + ok + ' / ' + (lines.length - 1));
console.log('화면 문장이 기대는 사실 ' + extraOk + ' / ' + extraAll);
