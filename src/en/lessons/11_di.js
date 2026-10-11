Lab.register({
  id: 'di', nav: 'Bean creation and injection', cat: 'Spring', mode: 'step',
  title: 'In what order does Spring create objects and wire them together?',
  intro: 'When an application starts, the Spring container creates the beans one by one and wires them together. The order in which the objects are created depends on the injection style, and when two beans need each other (a circular dependency), startup can fail.',
  terms: ['Inversion of Control (IoC)', 'Dependency injection (DI)', 'Constructor injection, setter injection, and field injection', 'Spring bean', 'Bean lifecycle', 'Circular dependency'], ranks: ['di', 'bean'],
  controls: [
    { id: 'inj', label: 'Injection style', type: 'select', value: 'ctor', options: [['ctor', 'Constructor injection'], ['field', 'Field injection (@Autowired)'], ['setter', 'Setter injection']] },
    { id: 'cycle', label: 'OrderService and PaymentService are injected into each other (circular dependency)', type: 'check', value: false },
    { id: 'allow', label: 'Set spring.main.allow-circular-references=true', type: 'check', value: false, show: function (c) { return c.cycle; } },
  ],
  presets: [
    { t: 'Default settings', d: 'Constructor injection. A dependency must be fully initialized before the next object can be created.', v: { inj: 'ctor', cycle: false, allow: false } },
    { t: 'Switching to field injection', d: 'The object is created first and filled in later. For a short time, its fields are empty.', v: { inj: 'field', cycle: false, allow: false } },
    { t: 'Constructor injection + circular dependency', d: 'Neither bean can be created first, so startup fails.', v: { inj: 'ctor', cycle: true, allow: false } },
    { t: 'Field injection + circular dependency', d: 'With the default settings of Spring Boot, this also fails at startup.', v: { inj: 'field', cycle: true, allow: false } },
    { t: 'Allowing circular dependencies', d: 'Field injection gets through by handing over an object early, before it is fully initialized.', v: { inj: 'field', cycle: true, allow: true } },
    { t: 'Constructor injection fails even when allowed', d: 'This is because the arguments must exist before a constructor can be called.', v: { inj: 'ctor', cycle: true, allow: true } },
  ],
  code: function (c) {
    function cls(name, ann, deps) {
      var f = deps.map(function (d) { return d.charAt(0).toLowerCase() + d.slice(1); });
      if (c.inj === 'ctor') return ann + '\nclass ' + name + ' {\n' + deps.map(function (d, i) { return '    private final ' + d + ' ' + f[i] + ';\n'; }).join('') + (deps.length ? '\n    ' + name + '(' + deps.map(function (d, i) { return d + ' ' + f[i]; }).join(', ') + ') {\n' + f.map(function (x) { return '        this.' + x + ' = ' + x + ';\n'; }).join('') + '    }\n' : '') + '}';
      if (c.inj === 'field') return ann + '\nclass ' + name + ' {\n' + deps.map(function (d, i) { return '    @Autowired\n    private ' + d + ' ' + f[i] + ';\n'; }).join('') + '}';
      return ann + '\nclass ' + name + ' {\n' + deps.map(function (d, i) { return '    private ' + d + ' ' + f[i] + ';\n\n    @Autowired\n    void set' + d + '(' + d + ' ' + f[i] + ') {\n        this.' + f[i] + ' = ' + f[i] + ';\n    }\n'; }).join('') + '}';
    }
    var out = [cls('OrderController', '@RestController', ['OrderService']), cls('OrderService', '@Service', c.cycle ? ['OrderRepository', 'PaymentService'] : ['OrderRepository'])];
    if (c.cycle) out.push(cls('PaymentService', '@Service', ['OrderService']));
    out.push(cls('OrderRepository', '@Repository', []));
    return out.join('\n\n') + (c.cycle && c.allow ? '\n\n// application.properties\n// spring.main.allow-circular-references=true' : '');
  },
  label: function (c) { return { ctor: 'Constructor injection', field: 'Field injection', setter: 'Setter injection' }[c.inj] + (c.cycle ? ' · circular dependency' + (c.allow ? ' (allowed)' : '') : ''); },
  columns: ['Startup result', 'Order in which the objects were created', 'Order in which the beans were fully initialized'],
  simulate: function (c) {
    var ctor = c.inj === 'ctor', how = { field: 'field', setter: 'setter' }[c.inj];
    var deps = { OrderController: ['OrderService'], OrderRepository: [], OrderService: c.cycle ? ['OrderRepository', 'PaymentService'] : ['OrderRepository'] }, order = ['OrderController', 'OrderRepository', 'OrderService'];
    if (c.cycle) { deps.PaymentService = ['OrderService']; order.push('PaymentService'); }
    var st = {}, got = {}, stack = [], made = [], done = [], ev = [], failed = null;
    order.forEach(function (n) { st[n] = 'bean definition only'; got[n] = []; });
    function push(s, k) { ev.push({ s: s, k: k, snap: { st: JSON.parse(JSON.stringify(st)), got: JSON.parse(JSON.stringify(got)), stack: stack.slice() } }); }
    push('Component scanning: The container finds the classes annotated with @RestController, @Service, and @Repository and registers ' + order.length + ' bean definitions. No object has been created yet.', '');
    function create(n, by) {
      if (st[n] === 'fully initialized') { push(n + ' already exists as a fully initialized bean. The container does not create a new one and uses that object as it is (singleton).', ''); return true; }
      if (stack.indexOf(n) >= 0) {
        var loop = stack.slice(stack.indexOf(n)).concat([n]).join(' → ');
        if (ctor) { failed = loop; push(by + ' cannot be created without ' + n + ', but ' + n + ' is in creation right now and has no object yet (' + loop + '). The arguments must exist before a constructor can be called, so there is no way out. An exception is thrown and the application fails to start.', 'bad'); return false; }
        if (!c.allow) { failed = loop; push(by + ' needs ' + n + ' to be injected, but ' + n + ' is still in creation (' + loop + '). Spring Boot prohibits circular dependencies by default, so an exception is thrown and startup fails.', 'bad'); return false; }
        push(by + ' needs ' + n + ' to be injected, but ' + n + ' is still in creation. Circular dependencies are allowed, so the container takes a reference to ' + n + ' early and passes it in. The object of that bean already exists, but its injection is not finished.', 'bad'); return true;
      }
      stack.push(n);
      if (ctor) {
        st[n] = 'preparing arguments';
        push(n + ' starts to be created. ' + (deps[n].length ? 'The constructor requires ' + deps[n].join(', ') + ', so the container must prepare that first before it can call the constructor.' : 'The constructor takes no arguments.'), '');
        for (var i = 0; i < deps[n].length; i++) { if (!create(deps[n][i], n)) { st[n] = 'failed'; return false; } }
        made.push(n); got[n] = deps[n].slice();
      } else {
        made.push(n); st[n] = 'created (not injected)';
        push(n + ' is created first as an object, with the default constructor.' + (deps[n].length ? ' Dependencies that are still null, to be injected through a ' + how + ': ' + deps[n].length + '.' : ' It has nothing to be injected.'), '');
        for (var j = 0; j < deps[n].length; j++) { if (!create(deps[n][j], n)) { st[n] = 'failed'; return false; } got[n].push(deps[n][j]); push(n + ' received ' + deps[n][j] + ' through its ' + how + '.', ''); }
      }
      st[n] = 'fully initialized'; done.push(n); stack.pop();
      push(!ctor && !deps[n].length ? n + ' has nothing to be injected, so it is fully initialized right away.' : ctor ? n + ' is created as an object by calling its constructor.' + (deps[n].length ? ' Passed as arguments: ' + deps[n].join(', ') + '.' : '') + ' All of its dependencies are in place from the moment it is created. Next, the initialization callback (@PostConstruct) is called if there is one, and the bean is fully initialized.' : n + ' has received all of its injections. The initialization callback (@PostConstruct) is called at this point if there is one, and the bean is fully initialized.', 'good');
      return true;
    }
    for (var k = 0; k < order.length && !failed; k++) if (st[order[k]] !== 'fully initialized') create(order[k], 'The container');
    var sum = [];
    if (failed) {
      sum.push(ctor ? 'Constructor injection reveals a circular dependency right at startup. Even when you allow circular dependencies with the setting, a cycle between constructor-injected beans cannot be resolved. The solution is to remove the cycle itself by moving the functionality that the two beans share into a third bean.' : 'Since Spring Boot 2.6, circular dependencies are prohibited by default regardless of the injection style. You can allow them with a setting, but the recommendation is to change the design so that the cycle goes away.');
    } else {
      if (ctor) sum.push('With constructor injection, an object can be created only after its dependencies are fully initialized. So from the moment the object exists, all of its dependencies are in place, and the fields can be final.');
      else sum.push('With ' + how + ' injection, the object is created first and its dependencies are filled in later. In between, the object exists with its dependencies still null, and those fields cannot be final. If a test creates the object without Spring, its dependencies stay empty.');
      if (c.cycle) sum.push('Startup got through because circular dependencies were allowed, but an object whose injection was not finished was handed to another bean early. A structure in which two beans must know each other is likely to be a design problem in itself.');
    }
    return { events: ev, summary: sum, order: order, deps: deps, row: [failed ? 'Failed' : 'Succeeded', made.join(' → ') || 'none', done.join(' → ') || 'none'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, how = sim.c.inj === 'ctor' ? 'constructor arguments' : sim.c.inj === 'field' ? 'fields' : 'setters';
    if (!s) { H.text(v, 'Click Run to start the container.'); return; }
    H.table(v, ['Bean', 'State', 'Dependencies it needs', 'Dependencies filled in'], sim.order.map(function (n) {
      var x = s.st[n], need = sim.deps[n];
      return { cells: [n, { v: x, cls: x === 'fully initialized' ? 'good' : x === 'failed' ? 'bad' : x === 'bean definition only' ? '' : 'hot' }, need.length ? need.join(', ') : 'none', need.length ? (s.got[n].length ? s.got[n].join(', ') : '(none yet)') + (s.got[n].length < need.length && x.indexOf('created') === 0 ? ' · the rest are null' : '') : '-'] };
    }), 'Beans in the Spring container (injected through ' + how + ')');
    H.title(v, 'Beans in creation right now (outer → inner)');
    H.slots(v, s.stack.map(function (n, i) { return [n, i === s.stack.length - 1 ? 'b' : 'q']; }), 'None');
  },
  // Diagram: the beans in the container and arrows that show which bean needs which. A dashed line is a dependency that has not been filled in yet, and a solid line is one whose injection is finished.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, pos = { OrderController: [28, 56], OrderService: [240, 56], OrderRepository: [452, 56], PaymentService: [240, 196] };
    P.size(680, 300);
    P.region('ctx', 16, 16, 648, 268, 'Spring container');
    sim.order.forEach(function (n) {
      var x = s ? s.st[n] : 'bean definition only', need = sim.deps[n], got = s ? s.got[n] : [], top = s && s.stack[s.stack.length - 1] === n;
      P.box(n, pos[n][0], pos[n][1], 200, 60, { cls: (x === 'fully initialized' ? 'good' : x === 'failed' ? 'bad' : x === 'bean definition only' ? 'ghost' : 'hot') + (top ? ' now' : ''), title: n, sub: [x, need.length ? 'Dependencies: ' + got.length + '/' + need.length + ' filled' : 'No dependencies'] });
      need.forEach(function (d) {
        var filled = got.indexOf(d) >= 0, pair = n + '>' + d, a = n + ':r', b = d + ':l';
        if (pair === 'OrderService>PaymentService') { a = n + ':b:0.3'; b = d + ':t:0.3'; } else if (pair === 'PaymentService>OrderService') { a = n + ':t:0.7'; b = d + ':b:0.7'; }
        P.arrow('d_' + n + '_' + d, a, b, { cls: filled ? 'good' : x === 'failed' ? 'bad dash' : 'dash mut' });
      });
    });
    P.note('An arrow means "this bean needs that bean". A dashed line is a dependency that has not been filled in yet, and a solid green line is a dependency whose injection is finished. A yellow bean is in creation right now, and the thick border marks the innermost bean in creation.');
  },
  assume: 'This is a small application with only four beans, and the model assumes that the container starts creating the beans in the order in which they were scanned (the real order can vary with the classpath and the configuration, but the rule that a dependency must be ready first is the same). Prohibiting circular dependencies by default is the behavior of Spring Boot 2.6 and later. Another way to resolve a circular dependency (delaying the injection with @Lazy) is not covered. All 12 combinations were started on a real Spring Boot 4.1.1, and it was confirmed that whether startup succeeds, the order in which the objects are created (the order in which the constructors are called), and the order in which the beans are fully initialized (the order in which injection finishes) match the screen. Every startup failure was a BeanCurrentlyInCreationException.',
});
