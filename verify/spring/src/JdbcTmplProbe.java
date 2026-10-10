import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import javax.sql.DataSource;
import org.springframework.core.SpringVersion;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.dao.IncorrectResultSizeDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;

// "JdbcTemplate과 예외 변환" 실습의 열여덟 가지 조합을 실제 스프링 JDBC(JdbcTemplate) + HikariCP + H2에서 실행한다.
// 같은 일을 세 가지 방식(JDBC 직접 + 마지막 줄에서 close, JDBC 직접 + try-with-resources, JdbcTemplate)으로 하고
// 호출한 쪽이 받는 것, 예외가 체크 예외인지, 호출이 끝난 뒤 풀에 반납되지 않은 커넥션 수를 적는다.
public class JdbcTmplProbe {
    static final String FIND = "select name from member where city = ? order by id";
    static final String FIND_TYPO = "select nmae from member where city = ? order by id";
    static final String INSERT = "insert into member(id, name, city) values (?, ?, ?)";

    interface MemberRepository {
        String findName(String city) throws Exception;
        String findNameTypo(String city) throws Exception;
        int insert(Long id, String name, String city) throws Exception;
    }

    // JDBC 직접: 자원을 메서드의 마지막에서 닫는다. 도중에 예외가 나면 닫는 줄까지 가지 못한다.
    static class PlainJdbcRepository implements MemberRepository {
        final DataSource dataSource;
        PlainJdbcRepository(DataSource ds) { this.dataSource = ds; }
        String query(String sql, String city) throws SQLException {
            Connection con = dataSource.getConnection();
            PreparedStatement ps = con.prepareStatement(sql);
            ps.setString(1, city);
            ResultSet rs = ps.executeQuery();
            String name = rs.next() ? rs.getString("name") : null;
            rs.close();
            ps.close();
            con.close();
            return name;
        }
        public String findName(String city) throws SQLException { return query(FIND, city); }
        public String findNameTypo(String city) throws SQLException { return query(FIND_TYPO, city); }
        public int insert(Long id, String name, String city) throws SQLException {
            Connection con = dataSource.getConnection();
            PreparedStatement ps = con.prepareStatement(INSERT);
            ps.setLong(1, id);
            ps.setString(2, name);
            ps.setString(3, city);
            int rows = ps.executeUpdate();
            ps.close();
            con.close();
            return rows;
        }
    }

    // JDBC 직접: try-with-resources로 닫는다.
    static class TwrJdbcRepository implements MemberRepository {
        final DataSource dataSource;
        TwrJdbcRepository(DataSource ds) { this.dataSource = ds; }
        String query(String sql, String city) throws SQLException {
            try (Connection con = dataSource.getConnection();
                 PreparedStatement ps = con.prepareStatement(sql)) {
                ps.setString(1, city);
                try (ResultSet rs = ps.executeQuery()) {
                    return rs.next() ? rs.getString("name") : null;
                }
            }
        }
        public String findName(String city) throws SQLException { return query(FIND, city); }
        public String findNameTypo(String city) throws SQLException { return query(FIND_TYPO, city); }
        public int insert(Long id, String name, String city) throws SQLException {
            try (Connection con = dataSource.getConnection();
                 PreparedStatement ps = con.prepareStatement(INSERT)) {
                ps.setLong(1, id);
                ps.setString(2, name);
                ps.setString(3, city);
                return ps.executeUpdate();
            }
        }
    }

    // JdbcTemplate
    static class TemplateRepository implements MemberRepository {
        final JdbcTemplate jdbcTemplate;
        TemplateRepository(DataSource ds) { this.jdbcTemplate = new JdbcTemplate(ds); }
        public String findName(String city) { return jdbcTemplate.queryForObject(FIND, String.class, city); }
        public String findNameTypo(String city) { return jdbcTemplate.queryForObject(FIND_TYPO, String.class, city); }
        public int insert(Long id, String name, String city) { return jdbcTemplate.update(INSERT, id, name, city); }
    }

    static String sqlInfo(SQLException e) { return "SQLState " + e.getSQLState(); }

