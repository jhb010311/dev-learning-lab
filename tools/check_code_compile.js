// 실습 화면의 자바 코드가 그대로 컴파일되는지 점검한다. 고치지는 않고 목록만 만든다.
// 사이트 기준: 화면에 보이는 자바 코드는 그대로 컴파일되어야 한다. 줄였으면 주석으로 "필요한 부분만 남김"을 밝힌다.
//
// 하는 일
//   1. 실습마다 설정(controls) 기본값과 예시(presets) 하나하나의 조합으로 code()를 뽑는다(같은 글은 한 번만).
//   2. 줄 단위로 자바가 아닌 줄(# 주석, -- 주석, SQL, YAML, HTTP, 셸, URL 등)을 걸러 구획을 나누고,
//      구획마다 자바인지 가린다. 애매하면 자바로 보지 않는다(건너뜀).
//   3. 자바 구획을 파일로 써서 javac로 컴파일한다. "// 파일: app/X.java", "# X.java" 줄이 있으면 파일을 나눈다.
//   4. 실패하면, javac가 찾지 못한 이름을 흔한 패키지(JDK, jakarta, 스프링, 테스트 라이브러리)에서 찾아
//      import를 붙여 다시 컴파일한다. 그래서 통과하면 "import만 빠짐"이다.
//   5. 그래도 실패하면 오류를 나눈다(클래스 밖 문장, 선언 없는 이름, 타입 오류 등). 줄였다고 밝힌 주석이 있으면 따로 나눈다.
//      클래스 밖 문장이면 클래스 본문, 메서드 본문으로 감싸 다시 컴파일해 본 결과도 적는다(고칠 때 참고용).
//
// 실행: node tools/check_code_compile.js [--lang ko|en] [--only id1,id2] [--jobs 8] [--out 보고파일] [--keep]
//   보고 파일 기본값: dist/video/_tasks/code_compile_report.md
//   컴파일용 파일은 스크래치 폴더(CC_DIR 환경 변수, 없으면 아래 기본값)에 쓴다. 저장소에는 쓰지 않는다.
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');

const root = path.join(__dirname, '..');
const JDK = process.env.JDK_HOME || 'E:/dev/jdk-21.0.12.1+1';
const JAVAC = JDK + '/bin/javac', JAVAP = JDK + '/bin/javap', JIMAGE = JDK + '/bin/jimage';
const LIB_DIRS = ['E:/dev/java-interview-lab/verify/spring/libs', 'E:/dev/java-interview-lab/verify/spring/libs-extra'];
const CP = LIB_DIRS.map(d => d + '/*').join(';');
const CC_DIR = process.env.CC_DIR || 'C:/Users/wlsgu/AppData/Local/Temp/claude/C--/48e0d20d-9b4f-4e28-bb5b-e4912aa57816/scratchpad/cc';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const LANGS = opt('--lang') ? [opt('--lang')] : ['ko', 'en'];
const ONLY = opt('--only') ? new Set(opt('--only').split(',')) : null;
const JOBS = +opt('--jobs', Math.max(2, Math.min(10, os.cpus().length - 2)));
const OUT = path.resolve(root, opt('--out', 'dist/video/_tasks/code_compile_report.md'));
const KEEP = args.includes('--keep');

// ───────────────────────── 실습 읽기 ─────────────────────────
const fmt = x => (Math.round(x * 10) / 10).toFixed(1);
function loadLessons(lang) {
  const dir = path.join(root, 'src', lang === 'ko' ? '' : 'en', 'lessons');
  return fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort((a, b) => parseInt(a) - parseInt(b) || a.localeCompare(b)).map(f => {
    const list = [];
    new Function('Lab', fs.readFileSync(path.join(dir, f), 'utf8'))({ register: l => list.push(l), fmt });
    return Object.assign(list[0], { file: f });
  });
}
// 그 조합의 실행 결과(단계 문장, 요약, 결과 표)가 컴파일 오류를 말하면 그 문장 조각을 돌려준다.
// 실습이 일부러 컴파일 오류를 보여 주는 조합(접근 제한자, 검사 예외 등)을 구조 오류와 나누는 데 쓴다.
const SIM_CE = /컴파일 오류|컴파일에 실패|컴파일 실패|failed to compile|compilation failed|compile fails|fails at compile|컴파일되지 않|컴파일 에러|컴파일이 안 되|컴파일할 수 없|문법 오류|javac[^.。]{0,60}(오류|거부|멈|알리)|compile error|compile-time error|compilation error|does not compile|doesn't compile|won't compile|fails to compile|syntax error|compiler (rejects|reports|refuses|stops)|javac (rejects|reports|refuses|stops)/i;
function simCompileError(l, v) {
  let r; try { r = l.simulate({ ...v }); } catch (e) { return ''; }
  const texts = [].concat((r.events || []).map(e => e && (e.s || e.t || e.text) || ''), r.summary || [], JSON.stringify(r.row || '')).map(String);
  for (const t of texts) { const m = t.match(SIM_CE); if (m) { const i = Math.max(0, m.index - 25); return (i ? '…' : '') + t.slice(i, m.index + m[0].length + 25).trim() + '…'; } }
  return '';
}
// 기본값 + 예시마다 조합. 같은 code 글은 하나로 묶고, 어떤 조합에서 나왔는지 적는다.
function codeVariants(l) {
  const base = {}; (l.controls || []).forEach(d => { base[d.id] = d.value; });
  const combos = [{ name: '기본', v: { ...base } }];
  (l.presets || []).forEach((p, i) => combos.push({ name: '예시' + (i + 1), title: p.t, v: Object.assign({ ...base }, p.v) }));
  const byText = new Map();
  combos.forEach(c => {
    let text; try { text = String(l.code({ ...c.v })); } catch (e) { text = null; }
    const key = text === null ? '\u0000error' : text;
    if (!byText.has(key)) byText.set(key, { text, combos: [], titled: [], simSays: '' });
    const g = byText.get(key);
    g.combos.push(c.name); g.titled.push(c.title ? c.name + ' (' + c.title + ')' : c.name);
    if (!g.simSays) g.simSays = simCompileError(l, c.v);
  });
  return [...byText.values()];
}

