// 같은 메서드를 반복 호출하면서 묶음별 소요 시간을 잰다. 처음에는 느리다가 JIT 컴파일 뒤 빨라지는지 본다.
// 실행: java JitWarmup.java          (기본: 계층형 JIT)
//       java -Xint JitWarmup.java    (인터프리터만)
public class JitWarmup {
    static long work(int n) { long s = 0; for (int i = 0; i < n; i++) { s += (i * 31L) ^ (s >>> 3); } return s; }

    public static void main(String[] args) {
        long sink = 0; StringBuilder sb = new StringBuilder();
        for (int batch = 1; batch <= 12; batch++) {
            long t = System.nanoTime();
            for (int k = 0; k < 2000; k++) sink += work(1000);          // 묶음 하나 = 2,000번 호출
            sb.append(batch == 1 ? "" : ",").append((System.nanoTime() - t) / 1000);
        }
        System.out.println("묶음별 마이크로초=" + sb + " (sink " + (sink & 1) + ")");
    }
}