    public static void main(String[] args) throws Exception {
        ((ch.qos.logback.classic.Logger) org.slf4j.LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME)).setLevel(ch.qos.logback.classic.Level.WARN);
        List<String> out = new ArrayList<>();
        out.add("# spring " + SpringVersion.getVersion() + " | h2 " + org.h2.engine.Constants.VERSION + " | java " + System.getProperty("java.version"));
        out.add("# DuplicateKeyException은 DataIntegrityViolationException의 하위 클래스: " + DataIntegrityViolationException.class.isAssignableFrom(DuplicateKeyException.class)
            + " | EmptyResultDataAccessException은 IncorrectResultSizeDataAccessException의 하위 클래스: " + IncorrectResultSizeDataAccessException.class.isAssignableFrom(EmptyResultDataAccessException.class)
            + " | DataAccessException은 RuntimeException의 하위 클래스: " + RuntimeException.class.isAssignableFrom(DataAccessException.class));
        for (String how : new String[] { "plain", "twr", "tmpl" })
            for (String op : new String[] { "one", "zero", "two", "dup", "nul", "bad" }) {
                HikariConfig hc = new HikariConfig();
                hc.setJdbcUrl("jdbc:h2:mem:jdbctmpl;DB_CLOSE_DELAY=-1");
                hc.setMaximumPoolSize(4);
                try (HikariDataSource ds = new HikariDataSource(hc)) {
                    JdbcTemplate setup = new JdbcTemplate(ds);
                    setup.execute("drop table if exists member");
                    setup.execute("create table member(id bigint primary key, name varchar(20) not null, city varchar(20))");
                    setup.update("insert into member values (1, 'kim', '서울'), (2, 'lee', '부산'), (3, 'park', '서울')");
                    MemberRepository repo = how.equals("plain") ? new PlainJdbcRepository(ds) : how.equals("twr") ? new TwrJdbcRepository(ds) : new TemplateRepository(ds);
                    String caller, kind, extra = "";
                    try {
                        Object r = switch (op) {
                            case "one" -> repo.findName("부산");
                            case "zero" -> repo.findName("제주");
                            case "two" -> repo.findName("서울");
                            case "dup" -> repo.insert(1L, "choi", "대전");
                            case "nul" -> repo.insert(4L, null, "대전");
                            default -> repo.findNameTypo("부산");
                        };
                        caller = r == null ? "null" : r instanceof String ? "\"" + r + "\"" : r + "행 추가됨";
                        kind = "예외 없음";
                    } catch (SQLException e) {
                        caller = "SQLException (" + sqlInfo(e) + ")";
                        kind = "체크 예외";
                        extra = "|class=" + e.getClass().getName() + "|errorCode=" + e.getErrorCode();
                    } catch (DataAccessException e) {
                        caller = e.getClass().getSimpleName();
                        kind = "언체크 예외";
                        Throwable cause = e.getCause();
                        extra = "|cause=" + (cause instanceof SQLException se ? "SQLException (" + sqlInfo(se) + ")" : String.valueOf(cause)) + "|message=" + e.getMessage().replace('\n', ' ');
                    }
                    int active = ds.getHikariPoolMXBean().getActiveConnections();
                    int rows = setup.queryForObject("select count(*) from member", Integer.class);
                    out.add(how + "|" + op + " => " + caller + "|" + kind + "|" + (active == 0 ? "반납됨" : "반납 안 됨") + "|active=" + active + "|rows=" + rows + extra);
                }
            }
        // JdbcTemplate이 예외를 변환하는 시점에 커넥션이 이미 반납되어 있는지: 변환기를 감싸서 그 순간에 쓰는 중인 커넥션 수를 적는다
        HikariConfig hc = new HikariConfig();
        hc.setJdbcUrl("jdbc:h2:mem:jdbctmpl;DB_CLOSE_DELAY=-1");
        hc.setMaximumPoolSize(4);
        try (HikariDataSource ds = new HikariDataSource(hc)) {
            JdbcTemplate t = new JdbcTemplate(ds);
            org.springframework.jdbc.support.SQLExceptionTranslator original = t.getExceptionTranslator();
            int[] activeAtTranslate = { -1 };
            t.setExceptionTranslator((task, sql, ex) -> { activeAtTranslate[0] = ds.getHikariPoolMXBean().getActiveConnections(); return original.translate(task, sql, ex); });
            String thrown;
            try { t.update(INSERT, 1L, "choi", "대전"); thrown = "예외 없음"; } catch (DataAccessException e) { thrown = e.getClass().getSimpleName(); }
            out.add("# JdbcTemplate의 기본 예외 변환기: " + original.getClass().getSimpleName() + " | 변환기가 불린 순간 쓰는 중인 커넥션 수: " + activeAtTranslate[0] + " | 던져진 예외: " + thrown);
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.stream().filter(l -> !l.startsWith("#")).count() + " combos");
    }
}
