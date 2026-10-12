Lab.register({
  id: 'config_basic', nav: 'Configuration files', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['config', 'autoconf'],
  title: 'What is a configuration file, and how is it different from writing values in the code?',
  intro: 'A configuration file is a text file kept separate from the code. In Spring Boot it is named application.properties, and you write "name=value" lines in it (shop.name=kim-shop). If you write values that differ between environments, such as a port number or a connection address, directly in the code, you have to change the code and compile it again every time a value changes. So you keep the value in this file, and the code writes only the name. If you write an @Value("${name}") line above a field that needs a value, then when Spring creates the object, it looks for the value of that name in the configuration file and puts it in the field. If you write a default value after a : in the form ${name:default}, that value is used when the settings have no such name. In this lab you change or delete the shop.name line of the configuration file, and add or remove a default value on @Value, and run the program with the java command, to see what value comes into the name field and whether the program starts properly.',
  terms: ['application.properties', '@Value', '${...} placeholder', 'Externalized configuration and profiles'],
  controls: [
    { id: 'prop', label: 'The shop.name line of application.properties', type: 'select', value: 'kim', options: [['kim', 'shop.name=kim-shop'], ['lee', 'shop.name=lee-shop'], ['none', 'Delete that line']] },
    { id: 'def', label: 'Write a default value in @Value: ${shop.name:no-name}', type: 'check', value: false },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'How does the value on the shop.name=kim-shop line of the configuration file get into the name field, and what happens when you run it?', d: 'The configuration file has a name and a value, and the code writes only the name. When Spring creates the object, it puts the value kim-shop into name.', v: { prop: 'kim', def: false } },
    { t: 'Changing the value in the configuration file', q: 'What if you change the line shop.name=kim-shop in the configuration file to the line shop.name=lee-shop?', d: 'Only one line of the file is changed, and the code stays the same. The value lee-shop comes into name.', v: { prop: 'lee', def: false } },
    { t: 'Deleting that line', q: 'What if you delete the shop.name line from the configuration file?', d: 'There is no value to find, so Spring stops while starting. Nothing is printed to the screen.', v: { prop: 'none', def: false } },
    { t: 'Deleting the line but writing a default value', q: 'What if you delete the shop.name line from the configuration file, but write a default value on the @Value line (${shop.name:no-name})?', d: 'The settings have no such name, so the default value no-name is used. It starts without an error.', v: { prop: 'none', def: true } },
    { t: 'A default value and a value in the configuration file', q: 'What if you write a default value on the @Value line (${shop.name:no-name}), and the configuration file also has the line shop.name=kim-shop?', d: 'If the configuration file has the name, that value is used and the default value is not used.', v: { prop: 'kim', def: true } },
  ],
  VAL: { kim: 'kim-shop', lee: 'lee-shop' },
  code: function (c) {
    var out = ['# application.properties'];
    if (c.prop !== 'none') out.push('# Setting: a value written outside the code in the form name=value', 'shop.name=' + this.VAL[c.prop]);
    out.push('', '@Component', 'class ShopInfo {', '    // Receive: find the value of shop.name in the settings and put it in name', '    @Value("${shop.name' + (c.def ? ':no-name' : '') + '}")', '    String name;', '}', '',
      '@SpringBootApplication', 'public class App {', '    public static void main(String[] args) {', '        // Start Spring. ctx is the place that keeps the objects Spring made',
      '        ApplicationContext ctx = SpringApplication.run(App.class, args);', '        ShopInfo info = ctx.getBean(ShopInfo.class);', '        System.out.println(info.name);', '    }', '}');
    return out.join('\n');
  },
  label: function (c) { return { kim: 'Configuration file has shop.name=kim-shop', lee: 'Configuration file has shop.name=lee-shop', none: 'No shop.name line in the configuration file' }[c.prop] + ' · ' + (c.def ? 'default value no-name' : 'no default value'); },
  columns: ['Value that came into name', 'Startup', 'Error'],
  simulate: function (c) {
    var ev = [], sum = [], has = c.prop !== 'none', val = has ? this.VAL[c.prop] : '', fail = !has && !c.def;
    var kind = has ? (c.def ? 'foundDef' : (c.prop === 'kim' ? 'found' : 'foundLee')) : (c.def ? 'dflt' : 'fail');
    // file: the shop.name value in the configuration file ('' if none), list: the value in the settings list Spring read, or null (not read yet), made: whether the ShopInfo object was made, name: the value of the field,
    // out: the text printed to the screen, exit: the exit code of the process (null before it ends)
    var st = { file: val, phase: 'main', read: false, made: false, name: null, bad: false, out: null, exit: null };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var NOFILE = 'the name shop.name';
    push('When you run the App class with the java command on the computer, Java calls the main method of the App class. The first line of the main method, SpringApplication.run(App.class, args), starts Spring Boot.', '');
    st.phase = 'read'; st.read = true;
    if (has) {
      push('As it starts, Spring Boot finds and reads the file application.properties in the place where the class files are. This file is not Java code but a text file that collects "name=value" lines. It reads the line shop.name=' + val + ' and records one pair, shop.name = ' + val + ', in Spring\'s settings list.' + (c.prop === 'lee' && !c.def ? ' The only difference from the default settings is the value of this line. The code of ShopInfo and App is the same, so there is nothing to compile again.' : ''), '');
    } else {
      push('As it starts, Spring Boot first finds and reads the file application.properties in the place where the class files are. This file is not Java code but a text file that collects "name=value" lines. But this file has no name=value line at all (the # line at the top is a note for people to read, so it is not a setting). Spring\'s settings list does not have ' + NOFILE + '.', '');
    }
    st.phase = 'make';
    push('Next, Spring scans the classes starting from the package where the App class is, finds the ShopInfo class with @Component, and starts to create its object. The code we wrote has no line new ShopInfo(). Spring creates the object inside the SpringApplication.run line of the main method.', '');
    st.phase = 'value';
    if (kind === 'found' || kind === 'foundLee') {
      st.made = true; st.name = val;
      push('While creating the object, Spring reads the @Value("${shop.name}") line above the name field. What is inside ${ } means "go and find the value of this name in the settings list". Looking in the settings list for ' + NOFILE + ', Spring finds the value ' + val + ', so it puts that value into the name field. The code we wrote has no line that puts a value in name either.', 'good');
    } else if (kind === 'foundDef') {
      st.made = true; st.name = val;
      push('While creating the object, Spring reads the @Value("${shop.name:no-name}") line above the name field. What is inside ${ } means "go and find the value of this name in the settings list", and the value no-name after the : is "the value to use when there is no such name". Looking in the settings list for ' + NOFILE + ', Spring finds the value ' + val + ', so it puts that value into the name field. The settings have the name, so the default value after the : is not used.', 'good');
    } else if (kind === 'dflt') {
      st.made = true; st.name = 'no-name';
      push('While creating the object, Spring reads the @Value("${shop.name:no-name}") line above the name field. It looks in the settings list for ' + NOFILE + ', but it is not there. This line has the default value no-name written after the :, so Spring puts that value into the name field. Even though the settings do not have the name, creating the object does not stop.', 'good');
    } else {
      st.bad = true;
      push('While creating the object, Spring reads the @Value("${shop.name}") line above the name field and looks in the settings list for ' + NOFILE + ', but it is not there. This line has no default value written for when the name is missing, so Spring cannot decide the value to put into the name field. It throws an exception meaning it could not replace the ${shop.name} part with a value (Could not resolve placeholder \'shop.name\'), and stops creating the object.', 'bad');
    }
    if (fail) {
      st.phase = 'end'; st.exit = 1;
      push('The exception happened inside the SpringApplication.run line, and no code catches it. So the main method cannot go on to the next lines, the ctx.getBean line and the System.out.println line, and it ends with the exception, and the java process ends with an error (exit code 1). Nothing was printed to the screen.', 'bad');
    } else {
      st.phase = 'get';
      push('The SpringApplication.run line ends and the main method goes to the next line. The ctx.getBean line takes out the ShopInfo object that Spring made and kept, and puts it in info. The name of this object already holds the value ' + st.name + '.', '');
      st.phase = 'print'; st.out = st.name;
      push('The System.out.println(info.name) line prints the text held in name to the screen. One line, ' + st.name + ', is printed to the screen.', 'good');
      st.phase = 'end'; st.exit = 0;
      push('The main method ends. This project has no web server waiting for requests, so the java process also ends as it is (exit code 0).', '');
    }
    // Summary: the first line is the answer to this setting (the question)
    if (kind === 'found') {
      sum.push('A configuration file is a text file of "name=value" lines kept separate from the code (application.properties). The code writes only @Value("${name}") above the field, and when Spring creates the object, it finds the value of that name in the configuration file and puts it in the field. What differs from writing the value directly in the code is that the value is in a file outside the code.');
      sum.push('The text kim-shop never appears in the code of this program. The code that needs the value knows only the name, and the value is in the configuration file.');
    } else if (kind === 'foundLee') {
      sum.push('When one line of the configuration file was changed to the line shop.name=lee-shop, the value lee-shop came into name. Only the file was changed, and the code of ShopInfo and App stayed the same, so it was not compiled again.');
      sum.push('If you write values that differ between environments, such as a port number or a connection address, in the code, you have to change the code and compile it for each environment. If you keep the values in a configuration file, you can run the same code and change only the file.');
    } else if (kind === 'foundDef') {
      sum.push('Even if you write the default value no-name in @Value, when the configuration file has a shop.name line, the value ' + val + ' of that line comes into name. The default value is used only when the settings do not have that name.');
      sum.push('A default value is a safety net for when the configuration file is missing a setting. A setting that exists is not hidden by the default value.');
    } else if (kind === 'dflt') {
      sum.push('Even though the configuration file has no shop.name line, the default value no-name was written in @Value, so the program started without an error, and the value no-name came into name.');
      sum.push('If you write a default value, the program does not stop even when a setting is missing. If you do not write one, you find out right at the startup stage when a setting is missing.');
    } else {
      sum.push('When the shop.name line is deleted from the configuration file and no default value is written in @Value, Spring cannot decide the value to put into name, and it stops while starting. The main method cannot reach the println line, so nothing was printed to the screen, and the process ended with an error.');
      sum.push('This error happens at the moment the object is created, that is, when the program starts. You do not find out only after running the line that needs the value. It tells you right at startup that a setting is missing.');
    }
    var nameCol = fail ? 'Could not be set' : st.name, errCol = fail ? "Cannot find a value for shop.name (Could not resolve placeholder 'shop.name')" : 'None';
    return { events: ev, summary: sum, kind: kind, row: [nameCol, fail ? 'Failed (stopped while starting)' : 'Succeeded', errCol] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from java running the main method.'); return; }
    var c = sim.c;
    var fileTxt = s.file ? 'shop.name=' + s.file : 'No name=value line';
    var listTxt = !s.read ? 'Not read yet' : s.file ? 'shop.name = ' + s.file : 'Empty';
    var nameTxt = s.name !== null ? s.name : s.bad ? 'Could not decide a value to put in' : s.phase === 'value' || s.phase === 'make' ? 'Not yet' : 'No object';
    var pTxt = s.exit === null ? 'Running' : s.exit === 0 ? 'Ended (exit code 0)' : 'Ended with an error (exit code 1)';
    H.table(v, ['Part', 'State'], [
      { cls: '', cells: ['application.properties', fileTxt] },
      { cls: s.read ? '' : 'gone', cells: ['Spring\'s settings list', { v: listTxt, cls: s.read && s.file ? 'good' : '' }] },
      { cls: s.made || s.bad ? '' : 'gone', cells: ['name of ShopInfo', { v: nameTxt, cls: s.bad ? 'bad' : s.name !== null ? 'good' : '' }] },
      { cls: s.out !== null ? '' : 'gone', cells: ['Text printed to the screen', { v: s.out !== null ? s.out : 'None', cls: s.out !== null ? 'good' : '' }] },
      { cls: '', cells: ['java process', { v: pTxt, cls: s.exit === 1 ? 'bad' : s.exit === 0 ? 'good' : '' }] },
    ], 'Inside the java process');
  },
  // Diagram: the main method of App at the top, and in the middle row, from the left, the configuration file, Spring (the settings list), and the ShopInfo object. Arrows show the value in the file being read into Spring's settings list, whether Spring puts the value into name while creating ShopInfo, and where it stops if it cannot find the value. Two result boxes at the bottom.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, ph = s ? s.phase : '';
    P.size(680, 288);
    var end = s && s.exit !== null;
    P.region('jp', 6, 8, 668, 210, 'java process' + (end ? (s.exit === 0 ? ': ended' : ': ended with an error') : s ? ': running' : ''));
    var mnSub = !s ? 'Not run yet' : ph === 'main' || ph === 'read' || ph === 'make' || ph === 'value' ? 'SpringApplication.run is running' : ph === 'get' ? 'ctx.getBean is running' : ph === 'print' ? 'println is running' : s.exit === 0 ? 'Ended' : 'Ended with an exception';
    P.box('mn', 14, 36, 652, 44, { cls: end ? (s.exit === 0 ? 'plain' : 'bad') : s ? 'hot now' : 'ghost', title: 'main method of App', sub: mnSub });
    P.box('pf', 14, 112, 190, 92, { cls: ph === 'read' ? 'hot now' : s ? 'plain' : 'ghost', title: 'application.properties', sub: [s && s.file ? 'shop.name=' + s.file : s ? 'No name=value line' : ' '] });
    var spSub = !s || !s.read ? [' '] : s.file ? ['Settings list', 'shop.name = ' + s.file] : ['Settings: empty'];
    P.box('sp', 254, 112, 170, 92, { cls: s && s.bad ? 'bad' : s && s.read ? (ph === 'read' || ph === 'make' || ph === 'value' ? 'good now' : 'good') : 'ghost', title: 'Spring', sub: spSub });
    var siSub = !s ? [' '] : s.name !== null ? ['name = ' + s.name] : s.bad ? ['Stopped while creating'] : ph === 'make' || ph === 'value' ? ['Being created'] : ['Not yet'];
    P.box('si', 474, 112, 192, 92, { cls: s && s.bad ? 'bad' : s && s.name !== null ? (ph === 'value' ? 'good now' : 'good') : 'ghost', title: 'ShopInfo object', sub: siSub });
    if (s && ph === 'read') P.arrow('rd', 'pf:r:0.5', 'sp:l:0.5', { cls: 'hot' });
    if (s && ph === 'make') P.arrow('mk', 'sp:r:0.35', 'si:l:0.35', { cls: 'hot' });
    if (s && ph === 'value') P.arrow('vl', 'sp:r:0.65', 'si:l:0.65', { cls: s.bad ? 'bad' : 'good' });
    var prog = !s ? 'Not yet' : s.exit === 0 ? 'Ran to the end' : s.exit === 1 ? 'Stopped while starting' : 'Running';
    P.box('n1', 14, 236, 322, 36, { cls: s && s.out !== null ? 'good' : s && s.exit === 1 ? 'bad' : 'ghost', title: 'Text printed to the screen', right: s && s.out !== null ? s.out : s && s.exit === 1 ? 'None' : 'None yet' });
    P.box('n2', 344, 236, 322, 36, { cls: s && s.exit === 0 ? 'good' : s && s.exit === 1 ? 'bad' : 'ghost', title: 'Program', right: prog });
  },
  assume: 'This is the result of running Spring Boot 4.1.1 (Spring Framework 7.0.9) on JDK 21.0.12.1. All six combinations were checked by compiling a source with the same structure as the code on the screen (ShopInfo and App in the package app, and application.properties in the same folder as the class files), running app.App from its main method as a new process with the java command, and comparing the results. What was checked is the three items of the result table. The value that came into name was decided from the text the process printed to the standard output, whether the startup succeeded from the exit code (0 and 1) and the standard output, and the error from the name and message of the exception on the standard error. In the combinations where the configuration file is deleted, only the shop.name line and the note line right above it were removed from the file, and the # application.properties line at the top was left. The facts that the step sentences rely on were also checked by execution. In the combinations with a configuration file, Spring reads application.properties on the class path as a source of settings (Config resource class path resource [application.properties]) and the shop.name value in it is in the Spring Environment. When SpringApplication.run ends, the ShopInfo object has already been made and the name field holds the value. Our source has no new ShopInfo() and no line that puts a value in name. When there is no shop.name line and no default value, an exception (BeanCreationException, whose cause is a PlaceholderResolutionException with Could not resolve placeholder \'shop.name\' in value "${shop.name}") comes out of the SpringApplication.run line, main cannot go on to the next line and ends with exit code 1, and nothing is printed to the standard output. When only application.properties is changed from kim-shop to lee-shop and the program is run again from the same compile result (the hashes of the ShopInfo.class file and the App.class file are the same), lee-shop comes out without compiling. In the combination where the shop.name line is deleted and a default value is written, the file has no name=value line at all, and it was observed that application.properties does not appear in the list of setting sources of Spring. The step sentence says only as far as "the settings list does not have the name shop.name". For the class path, only the 21 jars that spring-boot-starter brings in were given, not the whole library folder (the same list as the Spring Boot Fundamentals lab, with no web library), and the working folder of the child process was an empty temporary folder (because Spring Boot also reads application.properties and the config folder in the working folder). The environment variables starting with SPRING_ and SHOP_ were removed from the child process. What the documentation defines comes from the section Externalized Configuration of the Spring Boot documentation (that when it starts, it finds and reads application.properties at the root of the class path, in the /config package of the class path, in the current folder, and in the config folder of the current folder; that settings are kept outside the code so that the same code can be used in different environments; and that in ${name:default}, what follows the : is the default value) and the section Using @Value of the Spring Framework documentation (that @Value("${...}") injects an external setting value; the default value syntax; that Spring Boot registers by default the PropertySourcesPlaceholderConfigurer that reads the values of application.properties; and that when this configurer is present, initialization fails if a ${} placeholder cannot be resolved). The documentation also says that if you use only Spring Framework and do not put this configurer in, the unresolved ${shop.name} text goes in as the value as it is, but this lab was run only on Spring Boot. That BeanCreationException and PlaceholderResolutionException come out when the value is missing is not defined by the documentation but is a behavior observed on this version. The code on the screen leaves out the package and import lines and assumes that ShopInfo and App are in the same package. In reality the two classes are in separate files, and application.properties is usually put in src/main/resources and copied next to the class files by the build (here it was put in that folder directly). What this lab does not cover is application.yml, the precedence when the same name is in several places, changing values with environment variables and run arguments, files for each profile, and @ConfigurationProperties. The precedence is covered in the in-depth lab "Configuration precedence", and Spring Boot making beans by itself after looking at the settings is covered in the in-depth lab "Spring Boot auto-configuration".',
});
