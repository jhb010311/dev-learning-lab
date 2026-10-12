// 기초개념 "제네릭" 실습의 모형 결과를 실제 javac 컴파일과 실행 결과(GenericBasicProbe.out.txt)와 대조한다
// 대조: 결과 표 세 열, 오류의 개수, 오류가 난 줄, 컴파일 실패일 때 Main.class가 없는 것, 예외의 종류와 난 줄,
//       컴파일러가 남긴 노트(기본 옵션에서 무엇이 나오는지),
//       단계 문장이 기대는 사실(담을 때 아무 일 없음, Object로 꺼낼 수 있음, 경고 옵션을 켜면 어느 줄에서 경고가 나는지 등),
//       그리고 화면의 코드(code 함수)가 Probe가 컴파일한 소스(verify/out/generic_basic/<조합>/Main.java)와 같은 글인지
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('generic_basic');
const lines = fs.readFileSync(path.join(__dirname, 'GenericBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
// 실제 javac의 진단 코드와 영어 메시지 -> 화면에 적는 한국어 (이 표에 없는 오류가 나오면 모형이 모르는 오류이므로 다름으로 센다)
const ERR = [
  ['compiler.err.prob.found.req', /^incompatible types: int cannot be converted to java\.lang\.String$/, lesson.errAdd],
  ['compiler.err.prob.found.req', /^incompatible types: java\.lang\.Object cannot be converted to java\.lang\.String$/, lesson.errGet],
];
function ko(code, msg) { const e = ERR.find(x => x[0] === code && x[1].test(msg)); return e ? e[2] : '(모르는 오류 ' + code + ' / ' + msg + ')'; }
const NOTE_UNCHECKED = /^NOTE:compiler\.note\.unchecked\.filename:\S+ uses unchecked or unsafe operations\. ;; NOTE:compiler\.note\.unchecked\.recompile:Recompile with -Xlint:unchecked for details\.$/;
const NOTE_COMPRESSED = /^NOTE:compiler\.note\.compressed\.diags:Some messages have been simplified; recompile with -Xdiags:verbose to get full output$/;
let ok = 0, n = 0;
for (const ln of lines.slice(1)) {
  n++;
  const [k, v] = ln.split(' => '), f = v.split('|');
  const [res, code, nerr, mainClass, ran, exc, excMsg, excLine, out, notes, msg] = f, where = f.slice(11).join('|');
  const probs = [];
  if (ln.startsWith('FACT ')) {
    const name = k.slice(5);
    const want = {
      // <String>이 없는 리스트에 123을 담는 줄은 실행 중에도 예외 없이 지나가고, 리스트에는 1개가 담긴다
      add_raw_number: () => res === 'OK' && exc === '-' && out === '1',
      // <String>이 없어도 꺼낸 것을 Object 변수에 담는 것은 컴파일된다(컴파일러는 Object라고만 안다)
      get_raw_object: () => res === 'OK' && exc === '-' && out === '김철수',
      // <String>이 있으면 꺼낸 것의 String 메서드를 캐스팅 없이 바로 부를 수 있다
      get_generic_string_method: () => res === 'OK' && out === '3' && notes === '-',
      // <String>이 없으면 꺼낸 것의 String 메서드를 캐스팅 없이 부를 수 없다
      get_raw_string_method: () => res === 'ERR' && code === 'compiler.err.cant.resolve.location.args' && /\.length\(\)/.test(where),
      // 경고 옵션을 켜면 로 타입 경고는 List/ArrayList를 쓴 선언 줄에서, unchecked 호출 경고는 names.add 줄에서 나고, (String) 캐스팅 줄에서는 경고가 없다
      lint_raw_str_cast: () => res === 'OK' && /raw\.class\.use:found raw type: java\.util\.List@List names = new ArrayList\(\);/.test(notes) && /unchecked\.call\.mbr\.of\.raw\.type:.*@names\.add\("김철수"\);$/.test(notes) && !/get\(0\)/.test(notes),
      lint_raw_num_cast: () => res === 'OK' && /unchecked\.call\.mbr\.of\.raw\.type:.*@names\.add\(123\);$/.test(notes) && !/get\(0\)/.test(notes) && exc === 'java.lang.ClassCastException',
      // 기본 옵션에서 줄여 알리던 오류의 원래 모양은 add(int)에 맞는 메서드가 없다는 것
      verbose_gen_num: () => res === 'ERR' && code === 'compiler.err.cant.apply.symbols' && /^no suitable method found for add\(int\)$/.test(msg) && where === 'names.add(123);',
      // <String>이 있을 때 (String)은 불필요한 캐스트(경고 옵션을 켜야 알려 줌)
      lint_gen_str_cast: () => res === 'OK' && out === '3' && /^WARNING:compiler\.warn\.redundant\.cast:redundant cast to java\.lang\.String@String first = \(String\) names\.get\(0\);$/.test(notes),
    }[name];
    if (!want) probs.push('모르는 사실 ' + name); else if (!want()) probs.push('사실이 다름: ' + v);
    if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
    continue;
  }
  const [gen, put, cast] = k.split('|');
  const c = { gen: gen === 'true', put, cast: cast === 'true' };
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row;
  let real;
  if (res === 'OK') {
    let run;
    if (exc !== '-') run = out === '(없음)' && exc === 'java.lang.ClassCastException' ? 'ClassCastException으로 멈춤' : '(모르는 예외 또는 출력이 있는 채 멈춤 ' + exc + ' / ' + out + ')';
    else run = out;
    const what = notes === '-' ? '없음' : NOTE_UNCHECKED.test(notes) ? lesson.noteText : '(모르는 노트 ' + notes + ')';
    real = ['성공', what, run];
  } else {
    real = ['오류', ko(code, msg), '실행할 수 없음'];
    if (ran !== 'false') probs.push('컴파일 실패인데 실행됨');
  }
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  if (sim.nerr !== +nerr) probs.push('오류 개수 모형 ' + sim.nerr + ' 실제 ' + nerr);
  const realAt = res === 'OK' ? [] : where.split(' ## ');
  if (JSON.stringify(sim.errAt) !== JSON.stringify(realAt)) probs.push('오류가 난 줄 모형 ' + JSON.stringify(sim.errAt) + ' 실제 ' + JSON.stringify(realAt));
  if ((mainClass === 'true') !== (res === 'OK')) probs.push('Main.class 생성 여부가 컴파일 결과와 다름: ' + mainClass);
  // 단계 문장: 로 타입이면 unchecked 노트 두 줄(오류가 있어도 함께), <String>이 있으면 로 타입 노트가 없다
  if (!c.gen && !NOTE_UNCHECKED.test(notes)) probs.push('로 타입인데 unchecked 노트가 없음: ' + notes);
  if (c.gen && notes !== '-' && !NOTE_COMPRESSED.test(notes)) probs.push('<String>이 있는데 예상 밖의 노트: ' + notes);
  if (c.gen && res !== 'OK' && !NOTE_COMPRESSED.test(notes)) probs.push('줄여 알린 오류라는 노트가 없음: ' + notes);
  // 실행 중 예외: ClassCastException(Integer를 String으로)이 (String)으로 꺼내는 줄에서 난다
  if (exc !== '-') {
    if (!/^class java\.lang\.Integer cannot be cast to class java\.lang\.String /.test(excMsg)) probs.push('예외 메시지가 Integer를 String으로 바꾸다 난 것이 아님: ' + excMsg);
    if (excLine !== 'String first = (String) names.get(0);') probs.push('예외가 난 줄이 꺼내는 줄이 아님: ' + excLine);
  }
  if (res === 'OK' && out !== '(없음)' && exc === '-' && out !== '3') probs.push('예상 밖의 출력 ' + out);
  const srcFile = path.join(__dirname, '..', 'out', 'generic_basic', [gen, put, cast].join('-'), 'Main.java');
  const src = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (src !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
console.log('일치 ' + ok + ' / ' + n);
