Lab.register({
  id: 'replica', nav: 'Replication lag and CAP', cat: 'Database', mode: 'step',
  title: 'I just saved it, but the query shows the old value',
  intro: 'If you send writes to the source (primary) database and reads to a replica, you can spread out the read load. But it takes time for a change on the source to reach the replica. This time difference is called replication lag. The CAP theorem says that when the network is partitioned, a system has to choose between continuing to respond (availability) and refusing to respond with data that may be stale (consistency), and this lab shows both cases.',
  terms: ['Replication', 'Eventual consistency', 'CAP theorem', 'Read-only transaction (readOnly)'], ranks: ['dbengine', 'nosql', 'traffic'],
  controls: [
    { id: 'part', label: 'What to look at', type: 'select', value: 'lag', options: [['lag', 'Replication lag'], ['cut', 'Network partition between the source and the replica']] },
    { id: 'lag', label: 'Time the replication takes', type: 'select', value: '1', options: [['0.1', '0.1s'], ['1', '1s'], ['5', '5s']], show: function (c) { return c.part === 'lag'; } },
    { id: 'when', label: 'Time from the save to the query', type: 'select', value: '0.3', options: [['0.3', '0.3s later (moving to another screen right after the save)'], ['2', '2s later'], ['10', '10s later']], show: function (c) { return c.part === 'lag'; } },
    { id: 'from', label: 'Where the query is sent', type: 'select', value: 'replica', options: [['replica', 'Replica'], ['primary', 'Source']], show: function (c) { return c.part === 'lag'; } },
    { id: 'choice', label: 'Replica behavior during the partition', type: 'select', value: 'ap', options: [['ap', 'Keep responding with the data it has (choose availability)'], ['cp', 'Refuse to respond, because it cannot confirm the data is current (choose consistency)']], show: function (c) { return c.part === 'cut'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'With replication that takes 1 second, what value does a query to the replica return 0.3 seconds after the save?', d: 'Replication takes 1s, and the replica is queried 0.3s after the save. The old value comes back.', v: { part: 'lag', lag: '1', when: '0.3', from: 'replica', choice: 'ap' } },
    { t: 'Only the query right after saving goes to the source', q: 'What if you send the query right after the save to the source?', d: 'A user who has just written reads from the source.', v: { part: 'lag', lag: '1', when: '0.3', from: 'primary', choice: 'ap' } },
    { t: 'A query after some time has passed', q: 'What if the time from the save to the query is 2 seconds?', d: 'Once replication has finished, the replica also returns the new value.', v: { part: 'lag', lag: '1', when: '2', from: 'replica', choice: 'ap' } },
    { t: 'When replication falls 5s behind', q: 'What if replication takes 5 seconds and you query 2 seconds after the save?', d: 'Even a read 2s later returns the old value.', v: { part: 'lag', lag: '5', when: '2', from: 'replica', choice: 'ap' } },
    { t: 'Network partition: keep responding', q: 'What if the network between the source and the replica is cut and the replica keeps responding with the data it has?', d: 'The service keeps working, but it returns the old value.', v: { part: 'cut', lag: '1', when: '0.3', from: 'replica', choice: 'ap' } },
    { t: 'Network partition: refuse to respond', q: 'What if, during the network partition, the replica refuses to respond because it cannot confirm the data is current?', d: 'It does not return a wrong value, but the query fails.', v: { part: 'cut', lag: '1', when: '0.3', from: 'replica', choice: 'cp' } },
  ],
  code: function (c) {
    if (c.part === 'cut') return '// The source and the replica cannot communicate with each other\n// The replica can choose one of two things\n//\n// 1) Respond with the value it has  -> it responds, but the value may not be the latest (AP)\n// 2) Refuse to respond              -> it gives no wrong value, but the service is down (CP)';
    return '// Only the service class body is shown (class declaration, memberRepository field, the example Member entity, and imports omitted)\n' + (c.from === 'replica' ? '// A case where the data sources are set up separately so that readOnly transactions go to the replica and everything else goes to the source' : '// A setting that sends a read right after a write to the source, even if it is readOnly') + '\n@Transactional\npublic void changeNickname(long id, String name) {     // -> source\n    memberRepository.findById(id).orElseThrow().setNickname(name);\n}\n\n@Transactional(readOnly = true)\npublic Member getMember(long id) {                      // -> ' + (c.from === 'replica' ? 'replica' : 'source (a query right after the write is sent to the source)') + '\n    return memberRepository.findById(id).orElseThrow();\n}';
  },
  label: function (c) { return c.part === 'lag' ? 'Replication ' + c.lag + 's · query to ' + (c.from === 'replica' ? 'replica' : 'source') + ' ' + c.when + 's later' : 'Partition · ' + (c.choice === 'ap' ? 'keeps responding' : 'refuses to respond'); },
  columns: ['Query result', 'Is it the latest value', 'Did it respond'],
  simulate: function (c) {
    var ev = [], sum = [], S = { p: 'Nickname = Alice', r: 'Nickname = Alice', link: 'Connected', read: '-' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(S)) }); }
    push('The member\'s nickname is "Alice", and the source and the replica have the same value.', '');
    var got, fresh, answered = true;
    if (c.part === 'lag') {
      var lag = +c.lag, when = +c.when;
      S.p = 'Nickname = Bob'; push('0s: The user changes the nickname to "Bob". It is saved on the source database and committed. The user gets a "saved" response. It has not yet been delivered to the replica.', '');
      var first = when < lag;
      if (!first) { S.r = 'Nickname = Bob'; push(lag + 's: The change record from the source reaches the replica and is applied.', 'good'); }
      if (c.from === 'primary') { got = 'Bob'; S.read = 'From source: "Bob"'; push(when + 's: The query is sent to the source. The source always has the latest value, so "Bob" is returned.', 'good'); }
      else if (first) { got = 'Alice'; S.read = 'From replica: "Alice"'; push(when + 's: The query is sent to the replica. Replication has not arrived yet, so the replica still has the old value "Alice". This time difference is the replication lag. The user sees a screen on which the nickname they just changed is unchanged.', 'bad'); }
      else { got = 'Bob'; S.read = 'From replica: "Bob"'; push(when + 's: The query is sent to the replica. Replication has already finished, so "Bob" is returned.', 'good'); }
      if (first) { S.r = 'Nickname = Bob'; push(lag + 's: Replication finally arrives, and the replica also becomes "Bob". Later queries see the new value.', ''); }
      fresh = got === 'Bob';
      sum.push('Replication is usually asynchronous, so there is a time lag between the source and the replica. Given time they become the same, but before that they can differ (eventual consistency). Ways to handle this are to read the data a user has just written from the source, or, on the screen right after a write, to use the value received in the response as it is.');
      if (c.from === 'primary') sum.push('If every query is sent to the source, there is no problem, but the benefit of spreading out the reads is lost. Send only the queries that must be current to the source.');
    } else {
      S.link = 'Disconnected'; push('The network between the source and the replica is cut. Both databases are alive, but neither can know the state of the other.', 'bad');
      S.p = 'Nickname = Bob'; push('The user changes the nickname to "Bob". It is saved on the source, but there is no way to deliver it to the replica.', '');
      if (c.choice === 'ap') { got = 'Alice'; fresh = false; S.read = 'From replica: "Alice" (old value)'; push('A query from another user comes to the replica. The replica responds with the value it has, "Alice". The service continues, but a value that is not the latest was returned.', 'bad'); }
      else { got = 'Error'; fresh = true; answered = false; S.read = 'Replica refused to respond'; push('A query from another user comes to the replica. The replica cannot guarantee that its data is the latest, so it returns an error. No wrong value was returned, but the query failed.', 'bad'); }
      S.link = 'Restored'; S.r = 'Nickname = Bob'; push('The network is restored. The changes that were held back are delivered to the replica, and the two databases are the same again.', 'good');
      sum.push('In a system split across several machines, a network partition will happen sooner or later. When it does, you cannot keep both "respond to every request (availability)" and "give the same latest value wherever you read (consistency)"; you have to choose one. This is what the CAP theorem says. In normal times, without a partition, both can be kept.');
      sum.push(c.choice === 'ap' ? 'Data that is fine to be an old value for a short time, such as a product list or a like count, chooses availability.' : 'Data that must never return a wrong value, such as an account balance or stock, chooses consistency and accepts the errors.');
    }
    return { events: ev, summary: sum, row: [answered ? '"' + got + '"' : 'Error', c.part === 'cut' && !answered ? '(no response)' : fresh ? 'Yes' : 'No', answered ? 'Yes' : 'No'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { p: 'Nickname = Alice', r: 'Nickname = Alice', link: 'Connected', read: '-' };
    var ln = H.lanes(v);
    H.lane(ln, 'Source', s.p + '  (receives writes)', s.p.indexOf('Bob') >= 0 ? 'good' : '');
    H.lane(ln, 'Replication link', s.link, s.link === 'Disconnected' ? 'bad' : 'none');
    H.lane(ln, 'Replica', s.r + '  (serves reads)', s.r === s.p ? (s.r.indexOf('Bob') >= 0 ? 'good' : '') : 'bad');
  },
  // Diagram: the source and the replica, with a replication arrow between them. A write goes to the source, and a query goes to the side that is set.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { p: 'Nickname = Alice', r: 'Nickname = Alice', link: 'Connected', read: '-' }, diff = s.r !== s.p, cut = s.link === 'Disconnected', newP = s.p.indexOf('Bob') >= 0;
    P.size(680, 290);
    P.box('app', 240, 16, 200, 40, { cls: 'plain', title: 'Application', center: true });
    P.box('pri', 40, 124, 240, 60, { cls: newP ? 'good' : 'plain', title: 'Source DB (receives writes)', sub: s.p });
    P.box('rep', 400, 124, 240, 60, { cls: diff ? 'bad' : newP ? 'good' : 'plain', title: 'Replica DB (serves reads)', sub: s.r });
    P.arrow('repl', 'pri:r', 'rep:l', { cls: cut ? 'bad dash' : diff ? 'dash' : 'good', label: cut ? 'Disconnected' : diff ? 'Not delivered yet' : 'Replication' });
    if (newP) P.arrow('wr', 'app:b:0.25', 'pri:t', { label: 'Write' });
    if (s.read !== '-') P.arrow('rd', 'app:b:0.75', (s.read.indexOf('From source') === 0 ? 'pri' : 'rep') + ':t', { cls: s.read.indexOf('Bob') >= 0 ? 'good' : 'bad', label: 'Query' });
    if (diff) P.text('df', 340, 212, 'The source and the replica have different values now', { cls: 'bad', anchor: 'middle' });
    P.box('res', 40, 230, 600, 40, { cls: s.read === '-' ? 'ghost' : s.read.indexOf('Bob') >= 0 ? 'good' : 'bad', title: 'What the query received', right: s.read === '-' ? 'Not queried yet' : s.read });
    P.note('The arrow in the middle is replication. If it is dashed, the change on the source has not reached the replica yet, and a read from the replica in the meantime returns the old value.');
  },
  assume: 'This assumes one source and one replica with asynchronous replication. The replication time was treated as constant at the set value, but in practice it fluctuates with load: it is usually under 0.1 seconds, and it can momentarily widen to several seconds or more. The CAP theorem is about the choice to make during a network partition, and real systems mix different choices depending on the kind of data.',
});
