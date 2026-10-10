import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

// "배열" 실습의 일흔두 가지 조합(모양 2 × 칸의 타입 3 × b를 만드는 방법 3 × 값을 넣을 번호 4)을 실제로 실행한다.
// 출력: 모양|타입|방법|번호 => a == b[,a[0] == b[0]]|OK 또는 예외|a 출력|b 출력   (예외가 나면 출력 자리는 -)
// 각 메서드의 코드는 화면에 보이는 코드와 같다. b를 만드는 식 세 가지 가운데 하나를 고르는 부분만 한 줄로 묶었다.
// '# '으로 시작하는 줄은 실습의 요약 글에 적은 사실을 따로 확인한 것이다.
public class ArrayProbe {
    // ---- 1차원 ----
    static void int1(String copy, int idx) {
        int[] a = new int[3];
        int[] b = copy.equals("ref") ? a : copy.equals("clone") ? a.clone() : Arrays.copyOf(a, a.length);
        System.out.println(a == b);
        b[idx] = 7;
        System.out.println(Arrays.toString(a));
        System.out.println(Arrays.toString(b));
    }
    static void boolean1(String copy, int idx) {
        boolean[] a = new boolean[3];
        boolean[] b = copy.equals("ref") ? a : copy.equals("clone") ? a.clone() : Arrays.copyOf(a, a.length);
        System.out.println(a == b);
        b[idx] = true;
        System.out.println(Arrays.toString(a));
        System.out.println(Arrays.toString(b));
    }
    static void string1(String copy, int idx) {
        String[] a = new String[3];
        String[] b = copy.equals("ref") ? a : copy.equals("clone") ? a.clone() : Arrays.copyOf(a, a.length);
        System.out.println(a == b);
        b[idx] = "A";
        System.out.println(Arrays.toString(a));
        System.out.println(Arrays.toString(b));
    }

    // ---- 2차원 ----
    static void int2(String copy, int idx) {
        int[][] a = new int[2][3];
        int[][] b = copy.equals("ref") ? a : copy.equals("clone") ? a.clone() : Arrays.copyOf(a, a.length);
        System.out.println(a == b);
        System.out.println(a[0] == b[0]);
        b[0][idx] = 7;
        System.out.println(Arrays.deepToString(a));
        System.out.println(Arrays.deepToString(b));
    }
    static void boolean2(String copy, int idx) {
        boolean[][] a = new boolean[2][3];
        boolean[][] b = copy.equals("ref") ? a : copy.equals("clone") ? a.clone() : Arrays.copyOf(a, a.length);
        System.out.println(a == b);
        System.out.println(a[0] == b[0]);
        b[0][idx] = true;
        System.out.println(Arrays.deepToString(a));
        System.out.println(Arrays.deepToString(b));
    }
    static void string2(String copy, int idx) {
        String[][] a = new String[2][3];
        String[][] b = copy.equals("ref") ? a : copy.equals("clone") ? a.clone() : Arrays.copyOf(a, a.length);
        System.out.println(a == b);
        System.out.println(a[0] == b[0]);
        b[0][idx] = "A";
        System.out.println(Arrays.deepToString(a));
        System.out.println(Arrays.deepToString(b));
    }

    interface Case { void run(String copy, int idx); }

    // 요약 글 확인용: 메서드에 넘긴 배열의 칸을 바꾼다
    static void fill(int[] p) { p[2] = 7; }

    // 한 조합을 실행해 System.out으로 나간 줄과 예외를 모은다
    static void one(String shape, String type, Case k, String copy, int idx) {
        PrintStream old = System.out;
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
        String err = null;
        try { k.run(copy, idx); } catch (RuntimeException e) { err = e.getClass().getSimpleName() + ": " + e.getMessage(); } finally { System.setOut(old); }
        String[] o = buf.toString(StandardCharsets.UTF_8).strip().split("\\R");
        int n = shape.equals("2") ? 2 : 1;                       // 값을 넣기 전에 출력하는 비교 줄 수
        String eq = n == 2 ? o[0] + "," + o[1] : o[0];
        if (err == null && o.length != n + 2) throw new IllegalStateException("출력 줄 수 " + o.length);
        if (err != null && o.length != n) throw new IllegalStateException("예외인데 출력 줄 수 " + o.length);
        System.out.println(shape + "|" + type + "|" + copy + "|" + idx + " => " + eq + "|" + (err == null ? "OK|" + o[n] + "|" + o[n + 1] : err + "|-|-"));
    }

