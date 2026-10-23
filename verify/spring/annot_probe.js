// "애너테이션" 실습(annot)의 조합을 실제로 컴파일하고 실행한다. 결과: verify/spring/annot_probe.out.txt
// 사용: node verify/spring/annot_probe.js
//
// 화면의 코드는 실습 파일의 parts(c)에서 그대로 가져온다. 조합마다 임시 폴더에
//   - Main.java = import 줄 + 화면의 선언 부분 + "public class Main { main(...) { 화면의 main 부분 } }"
//   - test 주제는 CalcTest.java = 화면의 코드 그대로, 그리고 이 프로브가 더한 RunTests.java(JUnit Platform Launcher로 CalcTest를 실행)
// 를 만들고 JDK 21 javac(영어 메시지)로 컴파일한다. 성공하면
//   (1) javap -v -p로 만들어진 class 파일에서 멤버마다 RuntimeVisibleAnnotations / RuntimeInvisibleAnnotations에 적힌 애너테이션을 읽고
//   (2) 별도의 java 프로세스로 실행해 표준 출력을 얻는다(스프링 로그가 섞이지 않게 logback은 클래스패스에서 뺀다).
// tx 주제는 같은 소스에 이 프로브의 FactsTx.java를 더해 한 번 더 실행한다(자동 프록시 생성기 빈, 프록시인가, 스프링이 읽은 트랜잭션 속성, 트랜잭션 매니저에 단 리스너로 센 시작·커밋·롤백 횟수).
// 끝에 FACT 줄: 표준 애너테이션의 실제 선언(@Retention, @Target), Integer(int)의 @Deprecated 값, Runnable·Comparator의 @FunctionalInterface.
//
// 출력 줄: <조합 키> => code=<화면 코드의 해시>|comp=OK|ERR|diag=<줄 번호:종류:그 줄의 글:메시지 ;; ...>|annos=<클래스.멤버:V|I:애너테이션 ...>|out=<출력, 줄바꿈은 \n>|exit=<종료 코드>[|tx=...]
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const { load } = require('../model_rows.js');
const lesson = load('annot');
const JDK = 'E:/dev/jdk-21.0.12.1+1/bin';
const LIBS = ['E:/dev/java-interview-lab/verify/spring/libs', 'E:/dev/java-interview-lab/verify/spring/libs-extra'];
const jars = LIBS.flatMap(d => fs.readdirSync(d).filter(f => f.endsWith('.jar')).map(f => d + '/' + f));
const CP_ALL = jars.join(';'), CP_QUIET = jars.filter(j => !/logback-/.test(path.basename(j))).join(';');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lab-annot-'));

const IMPORTS = {
  tx: ['java.lang.reflect.Method', 'javax.sql.DataSource', 'org.springframework.context.annotation.AnnotationConfigApplicationContext', 'org.springframework.context.annotation.Bean', 'org.springframework.context.annotation.Configuration', 'org.springframework.jdbc.datasource.DataSourceTransactionManager', 'org.springframework.jdbc.datasource.DriverManagerDataSource', 'org.springframework.transaction.PlatformTransactionManager', 'org.springframework.transaction.annotation.EnableTransactionManagement', 'org.springframework.transaction.annotation.Transactional', 'org.springframework.transaction.support.TransactionSynchronizationManager'],
  retention: ['java.lang.annotation.Annotation', 'java.lang.reflect.Method', 'java.util.ArrayList', 'java.util.List', 'org.springframework.lang.Contract', 'org.springframework.transaction.annotation.Transactional'],
  custom: ['java.lang.annotation.ElementType', 'java.lang.annotation.Retention', 'java.lang.annotation.RetentionPolicy', 'java.lang.annotation.Target', 'java.lang.reflect.Method'],
  override: [], deprecated: [], funcif: [],
};
const base = {}; lesson.controls.forEach(d => { base[d.id] = d.value; });
const AXES = { tx: { txAnn: [true, false], enable: [true, false], get: ['bean', 'new'] }, test: { sub: [false, true] }, retention: { misplace: [false, true] }, override: { typo: [true, false], ov: [false, true] }, deprecated: { old: [true, false] }, funcif: { fi: [true, false], two: [false, true] }, custom: { ret: ['none', 'RUNTIME'] } };
function cases() {
  const out = [];
  for (const [topic, ax] of Object.entries(AXES)) {
    let list = [{}];
    for (const [k, vs] of Object.entries(ax)) list = list.flatMap(o => vs.map(v => Object.assign({}, o, { [k]: v })));
    list.forEach(o => out.push(Object.assign({}, base, { topic }, o)));
  }
  return out;
}
const keyOf = c => c.topic + '|' + Object.keys(AXES[c.topic]).map(k => k + '=' + c[k]).join(',');
const run = (cmd, args, opts) => cp.spawnSync(cmd, args, Object.assign({ encoding: 'utf8', maxBuffer: 64 << 20 }, opts || {}));
const clean = s => String(s).replace(/\r/g, '').replace(/\|/g, '¦').replace(/\n/g, '\\n');

