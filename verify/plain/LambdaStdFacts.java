import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

// "람다와 함수형 인터페이스" 실습의 "람다를 받는 쪽 (자바 표준)" 표를 확인한다. lambda_probe.js가 부른다.
// 입력(탭으로 나눈 줄): param <클래스> <메서드> <표에 적은 매개변수>   또는   src <src.zip 안의 경로> <표에 적은 코드 줄>
// 출력: # fact param ... = true/false (실제 선언)   ·   # fact src ... = true/false
// 사용: java LambdaStdFacts.java <facts.tsv> <JDK의 lib/src.zip>
public class LambdaStdFacts {
    static Class<?> cls(String simple) throws Exception {
        for (String p : new String[] {"java.util.", "java.util.stream."}) {
            try { return Class.forName(p + simple); } catch (ClassNotFoundException e) { }
        }
        throw new ClassNotFoundException(simple);
    }

    static String norm(String s) { return s.replaceAll("\\s+", " ").trim(); }

    public static void main(String[] args) throws Exception {
        List<String> rows = Files.readAllLines(Path.of(args[0]), StandardCharsets.UTF_8);
        try (ZipFile zip = new ZipFile(args[1])) {
            for (String row : rows) {
                if (row.isBlank()) continue;
                String[] f = row.split("\t");
                if (f[0].equals("param")) {
                    String want = f[3];                       // 예: Consumer<? super E> action
                    String wantType = want.contains(" ") && !want.endsWith(">") ? want.substring(0, want.lastIndexOf(' ')) : want;
                    String got = null;
                    for (Method m : cls(f[1]).getMethods()) {
                        if (!m.getName().equals(f[2]) || m.getParameterCount() != 1) continue;
                        if (m.getDeclaringClass() != cls(f[1]) && !Modifier.isStatic(m.getModifiers()) && f[1].equals("Stream")) continue;
                        got = m.getGenericParameterTypes()[0].getTypeName().replaceAll("\\b[a-z]+(\\.[a-z]+)*\\.(?=[A-Z])", "");
                        if (m.getDeclaringClass() == cls(f[1])) break;
                    }
                    System.out.println("# fact param " + f[1] + "." + f[2] + " | 표=" + wantType + " | 실제=" + got + " = " + wantType.equals(got));
                } else {
                    ZipEntry e = zip.getEntry(f[1]);
                    String src = e == null ? "" : norm(new String(zip.getInputStream(e).readAllBytes(), StandardCharsets.UTF_8));
                    System.out.println("# fact src " + f[1] + " | " + f[2] + " = " + src.contains(norm(f[2])));
                }
            }
        }
        // 람다가 구현하는 메서드: 함수형 인터페이스마다 추상 메서드 하나의 이름
        for (Class<?> fi : new Class<?>[] {java.util.function.Consumer.class, java.util.function.Predicate.class, java.util.function.Function.class, java.util.function.Supplier.class, java.util.Comparator.class}) {
            StringBuilder sb = new StringBuilder();
            for (Method m : fi.getMethods()) {
                if (!Modifier.isAbstract(m.getModifiers())) continue;
                if (m.getName().equals("equals") && m.getParameterCount() == 1) continue;   // Object의 메서드를 다시 선언한 것은 세지 않는다
                sb.append(sb.length() == 0 ? "" : ",").append(m.getName());
            }
            System.out.println("# fact abstract " + fi.getSimpleName() + " = " + sb);
        }
    }
}
