// 용어 대조표(src/en/termbase) 전체를 검사한다. 사용: node tools/i18n/check_termbase.js
//   설명집(kb)과 용어 풀이(glossary)의 모든 용어가 표에 있는지, 표에만 있는 용어는 없는지,
//   ko나 en이 겹치지 않는지, how와 src의 형식, 영어 이름에 한글이 없는지를 본다.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..'), dir = path.join(root, 'src', 'en', 'termbase'), HAN = /[가-힣]/;
const rows = fs.readdirSync(dir).filter(f => f.endsWith('.js')).flatMap(f => require(path.join(dir, f)).map(r => Object.assign({ file: f }, r)));
const errs = [], warns = [];
const kb = fs.readdirSync(path.join(root, 'kb')).filter(f => /^kb.*\.js$/.test(f)).flatMap(f => require(path.join(root, 'kb', f)).map(r => r[1]));
const gl = []; new Function('Lab', fs.readFileSync(path.join(root, 'src', 'glossary.js'), 'utf8'))({ glossary: g => gl.push(...g) });
const glNames = [...new Set(gl.filter(e => !e.kb).map(e => e.t))];
const byKo = Object.create(null), byEn = Object.create(null);
rows.forEach(r => {
  const at = r.file + ' "' + r.ko + '"';
  if (!r.ko || !r.en) errs.push(at + ': ko, en이 필요');
  if (HAN.test(r.en) || (r.also || []).some(a => HAN.test(a))) errs.push(at + ': 영어 이름에 한글이 있음');
  if (!['official', 'composed', 'descriptive', 'unverified'].includes(r.how)) errs.push(at + ': how 값 오류 ' + r.how);
  if (r.how !== 'unverified' && r.how !== 'descriptive' && !/https?:\/\/|\[[^\]]+\]/.test(r.src || '')) warns.push(at + ': src에 주소(또는 파일 머리말의 줄임 이름)가 없음');
  (byKo[r.ko] = byKo[r.ko] || []).push(r);
});
// 같은 한국어 용어가 여러 파일에 있어도(설명집과 용어 풀이에 함께 있는 낱말 등) 영어 이름이 같으면 된다
Object.keys(byKo).forEach(k => {
  const ens = [...new Set(byKo[k].map(r => r.en))];
  if (ens.length > 1) errs.push('같은 한국어 용어의 영어 이름이 서로 다름: ' + k + ' → ' + byKo[k].map(r => r.file + ' ' + JSON.stringify(r.en)).join(' / '));
  ens.forEach(e => (byEn[e.toLowerCase()] = byEn[e.toLowerCase()] || []).push(byKo[k][0].file + ' "' + k + '"'));
});
Object.keys(byEn).forEach(k => { if (byEn[k].length > 1) errs.push('같은 영어 이름이 여러 용어에: ' + k + ' ← ' + byEn[k].join(' / ')); });
const missKb = kb.filter(n => !byKo[n]), missGl = glNames.filter(n => !byKo[n]);
const extra = rows.filter(r => !kb.includes(r.ko) && !glNames.includes(r.ko)).map(r => r.file + ' "' + r.ko + '"');
const n = {}; rows.forEach(r => n[r.how] = (n[r.how] || 0) + 1);
console.log('대조표 ' + rows.length + '개', JSON.stringify(n), '| 설명집 ' + kb.length + '개, 용어 풀이 낱말 ' + glNames.length + '개');
if (missKb.length) console.log('표에 없는 설명집 용어 ' + missKb.length + '개: ' + missKb.join(' | '));
if (missGl.length) console.log('표에 없는 용어 풀이 낱말 ' + missGl.length + '개: ' + missGl.join(' | '));
if (extra.length) console.log('설명집에도 용어 풀이에도 없는 항목 ' + extra.length + '개: ' + extra.join(' | '));
warns.forEach(w => console.log('주의: ' + w)); errs.forEach(e => console.log('오류: ' + e));
console.log(errs.length ? '검사 실패 (' + errs.length + '개)' : '형식 검사 통과');
