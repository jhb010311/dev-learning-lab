Lab.register({
  id: 'cdn', nav: 'CDN', cat: 'Networking', mode: 'step',
  title: 'The origin was changed, so why do users still get the old file?',
  intro: 'A CDN keeps copies of the files held by the origin server on servers close to the users (edge servers) and has the edge servers answer on its behalf. The first request finds no copy at the edge, so it goes all the way to the origin (MISS), but after that the edge answers right away (HIT). In exchange, the edge does not ask the origin again during the freshness lifetime of a copy, so if you change the file at the origin in the meantime, users still receive the old copy.',
  terms: ['CDN', 'Origin server and edge server', 'Cache key', 'Cache invalidation (purge)', 'TTL (time to live)'],
  controls: [
    { id: 'ttl', label: 'How long the edge may use a copy (written by the origin in the response)', type: 'select', value: '300', options: [['60', 'Cache-Control: public, s-maxage=60 (60 seconds)'], ['300', 'Cache-Control: public, s-maxage=300 (300 seconds)']] },
    { id: 'q2', label: 'Address of the request at 10s', type: 'select', value: 'same', options: [['same', '/app.css?v=1 (same address as the first)'], ['ref', '/app.css?v=1&ref=mail (a query string is added)']] },
    { id: 'chg', label: 'At 30s, the app.css at the origin is changed to new content', type: 'check', value: true },
    { id: 'after', label: 'What is done after the change', type: 'select', value: 'none', options: [['none', 'Nothing'], ['purge', 'Ask the edge to invalidate (purge) /app.css?v=1'], ['ver', 'Change the requested address to /app.css?v=2']], show: function (c) { return c.chg; } },
  ],
  presets: [
    { t: 'Default settings', q: 'With s-maxage=300 on app.css, requests at 0s, 10s, 40s, and 80s, and the origin changed at 30s, what does each request receive?', d: 'Freshness lifetime of 300 seconds. Although the origin was changed, the users at 40s and at 80s both get the old content.', v: { ttl: '300', q2: 'same', chg: true, after: 'none' } },
    { t: 'If the freshness lifetime is 60 seconds', q: 'What if you change how long the edge may use a copy to s-maxage=60?', d: 'At 40s the user gets the old content, and at 80s the edge asks again and the user gets the new content.', v: { ttl: '60', q2: 'same', chg: true, after: 'none' } },
    { t: 'Invalidation (purge)', q: 'What if, after the change, you ask the edge to invalidate (purge) /app.css?v=1?', d: 'The copy at the edge is deleted, and the next request fetches the new content from the origin.', v: { ttl: '300', q2: 'same', chg: true, after: 'purge' } },
    { t: 'Change the address', q: 'What if, after the change, you change the requested address to /app.css?v=2?', d: '?v=2 is a different address, so the edge has no copy of it and fetches the new content.', v: { ttl: '300', q2: 'same', chg: true, after: 'ver' } },
    { t: 'If a query string is added', q: 'What if the request at 10s uses /app.css?v=1&ref=mail and the app.css at the origin is not changed at 30s?', d: 'Even though it is the same file, it is treated as a different copy, and the request goes to the origin one more time.', v: { ttl: '300', q2: 'ref', chg: false, after: 'none' } },
    { t: 'When the file is not changed', q: 'What if the app.css at the origin is not changed at 30s?', d: 'The request goes to the origin only once, and the edge answers all the rest.', v: { ttl: '300', q2: 'same', chg: false, after: 'none' } },
  ],
  // If the file is not changed, "What is done after the change" is not used, so it is fixed to one value
  fix: function (c) { return c.chg ? null : { after: 'none' }; },
  U1: '/app.css?v=1', UREF: '/app.css?v=1&ref=mail', U2: '/app.css?v=2',
  NEAR: 20, FAR: 200,   // example latency: 20ms round trip between the user and the edge, 200ms round trip between the edge and the origin
  code: function (c) {
    var u3 = c.chg && c.after === 'ver' ? this.U2 : this.U1;
    return '# Response header that the origin adds when it serves app.css\nCache-Control: public, s-maxage=' + c.ttl + '     # a shared cache (the edge) may use the copy as it is for ' + c.ttl + ' seconds\n\n// Edge: a server that keeps copies and answers on their behalf (a shortened version in Node.js)\nconst store = new Map();                              // address (path + query string) → stored copy\nhttp.createServer(async (req, res) => {\n    if (req.method === \'PURGE\') {                     // invalidation: deletes the copy of that address\n        store.delete(req.url);\n        return res.end(\'purged\');\n    }\n    const copy = store.get(req.url);\n    if (copy && age(copy) < copy.ttl) {               // there is a copy and it is within the freshness lifetime\n        res.setHeader(\'X-Cache\', \'HIT\');\n        return res.end(copy.body);                    // answers right away without asking the origin\n    }\n    const fresh = await fetchFromOrigin(req.url);     // if there is none or the freshness lifetime has passed, go to the origin\n    store.set(req.url, fresh);\n    res.setHeader(\'X-Cache\', copy ? \'EXPIRED\' : \'MISS\');\n    res.end(fresh.body);\n});\n\n// Order of requests\n//  0s  curl https://cdn.shop.example' + this.U1 + '\n// 10s  curl https://cdn.shop.example' + (c.q2 === 'ref' ? this.UREF : this.U1) + (c.chg ? '\n// 30s  deploy the new content of app.css to the origin' + (c.after === 'purge' ? '\n//       curl -X PURGE https://cdn.shop.example' + this.U1 : '') : '') + '\n// 40s  curl https://cdn.shop.example' + u3 + '\n// 80s  curl https://cdn.shop.example' + u3;
  },
  label: function (c) { return 'Fresh for ' + c.ttl + 's' + (c.q2 === 'ref' ? ' · ?v=1&ref=mail at 10s' : '') + (c.chg ? ' · content changed at 30s' + { none: '', purge: ' + invalidation', ver: ' + address changed to ?v=2' }[c.after] : ' · no change'); },
  columns: ['Request at 0s', 'Request at 10s', 'Request at 40s', 'Request at 80s', 'Requests that went to the origin'],
  simulate: function (c) {
    var ttl = +c.ttl, U1 = this.U1, U3 = c.chg && c.after === 'ver' ? this.U2 : U1, NEAR = this.NEAR, FAR = this.FAR, ev = [], sum = [];
    var st = { t: -1, reqs: [], entries: [], origin: 'old', oc: 0, cur: null, changed: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function find(url) { return st.entries.filter(function (e) { return e.url === url; })[0]; }
    function name(v) { return !c.chg ? '' : v === 'old' ? 'Old content' : 'New content'; }
    // The edge handles one request. No copy: MISS. A copy within its freshness lifetime: HIT. A copy past it: EXPIRED
    function request(t, url) {
      var e = find(url), status = !e ? 'MISS' : t - e.at < ttl ? 'HIT' : 'EXPIRED', age = e ? t - e.at : 0, ver;
      if (status === 'HIT') ver = e.ver;
      else { st.oc++; ver = st.origin; if (e) { e.ver = ver; e.at = t; } else st.entries.push({ url: url, ver: ver, at: t }); }
      var ms = status === 'HIT' ? NEAR : NEAR + FAR, stale = status === 'HIT' && ver !== st.origin;
      st.t = t; st.cur = { t: t, url: url, status: status, ver: ver, ms: ms, stale: stale, age: age };
      st.reqs.push(st.cur);
      return st.cur;
    }
    var cell = function (r) { return r.status + (c.chg && r.t >= 30 ? ' · ' + name(r.ver) : ''); };
    var r1 = request(0, U1);
    push('0s: A user sends GET ' + U1 + '. The request does not go to the origin; it arrives at the edge server close to the user. The edge has no copy of this address (MISS). The edge fetches the file from the faraway origin, gives it to the user, and keeps a copy. According to the s-maxage=' + ttl + ' that the origin wrote in the response, this copy may be used as it is for ' + ttl + ' seconds.', '');
    var r2 = request(10, c.q2 === 'ref' ? this.UREF : U1);
    if (c.q2 === 'same') push('10s: Another user requests the same address. The edge has a copy, and it was fetched 10 seconds ago, so it is within its freshness lifetime (HIT). The edge answers right away without asking the origin. The origin does not even know that this request happened. Because many users share one copy, this is called a shared cache.', 'good');
    else push('10s: Another user requests the address ' + this.UREF + ' from a link in an email. It is the same file, but the query string is different, so the address is different. The edge looks up copies by the whole address (the cache key), so there is no matching copy (MISS). It goes to the origin one more time and keeps a copy of the same content under this address as well.', 'bad');
    if (c.chg) {
      st.t = 30; st.origin = 'new'; st.changed = true; st.cur = null;
      push('30s: A developer changes the app.css at the origin to new content and deploys it. The origin does not tell the edge about this. The copy the edge has stored is still the old content.', '');
      if (c.after === 'purge') {
        st.entries = st.entries.filter(function (e) { return e.url !== U1; });
        push('Next, an invalidation (purge) of the address ' + U1 + ' is requested from the edge. The edge deletes the copy of that address.' + (c.q2 === 'ref' ? ' The copy for the different address ' + this.UREF + ' is not deleted and stays as old content.' : ''), 'good');
      }
      if (c.after === 'ver') push('Next, the address that the web page points to is changed to ' + this.U2 + '. The copies at the edge are not touched. Users now request the new address.', 'good');
    }
    var r3 = request(40, U3);
    if (r3.status === 'HIT') push('40s: A user requests the address ' + U3 + '. The copy at the edge was fetched 40 seconds ago, so it is within the freshness lifetime (' + ttl + ' seconds) (HIT). The edge gives the stored copy as it is.' + (r3.stale ? ' The file at the origin was changed 10 seconds ago, but the edge does not know. The user gets the old content.' : ''), r3.stale ? 'bad' : 'good');
    else push('40s: A user requests the address ' + U3 + '. ' + (c.after === 'purge' ? 'Because the copy was deleted,' : 'Because ?v=2 is an address the edge is seeing for the first time,') + ' the edge has no matching copy (MISS). What the edge fetched from the origin is the new content, and it keeps this as a copy.', 'good');
    var r4 = request(80, U3);
    if (r4.status === 'EXPIRED') push('80s: A user requests the address ' + U3 + '. There is a copy, but ' + r4.age + ' seconds have passed since it was fetched, which is over the freshness lifetime (' + ttl + ' seconds) (EXPIRED). The edge does not use this copy as it is and requests the file from the origin again.' + (c.chg ? ' What it fetched this time is the new content. Only now does the changed file reach the user.' : ' The content is the same, but the freshness lifetime of the copy starts over.'), c.chg ? 'good' : '');
    else push('80s: A user requests the address ' + U3 + '. There is a copy, and ' + r4.age + ' seconds have passed since it was fetched, which is within the freshness lifetime (' + ttl + ' seconds) (HIT). The edge answers right away.' + (r4.stale ? ' It has been 50 seconds since the file at the origin changed, but the user still gets the old content. This keeps happening until the freshness lifetime ends at ' + ttl + ' seconds.' : ''), r4.stale ? 'bad' : 'good');
    var stales = st.reqs.filter(function (r) { return r.stale; }).length;
    sum.push('When the edge answers right away, only a short distance is traveled, so it is fast (' + NEAR + 'ms in the example), and going to the origin adds the long distance (' + (NEAR + FAR) + 'ms in the example). The number of requests the origin receives also goes down. These times are examples to show the difference.');
    if (stales) sum.push('The edge does not ask the origin again during the freshness lifetime. So even if you change the file at the origin, copies that still have freshness lifetime left continue to go out. The longer the freshness lifetime, the faster the responses, but the more slowly the changed content spreads.' + (c.ttl === '60' ? ' With this setting of 60 seconds, the new content went out from the request at 80s.' : ''));
    if (c.chg && c.after === 'purge') sum.push('Invalidation (purge) is a feature that forcibly deletes a copy that still has freshness lifetime left. The first request after the deletion is a MISS and fetches the new content from the origin. It deletes only the copy of the address you specify, and it cannot delete the copies that users\' browsers keep separately.');
    if (c.chg && c.after === 'ver') sum.push('If the query string is different, the edge sees a different copy. Using this, if you raise the version in the address each time you change the file (?v=2, or adding a hash to the file name), the new content goes out right away without invalidation. The address changes along with the content, so you can set a very long freshness lifetime. The copy of the old address ' + U1 + ' stays there as the old content.');
    if (c.q2 === 'ref') sum.push('The edge looks up copies by the whole address, the path and the query string together. Even a query string unrelated to the content, such as a tracking value attached to a link in an ad or an email, makes a different copy, and more requests go to the origin. That is why CDNs have a setting to ignore some query strings when looking up a copy.');
    if (!c.chg && c.q2 === 'same') sum.push(c.ttl === '300' ? 'While the file does not change, the longer the freshness lifetime the better. The request went to the origin only the first time.' : 'When the freshness lifetime passes, the edge goes to the origin again even if the content is the same. A short freshness lifetime spreads changed content quickly, but in exchange the trips to the origin become frequent.');
    return { events: ev, summary: sum, row: [cell(r1), cell(r2), cell(r3), cell(r4), st.oc + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, 'Click Run to start with the first request at 0s.'); return; }
    var name = function (x) { return !c.chg ? 'Copy' : x === 'old' ? 'Old content' : 'New content'; };
    H.counters(v, [[s.reqs.filter(function (r) { return r.status === 'HIT'; }).length + '', 'Answered by the edge right away'], [s.oc + '', 'Requests that went to the origin']]);
    H.table(v, ['Time', 'Requested address', 'Edge decision', 'What the user got', 'Time taken (example)'], s.reqs.map(function (r) { return { cells: [r.t + 's', r.url, { v: r.status, cls: r.status === 'HIT' ? 'good' : 'hot' }, { v: name(r.ver) + (r.stale ? ' (the origin has already changed)' : ''), cls: r.stale ? 'bad' : '' }, r.ms + 'ms'] }; }), 'Requests from users');
  },
  // Diagram: user → edge → origin. The copies stored inside the edge are stacked by address. The arrow from the edge to the origin appears only for MISS or EXPIRED.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], c = sim.c, ttl = +c.ttl, s = last ? last.snap : { t: 0, reqs: [], entries: [], origin: 'old', oc: 0, cur: null, changed: false }, cur = s.cur;
    var name = function (x) { return !c.chg ? 'Copy' : x === 'old' ? 'Old content' : 'New content'; };
    P.size(680, 300);
    P.box('u', 16, 62, 124, 60, { cls: cur ? 'wait' : 'plain', title: 'User', sub: 'Near the edge' });
    P.region('eg', 172, 16, 300, 210, 'Edge server: a store of copies placed close to the user');
    P.box('ed', 184, 44, 276, 32, { cls: !cur ? 'plain' : cur.status === 'HIT' ? 'good' : 'hot', title: 'Edge decision', right: cur ? cur.status : '-' });
    [this.U1, this.UREF, this.U2].forEach(function (u, i) {
      var e = s.entries.filter(function (x) { return x.url === u; })[0]; if (!e) return;
      var fresh = s.t - e.at < ttl;
      P.box('e' + i, 184, 84 + i * 46, 276, 40, { cls: (!fresh ? 'ghost' : e.ver !== s.origin ? 'bad' : 'good') + (cur && cur.url === u ? ' now' : ''), title: u, right: name(e.ver), sub: fresh ? 'Fresh from ' + e.at + 's to ' + (e.at + ttl) + 's' : 'Fetched at ' + e.at + 's · stale' });
    });
    P.box('o', 504, 62, 160, 60, { cls: s.changed && s.t === 30 ? 'hot' : 'plain', title: 'Origin server', sub: ['Far away', c.chg ? (s.origin === 'old' ? 'Old app.css' : 'New app.css') : 'app.css unchanged'] });
    if (cur) { P.arrow('ue', 'u:r', 'ed:l', { label: 'Request' }); if (cur.status !== 'HIT') P.arrow('eo', 'ed:r', 'o:l', { cls: 'hot', label: 'Fetch' }); }
    P.box('now', 16, 240, 648, 36, { cls: !cur ? 'ghost' : cur.stale ? 'bad' : cur.status === 'HIT' ? 'good' : 'hot', title: cur ? cur.t + 's: GET ' + cur.url : s.t === 30 ? '30s: The file at the origin was changed' : 'No request yet', right: cur ? cur.status + (c.chg ? ' · ' + name(cur.ver) : '') + ' · ' + cur.ms + 'ms (example)' : '' });
    P.note('A step with no arrow from the edge to the origin is one where the edge answered right away with the copy it had stored. A red copy is an old copy that differs from the current content at the origin. The time taken is an example to show the difference in distance.');
  },
  assume: 'All 16 combinations (if the file is not changed, "What is done after the change" is not used) were run using an origin server and a small caching proxy acting as the edge, both started on 127.0.0.1, and it was confirmed that for each of the four requests whether it was a MISS, HIT, or EXPIRED, the content received, and the number of requests that reached the origin all matched the model. The edge is a test one built with Node.js 24; deciding whether a response may be stored and whether its freshness lifetime remains was left to http-cache-semantics 4.2 (shared cache mode), an implementation of the HTTP caching rules. To avoid waiting 80 seconds, the clock of the edge was run fast (1 second of the model as 30ms in real time), and the part of the user was played alternately by fetch of Node and curl 8.21. This was not checked on a real CDN service. The times taken (20ms, 220ms) and "close" and "far" are not measurements but examples to show the difference. That s-maxage sets the freshness lifetime of a shared cache and that a copy past its freshness lifetime is not used as it is follows sections 4.2 and 5.2.2.10 of RFC 9111, and that a copy is looked up by the request method and the address follows section 2. The names HIT, MISS, and EXPIRED and the X-Cache header are not standards but conventions used by many CDNs and proxies, and the spelling differs by product. Invalidation (purge) is also a product-specific feature that is not in the standards, and here it follows the common approach of deleting the copy of one address with a PURGE method. When the freshness lifetime has passed, the edge in this model fetches the whole file again, but real CDNs usually first ask with a conditional request only whether the file "has changed" (see the HTTP caching and ETag lab). Not covered: that there are several edges in several regions, each keeping its own copies; the copies that browsers keep separately; and a feature that fills in copies in advance.',
});
