Lab.register({
  id: 'datetime', nav: 'Dates and times', cat: 'Java language', mode: 'step',
  title: 'What date do you get when you add one month to January 31?',
  intro: 'Like a String, the date and time objects of java.time (LocalDate, ZonedDateTime, and so on) do not change their contents. A method such as plusMonths returns a new object, and because the months have different numbers of days, the result of "one month later" is sometimes not what you expect. The same instant is written as a different date and time in each time zone, and the amount of time between two points in time is measured separately in date-based units (Period) and in time-based units (Duration).',
  terms: ['java.time (Date-Time API)', 'Time zone and UTC', 'Period and Duration', 'Immutable object'],
  controls: [
    { id: 'topic', label: 'What to look at', type: 'select', value: 'plus', options: [['plus', 'Adding to a date'], ['zone', 'Writing the same instant in another time zone'], ['gap', 'Measuring the amount of time between two dates']] },
    { id: 'add', label: 'How to add to January 31, 2024', type: 'select', value: 'month', options: [['drop', 'Call plusMonths(1) and ignore the return value'], ['month', 'Add one month: plusMonths(1)'], ['twice', 'One month, twice: plusMonths(1).plusMonths(1)'], ['two', 'Two months at once: plusMonths(2)'], ['days', 'Add 30 days: plusDays(30)']], show: function (c) { return c.topic === 'plus'; } },
    { id: 'zone', label: 'Time zone in which to write 00:30 on January 1, 2024 in Seoul', type: 'select', value: 'ny', options: [['seoul', 'Asia/Seoul (Seoul)'], ['utc', 'UTC (Coordinated Universal Time)'], ['ny', 'America/New_York (New York)']], show: function (c) { return c.topic === 'zone'; } },
    { id: 'gap', label: 'How to measure from January 31 to March 1', type: 'select', value: 'period', options: [['period', 'Period.between (date-based amount)'], ['duration', 'Duration.between (time-based amount, with 00:00 added to the dates)'], ['durdate', 'Passing only dates to Duration.between']], show: function (c) { return c.topic === 'gap'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'What date do you get when you add one month to January 31, 2024 with plusMonths(1)?', d: 'Adding one month to January 31 gives the last day of February.', v: { topic: 'plus', add: 'month', zone: 'ny', gap: 'period' } },
    { t: 'Adding and ignoring the return value', q: 'What if you call plusMonths(1) and ignore the return value?', d: 'plusMonths is called, but the date is unchanged.', v: { topic: 'plus', add: 'drop', zone: 'ny', gap: 'period' } },
    { t: 'Adding one month, twice', q: 'What if you add one month twice with plusMonths(1).plusMonths(1)?', d: 'The result is March 29, not March 31.', v: { topic: 'plus', add: 'twice', zone: 'ny', gap: 'period' } },
    { t: 'Adding two months at once', q: 'What if you add two months at once with plusMonths(2)?', d: 'The result is March 31. This differs from adding one month twice.', v: { topic: 'plus', add: 'two', zone: 'ny', gap: 'period' } },
    { t: 'New Year in Seoul, in New York time', q: 'What if you write 00:30 on January 1, 2024 in Seoul in the America/New_York (New York) time zone?', d: 'It is the same instant, but in New York it is still the previous day.', v: { topic: 'zone', add: 'month', zone: 'ny', gap: 'period' } },
    { t: 'An amount measured with Period', q: 'What if you measure from January 31 to March 1 with Period.between (date-based amount)?', d: '30 days have passed, but getDays() is 1.', v: { topic: 'gap', add: 'month', zone: 'ny', gap: 'period' } },
    { t: 'Measuring a Duration from dates only', q: 'What if you pass only dates to Duration.between to measure from January 31 to March 1?', d: 'The code compiles, but an exception is thrown at run time.', v: { topic: 'gap', add: 'month', zone: 'ny', gap: 'durdate' } },
  ],
  // Values confirmed by real execution: the same instant as 2024-01-01 00:30 in Seoul, written in each time zone
  Z: {
    seoul: { id: 'Asia/Seoul', name: 'Seoul', zdt: '2024-01-01T00:30+09:00[Asia/Seoul]', date: '2024-01-01', time: '00:30', off: '9 hours ahead of UTC' },
    utc: { id: 'UTC', name: 'UTC', zdt: '2023-12-31T15:30Z[UTC]', date: '2023-12-31', time: '15:30', off: 'the reference time zone' },
    ny: { id: 'America/New_York', name: 'New York', zdt: '2023-12-31T10:30-05:00[America/New_York]', date: '2023-12-31', time: '10:30', off: 'Winter: 5 hrs behind UTC' },
  },
  ADD: { drop: 'd.plusMonths(1);', month: 'd = d.plusMonths(1);', twice: 'd = d.plusMonths(1).plusMonths(1);', two: 'd = d.plusMonths(2);', days: 'd = d.plusDays(30);' },
  code: function (c) {
    if (c.topic === 'plus') return 'LocalDate d = LocalDate.of(2024, 1, 31);\nLocalDate first = d;                 // remember the first object\n\n' + this.ADD[c.add] + (c.add === 'drop' ? '                     // the return value is ignored' : '') + '\n\nSystem.out.println(d);\nSystem.out.println(first);\nSystem.out.println(d == first);      // same object?';
    if (c.topic === 'zone') return 'ZonedDateTime seoul = ZonedDateTime.of(2024, 1, 1, 0, 30, 0, 0, ZoneId.of("Asia/Seoul"));\nInstant moment = seoul.toInstant();          // a single point in time, independent of any time zone\nZonedDateTime there = moment.atZone(ZoneId.of("' + this.Z[c.zone].id + '"));\n\nSystem.out.println(there);\nSystem.out.println(there.toLocalDate());     // the date only\nSystem.out.println(there.toInstant());       // the instant it represents';
    var head = 'LocalDate a = LocalDate.of(2024, 1, 31);\nLocalDate b = LocalDate.of(2024, 3, 1);\n\n';
    if (c.gap === 'period') return head + 'Period p = Period.between(a, b);                     // date-based amount: years, months, days\n\nSystem.out.println(p);\nSystem.out.println(p.getDays());                     // the value of the "days" part\nSystem.out.println(ChronoUnit.DAYS.between(a, b));   // total number of days';
    return head + (c.gap === 'duration' ? 'Duration t = Duration.between(a.atStartOfDay(), b.atStartOfDay());   // time-based amount: in seconds' : 'Duration t = Duration.between(a, b);    // only dates are passed') + '\n\nSystem.out.println(t);\nSystem.out.println(t.toHours());\nSystem.out.println(t.toDays());';
  },
  label: function (c) {
    if (c.topic === 'plus') return 'January 31 · ' + { drop: 'plusMonths(1), return value ignored', month: 'plusMonths(1)', twice: 'plusMonths(1) twice', two: 'plusMonths(2)', days: 'plusDays(30)' }[c.add];
    if (c.topic === 'zone') return 'Seoul, January 1, 00:30 → ' + this.Z[c.zone].id;
    return 'January 31 to March 1 · ' + { period: 'Period.between', duration: 'Duration.between (00:00 added)', durdate: 'Duration.between (dates only)' }[c.gap];
  },
  columns: ['First line of output', 'Second line of output', 'Third line of output'],
  simulate: function (c) {
    var ev = [], sum = [], ex = '';
    var st = { objs: [], s: 0, f: 0, seoul: false, inst: false, there: false, ab: false, got: '', ex: false, out: [] };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function print(what, line, more, k) { st.out.push(line); push('System.out.println(' + what + '): The line ' + line + ' is printed.' + (more ? ' ' + more : ''), k); }
    if (c.topic === 'plus') {
      st.objs.push('2024-01-31'); st.s = 1;
      push('LocalDate d = LocalDate.of(2024, 1, 31): A date object that represents January 31, 2024 is created, and d refers to it. A LocalDate holds only a date, with no time and no time zone.');
      st.f = 1;
      push('LocalDate first = d: first refers to the same object as well. first is kept so that you can see later whether the first object changes.');
      if (c.add === 'drop') {
        st.objs.push('2024-02-29');
        push('d.plusMonths(1): The first object is left as it is, and a new object that holds the date one month later is created and returned. But there is no variable to receive the return value, so the result is not kept anywhere.', 'bad');
      } else if (c.add === 'month') {
        st.objs.push('2024-02-29'); st.s = 2;
        push('d = d.plusMonths(1): One month after January 31 should be February 31, but there is no such day. In this case the date is adjusted to the last day of that month. February 2024 has 29 days, so the result is 2024-02-29. d refers to this new object.');
      } else if (c.add === 'twice') {
        st.objs.push('2024-02-29'); st.s = 2;
        push('d.plusMonths(1): First, one month is added. February 31 does not exist, so the result is a new object adjusted to the last day of February, 2024-02-29.');
        st.objs.push('2024-03-29'); st.s = 3;
        push('.plusMonths(1): One more month is added to the February 29 that was just produced. March 29 exists, so the result is 2024-03-29 as it is. The fact that the original date was the 31st is not remembered. d refers to this object.', 'bad');
      } else if (c.add === 'two') {
        st.objs.push('2024-03-31'); st.s = 2;
        push('d = d.plusMonths(2): Two months after January 31 is March 31, which exists, so the result is 2024-03-31 as it is. The calculation does not pass through February, so the day of the month is not reduced. d refers to this new object.', 'good');
      } else {
        st.objs.push('2024-03-01'); st.s = 2;
        push('d = d.plusDays(30): The date is moved forward one day at a time, 30 times, without regard to months. February 2024 has 29 days, so 30 days later is 2024-03-01. d refers to this new object.');
      }
      var now = st.objs[st.s - 1], same = st.s === 1;
      print('d', now, same ? 'plusMonths was called, but d still refers to the first object.' : '', same ? 'bad' : '');
      print('first', '2024-01-31', 'The contents of the first object did not change.');
      st.out.push(String(same));
      push('d == first: ' + (same ? 'The two variables refer to the same object, so the result is true.' : 'd refers to the newly created object and first refers to the first object, so the result is false.'));
      if (c.add === 'drop') { sum.push('The date objects of java.time do not change their contents. plusMonths returns a new object, so you have to assign the return value, as in d = d.plusMonths(1), to use the result.'); sum.push('This works the same way as the methods of String. Ignoring the return value causes no compile-time error and no exception, so the mistake is hard to notice.'); }
      if (c.add === 'month') { sum.push('When the result of an addition is a date that is not in the calendar, no exception is thrown. The date is adjusted to the last day of that month.'); sum.push('So adding months in several separate steps can give a different result.'); }
      if (c.add === 'twice') { sum.push('The date that was reduced to February 29 by the first addition becomes the starting point of the next calculation. The result is two days away from the result of adding two months at once (2024-03-31).'); sum.push('To produce a recurring date such as the last day of every month, do not keep adding to the previous result. Add to the original date with a different number of months each time, as in plusMonths(1), plusMonths(2).'); }
      if (c.add === 'two') { sum.push('Adding two months at once does not pass through February, so the day of the month is not reduced. This differs from the result of adding one month twice (2024-03-29).'); }
      if (c.add === 'days') { sum.push('"30 days later" and "one month later" are different. plusDays counts the number of days as given, and plusMonths moves to another month of the calendar. The result is one day away from one month later (2024-02-29).'); }
    } else if (c.topic === 'zone') {
      var z = this.Z[c.zone];
      st.seoul = true;
      push('ZonedDateTime.of(2024, 1, 1, 0, 30, 0, 0, ZoneId.of("Asia/Seoul")): This creates 00:30 on January 1, 2024 in Seoul time. A ZonedDateTime holds a date, a time, and a time zone together.');
      st.inst = true;
      push('seoul.toInstant(): This takes away the time zone and gives an Instant, which keeps only "a single point in time". An Instant is written in UTC. Seoul is 9 hours ahead of UTC, so this instant is 2023-12-31T15:30:00Z. The Z at the end indicates UTC.');
      st.there = true;
      push('moment.atZone(ZoneId.of("' + z.id + '")): This writes the same instant with the calendar and clock of ' + (c.zone === 'utc' ? 'UTC' : z.name + '') + '. ' + (c.zone === 'seoul' ? 'It is 00:30 on January 1, 2024, the same as the value created at the start.' : c.zone === 'utc' ? 'UTC is the reference time zone, so it is 15:30 on December 31, 2023, exactly as written in the Instant.' : 'On this date New York is 5 hours behind UTC, so it is 10:30 on December 31, 2023.'));
      print('there', z.zdt, 'The date and time are followed by the offset from UTC' + (c.zone === 'utc' ? ' (Z means no offset)' : '') + ' and the time zone ID.');
      print('there.toLocalDate()', z.date, c.zone === 'seoul' ? 'This is the date in Seoul.' : 'It is the same instant, but the date differs from the date in Seoul (2024-01-01). Even the year is different.', c.zone === 'seoul' ? '' : 'bad');
      print('there.toInstant()', '2023-12-31T15:30:00Z', 'Whichever time zone it is written in, the instant it represents is the same.', 'good');
      sum.push(c.zone === 'seoul' ? 'Converting back to the same time zone gives the value that was created at the start.' : c.zone === 'utc' ? 'Written in UTC, the time is 9 hours earlier than in Seoul, and the date is one day earlier. This is why the date looks one day off when a time stored in UTC is shown on the screen as it is.' : 'It is the same instant, but it is January 1, 2024 in Seoul and December 31, 2023 in New York. If you store or compare only the date, without the time zone, the date can be off by one day.');
      sum.push('To store or exchange a single point in time, use a value that does not depend on a time zone, such as an Instant, and convert it to the time zone of the person when you show it to that person.');
    } else {
      st.ab = true;
      push('LocalDate a, b: The two dates to measure between, 2024-01-31 and 2024-03-01, are created.');
      if (c.gap === 'period') {
        st.got = 'P1M1D';
        push('Period.between(a, b): This counts "how many years, months, and days" along the calendar. Adding one month to January 31 gives February 29, and one more day after that is March 1. So the amount is 1 month and 1 day.');
        print('p', 'P1M1D', 'In this notation, P stands for Period, 1M for 1 month, and 1D for 1 day.');
        print('p.getDays()', '1', 'getDays() does not return the total number of days. It returns only the value of the days part of "1 month and 1 day".', 'bad');
        print('ChronoUnit.DAYS.between(a, b)', '30', 'This is the total number of days between the two dates. When you want to know how many days have passed, count in days like this.', 'good');
        sum.push('A Period expresses an amount of time in calendar years, months, and days. getDays() is only the value of the days part, so using getDays() to find "how many days have passed" gives the wrong answer.');
        sum.push('The length of a month differs from month to month, so a Period cannot be converted to a fixed number of days or hours. Get the total number of days with ChronoUnit.DAYS.between.');
      } else if (c.gap === 'duration') {
        push('a.atStartOfDay(), b.atStartOfDay(): This adds the time 00:00 to each date to make a value that has a time (a LocalDateTime). A Duration measures in seconds, so it needs a time.');
        st.got = 'PT720H';
        push('Duration.between(...): This measures the time that elapsed between the two date-times. It is 720 hours, which corresponds to 30 days. A Duration holds only a length in seconds. It has no unit such as a month or a year.');
        print('t', 'PT720H', 'PT marks a time-based amount, and 720H is 720 hours.');
        print('t.toHours()', '720', '');
        print('t.toDays()', '30', 'In a Duration, a day is always calculated as 24 hours.', 'good');
        sum.push('A Duration holds the length of the elapsed time. It has no unit whose length depends on the calendar, as "1 month and 1 day" in a Period does.');
        sum.push('Express an amount that is counted by the calendar, such as "one month later", with a Period, and an amount of fixed length, such as "90 minutes" or "30 seconds", with a Duration.');
      } else {
        st.ex = true; ex = 'Unsupported unit: Seconds';
        push('Duration.between(a, b): Duration tries to measure the amount in seconds. But a LocalDate has only a date and no time, so the difference in seconds cannot be obtained. An UnsupportedTemporalTypeException is thrown.', 'bad');
        push('The exception message is "Unsupported unit: Seconds". It means that LocalDate does not support the seconds unit. The code compiles, so this is a mistake that shows up only when you run it, and because execution stopped with the exception, the three output lines below are not executed.', 'bad');
        sum.push('A Duration measures in seconds, so it needs values that have a time, such as LocalDateTime, ZonedDateTime, or Instant. It cannot be measured from LocalDate values, which have only a date.');
        sum.push('Get the amount of time between dates with Period.between or ChronoUnit.DAYS.between.');
      }
    }
    var row = st.ex ? ['Exception: UnsupportedTemporalTypeException', '(not executed)', '(not executed)'] : st.out.slice();
    return { events: ev, summary: sum, ex: ex, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, z = this.Z[c.zone];
    if (!s) { H.text(v, 'Click Run to go through the code one line at a time.'); return; }
    if (c.topic === 'plus') {
      H.table(v, ['Object', 'Date', 'Referenced by'], s.objs.map(function (o, i) { var by = []; if (s.s === i + 1) by.push('d'); if (s.f === i + 1) by.push('first'); return { cls: by.length ? '' : 'gone', cells: ['Object ' + (i + 1), o, by.length ? by.join(', ') : 'none'] }; }), 'LocalDate objects');
    } else if (c.topic === 'zone') {
      var rows = [];
      if (s.seoul) rows.push({ cells: ['seoul', 'ZonedDateTime', '2024-01-01T00:30+09:00[Asia/Seoul]'] });
      if (s.inst) rows.push({ cells: ['moment', 'Instant', { v: '2023-12-31T15:30:00Z', cls: 'good' }] });
      if (s.there) rows.push({ cells: ['there', 'ZonedDateTime', { v: z.zdt, cls: 'hot' }] });
      H.table(v, ['Variable', 'Type', 'Value'], rows, 'Three values that write the same instant');
    } else {
      var r2 = [];
      if (s.ab) { r2.push({ cells: ['a', 'LocalDate', '2024-01-31'] }); r2.push({ cells: ['b', 'LocalDate', '2024-03-01'] }); }
      if (s.got) r2.push({ cells: [c.gap === 'period' ? 'p' : 't', c.gap === 'period' ? 'Period' : 'Duration', { v: s.got, cls: 'hot' }] });
      if (s.ex) r2.push({ cells: ['t', 'Duration', { v: 'not created because of the exception', cls: 'bad' }] });
      H.table(v, ['Variable', 'Type', 'Value'], r2, 'The two dates and the amount of time between them');
    }
  },
  // Diagram: depending on the topic, (1) the variables and date objects, with the months of the calendar below them (2) one instant (Instant) and the values that write it in three time zones (3) two dates with Period and Duration. The three output lines are at the bottom.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { objs: [], s: 0, f: 0, seoul: false, inst: false, there: false, ab: false, got: '', ex: false, out: [] }, Z = this.Z, y0;
    if (c.topic === 'plus') {
      P.size(680, 330); y0 = 238;
      P.region('V', 16, 16, 200, 150, 'Variables');
      P.region('O', 280, 16, 384, 150, 'LocalDate objects');
      P.box('v_d', 30, 54, 172, 34, s.s ? { cls: 'wait', title: 'd', right: 'reference' } : { cls: 'ghost', title: 'd', right: 'not declared' });
      P.box('v_first', 30, 104, 172, 34, s.f ? { cls: 'wait', title: 'first', right: 'reference' } : { cls: 'ghost', title: 'first', right: 'not declared' });
      s.objs.forEach(function (o, i) {
        var n = (s.s === i + 1 ? 1 : 0) + (s.f === i + 1 ? 1 : 0);
        P.box('o' + (i + 1), 296, 48 + i * 38, 352, 30, { cls: n === 2 ? 'good' : n ? 'hot' : 'ghost', title: 'LocalDate object ' + o, right: n ? '' : 'no references' });
      });
      if (s.s) P.arrow('ar_d', 'v_d:r', 'o' + s.s + ':l' + (s.s === s.f ? ':0.3' : ''), { cls: 'hot' });
      if (s.f) P.arrow('ar_f', 'v_first:r', 'o1:l' + (s.s === s.f ? ':0.7' : ''), {});
      var cur = s.s ? s.objs[s.s - 1] : '', mon = cur ? +cur.slice(5, 7) : 0;
      [[1, '31 days'], [2, '29 days (leap year)'], [3, '31 days']].forEach(function (m, i) {
        P.box('m' + m[0], 16 + i * 220, 180, 208, 46, { cls: mon === m[0] ? 'hot now' : 'plain', title: '2024-0' + m[0] + '', sub: m[1], right: mon === m[0] ? 'd: ' + (+cur.slice(8)) + '' : '' });
      });
      P.note('The top part shows the date object that each variable refers to, and the bottom part shows where d is in the calendar now.');
    } else if (c.topic === 'zone') {
      P.size(680, 300); y0 = 208;
      P.box('inst', 170, 20, 340, 50, s.inst ? { cls: 'good', title: 'Instant: a point in time, no time zone', sub: '2023-12-31T15:30:00Z', center: true } : { cls: 'ghost', title: 'Instant: a point in time, no time zone', sub: 'not created yet', center: true });
      ['ny', 'utc', 'seoul'].forEach(function (k, i) {
        var z = Z[k], on = k === 'seoul' ? s.seoul : s.there, sel = s.there && k === c.zone;
        P.box('z_' + k, 16 + i * 220, 118, 208, 66, on ? { cls: sel ? 'hot now' : 'wait', title: z.id, sub: [z.date + '  ' + z.time, z.off] } : { cls: 'ghost', title: z.id, sub: ['not written yet', z.off] });
      });
      if (s.inst) P.arrow('a_in', 'z_seoul:t', 'inst:r', { label: 'toInstant' });
      if (s.there) P.arrow('a_out', 'inst:b', 'z_' + c.zone + ':t', { cls: 'hot', label: 'atZone' });
      P.note('The Instant at the top center is "a single point in time", and the three boxes below show that instant written with the calendar and clock of each time zone.');
    } else {
      P.size(680, 280); y0 = 188;
      P.box('a', 16, 30, 200, 40, s.ab ? { cls: 'wait', title: 'a = 2024-01-31', center: true } : { cls: 'ghost', title: 'a', center: true });
      P.box('b', 464, 30, 200, 40, s.ab ? { cls: 'wait', title: 'b = 2024-03-01', center: true } : { cls: 'ghost', title: 'b', center: true });
      if (s.ab) P.arrow('ab', 'a:r', 'b:l', { label: 'the time between them' });
      var per = c.gap === 'period';
      P.box('per', 16, 100, 320, 64, { cls: per && s.got ? 'hot now' : per ? 'plain' : 'ghost', title: 'Period: calendar years, months, days', sub: per && s.got ? '1 month 1 day  (P1M1D)' : per ? 'not measured yet' : 'not used with this setting' });
      P.box('dur', 344, 100, 320, 64, { cls: s.ex ? 'bad' : !per && s.got ? 'hot now' : !per ? 'plain' : 'ghost', title: 'Duration: a length of time in seconds', sub: s.ex ? 'a date has no time (exception)' : !per && s.got ? '720 hours  (PT720H)' : !per ? 'not measured yet' : 'not used with this setting' });
      P.note('A Period counts "how many months and days" along the calendar, and a Duration measures the length of the elapsed time. Dates alone are not enough to measure a Duration. The values must have a time.');
    }
    ['line 1', 'line 2', 'line 3'].forEach(function (n, i) {
      P.box('out' + i, 16, y0 + i * 30, 648, 26, s.out.length > i ? { cls: 'plain', title: 'Output ' + n, right: s.out[i] } : { cls: 'ghost', title: 'Output ' + n, right: s.ex ? 'not executed' : 'none yet' });
    });
  },
  assume: 'The output of the 135 combinations (11 distinct cases, because each topic uses only one of the settings) was checked against the results of running the same code on JDK 21 on this PC. The code uses only fixed dates and time zones specified by name, so it gives the same result regardless of the current date or the time zone setting of the PC, and running it with the default time zone of the PC changed to other values confirmed that the output is the same. The time in each time zone follows the time zone data included in the JDK. New York being 5 hours behind UTC applies to this date (winter), and the difference is 4 hours during daylight saving time. Calculations for the days on which daylight saving time starts or ends are not covered by this model. Results for years that are not leap years (for example, February 28) are not within the range that was run and checked.',
});
