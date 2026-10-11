Lab.register({
  id: 'dns', nav: 'DNS', cat: 'Networking', mode: 'step',
  title: 'Who knows the IP address of a domain name, and when does a change show up?',
  intro: 'A computer cannot connect to a name like shop.example; it needs an IP address. DNS is what turns a name into an address. The servers that know the answer are not in one place but are divided into several levels, and an answer that has been received stays in a cache for a set time (the TTL) so that it is not asked for again. Follow the lookup process and see the difference the cache makes.',
  terms: ['DNS', 'DNS record', 'Recursive resolver and authoritative name server', 'DNS cache and TTL'],
  controls: [
    { id: 'q', label: 'What to ask for', type: 'select', value: 'a', options: [['a', 'IPv4 address of shop.example (A)'], ['aaaa', 'IPv6 address of shop.example (AAAA)'], ['cname', 'Address of www.shop.example (through a CNAME)'], ['mx', 'Mail server of shop.example (MX)']] },
    { id: 'cache', label: 'State of the caches', type: 'select', value: 'none', options: [['none', 'Nowhere (a name asked for the first time)'], ['resolver', 'In the resolver\'s cache (another user asked 120s ago)'], ['os', 'In this PC\'s cache (asked 120s ago)'], ['expired', 'This PC asked 400s ago (the TTL of 300s has passed)']] },
    { id: 'changed', label: 'The administrator changed the value of the record a moment ago', type: 'check', value: false, hint: 'Only the value on the authoritative name server changes. Answers already in a cache stay as they are.' },
  ],
  presets: [
    { t: 'Default settings', d: 'A name asked for the first time. The resolver asks from the root server down, one server at a time, to find the answer.', v: { q: 'a', cache: 'none', changed: false } },
    { t: 'A name that was just asked for', d: 'The answer is in this PC\'s cache, so no one is asked.', v: { q: 'a', cache: 'os', changed: false } },
    { t: 'Record changed, but traffic still goes to the old address', d: 'The TTL has not run out in the resolver\'s cache, so it gets the old value.', v: { q: 'a', cache: 'resolver', changed: true } },
    { t: 'After the TTL has passed', d: 'It asks again and gets the new value. It does not start from the root server.', v: { q: 'a', cache: 'expired', changed: true } },
    { t: 'A name that goes through a CNAME', d: 'It finds the canonical name of the alias, and then looks up that name once more.', v: { q: 'cname', cache: 'none', changed: false } },
    { t: 'Finding the mail server', d: 'An MX record gives the name of the mail server, not an address.', v: { q: 'mx', cache: 'none', changed: false } },
  ],
  CASES: {
    a: { name: 'shop.example', type: 'A', old: '203.0.113.10', neu: '203.0.113.99' },
    aaaa: { name: 'shop.example', type: 'AAAA', old: '2001:db8::10', neu: '2001:db8::99' },
    cname: { name: 'www.shop.example', type: 'A', alias: 'shop.cdn.example', old: '203.0.113.80', neu: '203.0.113.81' },
    mx: { name: 'shop.example', type: 'MX', old: '10 mail.shop.example', neu: '10 mail2.shop.example' },
  },
  code: function (c) {
    var C = this.CASES, K = C[c.q];
    var ch = function (q) { return c.changed && c.q === q ? '   ; changed a moment ago (it was ' + C[q].old + ' before)' : ''; }, v = function (q) { return c.changed && c.q === q ? C[q].neu : C[q].old; };
    var call = c.q === 'aaaa' ? 'resolve6(\'shop.example\', { ttl: true })' : c.q === 'mx' ? 'resolveMx(\'shop.example\')' : 'resolve4(\'' + K.name + '\', { ttl: true })';
    return '; Records held by the authoritative name server for shop.example (name, TTL, type, value)\nshop.example.        300  IN  A      ' + v('a') + ch('a') + '\nshop.example.        300  IN  AAAA   ' + v('aaaa') + ch('aaaa') + '\nshop.example.        300  IN  MX     ' + v('mx') + '.' + ch('mx') + '\nwww.shop.example.    300  IN  CNAME  shop.cdn.example.\n\n; Records held by the authoritative name server for cdn.example\nshop.cdn.example.    300  IN  A      ' + v('cname') + ch('cname') + '\n\n// The asking side (Node.js, file name ask.mjs). It asks the recursive resolver in the network settings and receives the answer\nimport { Resolver } from \'node:dns/promises\';\nconsole.log(await new Resolver().' + call + ');';
  },
  label: function (c) { return { a: 'A', aaaa: 'AAAA', cname: 'A via CNAME', mx: 'MX' }[c.q] + ' · ' + { none: 'no cache', resolver: 'resolver cache', os: 'PC cache', expired: 'TTL passed' }[c.cache] + (c.changed ? ' · record changed' : ''); },
  columns: ['Answer received', 'Where the answer came from', 'Queries from the PC to the resolver', 'Queries from the resolver to name servers', 'Was the changed value reflected?'],
  simulate: function (c) {
    var K = this.CASES[c.q], cn = c.q === 'cname', TTL = 300, AGO = 120, LEFT = TTL - AGO, OLD = 400, NS = 172800, ev = [], sum = [];
    var st = { msgs: [], pc: [], rs: [], pcq: 0, upq: 0, ans: '', src: '' };
    function push(s, kind) { ev.push({ s: s, k: kind || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function msg(f, t, s, cls) { st.msgs.push({ f: f, t: t, s: s, cls: cls || '' }); }
    var cached = c.cache === 'os' || c.cache === 'resolver', val = c.changed && !cached ? K.neu : K.old, show = function (v) { return cn ? K.alias + ' → ' + v : v; };
    var answer = show(val), ask = K.name + ' ' + K.type + ' ?', path = [];
    // turn the records in a cache into rows of the table
    function recs(v, ttl) { return cn ? [[K.name, 'CNAME', K.alias, ttl], [K.alias, 'A', v, ttl]] : [[K.name, K.type, v, ttl]]; }
    function deleg(left) { var d = [['example', 'NS', '.example server', left + 's'], ['shop.example', 'NS', 'name server of shop.example', left + 's']]; if (cn) d.push(['cdn.example', 'NS', 'name server of cdn.example', left + 's']); return d; }
    var need = { a: 'The browser needs an IP address to connect to shop.example. What to look up is the A record (IPv4 address) of shop.example.', aaaa: 'The browser needs an IPv6 address to connect to shop.example over IPv6. What to look up is the AAAA record (IPv6 address) of shop.example.', cname: 'The browser needs an IP address to connect to www.shop.example. What to look up is the A record (IPv4 address) of www.shop.example.', mx: 'To send mail to shop.example, you need to know where the servers that receive mail for that domain are. What to look up is the MX record of shop.example.' }[c.q];
    var chg = { a: 'changed the address in the A record to ' + K.neu, aaaa: 'changed the address in the AAAA record to ' + K.neu, cname: 'changed the address in the A record of the canonical name (' + K.alias + ') to ' + K.neu, mx: 'changed the mail server in the MX record to ' + K.neu.slice(3) }[c.q];
    // the state of the caches at the start
    if (c.cache === 'os') { st.pc = recs(K.old, LEFT + 's'); st.rs = recs(K.old, LEFT + 's').concat(deleg(NS - AGO)); }
    if (c.cache === 'resolver') st.rs = recs(K.old, LEFT + 's').concat(deleg(NS - AGO));
    if (c.cache === 'expired') { st.pc = recs(K.old, 'TTL passed'); st.rs = recs(K.old, 'TTL passed').concat(deleg(NS - OLD)); }
    // 1. the cache of the PC
    if (c.cache === 'os') {
      msg('pc', '', 'In cache (' + LEFT + 's left)', 'good'); st.ans = show(K.old); st.src = 'PC\'s cache';
      push(need + ' First it looks at the cache of this PC (the place where the operating system and the browser remember answers they received earlier). There is an answer that was received when the same thing was asked ' + AGO + 's ago, and of the TTL of ' + TTL + 's, ' + LEFT + 's is left. It uses the answer from the cache as it is. No question goes out over the network.', 'good');
      if (c.changed) push('But a moment ago the administrator ' + chg + '. The only thing that changed is the value on the authoritative name server, and this PC has no way to know it. It asks again and gets the new value only after ' + LEFT + 's, when the TTL in its cache ends.', 'bad');
    } else {
      if (c.cache === 'expired') { msg('pc', '', 'Cached answer: TTL passed'); st.pc = []; push(need + ' First it looks at the cache of this PC. There was an answer received earlier, but it is from ' + OLD + 's ago, so the TTL of ' + TTL + 's has passed. An answer whose TTL has passed is not used and is discarded.'); }
      else { msg('pc', '', 'Not in cache'); push(need + ' First it looks at the cache of this PC (the place where the operating system and the browser remember answers they received earlier). ' + (c.cache === 'none' ? 'It is a name asked for the first time, so there is nothing.' : 'This PC has never asked for it, so there is nothing.')); }
      // 2. the recursive resolver
      msg('pc', 'rs', ask); st.pcq = 1;
      var intro2 = 'This PC asks the recursive resolver. A recursive resolver is a DNS server that looks for the answer on your behalf. It is usually run by an internet provider or a company, and its address is in the network settings. The resolver also looks at its own cache first. ';
      if (c.cache === 'resolver') {
        msg('rs', '', 'In cache (' + LEFT + 's left)', 'good');
        push(intro2 + 'Another user asked for the same thing ' + AGO + 's ago, so it has the answer, and ' + LEFT + 's of the TTL is left.', 'good');
        msg('rs', 'pc', 'Answer: ' + K.old + (K.type === 'MX' ? '' : ' (TTL ' + LEFT + ')'), 'good'); st.pc = recs(K.old, LEFT + 's'); st.ans = show(K.old); st.src = 'Resolver\'s cache';
        push('The resolver returns the answer from its cache right away, without asking the root server or the authoritative name server. The TTL written in the answer is not the original ' + TTL + 's but the ' + LEFT + 's that remain. This PC also remembers the answer only for those ' + LEFT + 's.', 'good');
        if (c.changed) push('But a moment ago the administrator ' + chg + '. While the TTL in its cache remains, the resolver does not ask the authoritative name server again, so every user of this resolver gets the old value for the remaining ' + LEFT + 's.', 'bad');
      } else {
        var chNote = c.changed ? ' This is the new value that the administrator changed a moment ago.' : '';
        if (c.cache === 'none') {
          msg('rs', '', 'Not in cache');
          push(intro2 + 'There is nothing. The only thing the resolver knows from the start is the addresses of the root servers.');
          msg('rs', 'root', ask); msg('root', 'rs', 'Referral: .example server'); st.upq++; path.push('root'); st.rs.push(['example', 'NS', '.example server', NS + 's']);
          push('Resolver → root server: The resolver sends the same question to the root server. The root server does not have the answer. Instead, it looks at the end of the name (.example) and gives the addresses of the servers responsible for names ending in .example (the TLD servers). A response like this, which tells the resolver which server to ask next, is a referral. Handing a part of the name space down to the servers below is called delegation.');
          msg('rs', 'tld', ask); msg('tld', 'rs', 'Referral: shop.example server'); st.upq++; path.push('.example'); st.rs.push(['shop.example', 'NS', 'name server of shop.example', NS + 's']);
          push('Resolver → .example server: It sends the same question again. This server does not have the answer either, and it gives the addresses of the name servers responsible for shop.example.');
        } else {
          msg('rs', '', 'Answer expired; delegation kept'); st.rs = deleg(NS - OLD);
          push(intro2 + 'The answer was deleted because its TTL had passed. But it still remembers the delegation information, "which name servers are responsible for shop.example", because its TTL is much longer (in this example ' + NS + 's, which is 2 days).');
        }
        var skip = c.cache === 'expired' ? ' The delegation information is in the cache, so it skips the root server and the .example server and asks directly.' : '';
        st.upq++; path.push('shop.example'); msg('rs', 'shop', ask);
        if (!cn) {
          msg('shop', 'rs', 'Answer: ' + (K.type === 'MX' ? 'MX ' + val : K.type + ' ' + val + ' (TTL ' + TTL + ')'), 'good'); st.rs = recs(val, TTL + 's').concat(st.rs);
          push('Resolver → authoritative name server of shop.example: This is the server that holds the original records of this domain.' + skip + ' It gives the answer: ' + K.name + ' ' + K.type + ' ' + val + ', TTL ' + TTL + 's.' + chNote, 'good');
        } else {
          msg('shop', 'rs', 'CNAME ' + K.alias); st.rs = [[K.name, 'CNAME', K.alias, TTL + 's']].concat(st.rs);
          push('Resolver → authoritative name server of shop.example: This is the server that holds the original records of this domain.' + skip + ' A CNAME record came back for a question about an A record: ' + K.name + ' CNAME ' + K.alias + ', TTL ' + TTL + 's. It means that ' + K.name + ' is an alias and its canonical name (the real name) is ' + K.alias + '. The address is not known yet.');
          if (c.cache === 'none') {
            msg('rs', 'tld', K.alias + ' A ?'); msg('tld', 'rs', 'Referral: cdn.example server'); st.upq++; path.push('.example'); st.rs.push(['cdn.example', 'NS', 'name server of cdn.example', NS + 's']);
            push('The resolver searches again from the start for the canonical name (' + K.alias + '). It learned which server is responsible for .example a moment ago, so it skips the root server and asks the .example server. It gets the address of the name server responsible for cdn.example.');
          }
          msg('rs', 'cdn', K.alias + ' A ?'); msg('cdn', 'rs', 'Answer: A ' + val + ' (TTL ' + TTL + ')', 'good'); st.upq++; path.push('cdn.example'); st.rs = [st.rs[0], [K.alias, 'A', val, TTL + 's']].concat(st.rs.slice(1));
          push('Resolver → authoritative name server of cdn.example: ' + (c.cache === 'expired' ? 'It searches again with the canonical name (' + K.alias + '). The delegation information for cdn.example is also in the cache, so it asks directly. ' : '') + 'It gives the answer: ' + K.alias + ' A ' + val + ', TTL ' + TTL + 's.' + chNote, 'good');
        }
        msg('rs', 'pc', 'Answer: ' + val + (K.type === 'MX' ? '' : ' (TTL ' + TTL + ')'), 'good'); st.pc = recs(val, TTL + 's'); st.ans = answer; st.src = 'Authoritative name server';
        push('The resolver puts the records it received in its own cache and returns the answer to this PC. For the next ' + TTL + 's, it answers anyone who asks the same thing from its cache.' + (c.cache === 'none' ? ' It also remembers the delegation information it learned on the way.' : '') + ' This PC also puts the answer it received in its cache for the TTL.' + (c.changed ? ' No cache held the old value, so the new value was reflected right away.' : ''), 'good');
      }
    }
    var stale = c.changed && cached;
    push(c.q === 'mx' ? 'Mail is sent to the ' + st.ans.slice(3) + ' server. The IP address of this name is looked up once more with an A record (the name server may also include it in the MX answer).' + (stale ? ' This is the old server from before the administrator changed it.' : '') : 'The browser connects to the address it received (' + (cn ? val : st.ans) + ').' + (stale ? ' This is the old address from before the administrator changed it.' : ''), stale ? 'bad' : 'good');
    var reflected = !c.changed ? 'Not changed' : cached ? 'Still the old value' : 'Reflected (new value)';
    sum.push('Answer received: ' + answer + '. Where it came from: ' + st.src + '. Queries from the PC to the resolver: ' + st.pcq + '. Queries from the resolver to name servers: ' + st.upq + '.');
    if (c.cache === 'none') sum.push('No server has the answer for every name. A root server tells you which servers handle the last part of a name (.example, .com, .kr), those servers tell you the name server for each domain, and only the authoritative name server of that domain has the answer. This PC asks only one resolver, and the resolver does the step-by-step asking on its behalf.');
    if (cached) sum.push('An answer that has been received stays in the cache for the TTL, and during that time it is not asked for again. There are caches on the PC and on the resolver. Thanks to this, most lookups finish without reaching a root server.');
    if (c.cache === 'expired') sum.push('Once the TTL has passed, it asks again. Even so, it does not start from the root server again. This is because which name servers are responsible for the domain is remembered separately, with a longer TTL.');
    if (stale) sum.push('Even if you change a record, an answer that is already in a cache is used until its TTL ends. So each user gets the new value at a different time, and at the latest it takes as long as the TTL before the change. If you plan to move a server, shorten the TTL in advance, and keep the old server running for a while after the move.');
    if (c.changed && !cached) sum.push('This time no cache held the old value, so the new value was received right away. If you change the cache state to "In the resolver\'s cache", you can see another user receive the old value at the same moment.');
    sum.push({ a: 'An A record connects a name to an IPv4 address. It is the most basic record.', aaaa: 'An AAAA record connects a name to an IPv6 address. An IPv6 address is 128 bits, four times the length of an IPv4 address (32 bits), and the name of the record is A written four times, AAAA. One name can have both A and AAAA records.', cname: 'A CNAME record connects a name to another name, not to an address. When the side that owns the canonical name (a CDN or a hosting company) changes the server address, you do not need to fix your record. In exchange, the canonical name has to be looked up once more.', mx: 'An MX record tells you the name of the server that receives mail sent to the domain. The number in front is the priority, and when there are several records, the server with the smaller number is tried first.' }[c.q]);
    return { events: ev, summary: sum, answer: answer, path: path, cn: cn, row: [answer, st.src, st.pcq + '', st.upq + (path.length ? ' (' + path.join(' → ') + ')' : ''), reflected] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { msgs: [], pc: [], rs: [], pcq: 0, upq: 0, ans: '', src: '' }, c = sim.c;
    H.counters(v, [[s.pcq + '', 'Queries from the PC to the resolver'], [s.upq + '', 'Queries from the resolver to name servers']]);
    if (!last) H.text(v, 'Click Run to look for the answer in order, starting with the cache of this PC.');
    var ln = H.lanes(v), stale = sim.row[4] === 'Still the old value';
    H.lane(ln, 'Answer received', s.ans || 'None yet', s.ans ? (stale ? 'bad' : 'good') : 'none');
    H.lane(ln, 'Where the answer came from', s.src || 'None yet', s.src ? (s.src === 'Authoritative name server' ? 'good' : 'wait') : 'none');
    var rows = function (list) { return list.length ? list.map(function (r) { return { cls: r[3] === 'TTL passed' ? 'gone' : '', cells: [r[0], r[1], r[2], r[3]] }; }) : [{ cells: ['(empty)', '', '', ''] }]; };
    H.table(v, ['Name', 'Type', 'Value', 'TTL left'], rows(s.pc), 'Cache of this PC');
    H.table(v, ['Name', 'Type', 'Value', 'TTL left'], rows(s.rs), 'Cache of the recursive resolver (NS is delegation information that says "which server is responsible for this name")');
    var kind = c.q === 'cname' ? 'CNAME' : this.CASES[c.q].type;
    H.table(v, ['Type', 'What it connects the name to', 'Example'], [['A', 'IPv4 address', 'shop.example → 203.0.113.10'], ['AAAA', 'IPv6 address', 'shop.example → 2001:db8::10'], ['CNAME', 'Another name (this name is an alias)', 'www.shop.example → shop.cdn.example'], ['MX', 'Name and priority of the server that receives mail', 'shop.example → 10 mail.shop.example']].map(function (r) { return { cells: [{ v: r[0], cls: r[0] === kind ? 'hot' : '' }, r[1], r[2]] }; }), 'Record types');
  },
  // Diagram: the PC, the recursive resolver, the root server, the .example server, and the authoritative name server are placed side by side, and the questions and answers between them are drawn from top to bottom. When the answer comes from a cache, the arrows end there.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { msgs: [], pc: [], rs: [], pcq: 0, upq: 0, ans: '', src: '' };
    var actors = sim.cn ? [['pc', 'PC', 'wait'], ['rs', 'Resolver', 'wait'], ['root', 'Root'], ['tld', '.example'], ['shop', 'shop.example'], ['cdn', 'cdn.example']] : [['pc', 'PC', 'wait'], ['rs', 'Resolver', 'wait'], ['root', 'Root server'], ['tld', '.example'], ['shop', 'Authoritative']];
    var end = P.seq(actors, s.msgs.map(function (m) { return m.t ? { f: m.f, t: m.t, s: m.s, cls: m.cls } : { f: m.f, s: m.s, cls: m.cls }; }), { keep: 9 });
    P.box('cnt', 16, end + 14, 262, 34, { cls: 'plain', title: 'Questions sent', right: 'PC ' + s.pcq + ' · resolver ' + s.upq });
    P.box('ans', 286, end + 14, 378, 34, { cls: s.ans ? (sim.row[4] === 'Still the old value' ? 'bad' : 'good') : 'ghost', title: 'Answer received', right: s.ans || 'None yet' });
    P.size(680, end + 64);
    P.note('Each arrow is one question or one answer, and time flows from top to bottom. A box is the result of looking in the cache at that server. Resolver is the recursive resolver, and Authoritative is the authoritative name server that holds the original records of the domain (when a CNAME is involved, shop.example and cdn.example stand for the authoritative name servers of those domains). If the cache has the answer, the arrows end there and do not reach the servers on the right.');
  },
  assume: 'A test program was started on 127.0.0.1 that plays the roles of a root server, a .example server, two authoritative name servers, and a recursive resolver, and real DNS messages were exchanged. For 32 combinations, the answer, the number of questions, the order of asking, and whether the changed value is reflected were checked. No outside DNS was queried. However, this test name server, resolver, and PC-side cache were built for this lab by following the standard procedures (RFC 1034 section 4.3.2 for name server responses, section 5.3.3 for resolver procedures, and RFC 1035 section 6.1.3 for the TTL of a cache). So the behaviors "ask from the root server down in order", "use the answer in the cache for the TTL", and "if the delegation information remains after the TTL has passed, ask the authoritative name server directly" were confirmed by reproducing the standard procedures, and were not checked against a resolver product that is actually operated or the cache of an operating system. What was confirmed with an independent implementation is the content of the records. For each combination, the same question was also sent with Node.js 24 dns.Resolver (c-ares), and the values of A, AAAA, CNAME, and MX that c-ares parsed from the response of the test server were checked to be the same. It was also confirmed that the Node.js dns.Resolver does not cache by itself and asks again every time. The time was made by really waiting. In the run, the TTL of the record was set to 4 seconds, and the question was asked again after 1.2 seconds (TTL remaining) and after 5.2 seconds (TTL passed). The 300s, 120s, and 400s on the screen and the 172800s of the delegation information are examples written as numbers of a size commonly seen in the same situation. The meaning of the records follows RFC 1035 sections 3.3 and 3.4.1 (A, CNAME, MX) and RFC 3596 (AAAA), and looking up the canonical name again when a CNAME is met follows RFC 1034 section 3.6.2. A real resolver does more, such as choosing one of several root servers and name servers, sending only part of the name in a query (RFC 9156), and caching negative answers, that is, answers saying that a name does not exist. There are also cases in which a browser and an operating system do not keep the TTL exactly and remember an answer for a shorter or longer time. All the addresses are in the ranges reserved for documentation.',
});