const RUN_TESTS = `import org.junit.platform.launcher.Launcher;
import org.junit.platform.launcher.LauncherDiscoveryRequest;
import org.junit.platform.launcher.core.LauncherDiscoveryRequestBuilder;
import org.junit.platform.launcher.core.LauncherFactory;
import org.junit.platform.launcher.listeners.SummaryGeneratingListener;
import org.junit.platform.launcher.listeners.TestExecutionSummary;
import org.junit.platform.engine.discovery.DiscoverySelectors;

public class RunTests {
    public static void main(String[] args) {
        LauncherDiscoveryRequest req = LauncherDiscoveryRequestBuilder.request().selectors(DiscoverySelectors.selectClass("CalcTest")).build();
        Launcher launcher = LauncherFactory.create();
        SummaryGeneratingListener l = new SummaryGeneratingListener();
        launcher.execute(req, l);
        TestExecutionSummary s = l.getSummary();
        System.out.println("#JUNIT found=" + s.getTestsFoundCount() + " started=" + s.getTestsStartedCount() + " succeeded=" + s.getTestsSucceededCount() + " failed=" + s.getTestsFailedCount());
    }
}
`;
const FACTS_TX = `import org.springframework.aop.support.AopUtils;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionExecution;
import org.springframework.transaction.TransactionExecutionListener;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;

public class FactsTx {
    public static void main(String[] args) throws Exception {
        try (AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
            String apc = ctx.containsBean("org.springframework.aop.config.internalAutoProxyCreator") ? ctx.getBean("org.springframework.aop.config.internalAutoProxyCreator").getClass().getSimpleName() : "-";
            OrderService bean = ctx.getBean(OrderService.class);
            Object attr = new AnnotationTransactionAttributeSource().getTransactionAttribute(OrderService.class.getMethod("order"), OrderService.class);
            System.out.println("#FACT autoProxyCreator=" + apc + " isAopProxy=" + AopUtils.isAopProxy(bean) + " superclass=" + bean.getClass().getSuperclass().getSimpleName() + " txAttr=" + attr);
            // 트랜잭션 매니저(스프링의 DataSourceTransactionManager)에 시작·커밋·롤백을 세는 리스너를 단다
            int[] n = new int[3];
            ((AbstractPlatformTransactionManager) ctx.getBean(PlatformTransactionManager.class)).addListener(new TransactionExecutionListener() {
                public void afterBegin(TransactionExecution t, Throwable e) { n[0]++; }
                public void afterCommit(TransactionExecution t, Throwable e) { n[1]++; }
                public void afterRollback(TransactionExecution t, Throwable e) { n[2]++; }
            });
            bean.order();
            System.out.println("#COUNT begins=" + n[0] + " commits=" + n[1] + " rollbacks=" + n[2]);
        }
    }
}
`;
const FACTS = `import java.lang.annotation.*;
import java.util.Arrays;
public class Facts {
    static String decl(Class<? extends Annotation> a) {
        Retention r = a.getAnnotation(Retention.class); Target t = a.getAnnotation(Target.class);
        return a.getName() + " retention=" + (r == null ? "none" : r.value()) + " target=" + (t == null ? "none" : Arrays.toString(t.value()));
    }
    public static void main(String[] args) throws Exception {
        System.out.println(decl(Override.class));
        System.out.println(decl(Deprecated.class));
        System.out.println(decl(FunctionalInterface.class));
        System.out.println(decl(org.springframework.transaction.annotation.Transactional.class));
        System.out.println(decl(org.junit.jupiter.api.Test.class));
        System.out.println(decl(org.springframework.lang.Contract.class));
        Deprecated d = Integer.class.getConstructor(int.class).getAnnotation(Deprecated.class);
        System.out.println("Integer(int) @Deprecated since=" + d.since() + " forRemoval=" + d.forRemoval());
        System.out.println("Integer.valueOf(int) @Deprecated=" + Integer.class.getMethod("valueOf", int.class).isAnnotationPresent(Deprecated.class));
        System.out.println("Runnable @FunctionalInterface=" + Runnable.class.isAnnotationPresent(FunctionalInterface.class) + " Comparator @FunctionalInterface=" + java.util.Comparator.class.isAnnotationPresent(FunctionalInterface.class));
    }
}
`;

