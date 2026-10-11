Lab.register({
  id: 'pwhash', nav: 'Password hashing', cat: 'Authentication', mode: 'step',
  title: 'How well do passwords hold up when the database leaks?',
  intro: 'Two members happen to use the same password (password123). How the passwords are stored in the database greatly changes how long an attacker needs to recover the original passwords after the database leaks.',
  terms: ['Hash function and salt', 'bcrypt', 'Symmetric-key cryptography and public-key cryptography'], ranks: ['websec', 'auth'],
  controls: [
    { id: 'how', label: 'Storage method', type: 'select', value: 'sha', options: [['plain', 'Plain text'], ['sha', 'SHA-256 hash'], ['salt', 'SHA-256 + a salt for each member'], ['bcrypt', 'bcrypt (includes a salt, slow hash)']] },
    { id: 'cost', label: 'bcrypt work factor (cost)', type: 'select', value: '10', options: [['10', '10 (Spring Security default)'], ['12', '12'], ['14', '14']], show: function (c) { return c.how === 'bcrypt'; } },
  ],
  presets: [
    { t: 'Default settings', d: 'SHA-256. The same password produces the same hash.', v: { how: 'sha', cost: '10' } },
    { t: 'Plain text storage', d: 'Everything is exposed the moment the data leaks.', v: { how: 'plain', cost: '10' } },
    { t: 'Add a salt', d: 'The same password now produces different hashes. But the hash itself is still fast.', v: { how: 'salt', cost: '10' } },
    { t: 'bcrypt', d: 'A hash that is made slow on purpose. The time needed to try guesses changes.', v: { how: 'bcrypt', cost: '10' } },
    { t: 'bcrypt cost 14', d: 'Attacks get slower, but verifying a login gets slower too.', v: { how: 'bcrypt', cost: '14' } },
  ],
  code: function (c) {
    if (c.how === 'plain') return '// Store the input as it is\nmember.setPassword(rawPassword);';
    if (c.how === 'sha') return 'MessageDigest md = MessageDigest.getInstance("SHA-256");\nbyte[] hash = md.digest(rawPassword.getBytes(UTF_8));\nmember.setPassword(HexFormat.of().formatHex(hash));';
    if (c.how === 'salt') return 'String salt = randomString(6);                  // a different random value for each member\nbyte[] hash = md.digest((salt + rawPassword).getBytes(UTF_8));\nmember.setSalt(salt);                            // the salt is not hidden; store it too\nmember.setPassword(HexFormat.of().formatHex(hash));';
    return 'PasswordEncoder encoder = new BCryptPasswordEncoder(' + c.cost + ');\n\n// Sign-up: generates the salt and hashes in one call\nmember.setPassword(encoder.encode(rawPassword));\n\n// Login: reads the salt and the cost from the stored value, computes the same way, and compares\nboolean ok = encoder.matches(rawPassword, member.getPassword());';
  },
  label: function (c) { return { plain: 'Plain text', sha: 'SHA-256', salt: 'SHA-256 + salt', bcrypt: 'bcrypt cost ' + c.cost }[c.how]; },
  columns: ['Stored values of the two members', 'Reverse lookup with a precomputed table', 'Trying 100 million passwords (one member)', 'Time to verify one login'],
  simulate: function (c) {
    var ev = [], sum = [], rows = [], H = c.how;
    var SHA = 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', S1 = '34ec6e5610ddbdd724d48b5b999df8a383d09d06a6035f836ef949881287ac53', S2 = '3f4ac84a9098fe3e661ef85f5f0543d060ae2b4a038b17f99d750dfda5df99ec';
    var stored = { plain: [['-', 'password123'], ['-', 'password123']], sha: [['-', SHA], ['-', SHA]], salt: [['x7Kp2q', S1], ['M4nT9z', S2]], bcrypt: [['(inside the value)', '$2a$' + c.cost + '$N9qo8uLOickgx2ZMRZoMye…'], ['(inside the value)', '$2a$' + c.cost + '$Xk3pQ7vRt1WzbY0aHdLu4.…']] }[H];
    var speed = { plain: 0, sha: 2e10, salt: 2e10, bcrypt: +c.cost === 10 ? 6000 : +c.cost === 12 ? 1500 : 375 }[H], verify = { plain: 'almost 0', sha: 'almost 0', salt: 'almost 0', bcrypt: +c.cost === 10 ? 'about 0.1s' : +c.cost === 12 ? 'about 0.3s' : 'about 1s' }[H];
    function dur(sec) { var n = sec < 3600 ? Math.round(sec / 60) : sec < 86400 * 2 ? Math.round(sec / 3600) : Math.round(sec / 86400), u = sec < 3600 ? ' minute' : sec < 86400 * 2 ? ' hour' : ' day'; return sec < 1 ? 'under 1 second' : 'about ' + n + u + (n === 1 ? '' : 's'); }
    var crack = H === 'plain' ? 'Not needed (visible as it is)' : dur(1e8 / speed), same = stored[0][1] === stored[1][1], table = H === 'plain' ? 'Not needed' : H === 'sha' ? 'Possible' : 'Impossible';
    function push(s, k, stage) { ev.push({ s: s, k: k, snap: { stage: stage } }); }
    push('Alice and Bob sign up, and both choose password123 as their password. The server stores it in the database using the ' + this.label(c) + ' method.' + (H === 'bcrypt' ? ' bcrypt generates the salt itself and includes it in the result string.' : ''), '', 1);
    push(same ? 'The stored values of the two members are exactly the same. Anyone who sees the database can tell at once that the two passwords are the same, and recovering one gives the passwords of every member with the same value.' : 'The passwords are the same, but the stored values differ. Each member\'s password was hashed with a different salt mixed in. From the stored values alone, you cannot tell whether the two passwords are the same.', same ? 'bad' : 'good', 2);
    push('Incident: an attacker has copied the whole member table out of the database.', 'bad', 3);
    if (H === 'plain') push('The passwords are written as they are. The attacker gets every member\'s password with no work at all. If users reuse the same password on other sites, those sites are broken into as well.', 'bad', 4);
    if (H === 'sha') push('A hash cannot be computed backward, but tables of precomputed hashes of common passwords already exist. The attacker only has to look the stored value up in a table, because the SHA-256 of password123 is the same value for everyone.', 'bad', 4);
    if (H === 'salt') push('A salt is mixed in, so precomputed tables are useless. The attacker has to hash candidate passwords one by one, adding each member\'s own salt. But SHA-256 is a function built to be computed quickly, and a single graphics card can make tens of billions of attempts per second.', 'bad', 4);
    if (H === 'bcrypt') push('bcrypt also has a salt, so precomputed tables cannot be used, and each member must be attacked separately. The difference is speed. bcrypt is designed so that one computation takes time on purpose, so even the same hardware can make only a few thousand attempts per second.', 'good', 4);
    push(H === 'plain' ? 'Result: everything is exposed the moment the data leaks.' : 'Time needed to try 100 million common passwords against one member: ' + crack + '.' + (H === 'bcrypt' ? ' With 1 million members, this time is multiplied by the number of members.' : ' A common password such as password123 is found almost instantly.'), H === 'bcrypt' ? 'good' : 'bad', 5);
    sum.push('The stored values ' + (same ? 'are the same' : 'differ') + ' for the two members. Reverse lookup with a precomputed table: ' + table + '. Trying 100 million passwords: ' + crack + '. Time to verify one normal login: ' + verify + '.');
    if (H === 'plain') sum.push('Never store passwords as plain text. It also means that an operator, or anyone who can access the database, can see the passwords.');
    if (H === 'sha') sum.push('General-purpose hash functions such as SHA-256 were made for uses that need speed, such as verifying files. For storing passwords, being fast is the weakness.');
    if (H === 'salt') sum.push('A salt stops the same password from producing the same hash, and it stops precomputed tables. But it does not slow down the guessing itself.');
    if (H === 'bcrypt') sum.push('For passwords, use a dedicated hash that is made slow on purpose, such as bcrypt, scrypt, or Argon2. Raising the cost by 1 doubles the computation time. Attackers get slower, but login verification gets slower by the same amount and uses more server CPU, so choose the highest value that fits within the time you can afford for one login.');
    sum.push('Store passwords as hashes, not as encrypted values. Encryption can be reversed to the original value with the key, but a hash cannot be reversed, and the server has no need to know the original password.');
    return { events: ev, summary: sum, stored: stored, same: same, k: { crack: crack, table: table, verify: verify }, row: [same ? 'Same' : 'Different', table, crack, verify] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], st = last ? last.snap.stage : 0;
    if (st >= 1) H.table(v, ['Member', 'Password entered', 'Salt', 'Value stored in the database'], [['Alice', sim.stored[0]], ['Bob', sim.stored[1]]].map(function (r) { return { cells: [r[0], 'password123', r[1][0], { v: r[1][1], cls: st >= 2 ? (sim.same ? 'bad' : 'good') : '' }] }; }), 'member table');
    if (st >= 4) H.counters(v, [[sim.k.table, 'Reverse lookup with a precomputed table'], [st >= 5 ? sim.k.crack : '?', 'Time to try 100 million passwords'], [sim.k.verify, 'Time to verify one login']]);
    if (sim.c.how === 'bcrypt' && st >= 1) H.text(v, 'Structure of a bcrypt stored value: $2a$ (algorithm) + ' + sim.c.cost + '$ (cost) + 22-character salt + 31-character hash. The values in the table are examples to show the structure, and their ends are shortened.');
  },
  assume: 'The SHA-256 values are actually computed. The bcrypt stored values are example strings that show the format. The guessing speeds show rough orders of magnitude. They assume that, for one high-performance graphics card, SHA-256 makes tens of billions of attempts per second and bcrypt with cost 10 makes a few thousand per second, and they are values chosen to match the orders of magnitude of published benchmarks. The login verification times are also rough values that vary with the server CPU. The default cost of Spring Security\'s BCryptPasswordEncoder is 10. On the PC used to write this lab, the SHA-256 speed measured with openssl was about 32 million per second on one CPU core (the tens of billions per second on screen is a published figure for a graphics card). bcrypt was not actually measured because the PC has no library for it.',
});
