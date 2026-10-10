Lab.register({
  id: 'casting', nav: '연산자와 형변환', cat: '자바 언어', mode: 'step',
  title: '7 / 2는 왜 3.5가 아니라 3이 나오나',
  intro: '자바에서 계산 결과는 숫자만이 아니라 타입으로도 정해집니다. int끼리 계산하면 결과도 int라서 소수점 아래나 범위를 넘는 부분이 사라지고, 타입이 섞이면 좁은 쪽을 넓은 쪽으로 자동으로 맞춘 뒤 계산합니다. +는 한쪽이 문자열이면 덧셈이 아니라 이어 붙이기가 됩니다. 식을 하나 골라, 어느 순간에 무엇이 사라지거나 바뀌는지 따라가 보세요.',
  terms: ['형변환', '정수 나눗셈과 나머지', '정수 오버플로', '문자열 연결'],
  controls: [
    { id: 'topic', label: '살펴볼 것', type: 'select', value: 'ints', options: [['ints', '정수끼리의 계산 (나눗셈, 나머지, 범위)'], ['conv', '타입이 섞이거나 바뀔 때 (형변환)'], ['str', '문자열과 +']] },
    { id: 'e1', label: '계산식', type: 'select', value: 'div', options: [['div', '7 / 2'], ['mod', '7 % 2'], ['ndiv', '-7 / 2'], ['nmod', '-7 % 2'], ['zero', '7 / 0'], ['over', '2147483647 + 1']], show: function (c) { return c.topic === 'ints'; } },
    { id: 'e2', label: '코드', type: 'select', value: 'late', options: [['late', 'double r = 7 / 2'], ['mix', 'double r = 7 / 2.0'], ['longlate', 'long r = big + 1  (big은 2147483647)'], ['longmix', 'long r = big + 1L'], ['narrow', 'int r = 3.99'], ['trunc', 'int r = (int) 3.99'], ['ntrunc', 'int r = (int) -3.99'], ['byte', 'byte r = (byte) 200']], show: function (c) { return c.topic === 'conv'; } },
    { id: 'e3', label: '계산식', type: 'select', value: 'ns', options: [['ns', '1 + 2 + "3"'], ['sn', '"1" + 2 + 3'], ['paren', '"1" + (2 + 3)'], ['mixed', '1 + 2 + "3" + 4 + 5']], show: function (c) { return c.topic === 'str'; } },
  ],
  presets: [
    { t: '처음 설정으로', d: 'int끼리 나누면 3.5가 아니라 3이 나옵니다.', v: { topic: 'ints', e1: 'div', e2: 'late', e3: 'ns' } },
    { t: 'double 변수에 받아도', d: '계산은 이미 int로 끝나서 3.0이 됩니다.', v: { topic: 'conv', e1: 'div', e2: 'late', e3: 'ns' } },
    { t: '한쪽을 double로 쓰면', d: '계산 전에 타입이 맞춰져 3.5가 나옵니다.', v: { topic: 'conv', e1: 'div', e2: 'mix', e3: 'ns' } },
    { t: 'int의 범위를 넘으면', d: '가장 큰 값에 1을 더하면 가장 작은 값이 됩니다.', v: { topic: 'ints', e1: 'over', e2: 'late', e3: 'ns' } },
    { t: 'long 변수에 받기만 하면', d: '넘친 뒤의 값이 그대로 들어갑니다.', v: { topic: 'conv', e1: 'over', e2: 'longlate', e3: 'ns' } },
    { t: 'byte로 강제 형변환', d: '200이 -56이 됩니다.', v: { topic: 'conv', e1: 'div', e2: 'byte', e3: 'ns' } },
    { t: '숫자와 문자열을 더하면', d: '1 + 2 + "3"은 "6"도 "123"도 아닙니다.', v: { topic: 'str', e1: 'div', e2: 'late', e3: 'ns' } },
  ],
  // 설정이 고른 한 줄: 변수 r의 타입 T, 오른쪽 식 e(계산 나무), 코드 옆에 적을 말
  pick: function (c) {
    var L = function (t, v, s) { return { k: 'lit', t: t, v: v, s: s }; }, B = function (op, l, r) { return { k: 'bin', op: op, l: l, r: r }; }, C = function (t, e) { return { k: 'cast', t: t, e: e }; }, Par = function (e) { return { k: 'par', e: e }; };
    var i = function (n) { return L('int', n, String(n)); }, s = function (x) { return L('String', x, '"' + x + '"'); }, d = function (x, sx) { return L('double', x, sx); }, big = function () { return { k: 'var', name: 'big', t: 'int', v: 2147483647 }; };
    var key = c.topic === 'ints' ? c.e1 : c.topic === 'conv' ? c.e2 : c.e3;
    var p = {
      div: ['int', B('/', i(7), i(2)), 'int끼리 나눗셈'], mod: ['int', B('%', i(7), i(2)), '%는 나머지'], ndiv: ['int', B('/', i(-7), i(2)), '음수를 나누면'], nmod: ['int', B('%', i(-7), i(2)), '음수의 나머지'],
      zero: ['int', B('/', i(7), i(0)), '0으로 나누면'], over: ['int', B('+', big(), i(1)), '범위를 넘는 덧셈'],
      late: ['double', B('/', i(7), i(2)), '계산은 int끼리, 변수는 double'], mix: ['double', B('/', i(7), d(2, '2.0')), '한쪽이 double'],
      longlate: ['long', B('+', big(), i(1)), '계산은 int끼리, 변수는 long'], longmix: ['long', B('+', big(), L('long', 1, '1L')), '1L은 long 타입의 1'],
      narrow: ['int', d(3.99, '3.99'), '(int) 없이 넣으려 하면'], trunc: ['int', C('int', d(3.99, '3.99')), '강제 형변환'], ntrunc: ['int', C('int', d(-3.99, '-3.99')), '음수를 강제 형변환'], byte: ['byte', C('byte', i(200)), 'int를 byte로 강제 형변환'],
      ns: ['String', B('+', B('+', i(1), i(2)), s('3')), '왼쪽부터 차례로'], sn: ['String', B('+', B('+', s('1'), i(2)), i(3)), '문자열이 맨 앞'], paren: ['String', B('+', s('1'), Par(B('+', i(2), i(3)))), '괄호 안이 먼저'],
      mixed: ['String', B('+', B('+', B('+', B('+', i(1), i(2)), s('3')), i(4)), i(5)), '숫자와 문자열이 섞임'],
    }[key];
    return { key: key, T: p[0], e: p[1], note: p[2], big: key === 'over' || key === 'longlate' || key === 'longmix' };
  },
  // 식을 글자로. 계산이 끝난 부분(val)은 값으로 적는다.
  jd: function (x) { return Number.isInteger(x) && Math.abs(x) < 1e7 ? x.toFixed(1) : String(x); },
  disp: function (n) { return n.t === 'String' ? '"' + n.v + '"' : n.t === 'double' ? this.jd(n.v) : String(n.v); },
  txt: function (n) { return n.k === 'lit' ? n.s : n.k === 'var' ? n.name : n.k === 'val' ? this.disp(n) : n.k === 'par' ? '(' + this.txt(n.e) + ')' : n.k === 'cast' ? '(' + n.t + ') ' + this.txt(n.e) : this.txt(n.l) + ' ' + n.op + ' ' + this.txt(n.r); },
  // 계산하지 않고 타입만 구한다 (컴파일러가 하는 일)
  typeOf: function (n) {
    if (n.k === 'par') return this.typeOf(n.e); if (n.k === 'cast') return n.t; if (n.k !== 'bin') return n.t;
    var a = this.typeOf(n.l), b = this.typeOf(n.r);
    if (n.op === '+' && (a === 'String' || b === 'String')) return 'String';
    return a === 'double' || b === 'double' ? 'double' : a === 'long' || b === 'long' ? 'long' : 'int';
  },
  stmt: function (c) { var p = this.pick(c); return p.T + ' r = ' + this.txt(p.e); },
  code: function (c) {
    var p = this.pick(c), line = p.T + ' r = ' + this.txt(p.e) + ';', pad = function (x) { return x + new Array(Math.max(2, 33 - x.length)).join(' ') + '// '; };
    return (p.big ? pad('int big = 2147483647;') + 'int가 담을 수 있는 가장 큰 값\n' : '') + pad(line) + p.note + '\n\nSystem.out.println(r);';
  },
  label: function (c) { return { ints: '정수 계산', conv: '형변환', str: '문자열과 +' }[c.topic] + ' · ' + this.stmt(c); },
  columns: ['오른쪽 식의 타입', '변수 r의 타입', '출력 또는 오류'],
  simulate: function (c) {
    var self = this, p = this.pick(c), T = p.T, root = { e: p.e }, ev = [], sum = [], lost = false;
    var wide = ['byte', 'short', 'int', 'long', 'float', 'double'], et = this.typeOf(p.e);
    var st = { forms: [{ x: this.txt(p.e), t: p.e.k === 'lit' ? p.e.t : '' }], r: null, out: null, hi: null, bad: false };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function form() { st.forms.push({ x: self.txt(root.e), t: root.e.k === 'val' ? root.e.t : '' }); }
    function set(n, t, v) { delete n.l; delete n.r; delete n.e; delete n.op; delete n.s; delete n.name; n.k = 'val'; n.t = t; n.v = v; }
    function widen(x, t) { return x.v; }   // 넓은 타입으로 맞춘다. 이 실습에 나오는 값은 모두 자바스크립트 숫자로 정확히 나타낼 수 있어 값은 그대로다
    var ro = { byte: 'byte로', int: 'int로', long: 'long으로', double: 'double로', String: 'String으로' };
    function Stop(msg) { this.msg = msg; }
    var parNote = '';
    function run(n) {
      if (n.k === 'par') { parNote = '괄호로 묶은 부분이라 바깥의 +보다 먼저 계산합니다. '; run(n.e); parNote = ''; set(n, n.e.t, n.e.v); return; }
      if (n.k === 'cast') {
        run(n.e); var before = self.txt(n), from = n.e.t, x = n.e.v, v, s;
        if (n.t === 'int' && from === 'double') {
          v = isNaN(x) ? 0 : Math.max(-2147483648, Math.min(2147483647, Math.trunc(x)));
          s = before + ': double 값을 int로 강제로 바꿉니다. int는 소수점 아래를 담지 못하므로, 소수점 아래를 버리고 ' + v + '만 남깁니다. 반올림하지 않습니다.' + (x < 0 && v !== x ? ' 버림은 0에 가까운 쪽으로 일어납니다(아래쪽 정수로 내리는 것이었다면 ' + Math.floor(x) + ').' : '');
          if (v !== x) lost = true;
        } else if (n.t === 'byte' && from === 'int') {
          v = ((x & 255) << 24) >> 24;
          var bits = ('00000000' + (x & 255).toString(2)).slice(-8);
          s = before + ': int 값을 byte로 강제로 바꿉니다. int는 32비트, byte는 8비트입니다. 아래쪽 8비트(' + bits + ')만 남기고 위쪽은 잘라 냅니다. ' + (v === x ? '범위 안의 값이라 그대로 ' + v + '입니다.' : 'byte는 -128부터 127까지만 나타내므로 이 값을 그대로 담을 수 없습니다. 남은 비트를 byte로 읽은 값은 ' + v + '입니다.');
          if (v !== x) lost = true;
        } else { v = widen(n.e, n.t); s = before + ': ' + from + ' 값을 ' + ro[n.t] + ' 바꿉니다.'; }
        st.hi = { from: from, to: n.t, kind: wide.indexOf(n.t) < wide.indexOf(from) ? 'narrow' : 'widen' };
        set(n, n.t, v); form(); push(s, lost ? 'bad' : ''); return;
      }
      if (n.k !== 'bin') return;
      run(n.l); run(n.r);
      var a = n.l, b = n.r, op = n.op, text = self.txt(n) + (a.k === 'var' ? ' (' + a.name + '의 값은 ' + a.v + ')' : ''), res, rt, msg, kind = '';
      if (op === '+' && (a.t === 'String' || b.t === 'String')) {
        var sa = a.t === 'String' ? a.v : self.disp(a), sb = b.t === 'String' ? b.v : self.disp(b);
        st.hi = { rule: 'concat' }; set(n, 'String', sa + sb); form();
        push(text + ': 한쪽이 문자열이므로 여기서 +는 덧셈이 아니라 이어 붙이기입니다. 숫자 쪽은 글자로 바뀐 뒤 붙습니다. 결과는 문자열 "' + (sa + sb) + '"입니다.', '');
        return;
      }
      rt = a.t === 'double' || b.t === 'double' ? 'double' : a.t === 'long' || b.t === 'long' ? 'long' : 'int';
      var x = widen(a, rt), y = widen(b, rt), verb = { '/': '나누면', '%': '나머지를 구하면', '+': '더하면' }[op];
      if (rt === 'int') {
        st.hi = c.topic === 'str' ? { rule: 'add' } : { from: 'int', to: 'int', kind: 'same' };
        if (op === '/' || op === '%') {
          if (y === 0) { st.bad = true; st.out = 'ArithmeticException: / by zero'; push(text + ': 정수를 0으로 나누는 계산은 할 수 없습니다. ArithmeticException이 발생하고, 프로그램은 이 줄에서 멈춥니다. 그 아래의 출력은 실행되지 않습니다.', 'bad'); throw new Stop('ArithmeticException: / by zero'); }
          var q = Math.trunc(x / y), rem = x % y, pr = function (z) { return z < 0 ? '(' + z + ')' : String(z); };
          if (op === '/') {
            res = q;
            if (rem !== 0) { lost = true; msg = text + ': 양쪽이 모두 int이므로 결과도 int입니다. 수학에서의 값은 ' + (x / y) + '입니다. 하지만 int는 소수점 아래를 담지 못하므로, 반올림 없이 버리고 ' + q + '만 남깁니다.' + (x / y < 0 ? ' 버림은 0에 가까운 쪽으로 일어납니다(아래쪽 정수로 내리는 것이었다면 ' + Math.floor(x / y) + ').' : ''); kind = 'bad'; }
            else msg = text + ': 양쪽이 모두 int이므로 결과도 int입니다. 나누어떨어지므로 결과는 ' + q + '입니다.';
          } else {
            res = rem;
            msg = text + ': %는 나눗셈에서 남는 수(나머지)를 구합니다. 나눗셈을 식으로 쓰면 ' + x + ' = ' + y + ' × ' + pr(q) + ' + ' + pr(rem) + ' 입니다. 몫이 ' + q + ', 나머지가 ' + rem + '입니다.' + (x < 0 ? ' 나머지의 부호는 나누어지는 왼쪽 수의 부호를 따릅니다.' : '');
          }
        } else {
          res = (x + y) | 0;
          if (res !== x + y) { lost = true; kind = 'bad'; msg = text + ': 양쪽이 모두 int이므로 결과도 int입니다. 수학에서의 값은 ' + (x + y) + '인데, int가 담을 수 있는 가장 큰 값은 2147483647입니다. 범위를 넘으면 오류 없이 반대쪽 끝인 가장 작은 값으로 넘어갑니다(오버플로). 결과는 ' + res + '입니다.'; }
          else msg = text + ': ' + parNote + '양쪽이 모두 int이므로 숫자 덧셈입니다. 결과는 int 값 ' + res + '입니다.';
        }
      } else {
        var narrow = a.t === rt ? b : a;
        st.hi = { from: narrow.t, to: rt, kind: 'widen' };
        if (rt === 'double') res = op === '/' ? x / y : op === '%' ? x % y : x + y;
        else res = op === '/' ? Math.trunc(x / y) : op === '%' ? x % y : x + y;   // long: 이 실습의 값은 long 범위를 넘지 않는다
        msg = text + ': 한쪽이 ' + rt + '이므로, 계산하기 전에 ' + narrow.t + ' 쪽이 ' + ro[rt] + ' 자동으로 바뀝니다. ' + rt + '끼리 ' + verb + ' ' + (rt === 'double' ? self.jd(res) : String(res)) + '입니다. ' + (rt === 'double' ? '소수점 아래가 그대로 남습니다.' : 'long의 범위 안이므로 넘치지 않습니다.');
        kind = 'good';
      }
      set(n, rt, res); form(); push(msg, kind);
    }
    var okAssign = T === et || (wide.indexOf(T) >= 0 && wide.indexOf(et) >= 0 && wide.indexOf(T) > wide.indexOf(et));
    var result, msgText = '';
    if (!okAssign) {
      // 컴파일러가 실행 전에 막는다
      st.hi = { from: et, to: T, kind: 'error' };
      push('컴파일러는 프로그램을 실행하기 전에 타입부터 검사합니다. 오른쪽 식 ' + this.txt(p.e) + '의 타입은 ' + et + '이고, 변수 r의 타입은 ' + T + '입니다.', '');
      st.bad = true; st.out = '컴파일 오류'; msgText = 'incompatible types: possible lossy conversion from ' + et + ' to ' + T;
      push(this.stmt(c) + ': ' + et + ' 값을 ' + T + ' 변수에 넣으려면 소수점 아래를 버려야 해서 값을 잃을 수 있습니다. 값을 잃을 수 있는 방향의 변환은 자동으로 해 주지 않습니다. 컴파일 오류가 나고, 프로그램은 실행되지 않습니다. javac가 보여 주는 메시지는 "' + msgText + '"입니다.', 'bad');
      result = '컴파일 오류';
    } else {
      try {
        if (p.big) push('int big = 2147483647: int가 담을 수 있는 가장 큰 값을 변수 big에 넣어 둡니다.', '');
        if (p.e.k === 'lit') push('오른쪽 식 ' + this.txt(p.e) + '의 타입은 ' + et + '입니다.', ''); else run(root.e);
        var val = root.e, rv = val.v;
        if (T !== et) {
          rv = widen(val, T); st.hi = { from: et, to: T, kind: 'widen' };
          st.r = self.disp({ t: T, v: rv });
          push(T + ' r = ' + self.disp(val) + ': 오른쪽 계산은 이미 끝났고, 그 결과는 ' + et + ' 값 ' + self.disp(val) + '입니다. 이 값을 ' + T + ' 변수에 넣으면서 ' + ro[T] + ' 넓혀집니다(자동 형변환). r에 든 값은 ' + st.r + '입니다.' + (lost ? ' 계산 도중에 사라진 부분은 돌아오지 않습니다.' : ''), lost ? 'bad' : '');
        } else {
          st.hi = null; st.r = self.disp(val);
          push(T + ' r = ' + self.disp(val) + ': ' + (T === 'String' ? '만들어진 문자열을 변수 r에 넣습니다.' : '계산된 값을 ' + T + ' 변수 r에 넣습니다. 타입이 같으므로 값은 그대로입니다.'), '');
        }
        result = T === 'String' ? rv : self.disp({ t: T, v: rv }); st.out = result;
        push('System.out.println(r): r에 든 값을 출력합니다. 출력은 ' + result + '입니다.', lost ? 'bad' : 'good');
      } catch (e) { if (!(e instanceof Stop)) throw e; result = e.msg; }
    }
    var tips = {
      div: ['int끼리 나누면 결과도 int입니다. 소수점 아래는 반올림 없이 버려집니다.', '소수점까지 얻으려면 나누기 전에 한쪽을 double로 만들어야 합니다. "살펴볼 것"을 형변환으로 바꿔 7 / 2.0을 실행해 보세요.'],
      mod: ['%는 나머지를 구합니다. 짝수인지 볼 때(n % 2 == 0), 열 번에 한 번만 무언가를 할 때(i % 10 == 0)처럼 자주 쓰입니다.'],
      ndiv: ['정수 나눗셈은 아래로 내리는 것이 아니라 0 쪽으로 버리는 것입니다. 양수에서는 둘이 같아서 드러나지 않다가 음수에서 차이가 납니다.'],
      nmod: ['나머지의 부호는 왼쪽 수(나누어지는 수)를 따릅니다. 그래서 홀수 검사를 n % 2 == 1로 쓰면 음수 홀수에서 false가 됩니다. n % 2 != 0으로 씁니다.'],
      zero: ['정수를 0으로 나누면 ArithmeticException이 납니다. 나누는 값이 0일 수 있으면 나누기 전에 검사합니다.', '실수 계산인 7 / 0.0은 예외 없이 Infinity가 됩니다. 정수와 실수는 규칙이 다릅니다.'],
      over: ['int는 약 -21억부터 21억까지만 담습니다. 범위를 넘어도 예외나 경고 없이 반대쪽 끝으로 넘어가므로 알아차리기 어렵습니다.', '큰 수가 나올 수 있는 계산(금액, 밀리초 단위 시간, 개수의 곱)은 long으로 합니다. 넘치는 순간을 예외로 알고 싶으면 Math.addExact를 씁니다.'],
      late: ['타입은 변수에 넣을 때가 아니라 계산할 때 정해집니다. 7 / 2는 int끼리의 계산이라 이미 3이 됐고, double 변수에 넣어도 3.0이 될 뿐입니다.', '평균을 구하면서 double avg = sum / count; 로 쓰면 같은 일이 생깁니다. (double) sum / count처럼 나누기 전에 한쪽을 double로 바꿉니다.'],
      mix: ['타입이 섞인 계산에서는 좁은 쪽이 넓은 쪽으로 자동으로 바뀐 뒤 계산됩니다(int보다 long이, long보다 double이 넓습니다). 담을 수 있는 범위가 넓어지는 방향이라 따로 적지 않아도 됩니다.'],
      longlate: ['long 변수에 받는 것만으로는 오버플로를 막지 못합니다. big + 1은 int끼리의 계산이라 이미 넘친 뒤이고, 그 결과가 long으로 넓혀질 뿐입니다.', '계산 자체가 long으로 이루어지게 해야 합니다. 코드를 long r = big + 1L로 바꿔 실행해 보세요.'],
      longmix: ['계산에 long이 하나라도 섞이면 그 계산은 long으로 이루어집니다. 1L처럼 숫자 뒤에 L을 붙이거나 (long) big처럼 한쪽을 먼저 바꿉니다.'],
      narrow: ['넓은 타입의 값을 좁은 타입의 변수에 넣는 것은 값을 잃을 수 있어서 자동으로 되지 않습니다. 컴파일러가 실행 전에 막아 줍니다.', '값을 잃어도 괜찮다는 뜻으로 (int)를 직접 적으면 통과합니다. 이것을 강제 형변환이라고 합니다.'],
      trunc: ['(int)는 소수점 아래를 버립니다. 3.99도 3이 됩니다. 반올림이 필요하면 Math.round를 씁니다.'],
      ntrunc: ['버림은 0 쪽으로 일어납니다. -3.99는 -4가 아니라 -3이 됩니다. 정수 나눗셈 -7 / 2가 -3인 것과 같은 방향입니다.'],
      byte: ['정수를 더 좁은 정수 타입으로 강제로 바꾸면 아래쪽 비트만 남고 위쪽이 잘립니다. 범위 안의 값이면 그대로지만, 범위를 벗어난 값은 전혀 다른 수가 됩니다.', '강제 형변환은 "값을 잃어도 된다"고 컴파일러에게 알리는 것입니다. 값이 범위 안에 있는지는 직접 확인해야 합니다.'],
      ns: ['+는 왼쪽부터 차례로 계산됩니다. 문자열을 만나기 전까지는 숫자 덧셈이고, 문자열을 만난 순간부터 이어 붙이기입니다.'],
      sn: ['맨 앞이 문자열이면 그 뒤의 +는 모두 이어 붙이기가 됩니다. "합: " + 1 + 2가 "합: 3"이 아니라 "합: 12"가 되는 이유입니다.'],
      paren: ['숫자를 먼저 더하려면 괄호로 묶습니다. 괄호 안이 먼저 계산되어 5가 된 뒤에 문자열에 붙습니다.'],
      mixed: ['한번 문자열이 되면 그 뒤의 +는 전부 이어 붙이기입니다. 뒤쪽의 4와 5는 더해져 9가 되지 않고 차례로 붙습니다.'],
    }[p.key];
    var types = '오른쪽 식 ' + st.forms[0].x + '의 타입은 ' + et + '이고, 변수 r의 타입은 ' + T + '입니다.';
    sum.push(result === '컴파일 오류' ? '컴파일 오류가 나서 프로그램이 실행되지 않습니다. ' + types : st.bad ? '실행 중에 ' + result + ' 예외가 나서 아무것도 출력되지 않습니다. ' + types : 'r을 출력하면 ' + result + '입니다. ' + types);
    tips.forEach(function (x) { sum.push(x); });
    return { events: ev, summary: sum, T: T, first: st.forms[0], msg: msgText, row: [et, T, result] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 계산을 한 단계씩 진행합니다.'); return; }
    H.table(v, ['순서', '식의 모습', '타입'], s.forms.map(function (f, i) { return { cells: [i === 0 ? '처음' : i + '번 계산한 뒤', { v: f.x, cls: i === s.forms.length - 1 ? 'hot' : '' }, f.t || '(계산 전)'] }; }), '오른쪽 식이 계산되는 순서');
    var ln = H.lanes(v), h = s.hi;
    if (h && h.rule) H.lane(ln, '+의 뜻', h.rule === 'concat' ? '한쪽이 문자열: 이어 붙이기' : '양쪽이 숫자: 덧셈', h.rule === 'concat' ? 'hot' : 'wait');
    else if (h) H.lane(ln, '타입', h.kind === 'same' ? h.from + '끼리의 계산: 결과도 ' + h.to : h.kind === 'widen' ? h.from + ' → ' + h.to + ': 넓히기 (자동)' : h.kind === 'narrow' ? h.from + ' → ' + h.to + ': 좁히기 (강제, 값을 잃을 수 있음)' : h.from + ' → ' + h.to + ': 좁히기는 자동으로 되지 않음', h.kind === 'widen' ? 'good' : h.kind === 'same' ? 'wait' : 'bad');
    H.counters(v, [[s.r === null ? '?' : s.r, '변수 r (' + sim.T + ')'], [s.out === null ? '?' : s.out, s.bad ? '오류' : '출력']]);
  },
  // 그림: 왼쪽에 오른쪽 식이 한 단계씩 줄어드는 모습, 오른쪽에 타입의 넓이 순서(문자열 주제에서는 +의 두 가지 뜻), 아래에 변수 r과 출력.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { forms: [sim.first], r: null, out: null, hi: null, bad: false }, h = s.hi || {};
    P.size(680, 296);
    P.region('ex', 16, 16, 318, 200, '오른쪽 식이 계산되는 순서 (위에서 아래로)');
    s.forms.forEach(function (f, i) {
      var cur = i === s.forms.length - 1;
      P.box('f' + i, 30, 46 + i * 32, 290, 26, { cls: cur ? (s.bad && s.out === '컴파일 오류' ? 'bad now' : 'hot now') : 'plain', title: f.x, right: f.t, mono: true });
    });
    if (c.topic === 'str') {
      P.region('ty', 350, 16, 314, 200, '+의 두 가지 뜻');
      P.box('ru1', 364, 52, 286, 44, { cls: h.rule === 'add' ? 'wait now' : 'plain', title: '양쪽이 모두 숫자', sub: '덧셈: 1 + 2 는 3' });
      P.box('ru2', 364, 112, 286, 44, { cls: h.rule === 'concat' ? 'hot now' : 'plain', title: '한쪽이라도 문자열', sub: '이어 붙이기: 3 + "3" 은 "33"' });
      P.text('ru3', 364, 190, '왼쪽부터 +를 하나씩 계산합니다', { cls: 'mut' });
    } else {
      P.region('ty', 350, 16, 314, 200, '타입의 넓이 (아래로 갈수록 넓음)');
      [['byte', '8비트', '-128 ~ 127'], ['short', '16비트', '-32768 ~ 32767'], ['int', '32비트', '약 -21억 ~ 21억'], ['long', '64비트', '약 -922경 ~ 922경'], ['double', '64비트', '소수점이 있는 수']].forEach(function (r, i) {
        var cls = h.to === r[0] ? (h.kind === 'error' ? 'bad now' : 'hot now') : h.from === r[0] ? 'wait' : 'plain';
        P.box('t_' + r[0], 364, 46 + i * 28, 286, 23, { cls: cls, title: r[0] + ' · ' + r[1], right: r[2] });
      });
      P.text('tk', 364, 204, !h.kind ? '좁은 쪽에서 넓은 쪽으로만 자동으로 바뀝니다' : h.kind === 'same' ? h.from + '끼리 계산하면 결과도 ' + h.to : h.kind === 'widen' ? h.from + ' → ' + h.to + ' 넓히기: 자동으로 일어남' : h.kind === 'narrow' ? h.from + ' → ' + h.to + ' 좁히기: 값을 잃을 수 있음' : h.from + ' → ' + h.to + ' 좁히기: 자동으로 되지 않음', { cls: h.kind === 'narrow' || h.kind === 'error' ? 'bad' : h.kind === 'widen' ? 'good' : 'mut' });
    }
    P.box('rv', 16, 232, 250, 36, { cls: s.r === null ? 'ghost' : 'wait', title: '변수 r (' + sim.T + ')', right: s.r === null ? '?' : s.r });
    P.box('ro', 274, 232, 390, 36, { cls: s.out === null ? 'ghost' : s.bad ? 'bad' : 'good', title: s.bad ? '오류' : '출력', right: s.out === null ? '?' : s.out });
    P.note(c.topic === 'str' ? '+가 여러 개면 왼쪽부터 하나씩 계산합니다. 그때마다 양쪽이 모두 숫자인지, 한쪽이 문자열인지에 따라 +의 뜻이 정해집니다. 괄호가 있으면 괄호 안을 먼저 계산합니다.' : '노란 칸은 지금 계산 결과의 타입이고, 파란 칸은 바뀌기 전의 타입입니다. 위에서 아래로(넓히기)는 자동으로 일어나고, 아래에서 위로(좁히기)는 (int)처럼 직접 적어야 하며 값을 잃을 수 있습니다. char와 float는 그림에서 뺐습니다.');
  },
  assume: '열여덟 가지 코드의 결과(오른쪽 식의 타입, 변수의 타입, 출력이나 예외)를 이 PC의 JDK 21에서 같은 코드를 실행한 결과와 대조했습니다. int r = 3.99가 컴파일 오류라는 것과 그 메시지도 같은 JDK의 컴파일러에 실제로 넣어 확인했습니다(메시지는 영어판 기준). 요약에 적은 7 / 0.0, (double) sum / count, "합: " + 1 + 2, n % 2 == 1, Math.round, Math.addExact의 동작도 함께 실행해 확인했습니다. 다루지 않은 것이 있습니다. float와 char와 short의 계산, byte b = 100처럼 범위 안의 정수 상수를 좁은 타입에 바로 넣을 수 있는 규칙, long을 double로 바꿀 때 큰 수에서 생기는 오차, 0.1 + 0.2 같은 실수 계산의 오차는 넣지 않았습니다. 7 / 2처럼 숫자만으로 된 식은 실제로는 컴파일러가 미리 계산해 두지만 결과는 같습니다.',
});