    public static void main(String[] args) {
        String[] types = { "int", "boolean", "String" }, copies = { "ref", "clone", "copyOf" };
        Case[] one = { ArrayProbe::int1, ArrayProbe::boolean1, ArrayProbe::string1 }, two = { ArrayProbe::int2, ArrayProbe::boolean2, ArrayProbe::string2 };
        int[] idxs = { 0, 2, 3, -1 };
        for (String shape : new String[] { "1", "2" })
            for (int t = 0; t < types.length; t++)
                for (String copy : copies)
                    for (int idx : idxs) one(shape, types[t], shape.equals("1") ? one[t] : two[t], copy, idx);

        // ---- 요약 글에 적은 사실 ----
        { int[] a = new int[3]; fill(a); System.out.println("# 메서드에 배열을 넘겨 p[2] = 7을 한 뒤의 a = " + Arrays.toString(a)); }
        { int[] a = { 1, 2, 3 }; int[] longer = Arrays.copyOf(a, 5); System.out.println("# Arrays.copyOf({1, 2, 3}, 5) = " + Arrays.toString(longer) + " , 원래 배열의 length = " + a.length); }
        {
            int[][] a = new int[2][3];
            int[][] b = new int[a.length][];
            for (int i = 0; i < a.length; i++) b[i] = a[i].clone();          // 행마다 clone (깊은 복사)
            b[0][2] = 7;
            System.out.println("# 행마다 clone: a[0] == b[0] 은 " + (a[0] == b[0]) + " , a = " + Arrays.deepToString(a) + " , b = " + Arrays.deepToString(b));
            System.out.println("# new int[2][3]: a.length = " + a.length + " , a[0].length = " + a[0].length + " , a[0]의 타입 = " + a[0].getClass().getSimpleName());
        }
        {
            int[] a = new int[3];
            try { for (int i = 0; i <= a.length; i++) a[i] = i; System.out.println("# i <= a.length 반복: 예외 없음"); }
            catch (ArrayIndexOutOfBoundsException e) { System.out.println("# i <= a.length 반복 => " + e.getClass().getSimpleName() + ": " + e.getMessage()); }
        }
        {
            // 번호를 숫자로 직접 적어도(화면의 코드처럼) 컴파일은 되고, 실행 중에 예외가 난다
            int[] a = new int[3];
            try { a[3] = 7; System.out.println("# a[3] = 7: 예외 없음"); }
            catch (ArrayIndexOutOfBoundsException e) { System.out.println("# 숫자로 적은 a[3] = 7 => 컴파일됨, 실행 중 " + e.getClass().getSimpleName() + ": " + e.getMessage()); }
            try { a[-1] = 7; System.out.println("# a[-1] = 7: 예외 없음"); }
            catch (ArrayIndexOutOfBoundsException e) { System.out.println("# 숫자로 적은 a[-1] = 7 => 컴파일됨, 실행 중 " + e.getClass().getSimpleName() + ": " + e.getMessage()); }
        }
        {
            String[] a = new String[3];
            try { System.out.println("# a[1].length() = " + a[1].length()); }
            catch (NullPointerException e) { System.out.println("# null인 칸에 a[1].length() => " + e.getClass().getSimpleName()); }
        }
        { double[] d = new double[1]; long[] l = new long[1]; Integer[] w = new Integer[1]; System.out.println("# 기본값: double " + d[0] + " , long " + l[0] + " , Integer(참조형) " + w[0]); }
    }
}
