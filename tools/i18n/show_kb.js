// 설명집 용어를 한국어와 영어로 나란히 보여 준다. 사용: node tools/i18n/show_kb.js <한국어 용어 이름의 일부> [...]
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const files = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => /^kb.*\.js$/.test(f)) : [];
process.argv.slice(2).forEach(q => {
  files(path.join(root, 'kb')).forEach(f => {
    const ko = require(path.join(root, 'kb', f)), enP = path.join(root, 'kb', 'en', f), en = fs.existsSync(enP) ? require(enP) : null;
    ko.forEach((r, i) => { if (!r[1].includes(q)) return; console.log('[' + f + ' #' + (i + 1) + '] ' + r[1] + '\n  KO: ' + r[2] + (en && en[i] ? '\n  EN (' + en[i][1] + '): ' + en[i][2] : '') + '\n'); });
  });
});
