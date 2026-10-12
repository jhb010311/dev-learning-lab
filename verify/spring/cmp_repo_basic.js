// 기초개념 "리포지토리" 실습의 모형 결과를 실제 스프링 부트 + 스프링 데이터 JPA + Hibernate + H2 실행 결과(repo_basic_probe.out.txt)와 대조한다
// 대조: 결과 표 세 열(실제 값에서 만든다), 화면의 코드가 Probe가 컴파일한 소스(verify/out/repo_basic/<조합>/src/app)와 같은 글인지
// (Main의 "// PROBE" 줄은 측정용이므로 빼고, MemberRepository의 package와 import 줄도 뺀다), 단계 문장이 기대는 사실들
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('repo_basic');
const lines = fs.readFileSync(path.join(__dirname, 'repo_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, n = 0, extraOk = 0, extraAll = 0;
function fields(v) { const f = {}; v.split('|').forEach(p => { const i = p.indexOf('='); if (i > 0) f[p.slice(0, i)] = p.slice(i + 1); }); return f; }
for (const ln of lines.slice(1)) {
  n++;
  const [k, v] = ln.split(' => '), [extS, method] = k.split('|'), ext = extS === 'true';
  const probs = [], c = { ext, method }, sim = lesson.simulate(Object.assign({}, c));
  const f = fields(v.startsWith('compile=ERR') ? v.replace(/\|variant=\[.*\]$/, '') : v);
  const vf = v.startsWith('compile=ERR') ? fields(v.slice(v.indexOf('|variant=[') + 10, -1)) : null;
  const sqlList = (s) => s ? s.split(' ;; ') : [];
  const cnt = (list, w) => list.filter(x => x.split(' ')[0] === w).length;
  let real;
  if (f.compile === 'ERR') {
    const errs = v.match(/\|errs=(.*?)\|variant=/)[1].split(' ;; ');
    const first = errs[0];
    const res = /^compiler\.err\.cant\.resolve\.location\.args@Main\.java:\d+@cannot find symbol\/ {2}symbol: {3}method save\(app\.Member\)\/ {2}location: variable memberRepository of type app\.MemberRepository$/.test(first) ? '컴파일 오류: MemberRepository에 save 메서드가 없음' : '(모르는 오류 ' + first + ')';
    real = [res, vf.beans === '0' ? '없음' : '(모르는 상태 beans=' + vf.beans + ')', '없음'];
  } else if (f.exc !== '-') {
    const res = /^org\.springframework\.beans\.factory\.BeanCreationException: .*No property 'nickname' found for type 'Member' >> org\.springframework\.data\.repository\.query\.QueryCreationException: No property 'nickname' found for type 'Member' >> org\.springframework\.data\.core\.PropertyReferenceException: No property 'nickname' found for type 'Member'$/.test(f.exc)
      ? '스프링이 시작하다 실패함: Member에 nickname 필드가 없음' : '(모르는 예외 ' + f.exc + ')';
    real = [res, f.out === '(없음)' && f.marks === '[]' && /^org.springframework.beans.factory.BeanCreationException: Error creating bean with name 'memberRepository'/.test(f.exc) ? '없음' : '(모르는 상태)', f.sql === '' ? '없음' : '(SQL이 나감)'];
  } else {
    const sl = sqlList(f.sql);
    real = [f.out, f.beans === '1' && f.isProxy === 'true' && f.isOurInterface === 'false' && f.ourImpls === '[]' ? '있음' : '(모르는 상태)', 'INSERT ' + cnt(sl, 'insert') + '번, SELECT ' + cnt(sl, 'select') + '번'];
  }
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | '));
  // 화면의 코드와 Probe가 컴파일한 소스
  const dir = path.join(__dirname, '..', 'out', 'repo_basic', extS + '-' + method, 'src', 'app');
  const repoSrc = fs.readFileSync(path.join(dir, 'MemberRepository.java'), 'utf8').replace(/\r\n/g, '\n');
  const mainSrc = fs.readFileSync(path.join(dir, 'Main.java'), 'utf8').replace(/\r\n/g, '\n').split('\n');
  const repoPart = repoSrc.split('\n\n').slice(2).join('\n\n').trimEnd();
  const i0 = mainSrc.findIndex(l => l.trim() === '// 쓰는 쪽'), i1 = mainSrc.findIndex(l => l.trim() === 'Probe.mark("use");  // PROBE');
  const usePart = mainSrc.slice(i0, i1).filter(l => !l.endsWith('// PROBE')).map(l => l.replace(/^ {8}/, '')).join('\n');
  const probeLines = mainSrc.filter(l => l.endsWith('// PROBE')).length;
  if (repoPart + '\n\n' + usePart !== lesson.code(Object.assign({}, c))) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름\n   화면 ' + lesson.code(Object.assign({}, c)).replace(/\n/g, '\\n') + '\n   실행 ' + (repoPart + '\n\n' + usePart).replace(/\n/g, '\\n'));
  if (probeLines !== 3) probs.push('PROBE 줄 수 ' + probeLines);
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
  // 화면 문장이 기대는 사실들
  const classes = fs.readdirSync(path.join(dir, '..', '..', 'classes', 'app'));
  const sl = f.sql !== undefined ? sqlList(f.sql) : [];
  const checks = {};
  if (!ext) {
    Object.assign(checks, {
      '컴파일 오류 수는 선언한 메서드와 상관없이 save 하나, 찾는 메서드를 선언하지 않았을 때는 save와 count 둘이다': +f.nerr === (method === 'none' ? 2 : 1),
      '첫 오류는 쓰는 쪽의 save 줄이고 나머지 오류는 count 줄이다': (() => { const errs = v.match(/\|errs=(.*?)\|variant=/)[1].split(' ;; '); return /method save\(/.test(errs[0]) && (method === 'none' ? errs.length === 2 && /cant\.resolve\.location\.args@Main\.java:\d+@.*method count\(\)/.test(errs[1]) : errs.length === 1); })(),
      '컴파일이 실패하면 Main 클래스 파일이 만들어지지 않는다': !classes.includes('Main.class'),
      '쓰는 쪽을 뺀 변형을 스프링에 띄우면 시작에 성공하고 MemberRepository 빈은 0개다': vf.exc === '-' && vf.beans === '0' && vf.repoBeanNames === '[]',
      '우리가 쓴 클래스 가운데 MemberRepository를 구현한 것은 없다': vf.ourImpls === '[]',
    });
  } else {
    if (method === 'nick') {
      Object.assign(checks, {
        '시작하다 실패하면 쓰는 쪽은 한 줄도 실행되지 않는다(표시와 출력이 없다)': f.marks === '[]' && f.out === '(없음)',
        '예외는 memberRepository 빈을 만들다 난 것이다': /^org\.springframework\.beans\.factory\.BeanCreationException: Error creating bean with name 'memberRepository' defined in app\.MemberRepository/.test(f.exc),
        '시작 실패 때 DB로 나간 SQL이 없다': f.sql === '',
      });
    } else {
      Object.assign(checks, {
        '우리가 쓴 클래스는 Main, Member, MemberRepository(와 측정용 Probe, SqlLog)뿐이고 MemberRepository를 구현한 것은 없다': f.ourClasses === '[Main, Member, MemberRepository, Probe, SqlLog]' && f.ourImpls === '[]',
        'MemberRepository 빈은 1개이고 그 객체는 JDK 프록시이며 우리 인터페이스 자체가 아니다': f.beans === '1' && f.isProxy === 'true' && f.isOurInterface === 'false' && f.repoBeanNames === '[memberRepository]',
        '구현 객체는 MemberRepository 인터페이스를 구현한다': f.itfs.split(',')[0] === 'app.MemberRepository',
        'save는 SELECT(id로)와 INSERT를 이 순서로 보낸다': /^select .* where m1_0\.id=\?$/.test(sl[0]) && /^insert into member /.test(sl[1]),
        'save가 끝난 시점에 나간 SQL은 2개이고 쓰는 쪽이 끝난 시점에는 3개다': f.marks === '[save:2, use:3]',
        [method === 'name' ? '마지막 SQL은 name으로 찾는 SELECT이다' : '마지막 SQL은 select count(*)이다']: method === 'name' ? /^select m1_0\.id,m1_0\.name from member m1_0 where m1_0\.name=\?$/.test(sl[2]) : /^select count\(\*\) from member m1_0$/.test(sl[2]),
        '나간 SQL은 모두 3개이고 출력은 1이다': sl.length === 3 && f.out === '1',
        '시작에 성공했고 예외가 없다': f.exc === '-',
      });
    }
  }
  for (const [name, pass] of Object.entries(checks)) { extraAll++; if (pass) extraOk++; else console.log('사실 불일치: ' + k + ' / ' + name); }
}
console.log('일치 ' + ok + ' / ' + n);
console.log('화면 문장이 기대는 사실 ' + extraOk + ' / ' + extraAll);