// javap -v -p 출력에서 멤버마다 애너테이션이 적힌 칸을 읽는다
function annos(dir) {
  const res = [];
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.class'))) {
    const cls = f.replace(/\.class$/, '');
    if (/^(Main|RunTests|FactsTx|Facts)$/.test(cls) || cls.includes('$')) continue;
    const r = run(JDK + '/javap', ['-v', '-p', path.join(dir, f)]);
    let member = '(class)', mode = '';
    for (const ln of r.stdout.split(/\r?\n/)) {
      if (/^  (?!\d+:)\S/.test(ln) && /[;)]\s*;?$/.test(ln) && !/^  (minor|major|flags|this_class|super_class|interfaces)/.test(ln)) { member = ln.trim().replace(/;$/, ''); mode = ''; continue; }
      if (/^\S/.test(ln)) member = '(class)';
      const m = /^\s*(RuntimeVisibleAnnotations|RuntimeInvisibleAnnotations):\s*$/.exec(ln);
      if (m) { mode = m[1] === 'RuntimeVisibleAnnotations' ? 'V' : 'I'; continue; }
      if (mode && /^\s+[A-Za-z_][\w.$]*(\(|$)/.test(ln) && !/^\s+\d+:/.test(ln)) res.push(cls + '.' + member.replace(/.* (\w+)\(.*$/, '$1()').replace(/.* (\w+)$/, '$1') + ':' + mode + ':@' + ln.trim().replace(/\($/, '').split('.').pop());
      else if (mode && !/^\s+(\d+:|[A-Za-z_][\w.$]*|\)|value=|\w+=)/.test(ln)) mode = '';
    }
  }
  return res.sort();
}

