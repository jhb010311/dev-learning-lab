import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

// "Optional" 실습의 스물네 가지 조합(name의 값 2 × 만드는 방법 3 × 꺼내는 방법 4)을 실제로 실행한다.
// Optional.empty()는 name을 쓰지 않으므로(화면에서도 name 설정이 숨겨짐) 서로 다른 경우는 스무 가지다.
// 출력: name의 값|만드는 방법|꺼내는 방법 => 화면에 찍힌 줄들(" / "로 이음)|예외(EX:클래스 이름: 메시지, 없으면 -)
public class OptionalProbe {
    // 기본값을 만드는 메서드. 실행되면 한 줄을 찍는다.
    static String makeDefault() {
        System.out.println("makeDefault 실행");
        return "손님";
    }

    // 화면의 main과 같은 순서로 실행한다
    static void scenario(String val, String make, String take) {
        String name = val.equals("kim") ? "kim" : null;
        Optional<String> opt = make.equals("of") ? Optional.of(name) : make.equals("nullable") ? Optional.ofNullable(name) : Optional.empty();
        System.out.println(opt);

        String result;
        switch (take) {
            case "get" -> result = opt.get();
            case "orElse" -> result = opt.orElse(makeDefault());
            case "orElseGet" -> result = opt.orElseGet(() -> makeDefault());
            default -> result = opt.map(s -> s.toUpperCase())
                                   .map(s -> s + " 님")
                                   .orElse("이름 없음");
        }
        System.out.println(result);
    }

    public static void main(String[] args) {
        PrintStream real = System.out;
        for (String val : new String[] { "kim", "null" })
            for (String make : new String[] { "of", "nullable", "empty" })
                for (String take : new String[] { "get", "orElse", "orElseGet", "map" }) {
                    ByteArrayOutputStream buf = new ByteArrayOutputStream();
                    System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
                    String ex = "-";
                    try { scenario(val, make, take); }
                    catch (RuntimeException e) { ex = "EX:" + e.getClass().getName() + (e.getMessage() == null ? "" : ": " + e.getMessage()); }
                    finally { System.setOut(real); }
                    String printed = buf.toString(StandardCharsets.UTF_8).strip();
                    String lines = printed.isEmpty() ? "" : String.join(" / ", printed.split("\\R"));
                    System.out.println(val + "|" + make + "|" + take + " => " + lines + "|" + ex);
                }
    }
}
