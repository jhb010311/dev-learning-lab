import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;

// "날짜와 시간" 실습의 135가지 조합(주제 3 × 더하는 방법 5 × 시간대 3 × 간격 재는 방법 3)을 실제로 실행한다.
// 주제마다 한 가지 설정만 쓰므로(나머지는 화면에서도 숨겨짐) 서로 다른 경우는 5 + 3 + 3 = 11가지이고, 나머지는 같은 코드를 다시 실행한 것이다.
// 출력: 주제|더하는 방법|시간대|간격 재는 방법 => 첫째 줄|둘째 줄|셋째 줄   (예외로 멈추면 첫째 줄에 EX:예외 클래스: 메시지, 나머지는 -)
// 오늘 날짜나 이 PC의 시간대를 쓰는 코드는 없다. 날짜는 모두 고정값이고 시간대는 이름으로 지정한다.
public class DateTimeProbe {
    // 날짜에 더하기
    static String plus(String add) {
        LocalDate d = LocalDate.of(2024, 1, 31);
        LocalDate first = d;
        switch (add) {
            case "drop" -> d.plusMonths(1);
            case "month" -> d = d.plusMonths(1);
            case "twice" -> d = d.plusMonths(1).plusMonths(1);
            case "two" -> d = d.plusMonths(2);
            default -> d = d.plusDays(30);
        }
        return d + "|" + first + "|" + (d == first);
    }
    // 같은 순간을 다른 시간대의 시각으로 적기
    static String zone(String zone) {
        String id = zone.equals("seoul") ? "Asia/Seoul" : zone.equals("utc") ? "UTC" : "America/New_York";
        ZonedDateTime seoul = ZonedDateTime.of(2024, 1, 1, 0, 30, 0, 0, ZoneId.of("Asia/Seoul"));
        Instant moment = seoul.toInstant();
        ZonedDateTime there = moment.atZone(ZoneId.of(id));
        return there + "|" + there.toLocalDate() + "|" + there.toInstant();
    }
    // 두 날짜 사이의 간격
    static String gap(String gap) {
        LocalDate a = LocalDate.of(2024, 1, 31);
        LocalDate b = LocalDate.of(2024, 3, 1);
        if (gap.equals("period")) {
            Period p = Period.between(a, b);
            return p + "|" + p.getDays() + "|" + ChronoUnit.DAYS.between(a, b);
        }
        if (gap.equals("duration")) {
            Duration t = Duration.between(a.atStartOfDay(), b.atStartOfDay());
            return t + "|" + t.toHours() + "|" + t.toDays();
        }
        Duration t = Duration.between(a, b);
        return t + "|" + t.toHours() + "|" + t.toDays();
    }

    public static void main(String[] args) {
        for (String topic : new String[] { "plus", "zone", "gap" })
            for (String add : new String[] { "drop", "month", "twice", "two", "days" })
                for (String zone : new String[] { "seoul", "utc", "ny" })
                    for (String gap : new String[] { "period", "duration", "durdate" }) {
                        String r;
                        try { r = topic.equals("plus") ? plus(add) : topic.equals("zone") ? zone(zone) : gap(gap); }
                        catch (RuntimeException e) { r = "EX:" + e.getClass().getName() + ": " + e.getMessage() + "|-|-"; }
                        System.out.println(topic + "|" + add + "|" + zone + "|" + gap + " => " + r);
                    }
        // 참고(대조에는 쓰지 않는 줄): 여름에는 뉴욕과 UTC의 차이가 달라진다
        System.out.println("# 참고: 2024-07-01T00:00:00Z를 뉴욕 시간대로 적으면 " + Instant.parse("2024-07-01T00:00:00Z").atZone(ZoneId.of("America/New_York")));
    }
}