const lines = ['# ' + run(JDK + '/java', ['-version']).stderr.split(/\r?\n/)[0] + ' | spring-tx 7.0.9 | junit-jupiter 6.0.3'];
let n = 0;
for (const c of cases()) {
  const dir = path.join(root, 'c' + (n++)), classes = path.join(dir, 'classes'); fs.mkdirSync(classes, { recursive: true });
  const [decl, body] = lesson.parts(c), files = [];
  let mainFile = null;
  if (c.topic === 'test') {
    fs.writeFileSync(path.join(dir, 'CalcTest.java'), decl + '\n'); fs.writeFileSync(path.join(dir, 'RunTests.java'), RUN_TESTS);
    files.push('CalcTest.java', 'RunTests.java'); mainFile = 'CalcTest.java';
  } else {
    const imp = IMPORTS[c.topic].map(i => 'import ' + i + ';').join('\n');
    const src = (imp ? imp + '\n\n' : '') + (decl ? decl + '\n\n' : '') + 'public class Main {\n    public static void main(String[] args) throws Exception {\n' + body.split('\n').map(l => '        ' + l).join('\n') + '\n    }\n}\n';
    fs.writeFileSync(path.join(dir, 'Main.java'), src); files.push('Main.java'); mainFile = 'Main.java';
    if (c.topic === 'tx') { fs.writeFileSync(path.join(dir, 'FactsTx.java'), FACTS_TX); files.push('FactsTx.java'); }
  }
  const jc = run(JDK + '/javac', ['-J-Duser.language=en', '-J-Duser.country=US', '-encoding', 'UTF-8', '-proc:none', '-cp', CP_ALL, '-d', classes].concat(files), { cwd: dir });
  const srcLines = fs.readFileSync(path.join(dir, mainFile), 'utf8').split('\n');
  const diag = [];
  for (const ln of (jc.stderr + jc.stdout).split(/\r?\n/)) {
    const m = /^(\w+\.java):(\d+): (error|warning): (.*)$/.exec(ln);
    if (m && m[1] === mainFile) diag.push(m[2] + ':' + m[3] + ':' + srcLines[+m[2] - 1].trim() + ':' + m[4]);
  }
  // code: 실행한 화면 코드의 해시. 실습의 코드가 나중에 바뀌면 대조 도구가 알아챈다
  let rec = 'code=' + require('crypto').createHash('sha1').update(lesson.code(c)).digest('hex').slice(0, 12) + '|comp=' + (jc.status === 0 ? 'OK' : 'ERR') + '|diag=' + clean(diag.join(' ;; '));
  if (jc.status === 0) {
    rec += '|annos=' + annos(classes).join(' ');
    const r = run(JDK + '/java', ['-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-cp', CP_QUIET + ';' + classes, c.topic === 'test' ? 'RunTests' : 'Main'], { cwd: dir });
    rec += '|out=' + clean(r.stdout.trim()) + '|exit=' + r.status;
    if (c.topic === 'tx') {
      const f = run(JDK + '/java', ['-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-cp', CP_QUIET + ';' + classes, 'FactsTx'], { cwd: dir });
      const o = f.stdout, fact = (/#FACT (.*)/.exec(o) || [, '?'])[1].trim(), cnt = (/#COUNT (.*)/.exec(o) || [, '?'])[1].trim();
      rec += '|tx=' + clean(fact + ' ' + cnt);
    }
  }
  lines.push(keyOf(c) + ' => ' + rec);
  console.log(keyOf(c) + ' => ' + (rec.length > 300 ? rec.slice(0, 300) + '…' : rec));
}
// 표준 애너테이션의 실제 선언과 값
{
  const dir = path.join(root, 'facts'); fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'Facts.java'), FACTS);
  const jc = run(JDK + '/javac', ['-encoding', 'UTF-8', '-proc:none', '-cp', CP_ALL, '-d', dir, 'Facts.java'], { cwd: dir });
  const r = run(JDK + '/java', ['-cp', CP_QUIET + ';' + dir, 'Facts'], { cwd: dir });
  (jc.status === 0 ? r.stdout : 'COMPILE ' + jc.stderr).trim().split(/\r?\n/).forEach(l => { lines.push('FACT ' + l.trim()); console.log('FACT ' + l.trim()); });
}
fs.writeFileSync(path.join(__dirname, 'annot_probe.out.txt'), lines.join('\n') + '\n');
console.log('조합 ' + (lines.length - 1) + '줄 → verify/spring/annot_probe.out.txt');
