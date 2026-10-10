// 그림 코드를 실습 파일의 assume 바로 앞에 넣는다. 사용: node add_draw.js draws_파일.js
// draws 파일은 { 실습 id: 'draw 코드 문자열' }을 내보낸다. 이미 draw가 있는 실습은 바꿔 넣는다.
const fs = require('fs'), path = require('path');
const draws = require(path.resolve(process.argv[2])), dir = path.join(__dirname, 'lab_src', 'lessons');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
Object.keys(draws).forEach(id => {
  const f = files.filter(x => new RegExp("^  id: '" + id + "', nav:", 'm').test(fs.readFileSync(path.join(dir, x), 'utf8')))[0];
  if (!f) throw new Error('실습 없음: ' + id);
  let s = fs.readFileSync(path.join(dir, f), 'utf8');
  const mark = "\n  assume: '"; if (s.split(mark).length !== 2) throw new Error(f + ': assume 위치를 못 찾음');
  const old = s.indexOf('\n  // 그림:'); if (old >= 0 && old < s.indexOf(mark)) s = s.slice(0, old) + s.slice(s.indexOf(mark));
  if (/\n  draw: function/.test(s)) throw new Error(f + ': 표시 없는 draw가 이미 있음');
  s = s.replace(mark, () => '\n' + draws[id].replace(/^\n+|\s+$/g, '') + mark);
  fs.writeFileSync(path.join(dir, f), s); console.log('그림 추가:', id, f);
});
