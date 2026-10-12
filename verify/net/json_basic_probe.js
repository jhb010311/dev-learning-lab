// 기초개념 "JSON" 실습의 모든 설정 조합(이름 따옴표 3 × age 값 2 × 쉼표 3 = 18)을 두 가지 해석기에 같은 글자로 넣어 실행한다.
//   (1) Node.js의 JSON.parse (자바스크립트의 표준 해석기)
//   (2) 자바의 Jackson 3 기본 설정 (JsonMapper.builder().build(), jackson-databind/core 3.1.5). verify/net/JsonBasicProbe.java를 컴파일해 자식 프로세스로 부른다.
// 넣는 글자는 이 파일이 조합마다 만들어 verify/out/json_basic/<키>.json에 UTF-8로 쓰고(줄 끝은 \n, 끝에 줄바꿈 없음), 두 해석기가 그 글자를 읽는다. 키는 key-age-comma.
// 사용: node verify/net/json_basic_probe.js      결과는 verify/net/json_basic_probe.out.txt에 쓴다.
// 한 줄의 모양: 키 => JSON 한 덩어리 { text, js: {...JSON.parse가 낸 것}, jackson: {...Jackson이 낸 것} }
// js: ok, ageType(typeof), plusOne(읽은객체.age + 1의 값, 글자로), plusOneType, ageStrict(age === 30), msg(오류 메시지 원문), pos(글자 위치), line, col, char(그 위치의 글자)
// jackson: JsonBasicProbe.java의 한 줄을 키=값으로 쪼갠 것 (ok, ageType, intValue, asInt, bind 또는 exc, line, col, offset, char, msg)
const fs = require('fs'), path = require('path'), cp = require('child_process');

const JDK = 'E:/dev/jdk-21.0.12.1+1/bin';
const LIBS = 'E:/dev/java-interview-lab/verify/spring/libs/*';
const OUTDIR = path.join(__dirname, '..', 'out', 'json_basic');
const CLASSES = path.join(OUTDIR, 'classes'), INPUT = path.join(OUTDIR, 'input');
const NAME = { dq: '"name"', none: 'name', sq: "'name'" };

// 조합마다 JSON 글을 만든다. (화면의 코드와 같은 글이어야 한다. 대조는 cmp가 한다)
function build(key, age, comma) {
  return [
    '{',
    '  ' + NAME[key] + ': "김철수",',
    '  "age": ' + (age === 'num' ? '30' : '"30"') + (comma === 'miss' ? '' : ','),
    '  "tags": ["vip", "new"]' + (comma === 'trail' ? ',' : ''),
    '}',
  ].join('\n');
}

// 화면의 조합이 아닌 참고용 글 하나: 주석을 넣으면 읽히는지 (JSON에는 주석을 적는 문법이 없다)
const EXTRA = { 'x-comment': ['{', '  "name": "김철수", // 이름', '  "age": 30,', '  "tags": ["vip", "new"]', '}'].join('\n') };
fs.mkdirSync(CLASSES, { recursive: true }); fs.mkdirSync(INPUT, { recursive: true });
const combos = [];
for (const key of ['dq', 'none', 'sq']) for (const age of ['num', 'str']) for (const comma of ['ok', 'trail', 'miss']) {
  const k = [key, age, comma].join('-'), text = build(key, age, comma);
  fs.writeFileSync(path.join(INPUT, k + '.json'), text, 'utf8');
  combos.push({ k, key, age, comma, text });
}

for (const k of Object.keys(EXTRA)) fs.writeFileSync(path.join(INPUT, k + '.json'), EXTRA[k], 'utf8');
// 자바 쪽: 컴파일하고 실행해 결과 파일을 얻는다
const jarOut = path.join(OUTDIR, 'jackson.out.txt');
cp.execFileSync(JDK + '/javac', ['-encoding', 'UTF-8', '-cp', LIBS, '-d', CLASSES, path.join(__dirname, 'JsonBasicProbe.java')], { stdio: 'inherit' });
cp.execFileSync(JDK + '/java', ['-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-cp', LIBS + ';' + CLASSES, 'JsonBasicProbe', INPUT, jarOut], { stdio: 'inherit' });
const jlines = fs.readFileSync(jarOut, 'utf8').split(/\r?\n/).filter(Boolean);
const jmap = {}, lenient = {};
for (const l of jlines) {
  if (l.startsWith('#')) continue;
  const isLen = l.startsWith('lenient '), body = isLen ? l.slice(8) : l, i = body.indexOf(' => ');
  const f = {}; body.slice(i + 4).split('|').forEach(p => { const j = p.indexOf('='); f[p.slice(0, j)] = p.slice(j + 1); });
  (isLen ? lenient : jmap)[body.slice(0, i)] = f;
}

// 자바스크립트 쪽
function viaJs(text) {
  try {
    const o = JSON.parse(text), plus = o.age + 1;
    return { ok: true, ageType: typeof o.age, plusOne: String(plus), plusOneType: typeof plus, ageStrictNumber: o.age === 30, keys: Object.keys(o).join(','), name: o.name, tags: JSON.stringify(o.tags) };
  } catch (e) {
    const m = /position (\d+)(?: \(line (\d+) column (\d+)\))?/.exec(e.message), pos = m ? +m[1] : -1;
    return { ok: false, errName: e.name, msg: e.message, pos, line: m && m[2] ? +m[2] : null, col: m && m[3] ? +m[3] : null, char: pos >= 0 && pos < text.length ? text[pos] : '(끝)' };
  }
}

const out = ['# node ' + process.version + ' (V8 ' + process.versions.v8 + ') · JSON.parse / ' + jlines[0].replace(/^# /, '')];
const raws = [];
for (const c of combos) {
  const row = { text: c.text, js: viaJs(c.text), jackson: jmap[c.k], jacksonLenient: lenient[c.k] };
  out.push(c.k + ' => ' + JSON.stringify(row));
  raws.push('# 넣은 글 ' + c.k + ' = ' + JSON.stringify(c.text));
}
for (const k of Object.keys(EXTRA)) { out.push('# 참고 ' + k + ' => ' + JSON.stringify({ text: EXTRA[k], js: viaJs(EXTRA[k]), jackson: jmap[k] })); raws.push('# 넣은 글 ' + k + ' = ' + JSON.stringify(EXTRA[k])); }
fs.writeFileSync(path.join(__dirname, 'json_basic_probe.out.txt'), out.join('\n') + '\n' + raws.join('\n') + '\n', 'utf8');
console.log(out.join('\n'));
