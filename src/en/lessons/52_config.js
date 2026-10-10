Lab.register({
  id: 'config', nav: 'Configuration precedence', cat: 'Spring', mode: 'step',
  title: 'When the same property is set in several places, which value wins?',
  intro: 'Spring Boot reads property values from several places, such as files, environment variables, and command-line arguments. When the same key is set in more than one place, the place with the higher precedence wins. Add and remove a property named app.timeout in several places and check the final value.',
  terms: ['Externalized configuration and profiles', 'Spring Boot auto-configuration', 'CI/CD'], ranks: ['boot', 'deploy'],
  controls: [
    { id: 'yml', label: 'app.timeout: 3000 in application.yml', type: 'check', value: true },
    { id: 'prof', label: 'The prod profile is active, and application-prod.yml has app.timeout: 5000', type: 'check', value: true },
    { id: 'env', label: 'Environment variable APP_TIMEOUT=7000', type: 'check', value: false },
    { id: 'sys', label: 'JVM option -Dapp.timeout=8000', type: 'check', value: false },
    { id: 'cli', label: 'Command-line argument --app.timeout=9000', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', d: 'Both application.yml and the prod file have the value. The prod file wins.', v: { yml: true, prof: true, env: false, sys: false, cli: false } },
    { t: 'Adding an environment variable', d: 'An environment variable takes precedence over the files. This is a common approach in container deployments.', v: { yml: true, prof: true, env: true, sys: false, cli: false } },
    { t: 'Adding a command-line argument too', d: 'Command-line arguments have the highest precedence.', v: { yml: true, prof: true, env: true, sys: true, cli: true } },
    { t: 'application.yml only', d: 'When no other place has the value, the value in application.yml is used.', v: { yml: true, prof: false, env: false, sys: false, cli: false } },
    { t: 'Not set anywhere', d: 'The default value written in the code is used.', v: { yml: false, prof: false, env: false, sys: false, cli: false } },
  ],
  SRC: [['cli', 'Command-line argument (--app.timeout=9000)', '9000'], ['sys', 'JVM system property (-Dapp.timeout=8000)', '8000'], ['env', 'OS environment variable (APP_TIMEOUT=7000)', '7000'], ['prof', 'application-prod.yml (profile-specific file)', '5000'], ['yml', 'application.yml (not profile-specific)', '3000']],
  code: function (c) {
    var run = (c.env ? 'APP_TIMEOUT=7000 ' : '') + 'java ' + (c.sys ? '-Dapp.timeout=8000 ' : '') + '-jar app.jar' + (c.prof ? ' --spring.profiles.active=prod' : '') + (c.cli ? ' --app.timeout=9000' : '');
    return '@Value("${app.timeout:1000}")          // 1000 if not set anywhere\nprivate int timeout;\n' + (c.yml ? '\n# application.yml\napp.timeout: 3000\n' : '') + (c.prof ? '\n# application-prod.yml\napp.timeout: 5000\n' : '') + '\n# Run\n' + run;
  },
  label: function (c) { var on = this.SRC.filter(function (s) { return c[s[0]]; }).map(function (s) { return s[2]; }); return on.length ? 'Values set: ' + on.join(', ') : 'Not set anywhere'; },
  columns: ['Final value', 'Where the value came from', 'Overridden values'],
  simulate: function (c) {
    var ev = [], sum = [], SRC = this.SRC, win = null, hidden = [], seen = [];
    function push(s, k) { ev.push({ s: s, k: k, snap: { seen: seen.slice(), win: win } }); }
    push('As the application starts, it looks for the value of app.timeout. Spring Boot checks several places in a fixed order and uses the value found in the place with the highest precedence. The steps go through the places from the highest precedence down.', '');
    SRC.forEach(function (s, i) {
      seen.push(s[0]);
      if (!c[s[0]]) { push((i + 1) + '. ' + s[1].split(' (')[0] + ': This key is not set here. The search moves on to the next place.', ''); return; }
      if (!win) { win = s[0]; push((i + 1) + '. ' + s[1].split(' (')[0] + ': The value ' + s[2] + ' is found here. No place with a higher precedence had a value, so this is the final value.' + (s[0] === 'env' ? ' The environment variable name APP_TIMEOUT is written in uppercase letters with an underscore, but Spring Boot matches it to the same key as app.timeout.' : ''), 'good'); }
      else { hidden.push(s[2]); push((i + 1) + '. ' + s[1].split(' (')[0] + ': The value ' + s[2] + ' is set here, but the value was already decided at a higher precedence. This value is not used.', ''); }
    });
    var val = win ? SRC.filter(function (s) { return s[0] === win; })[0][2] : '1000', from = win ? SRC.filter(function (s) { return s[0] === win; })[0][1].split(' (')[0] : 'Default value in the code (after the : in @Value)';
    if (!win) { seen.push('def'); push('No place has a value. The default value 1000 written in @Value is used. If there were no default value either, the application would fail during startup.', ''); }
    sum.push('The final value of app.timeout is ' + val + '. Where the value came from: ' + from + '.' + (hidden.length ? ' Overridden values: ' + hidden.join(', ') + '.' : ''));
    sum.push('From highest to lowest, the precedence is command-line arguments → JVM system properties → environment variables → the profile-specific file → application.yml. The closer a place is to the side that runs the application, the higher its precedence.');
    sum.push('Thanks to this order, you can run the same build artifact (a jar or an image) with different values in each environment without modifying it. Values that differ from one environment to another, or that must not be put in the code repository, such as a database URL or a password, are passed in through environment variables or injected at run time.');
    if (c.env && c.prof && win === 'env') sum.push('If you find that "I edited the file, but the value did not change", first check whether the same key is set in a place with a higher precedence (an environment variable, for example).');
    return { events: ev, summary: sum, row: [val, from, hidden.length ? hidden.join(', ') : 'None'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { seen: [], win: null };
    H.table(v, ['Precedence', 'Where the property is read from', 'Value there', 'Outcome'], this.SRC.map(function (x, i) { var on = s.seen.indexOf(x[0]) >= 0, has = c[x[0]]; return { cls: has ? '' : 'gone', cells: [(i + 1) + '', x[1], has ? x[2] : '(not set)', { v: !on ? '' : !has ? 'Not set' : s.win === x[0] ? 'Used' : 'Overridden', cls: on && has ? (s.win === x[0] ? 'good' : 'hot') : '' }] }; }).concat([{ cells: ['Last', 'Default value in the code (after the : in @Value)', '1000', { v: s.seen.indexOf('def') >= 0 ? 'Used' : '', cls: s.seen.indexOf('def') >= 0 ? 'good' : '' }] }]), 'From the highest precedence down');
    var win = s.win ? this.SRC.filter(function (x) { return x[0] === s.win; })[0][2] : s.seen.indexOf('def') >= 0 ? '1000' : '?';
    H.counters(v, [[win, 'Final value of app.timeout']]);
  },
  assume: 'This lab picks only five commonly used places from the externalized configuration order in the official Spring Boot documentation. The real list has more, such as SPRING_APPLICATION_JSON and configuration files outside the jar (which take precedence over the files inside the jar). A profile-specific file is read only when that profile is active. All 32 combinations were run on real Spring Boot 4.1.1, with a new process started for each combination, and the final value and the place it came from were confirmed to match the screen.',
});
