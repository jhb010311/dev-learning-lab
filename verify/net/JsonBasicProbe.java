// 기초개념 "JSON" 실습의 자바(Jackson 3) 쪽 Probe.
// 사용: java JsonBasicProbe <입력 폴더> <출력 파일>
//   입력 폴더에는 json_basic_probe.js가 조합마다 쓴 "<키>.json"(화면의 글자 그대로, UTF-8)이 들어 있다.
//   키는 key-age-comma (예: dq-num-ok). 출력 파일에 조합마다 한 줄을 쓴다.
// 한 줄의 모양: 키 => ok=true|ageType=노드의 종류|intValue=...|asInt=...|bind=...   또는
//               키 => ok=false|exc=예외 클래스|line=줄|col=칸|offset=글자 위치|char=오류가 난 자리의 글자|msg=원래 메시지 첫 줄
// 기본 설정(JsonMapper.builder().build())으로 읽는다. 마지막에 따로, 규칙에 어긋난 글을 받아 주는 옵션을 켠 해석기도 같은 글을 읽어 본다.
import tools.jackson.core.JacksonException;
import tools.jackson.core.TokenStreamLocation;
import tools.jackson.core.exc.StreamReadException;
import tools.jackson.core.json.JsonReadFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class JsonBasicProbe {
    public record Member(String name, int age, List<String> tags) {}

    static String clean(String s) {
        return s == null ? "(없음)" : s.replace("\r", "\\r").replace("\n", "\\n").replace("|", "¦");
    }

    static String firstLine(String s) {
        if (s == null) return "(없음)";
        int i = s.indexOf('\n');
        return clean(i < 0 ? s : s.substring(0, i));
    }

    static String parse(JsonMapper mapper, String text, boolean withBind) {
        try {
            JsonNode root = mapper.readTree(text);
            JsonNode age = root.get("age");
            // 여기까지가 "읽기에 성공"이다. 아래는 읽은 age를 정수로 꺼내 보는 것(읽기의 성패와 별개)
            StringBuilder sb = new StringBuilder("ok=true|ageType=" + age.getNodeType());
            sb.append("|names=").append(String.join(",", root.propertyNames()));
            sb.append("|nameValue=").append(root.get("name").asString());
            sb.append("|tagsSize=").append(root.get("tags").size());
            String iv;
            try {
                iv = String.valueOf(age.intValue());
            } catch (JacksonException e) {
                iv = "오류 " + e.getClass().getSimpleName() + ": " + firstLine(e.getOriginalMessage());
            }
            sb.append("|intValue=").append(iv);
            sb.append("|asInt=").append(age.asInt());
            if (withBind) {
                String bind;
                try {
                    Member m = mapper.readValue(text, Member.class);
                    bind = "age=" + m.age();
                } catch (JacksonException e) {
                    bind = "오류 " + e.getClass().getSimpleName() + ": " + firstLine(e.getOriginalMessage());
                }
                sb.append("|bind=").append(bind);
            }
            return sb.toString();
        } catch (JacksonException e) {
            StringBuilder sb = new StringBuilder("ok=false|exc=" + e.getClass().getName());
            TokenStreamLocation loc = e.getLocation();
            String ch = "(없음)";
            if (loc != null) {
                sb.append("|line=").append(loc.getLineNr()).append("|col=").append(loc.getColumnNr());
                long off = loc.getCharOffset();
                sb.append("|offset=").append(off);
                if (off >= 0 && off < text.length()) ch = String.valueOf(text.charAt((int) off));
            }
            sb.append("|char=").append(clean(ch));
            sb.append("|msg=").append(firstLine(e.getOriginalMessage()));
            return sb.toString();
        }
    }

    public static void main(String[] args) throws Exception {
        File dir = new File(args[0]);
        File[] files = dir.listFiles((d, n) -> n.endsWith(".json"));
        Arrays.sort(files);
        JsonMapper plain = JsonMapper.builder().build();
        JsonMapper lenient = JsonMapper.builder()
                .enable(JsonReadFeature.ALLOW_SINGLE_QUOTES)
                .enable(JsonReadFeature.ALLOW_UNQUOTED_PROPERTY_NAMES)
                .enable(JsonReadFeature.ALLOW_TRAILING_COMMA)
                .build();
        List<String> out = new ArrayList<>();
        out.add("# jackson-databind 3.1.5 · jackson-core 3.1.5 · java " + System.getProperty("java.version") + " · JsonMapper.builder().build() 기본 설정");
        for (File f : files) {
            String text = new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8);
            String key = f.getName().substring(0, f.getName().length() - 5);
            out.add(key + " => " + parse(plain, text, true));
        }
        out.add("# 아래는 같은 글을 ALLOW_SINGLE_QUOTES, ALLOW_UNQUOTED_PROPERTY_NAMES, ALLOW_TRAILING_COMMA를 켠 해석기로 읽은 것 (화면의 대조 대상이 아님)");
        for (File f : files) {
            String text = new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8);
            String key = f.getName().substring(0, f.getName().length() - 5);
            out.add("lenient " + key + " => " + parse(lenient, text, false));
        }
        Files.write(new File(args[1]).toPath(), (String.join("\n", out) + "\n").getBytes(StandardCharsets.UTF_8));
    }
}
