// 재귀 깊이와 스택 크기(-Xss)에 따라 StackOverflowError가 나는지 확인한다.
public class StackProbe {
    static int depth;
    static long factorial(int n) { depth++; if (n <= 1) return 1; return n * factorial(n - 1); }
    static long noBase(int n) { depth++; return n * noBase(n - 1); }
    static long sum(int n) { depth++; if (n <= 1) return 1; return n + sum(n - 1); }

    static String run(Runnable r) { depth = 0; try { r.run(); return "정상 종료, 깊이 " + depth; } catch (StackOverflowError e) { return "StackOverflowError, 깊이 " + depth + "에서 발생"; } }

    public static void main(String[] args) throws Exception {
        System.out.println("factorial(4) = " + factorial(4));
        System.out.println("종료 조건 없음 = " + run(() -> noBase(4)));
        int deep = Integer.parseInt(args[0]);
        System.out.println("종료 조건 있음, 깊이 " + deep + " = " + run(() -> sum(deep)));
        // 한 스레드에서 스택이 넘쳐도 다른 스레드는 계속 실행된다
        Thread t = new Thread(() -> { try { noBase(1); } catch (StackOverflowError e) { System.out.println("다른 스레드에서 StackOverflowError 발생 후 그 스레드 종료"); } });
        t.start(); t.join();
        System.out.println("main 스레드는 계속 실행 중, factorial(5) = " + factorial(5));
    }
}
