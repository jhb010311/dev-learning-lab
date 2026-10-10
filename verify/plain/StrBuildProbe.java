// "String, StringBuilder" 실습의 열여덟 가지 조합(타입 2 × 하는 일 3 × 메서드 3)을 실제로 실행한다.
// 출력: 타입|하는 일|메서드 => 변수가 가리키는 내용|처음 객체의 내용|처음과 같은 객체인가|반복하며 객체가 바뀐 횟수(반복이 없으면 -)
// StringBuilder일 때와 반복일 때는 메서드 설정을 쓰지 않으므로(화면에서도 숨겨짐) 같은 코드를 세 번 실행하게 된다.
public class StrBuildProbe {
    // String: 메서드를 부르고 돌려준 값을 받지 않는다
    static String strDrop(String m) {
        String s = "java";
        String first = s;
        switch (m) {
            case "concat" -> s.concat("!");
            case "replace" -> s.replace('a', 'o');
            default -> s.toUpperCase();
        }
        return s + "|" + first + "|" + (s == first) + "|-";
    }
    // String: 돌려준 값을 같은 변수에 다시 넣는다
    static String strAssign(String m) {
        String s = "java";
        String first = s;
        switch (m) {
            case "concat" -> s = s.concat("!");
            case "replace" -> s = s.replace('a', 'o');
            default -> s = s.toUpperCase();
        }
        return s + "|" + first + "|" + (s == first) + "|-";
    }
    // String: 반복문에서 +로 이어 붙인다
    static String strLoop() {
        String s = "java";
        String first = s;
        int changed = 0;
        for (int i = 1; i <= 3; i++) {
            String before = s;
            s = s + i;
            if (s != before) changed++;
        }
        return s + "|" + first + "|" + (s == first) + "|" + changed;
    }
    static String sbDrop() {
        StringBuilder sb = new StringBuilder("java");
        StringBuilder first = sb;
        sb.append("!");
        return sb + "|" + first + "|" + (sb == first) + "|-";
    }
    static String sbAssign() {
        StringBuilder sb = new StringBuilder("java");
        StringBuilder first = sb;
        sb = sb.append("!");
        return sb + "|" + first + "|" + (sb == first) + "|-";
    }
    static String sbLoop() {
        StringBuilder sb = new StringBuilder("java");
        StringBuilder first = sb;
        int changed = 0;
        for (int i = 1; i <= 3; i++) {
            StringBuilder before = sb;
            sb.append(i);
            if (sb != before) changed++;
        }
        return sb + "|" + first + "|" + (sb == first) + "|" + changed;
    }

    public static void main(String[] args) {
        for (String type : new String[] { "str", "sb" })
            for (String op : new String[] { "drop", "assign", "loop" })
                for (String m : new String[] { "concat", "replace", "upper" }) {
                    String r = type.equals("str")
                        ? (op.equals("drop") ? strDrop(m) : op.equals("assign") ? strAssign(m) : strLoop())
                        : (op.equals("drop") ? sbDrop() : op.equals("assign") ? sbAssign() : sbLoop());
                    System.out.println(type + "|" + op + "|" + m + " => " + r);
                }
    }
}
