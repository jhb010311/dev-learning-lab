// "왜 생겼나"(why)와 "지금 어디에 쓰나"(use)의 모양을 검사한다. build.js와 검사 도구(check_lesson.js, i18n/check_kb.js 등)가 함께 쓴다.
//   실습:        Lab.register({ ..., why: '…', use: '…', intro: '…' })   둘 다 고르는 항목이다
//   설명집(kb):  [분류, 용어, 설명] 또는 [분류, 용어, 설명, { why: '…', use: '…' }]   네 번째 칸도 고르는 것이고, 안의 why와 use도 하나만 써도 된다
// 있으면 비어 있지 않은 글(문자열)이어야 한다. 화면에는 글자 그대로 나온다(HTML로 읽지 않는다).
const KEYS = ['why', 'use'];
const isText = v => typeof v === 'string' && v.trim() !== '';

// 실습 하나의 why·use 오류 목록
function lessonErrors(l) {
  return KEYS.filter(k => l[k] !== undefined && !isText(l[k])).map(k => k + '는 비어 있지 않은 글이어야 함');
}

// 설명집 항목 하나의 형식 오류 목록
function kbErrors(r) {
  if (!Array.isArray(r) || (r.length !== 3 && r.length !== 4)) return ['[분류, 용어, 설명] 또는 [분류, 용어, 설명, { why, use }] 이어야 함'];
  const errs = [];
  if (!isText(r[0]) || !isText(r[1]) || !isText(r[2])) errs.push('분류, 용어, 설명은 비어 있지 않은 글이어야 함');
  if (r.length === 4) {
    const x = r[3];
    if (!x || typeof x !== 'object' || Array.isArray(x)) errs.push('네 번째 칸은 { why: \'…\', use: \'…\' } 모양이어야 함');
    else {
      const odd = Object.keys(x).filter(k => !KEYS.includes(k));
      if (odd.length) errs.push('네 번째 칸에 모르는 이름: ' + odd.join(', ') + ' (why, use만 씀)');
      if (!KEYS.some(k => k in x)) errs.push('네 번째 칸에는 why나 use가 하나는 있어야 함');
      KEYS.forEach(k => { if (k in x && !isText(x[k])) errs.push('네 번째 칸의 ' + k + '는 비어 있지 않은 글이어야 함'); });
    }
  }
  return errs;
}

// 한국어 원본과 영어판이 같은 자리에 why·use를 갖고 있는지(번역 검사용). a, b는 실습 객체이거나 kb 항목의 네 번째 칸
function sameKeys(a, b) {
  return KEYS.filter(k => !!(a && a[k]) !== !!(b && b[k]));
}

module.exports = { KEYS, lessonErrors, kbErrors, sameKeys };
