// 디자인을 손볼 때 앞뒤를 견주기 위한 화면 그림을 찍는다(처음 화면, 분야 목록, 실습, 테스트 / 넓은 화면과 휴대폰 너비).
// 먼저 미리보기 서버를 켠다: PORT=4174 node serve.js
// 실행: node tools/shotpages.js <임시 폴더> <그림을 둘 폴더> <이름 앞머리> [dark]
const { spawn } = require('child_process'), fs = require('fs'), path = require('path');
const tmp = process.argv[2], outDir = process.argv[3], pre = process.argv[4] || 'shot', dark = process.argv[5] === 'dark';
if (!tmp || !outDir) { console.log('사용: node tools/shotpages.js <임시 폴더> <그림을 둘 폴더> <이름 앞머리> [dark]'); process.exit(1); }
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', PORT = 9334, BASE = 'http://127.0.0.1:4174/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const RUN = `(async () => { const w = ms => new Promise(r => setTimeout(r, ms)), B = t => [...document.querySelectorAll('button')].find(x => x.offsetParent && x.textContent.indexOf(t) >= 0), E = t => [...document.querySelectorAll('button')].find(x => x.offsetParent && x.textContent.trim() === t);
  const c = B('다시 보지') || B("don't show again"); if (c) { c.click(); await w(300); }
  const run = E('실행') || E('Run'); if (run) { run.click(); await w(400); const nx = document.querySelector('#next'); for (let i = 0; i < 150 && nx && !nx.disabled; i++) { nx.click(); await w(12); } await w(700); }
  window.scrollTo(0, 0); await w(400); return document.title; })()`;
const PAGES = [
  ['home', '#home', 1280, 1500, false], ['study', '#study/spring', 1280, 1300, false], ['lab', '#txprop', 1280, 1700, true], ['lab2', '#threadpool', 1280, 1500, true], ['quiz', '#quiz/db', 1280, 1100, false],
  ['m-home', '#home', 390, 1500, false], ['m-lab', '#txprop', 390, 1900, true], ['en-home', 'en/#home', 1280, 1500, false],
];
(async () => {
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + path.join(tmp, 'chrome-shotpages'), '--window-size=1280,1200', '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  try {
    let target; for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { target = (await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json()).filter(t => t.type === 'page')[0]; } catch (e) {} }
    if (!target) throw new Error('Chrome에 연결하지 못함');
    const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
    let seq = 0; const wait = {}; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && wait[d.id]) { wait[d.id](d); delete wait[d.id]; } };
    const send = (method, params) => new Promise(ok => { const id = ++seq; wait[id] = d => ok(d.result || d); ws.send(JSON.stringify({ id, method, params: params || {} })); });
    await send('Page.enable'); fs.mkdirSync(outDir, { recursive: true });
    if (dark) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
    for (const [name, hash, w, h, run] of PAGES) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
      await send('Page.navigate', { url: 'about:blank' }); await sleep(200);
      await send('Page.navigate', { url: BASE + hash }); await sleep(1600);
      if (run) await send('Runtime.evaluate', { expression: RUN, awaitPromise: true });
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const out = path.join(outDir, pre + '-' + name + '.png'); fs.writeFileSync(out, Buffer.from(shot.data, 'base64')); console.log('저장: ' + out);
    }
    ws.close();
  } finally { chrome.kill(); }
})().catch(e => { console.log('실패: ' + e.message); process.exit(1); });
