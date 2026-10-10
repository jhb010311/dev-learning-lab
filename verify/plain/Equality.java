// ==와 equals: 만드는 방법에 따라 같은 객체인지가 달라지는 것을 실제로 확인한다.
public class Equality {
    public static void main(String[] args) {
        String a = "hello";
        String lit = "hello", nw = new String("hello"), in = new String("hello").intern(), cst = "hel" + "lo";
        String part = "hel"; String cat = part + "lo";
        System.out.println("str,lit=" + (a == lit) + "," + a.equals(lit));
        System.out.println("str,new=" + (a == nw) + "," + a.equals(nw));
        System.out.println("str,intern=" + (a == in) + "," + a.equals(in));
        System.out.println("str,const=" + (a == cst) + "," + a.equals(cst));
        System.out.println("str,concat=" + (a == cat) + "," + a.equals(cat));
        Integer i1 = 127, i2 = 127, j1 = 128, j2 = 128; int p1 = 127, p2 = 128;
        System.out.println("int,127,box=" + (i1 == i2) + "," + i1.equals(i2));
        System.out.println("int,128,box=" + (j1 == j2) + "," + j1.equals(j2));
        System.out.println("int,127,prim=" + (i1 == p1) + "," + i1.equals(p1));
        System.out.println("int,128,prim=" + (j1 == p2) + "," + j1.equals(p2));
    }
}
