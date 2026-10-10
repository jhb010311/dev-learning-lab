import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

// "변수와 타입" 실습의 열다섯 가지 조합(타입과 하는 일 5 × 복사가 일어나는 곳 3)을 실제로 실행한다.
// 각 조합의 코드는 화면에 보이는 코드와 같고, 맨 앞에 a의 처음 값을 한 번 더 출력하는 줄만 대조용으로 넣었다.
// 출력: what|how => 복사본에서 읽은 값|a에서 읽은 값|a에서 읽은 값이 처음과 달라졌는가
public class VarsProbe {
    static class Point {
        int x;
        Point(int x) { this.x = x; }
    }

    // ---- int (기본형): 복사본에 99를 대입 ----
    static void primAssign() {
        int a = 1;
        System.out.println(a);          // 대조용: 처음 값
        int b = a;
        b = 99;
        System.out.println(b);
        System.out.println(a);
    }
    static void changePrim(int p) {
        p = 99;
        System.out.println(p);
    }
    static void primCall() {
        int a = 1;
        System.out.println(a);
        changePrim(a);
        System.out.println(a);
    }
    static int changePrimRet(int p) {
        p = 99;
        System.out.println(p);
        return p;
    }
    static void primRet() {
        int a = 1;
        System.out.println(a);
        a = changePrimRet(a);
        System.out.println(a);
    }

    // ---- Point (참조형): 복사본으로 객체의 내용을 바꿈 ----
    static void fieldAssign() {
        Point a = new Point(1);
        System.out.println(a.x);
        Point b = a;
        b.x = 99;
        System.out.println(b.x);
        System.out.println(a.x);
    }
    static void changeField(Point p) {
        p.x = 99;
        System.out.println(p.x);
    }
    static void fieldCall() {
        Point a = new Point(1);
        System.out.println(a.x);
        changeField(a);
        System.out.println(a.x);
    }
    static Point changeFieldRet(Point p) {
        p.x = 99;
        System.out.println(p.x);
        return p;
    }
    static void fieldRet() {
        Point a = new Point(1);
        System.out.println(a.x);
        a = changeFieldRet(a);
        System.out.println(a.x);
    }

    // ---- Point (참조형): 복사본에 새 객체를 대입 ----
    static void renewAssign() {
        Point a = new Point(1);
        System.out.println(a.x);
        Point b = a;
        b = new Point(99);
        System.out.println(b.x);
        System.out.println(a.x);
    }
    static void changeRenew(Point p) {
        p = new Point(99);
        System.out.println(p.x);
    }
    static void renewCall() {
        Point a = new Point(1);
        System.out.println(a.x);
        changeRenew(a);
        System.out.println(a.x);
    }
    static Point changeRenewRet(Point p) {
        p = new Point(99);
        System.out.println(p.x);
        return p;
    }
    static void renewRet() {
        Point a = new Point(1);
        System.out.println(a.x);
        a = changeRenewRet(a);
        System.out.println(a.x);
    }

    // ---- Point (참조형): 새 객체로 복사해 두고 내용을 바꿈 ----
    static void copyAssign() {
        Point a = new Point(1);
        System.out.println(a.x);
        Point b = new Point(a.x);
        b.x = 99;
        System.out.println(b.x);
        System.out.println(a.x);
    }
    static void copyCall() {
        Point a = new Point(1);
        System.out.println(a.x);
        changeField(new Point(a.x));
        System.out.println(a.x);
    }
    static void copyRet() {
        Point a = new Point(1);
        System.out.println(a.x);
        a = changeFieldRet(new Point(a.x));
        System.out.println(a.x);
    }

    // ---- String (참조형): 복사본에 글자를 이어 붙임 ----
    static void strAssign() {
        String a = "hi";
        System.out.println(a);
        String b = a;
        b = b + "!";
        System.out.println(b);
        System.out.println(a);
    }
    static void changeStr(String p) {
        p = p + "!";
        System.out.println(p);
    }
    static void strCall() {
        String a = "hi";
        System.out.println(a);
        changeStr(a);
        System.out.println(a);
    }
    static String changeStrRet(String p) {
        p = p + "!";
        System.out.println(p);
        return p;
    }
    static void strRet() {
        String a = "hi";
        System.out.println(a);
        a = changeStrRet(a);
        System.out.println(a);
    }

    // System.out으로 나간 줄을 모아서 돌려준다
    static String[] capture(Runnable r) {
        PrintStream old = System.out;
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
        try { r.run(); } finally { System.setOut(old); }
        return buf.toString(StandardCharsets.UTF_8).split("\\R");
    }

    public static void main(String[] args) {
        Map<String, Runnable> all = new LinkedHashMap<>();
        all.put("prim|assign", VarsProbe::primAssign); all.put("prim|call", VarsProbe::primCall); all.put("prim|ret", VarsProbe::primRet);
        all.put("field|assign", VarsProbe::fieldAssign); all.put("field|call", VarsProbe::fieldCall); all.put("field|ret", VarsProbe::fieldRet);
        all.put("renew|assign", VarsProbe::renewAssign); all.put("renew|call", VarsProbe::renewCall); all.put("renew|ret", VarsProbe::renewRet);
        all.put("copy|assign", VarsProbe::copyAssign); all.put("copy|call", VarsProbe::copyCall); all.put("copy|ret", VarsProbe::copyRet);
        all.put("str|assign", VarsProbe::strAssign); all.put("str|call", VarsProbe::strCall); all.put("str|ret", VarsProbe::strRet);
        all.forEach((key, r) -> {
            String[] o = capture(r);            // o[0] a의 처음 값, o[1] 복사본에서 읽은 값, o[2] a에서 읽은 값
            if (o.length != 3) throw new IllegalStateException(key + ": 출력 줄 수 " + o.length);
            System.out.println(key + " => " + o[1] + "|" + o[2] + "|" + !o[2].equals(o[0]));
        });
    }
}
