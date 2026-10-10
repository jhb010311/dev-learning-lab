// "접근 제어" 실습의 모형 결과를 실제 스프링 시큐리티 서버 실행 결과(accessctl_probe.out.txt)와 조합마다 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('accessctl');
const all = fs.readFileSync(path.join(__dirname, 'accessctl_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(all[0]);
const parse = v => { const p = v.split('|'), f = { status: p[0] }; p.slice(1).forEach(x => { const i = x.indexOf('='); f[x.slice(0, i)] = x.slice(i + 1); }); return f; };
const real = {}, anon = [];
all.forEach(l => { if (!l.includes(' => ')) return; const [k, v] = l.replace(/^# 참고 /, '').split(' => '); if (l.startsWith('# 참고 ')) anon.push(parse(v)); else real[k] = parse(v); });
const STATUS = { 200: '200 OK', 403: '403 Forbidden', 404: '404 Not Found' }, T = { '1': 'mine', '2': 'other', '99': 'missing' };
const WHY = { 'no-owner-check': '소유자 확인 없이 조회함', 'not-found': '조회해 보니 없는 주문', owner: '소유자 확인: 주인이 맞음', 'not-owner': '소유자 확인: 주인이 아님', 'not-mine': '내 주문 가운데 없음', admin: '주인은 아니지만 ADMIN 역할' };
const cs = combos(lesson);
let ok = 0, hideOk = 0;
for (const c of cs) {
  const k = [c.check, c.who, T[c.target]].join('|'), sim = lesson.simulate(Object.assign({}, c)), f = real[k];
  if (!f) { console.log('실제 실행 결과 없음: ' + k); continue; }
  const me = c.who === 'admin' ? 'park' : 'kim';
  const realRow = [STATUS[f.status] || f.status, f.owner === '-' ? '없음' : f.owner + '의 주문 (' + (f.owner === me ? '본인' : '다른 회원') + ')',
    f.controller === 'false' ? (f.status === '403' ? 'URL 규칙 (컨트롤러 실행 전)' : '컨트롤러 실행 전에 ' + f.status) : WHY[f.reason] || f.reason];
  // 200이 아닌 응답의 본문에는 주문 내용이 없어야 하고, 모형이 말하는 "컨트롤러 실행 여부"도 실제와 같아야 한다
  const side = (f.status === '200' || f.leak === 'false') && String(sim.j.ctl) === f.controller;
  if (JSON.stringify(sim.row) === JSON.stringify(realRow) && side) ok++;
  else console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + realRow.join(' | ') + (side ? '' : '\n   본문 또는 컨트롤러 실행 여부가 다름'));
  // "없는 번호를 넣었을 때와 응답 코드가 같은가"(자원이 있는지 드러나는가)도 실제와 같아야 한다
  const miss = real[[c.check, c.who, 'missing'].join('|')];
  if (miss && sim.same99 === (miss.status === f.status)) hideOk++; else console.log('없는 번호와의 비교가 다름: ' + k);
}
console.log('일치 ' + ok + ' / ' + cs.length + (Object.keys(real).length !== cs.length ? '  (실제 실행 줄 수 ' + Object.keys(real).length + ')' : ''));
console.log('없는 번호(99)와 응답 코드가 같은지에 대한 모형의 판단이 실제와 같음 ' + hideOk + ' / ' + cs.length);
console.log('참고: 로그인하지 않은 요청 ' + anon.length + '개 가운데 401이고 컨트롤러가 실행되지 않은 것 ' + anon.filter(f => f.status === '401' && f.controller === 'false').length + '개');
