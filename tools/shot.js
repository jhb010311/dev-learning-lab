// README에 넣을 화면 그림을 찍는다. 이 PC의 Chrome을 창 없이 띄워 미리보기 서버의 실습을 열고, 실행을 누른 뒤 화면을 PNG로 저장한다.
// 먼저 미리보기 서버를 켠다: PORT=4174 node serve.js
// 실행: node tools/shot.js <임시 폴더> [실습 id]   → docs/img/lab-ko.png, docs/img/lab-en.png
const { spawn } = require('child_process'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), tmp = process.argv[2], lab = process.argv[3] || 'txprop';
if (!tmp) { console.log('사용: node tools/shot.js <임시 폴더> [실습 id]'); process.exit(1); }
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', PORT = 9333, BASE = 'http://127.0.0.1:4174/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + path.join(tmp, 'chrome-shot'), '--window-size=1280,1180', '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  try {
    let target; for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { target = (await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json()).filter(t => t.type === 'page')[0]; } catch (e) {} }
    if (!target) throw new Error('Chrome에 연결하지 못함');
    const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
    let seq = 0; const wait = {}; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && wait[d.id]) { wait[d.id](d); delete wait[d.id]; } };
    const send = (method, params) => new Promise(ok => { const id = ++seq; wait[id] = d => ok(d.result || d); ws.send(JSON.stringify({ id, method, params: params || {} })); });
    const js = expr => send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    await send('Page.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1180, deviceScaleFactor: 1, mobile: false });
    fs.mkdirSync(path.join(root, 'docs', 'img'), { recursive: true });
    for (const [lang, url, run, skip, close] of [['ko', BASE + '#' + lab, '실행', '결과만 보기', '다시 보지'], ['en', BASE + 'en/#' + lab, 'Run', 'Skip the animation', "don't show again"]]) {
      await send('Page.navigate', { url: 'about:blank' }); await sleep(300);
      await send('Page.navigate', { url }); await sleep(1500);
      const r = await js(`(async () => { const w = ms => new Promise(r => setTimeout(r, ms)), B = t => [...document.querySelectorAll('button')].find(x => x.offsetParent && x.textContent.indexOf(t) >= 0), E = t => [...document.querySelectorAll('button')].find(x => x.offsetParent && x.textContent.trim() === t);
        const c = B(${JSON.stringify(close)}); if (c) { c.click(); await w(300); }
        const run = E(${JSON.stringify(run)}); if (!run) return 'no run button'; run.click(); await w(400);
        const sk = B(${JSON.stringify(skip)}); if (sk) { sk.click(); await w(900); }
        document.querySelector('#title').scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); await w(500); return document.querySelector('#title').textContent + ' / ' + scrollY; })()`);
      console.log(lang + ': ' + JSON.stringify(r.result && r.result.value));
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const out = path.join(root, 'docs', 'img', 'lab-' + lang + '.png'); fs.writeFileSync(out, Buffer.from(shot.data, 'base64')); console.log('저장: ' + out + ' ' + Math.round(fs.statSync(out).size / 1024) + 'KB');
    }
    ws.close();
  } finally { chrome.kill(); }
})().catch(e => { console.log('실패: ' + e.message); process.exit(1); });