// ───────────────────────── 자바 구획 가리기 ─────────────────────────
const HANGUL = /[\uac00-\ud7a3]/;
// 문자열·문자 리터럴과 줄 끝 // 주석을 지운 줄 (판단용)
function stripLine(s) {
  let out = '', i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '"') { let j = i + 1; while (j < s.length && s[j] !== '"') { if (s[j] === '\\') j++; j++; } out += '""'; i = j + 1; continue; }
    if (ch === "'") { let j = i + 1; while (j < s.length && s[j] !== "'") { if (s[j] === '\\') j++; j++; } out += "'" + s.slice(i + 1, j) + "'"; i = j + 1; continue; }
    if (ch === '/' && s[i + 1] === '/') break;
    out += ch; i++;
  }
  return out.trimEnd();
}
const SQL_KW = /^(CREATE|SELECT|INSERT|UPDATE|DELETE|ALTER|DROP|START|COMMIT|ROLLBACK|SET|BEGIN|EXPLAIN|WITH|FROM|WHERE|GRANT|SHOW|USE|TRUNCATE|LOCK|UNLOCK|CALL|DELIMITER|SAVEPOINT|RELEASE|LEFT|RIGHT|INNER|OUTER|CROSS|JOIN|ORDER BY|GROUP BY|HAVING|LIMIT|OFFSET|VALUES|UNION|AND|OR|ON|PARTITION|PRIMARY|FOREIGN|CONSTRAINT|INDEX|KEY|AS|WHEN|THEN|ELSE|END|FOR UPDATE|RETURNS|DECLARE|IF|DO|LOOP|WHILE|REPEAT|LANGUAGE|FROM|RUN|COPY|ENTRYPOINT|CMD|EXPOSE|ENV|WORKDIR|ARG|ADD|USER|VOLUME|HEALTHCHECK|LABEL)(\s|;|$)/;
const SHELL = /^(\$ |git|java|javac|jar|curl|docker|kubectl|npm|npx|node|gradle|\.\/gradlew|gradlew|mvn|\.\/mvnw|scp|ssh|cd|ls|echo|cat|export|sudo|redis-cli|mysql|nc|openssl|nslookup|dig|ping|wget|keytool|ab|wrk|helm|kafka-[\w-]+|ps|kill|top|jps|jstack|jcmd|jmap|tail|grep|chmod|mkdir|rm|cp|mv|touch|python|pip|brew|apt|yum|systemctl|ufw|iptables|traceroute|tracert|netstat|ss|telnet|ifconfig|ip|route|arp|host)(\s|$)/;
const JAVA_KW_START = /^(extends|implements|throws|return|new|public|private|protected|static|final|abstract|class|interface|enum|record|import|package|if|else|for|while|do|try|catch|finally|throw|switch|case|default|break|continue|synchronized|var|this|super|assert|yield|sealed|permits|non-sealed)\b/;
// 한 줄의 종류: blank, jcomment(자바 주석), other(자바가 아닌 것이 확실), code(그 밖)
function lineKind(raw, st) {
  const t = raw.trim();
  if (st.textBlock) { if ((raw.match(/"""/g) || []).length % 2 === 1) st.textBlock = false; return 'code'; }
  if (st.block) { if (t.includes('*/')) st.block = false; return 'jcomment'; }
  if (!t) return 'blank';
  if (t.startsWith('//')) return 'jcomment';
  if (t.startsWith('/*')) { if (!t.includes('*/')) st.block = true; return 'jcomment'; }
  if ((raw.match(/"""/g) || []).length % 2 === 1) { st.textBlock = true; return 'code'; }
  if (/^(#|--|;|<\/?[a-z!?]|\(빈 줄\)|\(empty line\)|\(blank line\))/i.test(t)) return 'other';
  if (/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|CONNECT|TRACE) (\/|https?:|\*)/.test(t) || /^HTTP\/\d/.test(t)) return 'other';
  if (/^https?:\/\//.test(t) || /^\w+:\/\//.test(t)) return 'other';
  if (/^- /.test(t) || t === '-' || t === '---') return 'other';
  const s = stripLine(t);
  if (!s) return 'jcomment';
  if (/^[A-Za-z][\w.\-\[\]]*:(\s|$)/.test(s) && !/^default:/.test(s) && !/[;{,)]$/.test(s) && !/:\s*'[^']{2,}'\s*$/.test(s)) return 'other'; // YAML 키, HTTP 헤더 (자바스크립트 객체의 "키: 값," 줄은 제외)
  if (/^[\w.\-\[\]]+=\S/.test(s) && !/;$/.test(s)) return 'other'; // properties
  if (SQL_KW.test(s)) return 'other';
  if (SHELL.test(s) && !/[;{}]$/.test(s) && !/^(java|var|this)\./.test(s)) return 'other';
  if (/^(const|let|function|async|await|module\.exports|export|require\()\b/.test(s) || /^import .* from ['"]/.test(s)) return 'js'; // 구획을 나누지 않고, 그 구획을 자바가 아닌 것으로 만든다
  if (/^\d+\.\s/.test(s)) return 'other'; // 번호 목록
  if (HANGUL.test(s)) return 'other'; // 문자열·주석 밖의 한글 = 설명 글
  if (!/[;{}()=<>\[\]@,.+\-*\/&|?:!"']/.test(s) && s.split(/\s+/).length >= 3 && !JAVA_KW_START.test(s)) return 'other'; // 영어 설명 글
  return 'code';
}
const JS_SIGNAL = /=>|===|!==|\bconsole\.|\brequire\(|(^|[^.\w])fetch\(|\bdocument\.|\bwindow\.|\bawait\b|\basync\b|\bfunction\s*\(|\bundefined\b|\bBuffer\.|\bprocess\.(env|argv|exit)/;
const OTHER_SIGNAL = /^(implementation|testImplementation|runtimeOnly|compileOnly|annotationProcessor|api|plugins|dependencies|repositories|upstream|server_name|listen|proxy_pass|location|root|include|worker_processes|events|http|stream)\b(\s|\{|\(|'|$)|^\w+\s+'[^']{2,}'/;
function javaShaped(s) {
  if (/[;{}(,\[]$/.test(s) || /[)\]]$/.test(s) || /(->|\+|-|\*|&&|\|\||\?|:|=|\.)$/.test(s)) return true;
  if (/^(@|\.|}|\)|\+|-|&&|\|\||\?|:|"|case\b|default\b)/.test(s)) return true;
  if (JAVA_KW_START.test(s)) return true;
  return false;
}
// 구획이 자바인지. 이유와 함께 돌려준다.
// 자바가 아닌 것이 확실한 표지. 있으면 그 이유를 돌려준다(빈 줄로 나뉜 덩어리 하나에도 쓴다).
function hardWhy(lines) {
  const js = lines.find(x => x.kind === 'js');
  if (js) return '자바스크립트 줄: ' + js.raw.trim().slice(0, 40);
  const lead = []; for (const x of lines) { if (x.kind === 'jcomment') lead.push(x.raw.trim()); else if (x.kind !== 'blank') break; }
  if (/Node\.js|자바스크립트|JavaScript|자바가 아니|자바 코드가 아니|not Java|isn't Java|not a Java|browser console/i.test(lead.join('\n')) || /^\/\/\s*(브라우저|Browser)\s*($|[:(,.])/.test(lead[0] || '')) return '주석이 자바가 아니라고 밝힘(Node.js·자바스크립트·브라우저 등)';
  for (const x of lines) {
    if (x.kind !== 'code') continue;
    const s = stripLine(x.raw.trim()), noStr = s.replace(/"(?:[^"\\]|\\.)*"/g, '""');
    if (JS_SIGNAL.test(noStr)) return '자바스크립트 표지: ' + s.slice(0, 40);
    if (/'[^'\\]{2,}'/.test(noStr)) return '작은따옴표 문자열(자바 아님): ' + s.slice(0, 40);
    if (OTHER_SIGNAL.test(s)) return '설정·빌드 파일 표지: ' + s.slice(0, 40);
  }
  return null;
}
function judgeJava(lines, lenient) {
  const h = hardWhy(lines); if (h) return { java: false, why: h };
  const code = lines.filter(x => x.kind === 'code').map(x => stripLine(x.raw.trim())).filter(Boolean);
  if (!code.length) return { java: false, why: '주석만 있음' };
  const shaped = code.filter((s, i) => javaShaped(s) || (i + 1 < code.length && /^(\.|\+|-|\*|\/|&&|\|\||\?|:|\{|throws\b|extends\b|implements\b)/.test(code[i + 1]))).length;
  if (shaped / code.length < 0.85) return { java: false, why: '자바 모양 줄이 적음 (' + shaped + '/' + code.length + ')' };
  const all = code.join('\n');
  if (!/\b(class|interface|enum|record|void|return|new|public|private|protected|static|final|import|package|throws|try|catch|String|int|long|boolean|double|var|byte|char)\b|@[A-Z]\w*|System\.out|->|::|\b[A-Z]\w*<\w|\b[A-Z]\w*\.\w+\(/.test(all) && !(lenient && /[A-Za-z_]\w*\s*(\(|=|\.)/.test(all))) return { java: false, why: '자바 표지가 없음' };
  return { java: true };
}
const FILE_MARK = /^\s*(?:\/\/|#)\s*(?:파일\s*:|File\s*:)?\s*((?:[\w$]+\/)*[\w$]+)\.java\b/;
// code 글 → { units: [{name, pkg, lines:[{raw, no}]}], skipped: [{from,to,why}] }
function splitJava(text, lenient) {
  const st = {}, src = text.split('\n');
  const L = src.map((raw, i) => ({ raw, no: i + 1, kind: lineKind(raw, st) }));
  const segs = []; let cur = null, hint = null;
  L.forEach(x => {
    if (x.kind === 'other') {
      if (cur) { segs.push(cur); cur = null; }
      const m = x.raw.match(/^\s*#\s*((?:[\w$]+\/)*[\w$]+)\.java\b/); hint = m ? m[1] : null;
      return;
    }
    const fm = x.kind === 'jcomment' && x.raw.match(FILE_MARK);
    if (fm && /파일\s*:|File\s*:/.test(x.raw)) { if (cur) segs.push(cur); cur = { lines: [], hint: fm[1] }; hint = null; return; }
    if (!cur) { cur = { lines: [], hint }; hint = null; }
    cur.lines.push(x);
  });
  if (cur) segs.push(cur);
  const units = [], skipped = [];
  segs.forEach(sg => {
    while (sg.lines.length && sg.lines[sg.lines.length - 1].kind === 'blank') sg.lines.pop();
    if (!sg.lines.some(x => x.kind === 'code' || x.kind === 'js')) return;
    // 빈 줄로 나뉜 덩어리 가운데 자바가 아닌 것이 확실한 덩어리(브라우저 스크립트 등)는 떼어 낸다
    const blocks = []; let b = [];
    sg.lines.forEach(x => { if (x.kind === 'blank') { if (b.length) blocks.push(b); b = []; blocks.push([x]); } else b.push(x); });
    if (b.length) blocks.push(b);
    if (blocks.length > 1) {
      const keep = [];
      blocks.forEach(bl => { const h = bl.some(x => x.kind !== 'blank') && hardWhy(bl); if (h) skipped.push({ from: bl[0].no, to: bl[bl.length - 1].no, why: h }); else keep.push(...bl); });
      sg.lines = keep;
      while (sg.lines.length && sg.lines[0].kind === 'blank') sg.lines.shift();
      while (sg.lines.length && sg.lines[sg.lines.length - 1].kind === 'blank') sg.lines.pop();
      if (!sg.lines.some(x => x.kind === 'code')) return;
    }
    const j = judgeJava(sg.lines, lenient);
    if (!j.java) { skipped.push({ from: sg.lines[0].no, to: sg.lines[sg.lines.length - 1].no, why: j.why }); return; }
    units.push({ hint: sg.hint, lines: sg.lines.map(x => ({ raw: x.raw, no: x.no })) });
  });
  // public 최상위 타입이 둘 이상인 구획은 타입마다 파일을 나눈다(package·import 줄은 파일마다 붙임)
  const PUB_LINE = /^(?:@\w+(?:\([^)]*\))?\s+)*public\s+(?:(?:abstract|final|sealed|non-sealed|static|strictfp)\s+)*(?:class|interface|enum|record|@interface)\s+[A-Za-z_$]/;
  for (let k = 0; k < units.length; k++) {
    const u = units[k], ls = u.lines;
    const starts = ls.map((x, i) => PUB_LINE.test(x.raw) ? i : -1).filter(i => i >= 0);
    if (starts.length < 2) continue;
    const isHead = x => /^\s*(package|import)\s/.test(x.raw);
    const cut = starts.map(i => { while (i > 0 && /^(@|\/\/|\/\*| \*|\*)/.test(ls[i - 1].raw)) i--; return i; });
    cut[0] = 0;
    const head = ls.filter(isHead);
    const parts = cut.map((c, j) => ({ hint: j === 0 ? u.hint : null, lines: head.concat(ls.slice(c, j + 1 < cut.length ? cut[j + 1] : ls.length).filter(x => !isHead(x))) }));
    units.splice(k, 1, ...parts); k += parts.length - 1;
  }
  // 파일 이름: public 최상위 타입 > 파일 표시 줄 > SnippetN
  const used = new Set();
  units.forEach((u, k) => {
    const body = u.lines.map(x => x.raw).join('\n');
    const pm = body.match(/^\s*package\s+([\w.]+)\s*;/m); u.pkg = pm ? pm[1] : '';
    const pub = body.match(/^(?:@\w+(?:\([^)]*\))?\s+)*public\s+(?:(?:abstract|final|sealed|non-sealed|static|strictfp)\s+)*(?:class|interface|enum|record|@interface)\s+([A-Za-z_$][\w$]*)/m);
    let name = pub ? pub[1] : u.hint ? u.hint.split('/').pop() : 'Snippet' + (k + 1);
    while (used.has(u.pkg + '/' + name)) name += '_';
    used.add(u.pkg + '/' + name); u.name = name;
  });
  return { units, skipped };
}
const TRIM_KO = /필요한 부분만|줄임|줄였|생략|간추/;
const TRIM_EN = /only the (needed|relevant|necessary)|\bleft out\b|\bomitted\b|\btrimmed\b|\babridged\b|\bshortened\b/i;
function trimNote(units, lang) {
  const re = lang === 'ko' ? TRIM_KO : TRIM_EN;
  for (const u of units) for (const x of u.lines) {
    const ci = x.raw.indexOf('//'), cm = ci >= 0 ? x.raw.slice(ci) : /^\s*(\/\*|\*)/.test(x.raw) ? x.raw.trim() : '';
    if (cm && re.test(cm)) return cm.trim().slice(0, 70);
  }
  return '';
}

// ───────────────────────── import 찾기용 색인 ─────────────────────────
function zipEntries(file) {
  const b = fs.readFileSync(file); let e = b.length - 22;
  while (e >= 0 && b.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) return [];
  const n = b.readUInt16LE(e + 10); let p = b.readUInt32LE(e + 16); const out = [];
  for (let i = 0; i < n && b.readUInt32LE(p) === 0x02014b50; i++) {
    const nl = b.readUInt16LE(p + 28), xl = b.readUInt16LE(p + 30), cl = b.readUInt16LE(p + 32);
    out.push(b.toString('utf8', p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
  }
  return out;
}
const JDK_PKGS = ['java.util', 'java.util.function', 'java.util.stream', 'java.util.concurrent', 'java.util.concurrent.atomic', 'java.util.concurrent.locks',
  'java.io', 'java.nio.file', 'java.nio.charset', 'java.nio', 'java.time', 'java.time.format', 'java.time.temporal', 'java.math', 'java.net', 'java.net.http',
  'java.sql', 'javax.sql', 'java.lang.annotation', 'java.lang.reflect', 'java.security', 'java.security.spec', 'javax.crypto', 'javax.crypto.spec', 'java.util.regex', 'java.text',
  'java.util.random', 'java.nio.channels', 'java.lang.invoke', 'java.lang.ref', 'java.util.logging'];
const LIB_PREF = ['jakarta.persistence', 'jakarta.transaction', 'jakarta.validation', 'jakarta.validation.constraints', 'jakarta.servlet', 'jakarta.servlet.http', 'jakarta.servlet.annotation', 'jakarta.annotation', 'jakarta.inject',
  'org.springframework.stereotype', 'org.springframework.beans.factory.annotation', 'org.springframework.context.annotation', 'org.springframework.context', 'org.springframework.web.bind.annotation',
  'org.springframework.transaction.annotation', 'org.springframework.http', 'org.springframework.jdbc.core', 'org.springframework.boot', 'org.springframework.boot.autoconfigure',
  'org.springframework.data.jpa.repository', 'org.springframework.data.repository', 'org.springframework.data.domain', 'org.springframework.cache.annotation', 'org.springframework.scheduling.annotation',
  'org.springframework.security.config.annotation.web.builders', 'org.springframework.security.web', 'org.springframework.security.core', 'org.springframework.web.client', 'org.springframework.ui',
  'org.junit.jupiter.api', 'org.assertj.core.api', 'org.mockito', 'org.aspectj.lang', 'org.aspectj.lang.annotation', 'io.micrometer.core.instrument', 'org.slf4j'];
// 예시로 흔히 직접 만드는 이름은 라이브러리에서 가져오지 않는다(엉뚱한 클래스를 붙이지 않게)
const NO_AUTO = new Set(['Member', 'Order', 'Item', 'Product', 'Account', 'Event', 'Task', 'Payment', 'Post', 'Comment', 'Team', 'Address', 'Card', 'Node', 'Point', 'Status', 'Grade', 'Delivery', 'Coupon', 'Cart', 'Stock', 'Animal', 'Dog', 'Cat', 'Counter', 'Greeter', 'Main', 'App', 'Demo', 'Report', 'Category', 'Board', 'Review', 'Message', 'Notice', 'Job', 'Worker', 'Shape', 'Circle', 'Calc', 'Car', 'Person', 'Student', 'Book', 'Phone']);
const PREFER = {
  Transactional: 'org.springframework.transaction.annotation.Transactional', Value: 'org.springframework.beans.factory.annotation.Value',
  Component: 'org.springframework.stereotype.Component', Service: 'org.springframework.stereotype.Service', Repository: 'org.springframework.stereotype.Repository', Controller: 'org.springframework.stereotype.Controller',
  Id: 'jakarta.persistence.Id', Entity: 'jakarta.persistence.Entity', Table: 'jakarta.persistence.Table', Column: 'jakarta.persistence.Column', Version: 'jakarta.persistence.Version', Index: 'jakarta.persistence.Index',
  Query: 'org.springframework.data.jpa.repository.Query', Param: 'org.springframework.data.repository.query.Param', Modifying: 'org.springframework.data.jpa.repository.Modifying', Lock: 'org.springframework.data.jpa.repository.Lock',
  Test: 'org.junit.jupiter.api.Test', Timer: 'io.micrometer.core.instrument.Timer', Health: 'org.springframework.boot.health.contributor.Health', HealthIndicator: 'org.springframework.boot.health.contributor.HealthIndicator',
  HttpStatus: 'org.springframework.http.HttpStatus', Bean: 'org.springframework.context.annotation.Bean', Configuration: 'org.springframework.context.annotation.Configuration', Scope: 'org.springframework.context.annotation.Scope',
  NotNull: 'jakarta.validation.constraints.NotNull', NotBlank: 'jakarta.validation.constraints.NotBlank', Size: 'jakarta.validation.constraints.Size', Min: 'jakarta.validation.constraints.Min', Max: 'jakarta.validation.constraints.Max', Valid: 'jakarta.validation.Valid', Email: 'jakarta.validation.constraints.Email', Positive: 'jakarta.validation.constraints.Positive',
  Date: 'java.util.Date', Async: 'org.springframework.scheduling.annotation.Async', Cacheable: 'org.springframework.cache.annotation.Cacheable', Retention: 'java.lang.annotation.Retention', Target: 'java.lang.annotation.Target',
  ResponseEntity: 'org.springframework.http.ResponseEntity', Mock: 'org.mockito.Mock', MockitoBean: 'org.springframework.test.context.bean.override.mockito.MockitoBean', Order_: '',
  Aspect: 'org.aspectj.lang.annotation.Aspect', Around: 'org.aspectj.lang.annotation.Around', Before: 'org.aspectj.lang.annotation.Before', After: 'org.aspectj.lang.annotation.After',
  Logger: 'org.slf4j.Logger', LoggerFactory: 'org.slf4j.LoggerFactory', ObjectMapper: 'tools.jackson.databind.ObjectMapper', JsonProperty: 'com.fasterxml.jackson.annotation.JsonProperty',
  Cache: 'org.springframework.cache.Cache', CacheManager: 'org.springframework.cache.CacheManager', Path: 'java.nio.file.Path', Files: 'java.nio.file.Files', Duration: 'java.time.Duration',
  EnableWebSecurity: 'org.springframework.security.config.annotation.web.configuration.EnableWebSecurity', EnableMethodSecurity: 'org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity',
  PreAuthorize: 'org.springframework.security.access.prepost.PreAuthorize', Authentication: 'org.springframework.security.core.Authentication', User: 'org.springframework.security.core.userdetails.User',
  Pageable: 'org.springframework.data.domain.Pageable', Page: 'org.springframework.data.domain.Page', Sort: 'org.springframework.data.domain.Sort', Specification: 'org.springframework.data.jpa.domain.Specification',
  Assertions: 'org.assertj.core.api.Assertions', Filter: 'jakarta.servlet.Filter', Executor: 'java.util.concurrent.Executor', Callable: 'java.util.concurrent.Callable', Future: 'java.util.concurrent.Future',
};
const STATIC_CLASSES = ['java.nio.charset.StandardCharsets', 'java.util.stream.Collectors', 'org.assertj.core.api.Assertions', 'org.junit.jupiter.api.Assertions', 'org.mockito.Mockito', 'org.mockito.ArgumentMatchers',
  'org.springframework.test.web.servlet.request.MockMvcRequestBuilders', 'org.springframework.test.web.servlet.result.MockMvcResultMatchers', 'org.springframework.test.web.servlet.result.MockMvcResultHandlers',
  'org.springframework.security.config.Customizer', 'org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors', 'java.util.concurrent.TimeUnit'];
let INDEX = null, STATICS = null;
function buildIndex() {
  const cacheFile = path.join(CC_DIR, '_index.json');
  try { const c = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); if (c.v === 3) { INDEX = c.index; STATICS = c.statics; return; } } catch (e) { }
  const index = Object.create(null); const add = fq => { const n = fq.slice(fq.lastIndexOf('.') + 1); (index[n] = index[n] || []).includes(fq) || index[n].push(fq); };
  const jdkSet = new Set(JDK_PKGS);
  const im = cp.execFileSync(JIMAGE, ['list', JDK + '/lib/modules'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  im.split('\n').forEach(line => {
    const m = line.trim().match(/^([\w/]+)\/([A-Z][\w]*)\.class$/); if (!m) return;
    const pkg = m[1].replace(/\//g, '.'); if (jdkSet.has(pkg)) add(pkg + '.' + m[2]);
  });
  const BAD = /(^|\.)(internal|impl|spi|shaded|shade|jdk|sun|asm)(\.|$)|^(net\.bytebuddy|org\.h2|com\.mysql|org\.antlr|org\.eclipse|org\.objectweb|kotlin|org\.apache\.(tomcat|catalina|coyote|naming|juli|jasper|el)|org\.glassfish|com\.sun|org\.jboss|org\.xerial|com\.github\.luben|net\.jpountz|org\.HdrHistogram|io\.github\.classgraph|nonapi|net\.minidev|org\.codehaus|org\.hibernate\.(?!annotations)|org\.apache\.kafka\.(?!clients)|org\.springframework\.cglib|org\.springframework\.asm|org\.springframework\.objenesis|org\.mockito\.(?!(junit|stubbing|invocation))|org\.junit\.platform|org\.opentest4j|org\.apiguardian|org\.xmlunit|org\.skyscreamer|org\.json|com\.jayway|org\.awaitility|org\.hamcrest|com\.querydsl\.(apt|codegen)|com\.mysema|javax\.inject|org\.jspecify|ch\.qos|org\.apache\.logging|org\.aspectj\.(weaver|bridge|util|apache|asm|internal|runtime))/;
  LIB_DIRS.forEach(d => fs.readdirSync(d).filter(f => f.endsWith('.jar')).forEach(f => {
    zipEntries(path.join(d, f)).forEach(e => {
      e = e.replace(/^META-INF\/versions\/\d+\//, '');
      const m = e.match(/^([\w/]+)\/([A-Z][\w]*)\.class$/); if (!m) return;
      const pkg = m[1].replace(/\//g, '.'); if (BAD.test(pkg)) return; add(pkg + '.' + m[2]);
    });
  }));
  const statics = Object.create(null);
  STATIC_CLASSES.forEach(c => {
    let out = ''; try { out = cp.execFileSync(JAVAP, ['-public', '-cp', CP, c], { encoding: 'utf8', maxBuffer: 1 << 24 }); } catch (e) { return; }
    out.split('\n').forEach(line => {
      if (!/\bstatic\b/.test(line)) return;
      const m = line.match(/\s([\w$]+)\s*\(/) || line.match(/\s([\w$]+)\s*;/); if (!m) return;
      (statics[m[1]] = statics[m[1]] || []).includes(c) || statics[m[1]].push(c);
    });
  });
  INDEX = index; STATICS = statics;
  fs.mkdirSync(CC_DIR, { recursive: true }); fs.writeFileSync(cacheFile, JSON.stringify({ v: 3, index, statics }));
}
function rankPkg(fq) {
  const pkg = fq.slice(0, fq.lastIndexOf('.'));
  let i = JDK_PKGS.indexOf(pkg); if (i >= 0) return i;
  i = LIB_PREF.indexOf(pkg); if (i >= 0) return 100 + i;
  if (/^jakarta\./.test(pkg)) return 300;
  if (/^org\.springframework\./.test(pkg)) return 400 + pkg.split('.').length;
  return 600 + pkg.split('.').length;
}
function resolveClass(name, asAnnotation) {
  if (NO_AUTO.has(name) && !asAnnotation) return null;
  if (Object.prototype.hasOwnProperty.call(PREFER, name) && PREFER[name]) return PREFER[name];
  const c = (Object.prototype.hasOwnProperty.call(INDEX, name) ? INDEX[name] : []).slice().sort((a, b) => rankPkg(a) - rankPkg(b) || a.localeCompare(b));
  return c[0] || null;
}
function resolveStatic(name) {
  const c = Object.prototype.hasOwnProperty.call(STATICS, name) ? STATICS[name] : null; if (!c || !c.length) return null;
  return c.slice().sort((a, b) => STATIC_CLASSES.indexOf(a) - STATIC_CLASSES.indexOf(b))[0] + '.' + name;
}

// ───────────────────────── 컴파일 ─────────────────────────
let jobSeq = 0, running = 0; const waiters = [];
async function slot() { if (running < JOBS) { running++; return; } await new Promise(r => waiters.push(r)); running++; }
function release() { running--; const w = waiters.shift(); if (w) w(); }
// files: [{rel, text, map: [화면 줄 번호...]}] → { ok, errors: [{file, line, screenLine, msg, detail, src}] }
async function javac(files) {
  const dir = path.join(CC_DIR, 'j' + (++jobSeq));
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
  files.forEach(f => { const p = path.join(dir, 'src', f.rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, f.text); });
  await slot();
  const res = await new Promise(resolve => {
    cp.execFile(JAVAC, ['-J-XX:TieredStopAtLevel=1', '-J-XX:+UseSerialGC', '-J-Duser.language=en', '-J-Duser.country=US', '-J-Dstdout.encoding=UTF-8', '-J-Dstderr.encoding=UTF-8', '-J-Dsun.stdout.encoding=UTF-8', '-J-Dsun.stderr.encoding=UTF-8', '-encoding', 'UTF-8', '-proc:none', '-Xmaxerrs', '1000', '-nowarn', '-Xlint:none', '-cp', CP, '-d', path.join(dir, 'out'),
      ...files.map(f => path.join(dir, 'src', f.rel))], { encoding: 'utf8', maxBuffer: 1 << 26 }, (err, stdout, stderr) => resolve({ code: err ? (err.code || 1) : 0, out: (stdout || '') + (stderr || '') }));
  });
  release();
  if (!KEEP) fs.rmSync(dir, { recursive: true, force: true });
  const errors = [];
  const lines = res.out.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(.*\.java):(\d+): error: (.*)$/); if (!m) continue;
    const rel = path.relative(path.join(dir, 'src'), m[1]).replace(/\\/g, '/');
    const f = files.find(x => x.rel === rel); const ln = +m[2];
    const e = { file: rel, line: ln, screenLine: f && f.map[ln - 1] ? f.map[ln - 1] : null, msg: m[3], src: lines[i + 1] !== undefined ? lines[i + 1] : '', detail: [] };
    for (let j = i + 3; j < lines.length && /^\s{2}\S/.test(lines[j]) && !/^.*\.java:\d+: /.test(lines[j]); j++) e.detail.push(lines[j].trim());
    errors.push(e);
  }
  if (res.code !== 0 && !errors.length) errors.push({ file: '', line: 0, screenLine: null, msg: res.out.split('\n')[0].trim() || 'javac 실패', src: '', detail: [] });
  return { ok: res.code === 0, errors };
}
// 유닛 → 파일. imports는 package 문 바로 뒤(없으면 1줄 맨 앞)에 같은 줄로 붙여 줄 번호를 그대로 둔다.
function toFiles(units, extra) {
  return units.map(u => {
    const ls = u.lines.map(x => x.raw), imp = (extra[u.name] || []).map(x => 'import ' + x + ';').join(' ');
    if (imp) {
      const pi = ls.findIndex(s => /^\s*package\s+[\w.]+\s*;/.test(s));
      if (pi >= 0) ls[pi] = ls[pi].replace(/(package\s+[\w.]+\s*;)/, '$1 ' + imp); else ls[0] = imp + ' ' + ls[0];
    }
    return { rel: (u.pkg ? u.pkg.replace(/\./g, '/') + '/' : '') + u.name + '.java', text: ls.join('\n') + '\n', map: u.lines.map(x => x.no), unit: u.name };
  });
}
function wrapUnits(units, how) { // how: 'class' | 'method'
  return units.map(u => {
    const head = [], body = [];
    u.lines.forEach(x => { if (/^\s*(package|import)\s/.test(x.raw)) head.push(x); else body.push(x); });
    const open = how === 'class' ? 'class Wrap_' + u.name + ' { ' : 'class Wrap_' + u.name + ' { void run() throws Exception { ';
    const close = how === 'class' ? '}' : '} }';
    const lines = head.concat(body.map((x, i) => ({ raw: (i === 0 ? open : '') + x.raw.replace(/^(\s*)public\s+(?=(abstract\s+|final\s+)*(class|interface|enum|record)\b)/, '$1'), no: x.no })));
    if (lines.length) lines[lines.length - 1] = { raw: lines[lines.length - 1].raw + ' ' + close, no: lines[lines.length - 1].no };
    return Object.assign({}, u, { lines, name: 'Wrap_' + u.name });
  });
}
// 못 찾은 이름에 맞는 import를 붙여 가며 다시 컴파일한다.
async function compileWithImports(units) {
  const extra = {}; let r = await javac(toFiles(units, extra)); const first = r;
  const added = [];
  for (let round = 0; round < 6 && !r.ok; round++) {
    let changed = false;
    r.errors.forEach(e => {
      const f = toFiles(units, extra).find(x => x.rel === e.file); if (!f) return;
      const u = f.unit; extra[u] = extra[u] || [];
      let want = null;
      if (e.msg === 'cannot find symbol') {
        const sym = (e.detail.find(d => d.startsWith('symbol:')) || '').replace(/^symbol:\s*/, '');
        const loc = e.detail.find(d => d.startsWith('location:')) || '';
        let m;
        if ((m = sym.match(/^class (\w+)$/))) want = resolveClass(m[1], new RegExp('@' + m[1] + '\\b').test(e.src));
        else if ((m = sym.match(/^variable ([A-Z]\w*)$/)) ) want = resolveClass(m[1]) || resolveStatic(m[1]) && 'static ' + resolveStatic(m[1]);
        else if ((m = sym.match(/^(?:variable|method) (\w+)/)) && /^location: (class|interface|record|enum) /.test(loc)) { const s = resolveStatic(m[1]); if (s) want = 'static ' + s; }
      } else {
        const m = e.msg.match(/^package ([A-Z]\w*) does not exist$/); if (m) want = resolveClass(m[1]);
      }
      if (want && !extra[u].includes(want)) { extra[u].push(want); added.push(want.replace(/^static /, '정적 ')); changed = true; }
    });
    if (!changed) break;
    r = await javac(toFiles(units, extra));
  }
  return { first, last: r, added: [...new Set(added)] };
}
// 오류 하나 → 분류
function kindOf(e) {
  const m = e.msg;
  if (/unnamed classes are a preview feature|implicitly declared classes|class, interface, enum, or record expected|compact source file/.test(m)) return '클래스 밖 문장';
  if (/^cannot find symbol/.test(m)) { const s = (e.detail.find(d => d.startsWith('symbol:')) || '').replace(/^symbol:\s*/, ''); return '선언 없는 이름' + (s ? '' : ''); }
  if (/^package .* does not exist|cannot access/.test(m)) return '선언 없는 이름';
  if (/incompatible types|bad operand|cannot be applied to|no suitable (method|constructor)|cannot be converted|cannot be dereferenced|is not abstract and does not override|cannot be referenced from a static context|non-static .* cannot be referenced|is abstract; cannot be instantiated|has private access|has protected access|enclosing instance|must be final or effectively final|not an annotation type|cannot be accessed from outside package|is not public|does not take parameters|not applicable|cannot return a value|unexpected type|array required|cannot inherit|incomparable types|cannot assign a value|might not have been initialized|might already have been assigned/.test(m)) return '타입 오류';
  if (/unreported exception/.test(m)) return '처리 안 한 예외';
  if (/expected$|illegal start of|not a statement|reached end of file|unclosed|orphaned|else without if|illegal character|modifier .* not allowed here|' expected|is a preview feature|not allowed here/.test(m)) return '문법 오류';
  if (/already defined|duplicate class/.test(m)) return '중복 선언';
  if (/missing return statement|unreachable statement|break outside|continue outside/.test(m)) return '흐름 오류';
  return '기타';
}
const KIND_ORDER = ['클래스 밖 문장', '문법 오류', '선언 없는 이름', '타입 오류', '처리 안 한 예외', '중복 선언', '흐름 오류', '기타'];
function summarizeErrors(errors) {
  const kinds = [...new Set(errors.map(kindOf))].sort((a, b) => KIND_ORDER.indexOf(a) - KIND_ORDER.indexOf(b));
  const names = [...new Set(errors.filter(e => e.msg === 'cannot find symbol').map(e => (e.detail.find(d => d.startsWith('symbol:')) || '').replace(/^symbol:\s*(class|variable|method)?\s*/, '').replace(/\(.*$/, '')).filter(Boolean))];
  return { kinds, main: kinds[0] || '기타', names };
}
function errLines(e) {
  if (!e) return ['', ''];
  const sym = e.detail.filter(d => /^(symbol|location|required|found|reason):/.test(d)).slice(0, 2).join(', ');
  return [(e.screenLine ? '화면 ' + e.screenLine + '줄' : e.file + ':' + e.line) + ': error: ' + e.msg + (sym ? ' (' + sym + ')' : ''), (e.src || '').trim()];
}
async function checkText(text, lang, lenient, simSays) {
  if (text === null) return { cls: 'code() 오류' };
  const { units, skipped } = splitJava(text, lenient);
  if (!units.length) return { cls: '자바 아님', skipped };
  const r = await compileWithImports(units);
  const trim = trimNote(units, lang);
  const base = { units: units.map(u => (u.pkg ? u.pkg + '.' : '') + u.name), skipped, trim };
  if (r.first.ok) return Object.assign(base, { cls: '통과' });
  if (r.last.ok) return Object.assign(base, { cls: 'import만 빠짐', added: r.added });
  const s = summarizeErrors(r.last.errors);
  const out = Object.assign(base, { cls: simSays ? '실습이 보여 주는 컴파일 오류' : trim ? '줄였다고 밝힌 조각' : '구조 오류', simSays, kinds: s.kinds, main: s.main, names: s.names, nerr: r.last.errors.length, first: errLines(r.last.errors[0]), added: r.added });
  if (s.main === '클래스 밖 문장') { // 감싸 보면 어떻게 되는지(참고)
    for (const how of ['class', 'method']) {
      const w = await compileWithImports(wrapUnits(units, how));
      const label = how === 'class' ? '클래스 본문으로' : '메서드 본문으로';
      if (w.last.ok) { out.wrap = label + ' 감싸면 통과'; break; }
      const ws = summarizeErrors(w.last.errors);
      if (!ws.kinds.includes('클래스 밖 문장') && !ws.kinds.includes('문법 오류')) {
        const cand = label + ' 감싸면 ' + ws.kinds.join('·') + (ws.names.length ? ' (' + ws.names.slice(0, 6).join(', ') + ')' : '');
        if (!out.wrap || how === 'method') out.wrap = cand;
      }
    }
  }
  return out;
}

// ───────────────────────── 보고 ─────────────────────────
const esc = s => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/`/g, "'").replace(/\r?\n/g, ' ');
async function main() {
  fs.mkdirSync(CC_DIR, { recursive: true });
  buildIndex();
  const results = {}; // lang → [{l, variants:[{combos, res}]}]
  for (const lang of LANGS) {
    const lessons = loadLessons(lang).filter(l => !ONLY || ONLY.has(l.id));
    results[lang] = [];
    let done = 0;
    await Promise.all(lessons.map(async l => {
      const vs = codeVariants(l);
      // 같은 실습의 다른 조합에 자바 코드가 있으면, 자바 표지가 약한 짧은 구획(예: member.setPassword(raw);)도 자바로 본다
      const lenient = vs.some(v => v.text !== null && splitJava(v.text).units.length > 0);
      const rows = await Promise.all(vs.map(async v => ({ combos: v.combos, titled: v.titled, res: await checkText(v.text, lang, lenient, v.simSays) })));
      results[lang].push({ l, rows });
      done++;
      const tally = {}; rows.forEach(r => { tally[r.res.cls] = (tally[r.res.cls] || 0) + 1; });
      console.log(`[${lang} ${done}/${lessons.length}] ${l.id} (${l.file}) 조합 ${vs.reduce((a, v) => a + v.combos.length, 0)}개, 서로 다른 코드 ${vs.length}개: ` + Object.entries(tally).map(([k, n]) => k + ' ' + n).join(', '));
    }));
    const order = new Map(lessons.map((l, i) => [l.id, i]));
    results[lang].sort((a, b) => order.get(a.l.id) - order.get(b.l.id));
  }
  writeReport(results);
}
function writeReport(results) {
  const CLS = ['통과', 'import만 빠짐', '실습이 보여 주는 컴파일 오류', '줄였다고 밝힌 조각', '구조 오류', '자바 아님', 'code() 오류'];
  const md = [];
  md.push('# 실습 화면 자바 코드 컴파일 점검');
  md.push('');
  md.push('- 만든 도구: `node tools/check_code_compile.js` (' + new Date().toISOString().slice(0, 10) + ' 실행)');
  md.push('- 컴파일: `' + JAVAC + ' -encoding UTF-8 -proc:none -cp "' + CP + '"`');
  md.push('- 조합: 설정 기본값(기본) + 예시마다(예시N, presets 순서). 같은 코드 글이 나오는 조합은 한 줄로 묶었다.');
  md.push('- 분류');
  md.push('  - 통과: 화면 코드 그대로 컴파일됨');
  md.push('  - import만 빠짐: 흔한 import를 붙이면 컴파일됨 (붙인 이름을 적음)');
  md.push('  - 실습이 보여 주는 컴파일 오류: import를 붙여도 안 되지만, 그 조합의 실행 결과(단계 문장·요약·결과 표)가 "컴파일 오류" 등을 말함. 일부러 보여 주는 오류일 가능성이 큼(아래 두 분류보다 먼저 가름)');
  md.push('  - 줄였다고 밝힌 조각: import를 붙여도 안 되지만, 코드 주석에 "필요한 부분만 남김/줄임/생략"(영어: only the needed parts, left out, omitted 등)이 있음');
  md.push('  - 구조 오류: 위 둘에 해당하지 않는데 컴파일 안 됨. 갈래: 클래스 밖 문장, 문법 오류, 선언 없는 이름, 타입 오류(접근·문맥 오류 포함), 처리 안 한 예외, 중복 선언, 흐름 오류, 기타');
  md.push('  - 자바 아님: SQL·YAML·HTTP·셸·자바스크립트·nginx 등. 판단이 애매한 구획도 여기로 감');
  md.push('- 오류 줄은 import를 붙인 뒤의 javac 첫 오류다. "화면 N줄"은 화면 코드의 줄 번호. 클래스 밖 문장이면 클래스 본문·메서드 본문으로 감싸 본 결과를 "감싸면"에 적었다(참고용).');
  md.push('- 한 코드에 자바와 다른 언어가 섞여 있으면 자바 구획만 컴파일했다. 한 코드의 자바 구획들은 함께 컴파일한다. "// 파일: …java", "# X.java" 줄이 있거나 public 최상위 타입이 둘 이상이면 파일을 나눴다.');
  md.push('- import를 찾는 범위: JDK(java.util·java.io·java.time 등), jakarta.*, org.springframework.*, JUnit·AssertJ·Mockito, Micrometer 등 점검용 클래스패스의 라이브러리. 예시로 흔히 직접 만드는 이름(Member, Order, Item 등)은 애너테이션으로 쓰인 경우가 아니면 가져오지 않는다.');
  md.push('');
  md.push('## 요약');
  md.push('');
  md.push('| 언어 | 실습 | 조합 | 서로 다른 코드 | ' + CLS.join(' | ') + ' |');
  md.push('|---|---|---|---|' + CLS.map(() => '---').join('|') + '|');
  const comboCount = (lang, cls) => results[lang].reduce((a, x) => a + x.rows.filter(r => r.res.cls === cls).reduce((b, r) => b + r.combos.length, 0), 0);
  for (const lang of Object.keys(results)) {
    const R = results[lang];
    const nCombo = R.reduce((a, x) => a + x.rows.reduce((b, r) => b + r.combos.length, 0), 0), nText = R.reduce((a, x) => a + x.rows.length, 0);
    md.push(`| ${lang} | ${R.length} | ${nCombo} | ${nText} | ` + CLS.map(c => { const t = R.reduce((a, x) => a + x.rows.filter(r => r.res.cls === c).length, 0); return t ? t + ' (조합 ' + comboCount(lang, c) + ')' : '0'; }).join(' | ') + ' |');
  }
  md.push('');
  md.push('칸의 숫자는 서로 다른 코드 수, 괄호는 그 코드가 나오는 조합 수.');
  md.push('');
  for (const lang of Object.keys(results)) {
    const R = results[lang];
    const perLesson = cls => R.filter(x => x.rows.some(r => r.res.cls === cls)).map(x => x.l.id);
    md.push('### ' + lang + ': 실습 단위');
    md.push('');
    md.push('- 구조 오류가 있는 실습 (' + perLesson('구조 오류').length + '개): ' + (perLesson('구조 오류').join(', ') || '없음'));
    md.push('- 실습이 보여 주는 컴파일 오류가 있는 실습 (' + perLesson('실습이 보여 주는 컴파일 오류').length + '개): ' + (perLesson('실습이 보여 주는 컴파일 오류').join(', ') || '없음'));
    md.push('- 줄였다고 밝힌 조각이 있는 실습 (' + perLesson('줄였다고 밝힌 조각').length + '개): ' + (perLesson('줄였다고 밝힌 조각').join(', ') || '없음'));
    md.push('- import만 빠진 코드가 있는 실습 (' + perLesson('import만 빠짐').length + '개): ' + (perLesson('import만 빠짐').join(', ') || '없음'));
    const allPass = R.filter(x => x.rows.every(r => r.res.cls === '통과' || r.res.cls === '자바 아님') && x.rows.some(r => r.res.cls === '통과')).map(x => x.l.id);
    md.push('- 자바 코드가 모두 통과한 실습 (' + allPass.length + '개): ' + (allPass.join(', ') || '없음'));
    const nonJava = R.filter(x => x.rows.every(r => r.res.cls === '자바 아님')).map(x => x.l.id);
    md.push('- 자바 코드가 없다고 본 실습 (' + nonJava.length + '개): ' + (nonJava.join(', ') || '없음'));
    md.push('');
    const kindTally = {};
    R.forEach(x => x.rows.forEach(r => { if (r.res.cls === '구조 오류') kindTally[r.res.main] = (kindTally[r.res.main] || 0) + 1; }));
    md.push('- 구조 오류의 갈래(첫 갈래 기준, 서로 다른 코드 수): ' + (Object.entries(kindTally).sort((a, b) => KIND_ORDER.indexOf(a[0]) - KIND_ORDER.indexOf(b[0])).map(([k, n]) => k + ' ' + n).join(', ') || '없음'));
    md.push('');
  }
  for (const lang of Object.keys(results)) {
    const R = results[lang];
    for (const cls of ['구조 오류', '줄였다고 밝힌 조각', '실습이 보여 주는 컴파일 오류']) {
      const extraCol = cls === '줄였다고 밝힌 조각' ? '줄임 주석' : cls === '실습이 보여 주는 컴파일 오류' ? '실행 결과의 문장' : '';
      md.push('## ' + lang + ': ' + cls);
      md.push('');
      if (cls === '실습이 보여 주는 컴파일 오류') { md.push('조합의 실행 결과(단계 문장·요약·결과 표)가 "컴파일 오류" 등을 말하는 경우다. 일부러 보여 주는 오류인지, javac 오류가 실습이 말하는 오류와 같은지 확인할 것.'); md.push(''); }
      md.push('| 실습 id | 조합 | 갈래 | 못 찾은 이름 | javac 첫 오류 | 감싸면 |' + (extraCol ? ' ' + extraCol + ' |' : ''));
      md.push('|---|---|---|---|---|---|' + (extraCol ? '---|' : ''));
      let n = 0;
      R.forEach(x => x.rows.forEach(r => {
        if (r.res.cls !== cls) return; n++;
        const s = r.res;
        md.push(`| ${x.l.id} | ${esc(r.titled.join(', '))} | ${s.kinds.join('·')} (${s.nerr}개) | ${esc(s.names.slice(0, 8).join(', '))} | \`${esc(s.first[0])}\`<br>\`${esc(s.first[1])}\` | ${esc(s.wrap || '')} |` + (extraCol ? ` ${esc(cls === '줄였다고 밝힌 조각' ? s.trim : s.simSays)} |` : ''));
      }));
      if (!n) md.push('| 없음 | | | | | |' + (extraCol ? ' |' : ''));
      md.push('');
    }
    // 못 찾은 이름의 빈도(구조 오류·줄인 조각). 라이브러리 클래스인데 클래스패스에 없는 것인지 가릴 때 쓴다
    const freq = {};
    R.forEach(x => x.rows.forEach(r => { if (r.res.cls === '구조 오류' || r.res.cls === '줄였다고 밝힌 조각') r.res.names.forEach(nm => { (freq[nm] = freq[nm] || new Set()).add(x.l.id); }); }));
    const fl = Object.entries(freq).sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]));
    md.push('## ' + lang + ': 못 찾은 이름 (구조 오류·줄인 조각, 실습 수 순)');
    md.push('');
    md.push('대문자로 시작하는 이름 가운데 흔한 패키지에서 찾지 못한 라이브러리 클래스(점검용 클래스패스에 없는 라이브러리)가 섞여 있을 수 있다.');
    md.push('');
    md.push(fl.map(([nm, ids]) => nm + '(' + ids.size + ')').join(', ') || '없음');
    md.push('');
    md.push('## ' + lang + ': import만 빠짐');
    md.push('');
    md.push('| 실습 id | 조합 | 붙인 import | 줄임 주석 |');
    md.push('|---|---|---|---|');
    R.forEach(x => x.rows.forEach(r => { if (r.res.cls === 'import만 빠짐') md.push(`| ${x.l.id} | ${r.combos.join(', ')} | ${esc(r.res.added.map(a => a.replace(/^(정적 )?.*\./, '$1')).join(', '))} | ${esc(r.res.trim || '')} |`); }));
    md.push('');
    md.push('## ' + lang + ': 자바가 아니라고 보고 건너뛴 구획');
    md.push('');
    md.push('자바 구획과 섞여 있던 것도 포함한다. 판단이 맞는지 훑어볼 때 쓴다.');
    md.push('');
    md.push('| 실습 id | 조합 | 화면 줄 | 이유 |');
    md.push('|---|---|---|---|');
    R.forEach(x => {
      const seen = new Set();
      x.rows.forEach(r => (r.res.skipped || []).forEach(k => {
        const key = k.why; if (seen.has(key)) return; seen.add(key);
        md.push(`| ${x.l.id} | ${r.combos.join(', ')} | ${k.from}~${k.to} | ${esc(k.why)} |`);
      }));
    });
    md.push('');
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, md.join('\n'));
  console.log('\n보고: ' + path.relative(root, OUT));
  for (const lang of Object.keys(results)) {
    const R = results[lang];
    console.log(lang + ': 실습 ' + R.length + '개, ' + CLS.map(c => c + ' ' + R.reduce((a, x) => a + x.rows.filter(r => r.res.cls === c).length, 0)).join(', '));
  }
}
main().catch(e => { console.error(e); process.exit(1); });
