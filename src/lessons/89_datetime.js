Lab.register({
  id: 'datetime', nav: '날짜와 시간', cat: '자바 언어', mode: 'step',
  title: '1월 31일에 한 달을 더하면 며칠이 되나',
  intro: 'java.time의 날짜와 시간 객체(LocalDate, ZonedDateTime 등)는 String처럼 내용이 바뀌지 않습니다. plusMonths 같은 메서드는 새 객체를 돌려주고, 달마다 날수가 달라서 "한 달 뒤"의 계산이 생각과 다를 때가 있습니다. 같은 순간이라도 시간대에 따라 다른 날짜와 시각으로 적히며, 두 시점 사이의 간격은 날짜 단위(Period)와 시간 단위(Duration)로 따로 잽니다.',
  terms: ['java.time(날짜와 시간 API)', '시간대와 UTC', 'Period와 Duration', '불변 객체'],
  controls: [
    { id: 'topic', label: '살펴볼 것', type: 'select', value: 'plus', options: [['plus', '날짜에 더하기'], ['zone', '같은 순간을 다른 시간대로 적기'], ['gap', '두 날짜 사이의 간격 재기']] },
    { id: 'add', label: '2024년 1월 31일에 더하는 방법', type: 'select', value: 'month', options: [['drop', 'plusMonths(1)을 부르고 돌려준 값을 받지 않음'], ['month', '한 달 더하기: plusMonths(1)'], ['twice', '한 달씩 두 번: plusMonths(1).plusMonths(1)'], ['two', '두 달을 한 번에: plusMonths(2)'], ['days', '30일 더하기: plusDays(30)']], show: function (c) { return c.topic === 'plus'; } },
    { id: 'zone', label: '서울의 2024년 1월 1일 0시 30분을 적을 시간대', type: 'select', value: 'ny', options: [['seoul', 'Asia/Seoul (서울)'], ['utc', 'UTC (세계 표준시)'], ['ny', 'America/New_York (뉴욕)']], show: function (c) { return c.topic === 'zone'; } },
    { id: 'gap', label: '1월 31일부터 3월 1일까지를 재는 방법', type: 'select', value: 'period', options: [['period', 'Period.between (날짜 간격)'], ['duration', 'Duration.between (시간 간격, 날짜에 0시를 붙여서)'], ['durdate', 'Duration.between에 날짜만 넘기기']], show: function (c) { return c.topic === 'gap'; } },
  ],
  presets: [
    { t: '처음 설정으로', q: '2024년 1월 31일에 plusMonths(1)로 한 달을 더하면 며칠이 되나', d: '1월 31일에 한 달을 더하면 2월의 마지막 날이 됩니다.', v: { topic: 'plus', add: 'month', zone: 'ny', gap: 'period' } },
    { t: '더하고 받지 않으면', q: 'plusMonths(1) 호출을 하고 돌려준 값을 받지 않으면', d: 'plusMonths를 불렀는데 날짜가 그대로입니다.', v: { topic: 'plus', add: 'drop', zone: 'ny', gap: 'period' } },
    { t: '한 달씩 두 번 더하기', q: 'plusMonths(1).plusMonths(1) 호출로 한 달씩 두 번 더하면', d: '3월 31일이 아니라 3월 29일이 됩니다.', v: { topic: 'plus', add: 'twice', zone: 'ny', gap: 'period' } },
    { t: '두 달을 한 번에 더하기', q: 'plusMonths(2) 호출로 두 달을 한 번에 더하면', d: '3월 31일이 됩니다. 한 달씩 두 번 더한 것과 다릅니다.', v: { topic: 'plus', add: 'two', zone: 'ny', gap: 'period' } },
    { t: '서울의 새해를 뉴욕 시각으로', q: '서울의 2024년 1월 1일 0시 30분을 뉴욕 시간대(America/New_York)로 적으면', d: '같은 순간인데 뉴욕은 아직 전날입니다.', v: { topic: 'zone', add: 'month', zone: 'ny', gap: 'period' } },
    { t: 'Period로 잰 간격', q: '1월 31일부터 3월 1일까지의 날짜 간격을 Period.between으로 재면', d: '30일이 지났는데 getDays()는 1입니다.', v: { topic: 'gap', add: 'month', zone: 'ny', gap: 'period' } },
    { t: '날짜만으로 Duration을 재면', q: '1월 31일부터 3월 1일까지를 Duration.between에 날짜만 넘겨서 재면', d: '컴파일은 되지만 실행 중에 예외가 납니다.', v: { topic: 'gap', add: 'month', zone: 'ny', gap: 'durdate' } },
  ],
  // 실제 실행으로 확인한 값: 서울의 2024-01-01 00:30과 같은 순간을 각 시간대로 적은 것
  Z: {
    seoul: { id: 'Asia/Seoul', name: '서울', zdt: '2024-01-01T00:30+09:00[Asia/Seoul]', date: '2024-01-01', time: '00:30', off: 'UTC보다 9시간 빠름' },
    utc: { id: 'UTC', name: 'UTC', zdt: '2023-12-31T15:30Z[UTC]', date: '2023-12-31', time: '15:30', off: '기준 시간대' },
    ny: { id: 'America/New_York', name: '뉴욕', zdt: '2023-12-31T10:30-05:00[America/New_York]', date: '2023-12-31', time: '10:30', off: '겨울엔 UTC보다 5시간 느림' },
  },
  ADD: { drop: 'd.plusMonths(1);', month: 'd = d.plusMonths(1);', twice: 'd = d.plusMonths(1).plusMonths(1);', two: 'd = d.plusMonths(2);', days: 'd = d.plusDays(30);' },
  code: function (c) {
    if (c.topic === 'plus') return 'LocalDate d = LocalDate.of(2024, 1, 31);\nLocalDate first = d;                 // 처음 객체를 기억해 둔다\n\n' + this.ADD[c.add] + (c.add === 'drop' ? '                     // 돌려준 값을 받지 않는다' : '') + '\n\nSystem.out.println(d);\nSystem.out.println(first);\nSystem.out.println(d == first);      // 같은 객체인가';
    if (c.topic === 'zone') return 'ZonedDateTime seoul = ZonedDateTime.of(2024, 1, 1, 0, 30, 0, 0, ZoneId.of("Asia/Seoul"));\nInstant moment = seoul.toInstant();          // 시간대와 상관없는 한 순간\nZonedDateTime there = moment.atZone(ZoneId.of("' + this.Z[c.zone].id + '"));\n\nSystem.out.println(there);\nSystem.out.println(there.toLocalDate());     // 날짜만\nSystem.out.println(there.toInstant());       // 가리키는 순간';
    var head = 'LocalDate a = LocalDate.of(2024, 1, 31);\nLocalDate b = LocalDate.of(2024, 3, 1);\n\n';
    if (c.gap === 'period') return head + 'Period p = Period.between(a, b);                     // 날짜 간격: 년, 월, 일\n\nSystem.out.println(p);\nSystem.out.println(p.getDays());                     // "일" 칸의 값\nSystem.out.println(ChronoUnit.DAYS.between(a, b));   // 전체 일수';
    return head + (c.gap === 'duration' ? 'Duration t = Duration.between(a.atStartOfDay(), b.atStartOfDay());   // 시간 간격: 초 단위' : 'Duration t = Duration.between(a, b);    // 날짜만 넘긴다') + '\n\nSystem.out.println(t);\nSystem.out.println(t.toHours());\nSystem.out.println(t.toDays());';
  },
  label: function (c) {
    if (c.topic === 'plus') return '1월 31일 · ' + { drop: 'plusMonths(1) 결과를 받지 않음', month: 'plusMonths(1)', twice: 'plusMonths(1) 두 번', two: 'plusMonths(2)', days: 'plusDays(30)' }[c.add];
    if (c.topic === 'zone') return '서울 1월 1일 0시 30분 → ' + this.Z[c.zone].id;
    return '1월 31일 ~ 3월 1일 · ' + { period: 'Period.between', duration: 'Duration.between (0시를 붙임)', durdate: 'Duration.between (날짜만)' }[c.gap];
  },
  columns: ['첫째 줄 출력', '둘째 줄 출력', '셋째 줄 출력'],
  simulate: function (c) {
    var ev = [], sum = [], ex = '';
    var st = { objs: [], s: 0, f: 0, seoul: false, inst: false, there: false, ab: false, got: '', ex: false, out: [] };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function print(what, line, more, k) { st.out.push(line); push('System.out.println(' + what + '): ' + line + ' 한 줄이 출력됩니다.' + (more ? ' ' + more : ''), k); }
    if (c.topic === 'plus') {
      st.objs.push('2024-01-31'); st.s = 1;
      push('LocalDate d = LocalDate.of(2024, 1, 31): 2024년 1월 31일을 나타내는 날짜 객체를 만들고 d가 가리킵니다. LocalDate는 시각과 시간대 없이 날짜만 담습니다.');
      st.f = 1;
      push('LocalDate first = d: first도 같은 객체를 가리킵니다. 처음 객체가 나중에 바뀌는지 보려고 둡니다.');
      if (c.add === 'drop') {
        st.objs.push('2024-02-29');
        push('d.plusMonths(1): 처음 객체는 그대로 두고, 한 달 뒤의 날짜를 담은 새 객체를 만들어 돌려줍니다. 그런데 돌려준 것을 받는 변수가 없어 그 결과는 어디에도 남지 않습니다.', 'bad');
      } else if (c.add === 'month') {
        st.objs.push('2024-02-29'); st.s = 2;
        push('d = d.plusMonths(1): 1월 31일의 한 달 뒤는 2월 31일이어야 하지만 그런 날은 없습니다. 이럴 때는 그 달의 마지막 날로 맞춥니다. 2024년 2월은 29일까지 있으므로 2024-02-29입니다. 이 새 객체를 d가 가리킵니다.');
      } else if (c.add === 'twice') {
        st.objs.push('2024-02-29'); st.s = 2;
        push('d.plusMonths(1): 먼저 한 달을 더합니다. 2월 31일은 없는 날이므로 2월의 마지막 날인 2024-02-29로 맞춰진 새 객체가 나옵니다.');
        st.objs.push('2024-03-29'); st.s = 3;
        push('.plusMonths(1): 방금 나온 2월 29일에 다시 한 달을 더합니다. 3월 29일은 있는 날이므로 그대로 2024-03-29입니다. 처음 날짜가 31일이었다는 것은 기억하지 않습니다. 이 객체를 d가 가리킵니다.', 'bad');
      } else if (c.add === 'two') {
        st.objs.push('2024-03-31'); st.s = 2;
        push('d = d.plusMonths(2): 1월 31일의 두 달 뒤는 3월 31일이고, 있는 날이므로 그대로 2024-03-31입니다. 2월을 거쳐 가지 않으므로 날짜가 줄어들지 않습니다. 이 새 객체를 d가 가리킵니다.', 'good');
      } else {
        st.objs.push('2024-03-01'); st.s = 2;
        push('d = d.plusDays(30): 달을 따지지 않고 날짜를 하루씩 30번 넘깁니다. 2024년 2월은 29일까지 있으므로 30일 뒤는 2024-03-01입니다. 이 새 객체를 d가 가리킵니다.');
      }
      var now = st.objs[st.s - 1], same = st.s === 1;
      print('d', now, same ? 'plusMonths를 불렀지만 d는 처음 객체를 그대로 가리킵니다.' : '', same ? 'bad' : '');
      print('first', '2024-01-31', '처음 객체의 내용은 바뀌지 않았습니다.');
      st.out.push(String(same));
      push('d == first: ' + (same ? '두 변수가 같은 객체를 가리키므로 true입니다.' : 'd는 새로 만들어진 객체를, first는 처음 객체를 가리키므로 false입니다.'));
      if (c.add === 'drop') { sum.push('java.time의 날짜 객체는 내용이 바뀌지 않습니다. plusMonths는 새 객체를 돌려주므로 d = d.plusMonths(1)처럼 받아야 결과를 쓸 수 있습니다.'); sum.push('String의 메서드와 같은 방식입니다. 돌려준 값을 받지 않아도 컴파일 오류나 예외가 없어 알아채기 어렵습니다.'); }
      if (c.add === 'month') { sum.push('더한 결과가 달력에 없는 날짜이면 예외를 내지 않고 그 달의 마지막 날로 맞춥니다.'); sum.push('그래서 달을 여러 번 나눠 더하면 결과가 달라질 수 있습니다.'); }
      if (c.add === 'twice') { sum.push('첫 번째 더하기에서 2월 29일로 줄어든 날짜가 다음 계산의 출발점이 됩니다. 두 달을 한 번에 더한 결과(2024-03-31)와 이틀 차이가 납니다.'); sum.push('매달 말일처럼 되풀이되는 날짜를 만들 때는 앞의 결과에 계속 더하지 말고, 처음 날짜에 plusMonths(1), plusMonths(2)처럼 달 수를 바꿔 더합니다.'); }
      if (c.add === 'two') { sum.push('두 달을 한 번에 더하면 2월을 거치지 않으므로 날짜가 줄어들지 않습니다. 한 달씩 두 번 더한 결과(2024-03-29)와 다릅니다.'); }
      if (c.add === 'days') { sum.push('"30일 뒤"와 "한 달 뒤"는 다릅니다. plusDays는 날수를 그대로 세고, plusMonths는 달력의 달을 넘깁니다. 한 달 뒤(2024-02-29)와 하루 차이가 납니다.'); }
    } else if (c.topic === 'zone') {
      var z = this.Z[c.zone];
      st.seoul = true;
      push('ZonedDateTime.of(2024, 1, 1, 0, 30, 0, 0, ZoneId.of("Asia/Seoul")): 서울 시간으로 2024년 1월 1일 0시 30분을 만듭니다. ZonedDateTime은 날짜, 시각, 시간대를 함께 담습니다.');
      st.inst = true;
      push('seoul.toInstant(): 시간대를 떼어 내고 "어느 한 순간"만 남긴 Instant를 얻습니다. Instant는 UTC 기준으로 적습니다. 서울은 UTC보다 9시간 빠르므로 이 순간은 2023-12-31T15:30:00Z입니다. 끝의 Z는 UTC라는 표시입니다.');
      st.there = true;
      push('moment.atZone(ZoneId.of("' + z.id + '")): 같은 순간을 ' + (c.zone === 'utc' ? 'UTC의' : z.name + '의') + ' 달력과 시계로 적습니다. ' + (c.zone === 'seoul' ? '처음에 만든 것과 같은 2024년 1월 1일 0시 30분입니다.' : c.zone === 'utc' ? 'UTC는 기준이 되는 시간대이므로 Instant에 적힌 그대로 2023년 12월 31일 15시 30분입니다.' : '이 날짜에 뉴욕은 UTC보다 5시간 느리므로 2023년 12월 31일 10시 30분입니다.'));
      print('there', z.zdt, '날짜와 시각 뒤에 UTC와의 차이' + (c.zone === 'utc' ? '(Z는 차이 없음)' : '') + '와 시간대 이름이 붙습니다.');
      print('there.toLocalDate()', z.date, c.zone === 'seoul' ? '서울의 날짜입니다.' : '같은 순간인데 서울의 날짜(2024-01-01)와 다릅니다. 연도까지 다릅니다.', c.zone === 'seoul' ? '' : 'bad');
      print('there.toInstant()', '2023-12-31T15:30:00Z', '어느 시간대로 적었든 가리키는 순간은 같습니다.', 'good');
      sum.push(c.zone === 'seoul' ? '같은 시간대로 되돌리면 처음 만든 값과 같습니다.' : c.zone === 'utc' ? 'UTC로 적으면 서울보다 9시간 이른 시각이 되어 날짜가 하루 앞섭니다. UTC로 저장한 시각을 그대로 화면에 보여 주면 날짜가 하루 어긋나 보이는 이유입니다.' : '같은 순간인데 서울은 2024년 1월 1일, 뉴욕은 2023년 12월 31일입니다. 시간대를 빼고 날짜만 저장하거나 비교하면 하루가 어긋날 수 있습니다.');
      sum.push('어느 한 순간을 저장하거나 주고받을 때는 Instant처럼 시간대와 상관없는 값을 쓰고, 사람에게 보여 줄 때 그 사람의 시간대로 바꿔 적습니다.');
    } else {
      st.ab = true;
      push('LocalDate a, b: 간격을 잴 두 날짜 2024-01-31과 2024-03-01을 만듭니다.');
      if (c.gap === 'period') {
        st.got = 'P1M1D';
        push('Period.between(a, b): 달력을 따라 "몇 년, 몇 달, 며칠"인지 셉니다. 1월 31일에 한 달을 더하면 2월 29일이고, 거기서 하루가 더 지나면 3월 1일입니다. 그래서 간격은 1개월 1일입니다.');
        print('p', 'P1M1D', 'P는 Period, 1M은 1개월, 1D는 1일이라는 표기입니다.');
        print('p.getDays()', '1', 'getDays()는 전체 일수가 아니라 "1개월 1일" 가운데 일 칸의 값만 돌려줍니다.', 'bad');
        print('ChronoUnit.DAYS.between(a, b)', '30', '두 날짜 사이의 전체 일수입니다. 며칠이 지났는지 알고 싶을 때는 이렇게 일 단위로 셉니다.', 'good');
        sum.push('Period는 달력의 년, 월, 일로 간격을 나타냅니다. getDays()는 일 칸의 값일 뿐이어서 "며칠 지났나"를 getDays()로 구하면 틀립니다.');
        sum.push('한 달의 길이는 달마다 다르므로 Period를 정해진 일수나 시간으로 바꿀 수 없습니다. 전체 일수는 ChronoUnit.DAYS.between으로 구합니다.');
      } else if (c.gap === 'duration') {
        push('a.atStartOfDay(), b.atStartOfDay(): 날짜에 0시 0분을 붙여 시각이 있는 값(LocalDateTime)으로 만듭니다. Duration은 초 단위로 재기 때문에 시각이 필요합니다.');
        st.got = 'PT720H';
        push('Duration.between(...): 두 시각 사이에 흐른 시간을 잽니다. 30일에 해당하는 720시간입니다. Duration 안에는 초 단위의 길이만 들어 있고, 달이나 년이라는 단위는 없습니다.');
        print('t', 'PT720H', 'PT는 시간 간격이라는 표시이고 720H는 720시간입니다.');
        print('t.toHours()', '720', '');
        print('t.toDays()', '30', 'Duration에서 하루는 언제나 24시간으로 계산합니다.', 'good');
        sum.push('Duration은 흐른 시간의 길이를 담습니다. Period의 "1개월 1일"처럼 달력에 따라 길이가 달라지는 단위가 없습니다.');
        sum.push('"한 달 뒤"처럼 달력으로 세는 간격은 Period로, "90분"이나 "30초"처럼 길이가 정해진 간격은 Duration으로 나타냅니다.');
      } else {
        st.ex = true; ex = 'Unsupported unit: Seconds';
        push('Duration.between(a, b): Duration은 초 단위로 간격을 재려고 합니다. 그런데 LocalDate에는 날짜만 있고 시각이 없어서 초 단위의 차이를 구할 수 없습니다. UnsupportedTemporalTypeException 예외가 발생합니다.', 'bad');
        push('예외 메시지는 "Unsupported unit: Seconds"입니다. LocalDate가 초 단위를 지원하지 않는다는 뜻입니다. 컴파일은 통과하므로 실행해 봐야 드러나는 실수이고, 예외로 멈췄기 때문에 아래의 출력 세 줄은 실행되지 않습니다.', 'bad');
        sum.push('Duration은 초 단위로 재므로 LocalDateTime, ZonedDateTime, Instant처럼 시각이 있는 값이 필요합니다. 날짜만 있는 LocalDate로는 잴 수 없습니다.');
        sum.push('날짜 사이의 간격은 Period.between이나 ChronoUnit.DAYS.between으로 구합니다.');
      }
    }
    var row = st.ex ? ['예외: UnsupportedTemporalTypeException', '(실행되지 않음)', '(실행되지 않음)'] : st.out.slice();
    return { events: ev, summary: sum, ex: ex, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, z = this.Z[c.zone];
    if (!s) { H.text(v, '실행을 누르면 한 줄씩 진행합니다.'); return; }
    if (c.topic === 'plus') {
      H.table(v, ['객체', '날짜', '가리키는 변수'], s.objs.map(function (o, i) { var by = []; if (s.s === i + 1) by.push('d'); if (s.f === i + 1) by.push('first'); return { cls: by.length ? '' : 'gone', cells: ['객체 ' + (i + 1), o, by.length ? by.join(', ') : '없음'] }; }), 'LocalDate 객체');
    } else if (c.topic === 'zone') {
      var rows = [];
      if (s.seoul) rows.push({ cells: ['seoul', 'ZonedDateTime', '2024-01-01T00:30+09:00[Asia/Seoul]'] });
      if (s.inst) rows.push({ cells: ['moment', 'Instant', { v: '2023-12-31T15:30:00Z', cls: 'good' }] });
      if (s.there) rows.push({ cells: ['there', 'ZonedDateTime', { v: z.zdt, cls: 'hot' }] });
      H.table(v, ['변수', '타입', '값'], rows, '같은 순간을 적은 세 가지 값');
    } else {
      var r2 = [];
      if (s.ab) { r2.push({ cells: ['a', 'LocalDate', '2024-01-31'] }); r2.push({ cells: ['b', 'LocalDate', '2024-03-01'] }); }
      if (s.got) r2.push({ cells: [c.gap === 'period' ? 'p' : 't', c.gap === 'period' ? 'Period' : 'Duration', { v: s.got, cls: 'hot' }] });
      if (s.ex) r2.push({ cells: ['t', 'Duration', { v: '예외로 만들어지지 않음', cls: 'bad' }] });
      H.table(v, ['변수', '타입', '값'], r2, '두 날짜와 그 사이의 간격');
    }
  },
  // 그림: 주제에 따라 (1) 변수와 날짜 객체, 그 아래 달력의 달 (2) 한 순간(Instant)과 그것을 세 시간대로 적은 값 (3) 두 날짜와 Period, Duration. 맨 아래는 출력 세 줄.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { objs: [], s: 0, f: 0, seoul: false, inst: false, there: false, ab: false, got: '', ex: false, out: [] }, Z = this.Z, y0;
    if (c.topic === 'plus') {
      P.size(680, 330); y0 = 238;
      P.region('V', 16, 16, 200, 150, '변수');
      P.region('O', 280, 16, 384, 150, 'LocalDate 객체');
      P.box('v_d', 30, 54, 172, 34, s.s ? { cls: 'wait', title: 'd', right: '참조' } : { cls: 'ghost', title: 'd', right: '아직 없음' });
      P.box('v_first', 30, 104, 172, 34, s.f ? { cls: 'wait', title: 'first', right: '참조' } : { cls: 'ghost', title: 'first', right: '아직 없음' });
      s.objs.forEach(function (o, i) {
        var n = (s.s === i + 1 ? 1 : 0) + (s.f === i + 1 ? 1 : 0);
        P.box('o' + (i + 1), 296, 48 + i * 38, 352, 30, { cls: n === 2 ? 'good' : n ? 'hot' : 'ghost', title: 'LocalDate 객체 ' + o, right: n ? '' : '가리키는 변수 없음' });
      });
      if (s.s) P.arrow('ar_d', 'v_d:r', 'o' + s.s + ':l' + (s.s === s.f ? ':0.3' : ''), { cls: 'hot' });
      if (s.f) P.arrow('ar_f', 'v_first:r', 'o1:l' + (s.s === s.f ? ':0.7' : ''), {});
      var cur = s.s ? s.objs[s.s - 1] : '', mon = cur ? +cur.slice(5, 7) : 0;
      [[1, '31일까지 있음'], [2, '29일까지 있음 (윤년)'], [3, '31일까지 있음']].forEach(function (m, i) {
        P.box('m' + m[0], 16 + i * 220, 180, 208, 46, { cls: mon === m[0] ? 'hot now' : 'plain', title: '2024년 ' + m[0] + '월', sub: m[1], right: mon === m[0] ? 'd: ' + (+cur.slice(8)) + '일' : '' });
      });
      P.note('위쪽은 변수가 가리키는 날짜 객체, 아래쪽은 d가 지금 달력의 어디에 있는지입니다.');
    } else if (c.topic === 'zone') {
      P.size(680, 300); y0 = 208;
      P.box('inst', 170, 20, 340, 50, s.inst ? { cls: 'good', title: 'Instant: 시간대와 상관없는 한 순간', sub: '2023-12-31T15:30:00Z', center: true } : { cls: 'ghost', title: 'Instant: 시간대와 상관없는 한 순간', sub: '아직 없음', center: true });
      ['ny', 'utc', 'seoul'].forEach(function (k, i) {
        var z = Z[k], on = k === 'seoul' ? s.seoul : s.there, sel = s.there && k === c.zone;
        P.box('z_' + k, 16 + i * 220, 118, 208, 66, on ? { cls: sel ? 'hot now' : 'wait', title: z.id, sub: [z.date + '  ' + z.time, z.off] } : { cls: 'ghost', title: z.id, sub: ['아직 적지 않음', z.off] });
      });
      if (s.inst) P.arrow('a_in', 'z_seoul:t', 'inst:r', { label: 'toInstant' });
      if (s.there) P.arrow('a_out', 'inst:b', 'z_' + c.zone + ':t', { cls: 'hot', label: 'atZone' });
      P.note('가운데 위의 Instant가 "어느 한 순간"이고, 아래 세 상자는 그 순간을 각 시간대의 달력과 시계로 적은 것입니다.');
    } else {
      P.size(680, 280); y0 = 188;
      P.box('a', 16, 30, 200, 40, s.ab ? { cls: 'wait', title: 'a = 2024-01-31', center: true } : { cls: 'ghost', title: 'a', center: true });
      P.box('b', 464, 30, 200, 40, s.ab ? { cls: 'wait', title: 'b = 2024-03-01', center: true } : { cls: 'ghost', title: 'b', center: true });
      if (s.ab) P.arrow('ab', 'a:r', 'b:l', { label: '이 사이의 간격' });
      var per = c.gap === 'period';
      P.box('per', 16, 100, 320, 64, { cls: per && s.got ? 'hot now' : per ? 'plain' : 'ghost', title: 'Period: 달력의 년, 월, 일로 센 간격', sub: per && s.got ? '1개월 1일  (P1M1D)' : per ? '아직 재지 않음' : '이 설정에서는 쓰지 않음' });
      P.box('dur', 344, 100, 320, 64, { cls: s.ex ? 'bad' : !per && s.got ? 'hot now' : !per ? 'plain' : 'ghost', title: 'Duration: 초 단위로 잰 시간의 길이', sub: s.ex ? '날짜에는 시각이 없어 잴 수 없음 (예외)' : !per && s.got ? '720시간  (PT720H)' : !per ? '아직 재지 않음' : '이 설정에서는 쓰지 않음' });
      P.note('Period는 달력을 따라 "몇 달 며칠"로 세고, Duration은 흐른 시간의 길이를 잽니다. Duration을 재려면 날짜만으로는 안 되고 시각이 있어야 합니다.');
    }
    ['첫째 줄', '둘째 줄', '셋째 줄'].forEach(function (n, i) {
      P.box('out' + i, 16, y0 + i * 30, 648, 26, s.out.length > i ? { cls: 'plain', title: '출력 ' + n, right: s.out[i] } : { cls: 'ghost', title: '출력 ' + n, right: s.ex ? '실행되지 않음' : '아직 없음' });
    });
  },
  assume: '135가지 조합(주제마다 설정을 하나만 쓰므로 서로 다른 경우는 열한 가지)의 출력을 검증 환경의 JDK 21에서 같은 코드를 실행한 결과와 대조했습니다. 코드는 고정된 날짜와 이름으로 지정한 시간대만 쓰므로 오늘 날짜나 PC의 시간대 설정과 상관없이 같은 결과가 나오며, PC의 기본 시간대를 다른 값으로 바꿔 실행해도 출력이 같음을 확인했습니다. 시간대별 시각은 JDK에 들어 있는 시간대 자료를 따릅니다. 뉴욕이 UTC보다 5시간 느린 것은 이 날짜(겨울) 기준이며, 서머타임 기간에는 4시간입니다. 서머타임이 시작하거나 끝나는 날의 계산은 이 모형에서 다루지 않습니다. 윤년이 아닌 해의 결과(예: 2월 28일)는 실행해 대조한 범위에 들어 있지 않습니다.',
});
