import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;

// "입출력 스트림과 버퍼" 실습의 마흔여덟 가지 조합(버퍼 3 × 끝내는 방법 4 × 예외 2 × 읽는 방법 2)을 실제로 실행한다.
// 출력: buf|end|fail|read => 아래 스트림 write 횟수|한 번에 내려간 바이트 수들|파일 크기|닫혔는가|읽은 글자들(16진수 코드, 띄어 씀)
// 사용: java IoBufProbe <임시 파일을 둘 폴더>
public class IoBufProbe {
    // 아래 스트림으로 내려온 write 호출을 세는 스트림
    static class CountingOutputStream extends OutputStream {
        private final OutputStream out;
        int calls = 0;
        boolean closed = false;
        final List<Integer> lens = new ArrayList<>();
        CountingOutputStream(OutputStream out) { this.out = out; }
        @Override public void write(int b) throws IOException { calls++; lens.add(1); out.write(b); }
        @Override public void write(byte[] b, int off, int len) throws IOException { calls++; lens.add(len); out.write(b, off, len); }
        @Override public void flush() throws IOException { out.flush(); }
        @Override public void close() throws IOException { closed = true; out.close(); }
    }

    static void process() { throw new IllegalStateException("처리 중 오류"); }

    static OutputStream wrap(String buf, CountingOutputStream counting) {
        if (buf.equals("buf")) return new BufferedOutputStream(counting);
        if (buf.equals("buf4")) return new BufferedOutputStream(counting, 4);
        return counting;
    }

    static String one(File dir, String buf, String end, boolean fail, String read) throws IOException {
        File file = new File(dir, buf + "_" + end + "_" + fail + "_" + read + ".txt");
        byte[] data = "가나다".getBytes(StandardCharsets.UTF_8);
        FileOutputStream fos = new FileOutputStream(file);
        CountingOutputStream counting = new CountingOutputStream(fos);
        try {
            if (end.equals("twr")) {
                try (OutputStream out = wrap(buf, counting)) {
                    for (byte b : data) out.write(b);
                    if (fail) process();
                }
            } else {
                OutputStream out = wrap(buf, counting);
                for (byte b : data) out.write(b);
                if (fail) process();
                if (end.equals("flush")) out.flush();
                if (end.equals("close")) out.close();
            }
        } catch (IllegalStateException e) {
            // 화면의 코드처럼 예외를 잡고 계속한다
        }
        long size = Files.size(file.toPath());
        StringBuilder chars = new StringBuilder();
        if (read.equals("byte")) {
            try (InputStream in = new FileInputStream(file)) {
                int b;
                while ((b = in.read()) != -1) chars.append(String.format("%04X ", (int) (char) b));
            }
        } else {
            try (Reader in = new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8)) {
                int ch;
                while ((ch = in.read()) != -1) chars.append(String.format("%04X ", ch));
            }
        }
        String result = counting.calls + "|" + counting.lens.toString().replace(" ", "") + "|" + size + "|" + counting.closed + "|" + chars.toString().trim();
        fos.close();     // 측정이 끝난 뒤의 뒷정리. 버퍼를 거치지 않고 파일만 닫으므로 버퍼에 남은 것은 쓰이지 않는다.
        return result;
    }

    public static void main(String[] args) throws Exception {
        if (args[0].equals("child")) {      // 따로 확인 3에서 쓰는 자식 프로세스: 닫지도 flush하지도 않고 프로그램을 끝낸다
            OutputStream out = new BufferedOutputStream(new FileOutputStream(args[1]));
            for (byte b : "가나다".getBytes(StandardCharsets.UTF_8)) out.write(b);
            return;
        }
        File dir = new File(args[0]);
        dir.mkdirs();
        for (String buf : new String[] { "raw", "buf", "buf4" })
            for (String end : new String[] { "none", "flush", "close", "twr" })
                for (boolean fail : new boolean[] { false, true })
                    for (String read : new String[] { "byte", "char" })
                        System.out.println(buf + "|" + end + "|" + fail + "|" + read + " => " + one(dir, buf, end, fail, read));

        // 아래는 조합이 아니라, 실습의 글에서 말하는 사실을 따로 확인한 것이다.
        // 1) "가나다"의 UTF-8 바이트
        StringBuilder hex = new StringBuilder();
        for (byte b : "가나다".getBytes(StandardCharsets.UTF_8)) hex.append(String.format("%02X ", b & 0xFF));
        System.out.println("extra|가나다의 UTF-8 바이트 => " + hex.toString().trim());

        // 2) 크기를 주지 않은 BufferedOutputStream은 몇 바이트를 모은 뒤에 처음으로 아래로 내려보내는가
        CountingOutputStream c2 = new CountingOutputStream(OutputStream.nullOutputStream());
        OutputStream b2 = new BufferedOutputStream(c2);
        int n = 0;
        while (c2.calls == 0 && n < 100000) { b2.write(65); n++; }
        System.out.println("extra|기본 버퍼: 처음 내려간 것은 몇 번째 write에서, 몇 바이트 => " + n + "번째, " + c2.lens.get(0) + "바이트");

        // 3) 영문 abc는 한 글자가 1바이트라서 바이트 하나씩 글자로 바꿔도 그대로인가
        File f3 = new File(dir, "ascii.txt");
        try (OutputStream out = new FileOutputStream(f3)) { out.write("abc".getBytes(StandardCharsets.UTF_8)); }
        StringBuilder s3 = new StringBuilder();
        try (InputStream in = new FileInputStream(f3)) { int b; while ((b = in.read()) != -1) s3.append((char) b); }
        System.out.println("extra|abc를 바이트 하나씩 글자로 => " + s3 + " (" + Files.size(f3.toPath()) + "바이트)");

        // 4) 닫지도 flush하지도 않고 프로그램이 정상 종료하면 버퍼에 남은 것은 파일에 쓰이는가
        File f4 = new File(dir, "exit.txt");
        String java = System.getProperty("java.home") + File.separator + "bin" + File.separator + "java";
        Process p = new ProcessBuilder(java, "-cp", System.getProperty("java.class.path"), "IoBufProbe", "child", f4.getPath()).inheritIO().start();
        int code = p.waitFor();
        System.out.println("extra|닫지 않고 프로그램이 끝난 뒤의 파일 크기 => " + Files.size(f4.toPath()) + "바이트 (종료 코드 " + code + ")");
    }
}
