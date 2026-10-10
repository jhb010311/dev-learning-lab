import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Payload;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
import org.springframework.core.SpringVersion;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.validation.BindException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.Errors;
import org.springframework.validation.FieldError;
import org.springframework.validation.annotation.Validated;
import org.springframework.validation.method.ParameterValidationResult;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.HandlerExceptionResolver;
import org.springframework.web.servlet.ModelAndView;

// "검증" 실습의 조합을 실제 스프링 부트 서버(내장 톰캣)에 HTTP 요청을 보내 확인한다.
// 받는 방법 네 가지(@Valid 없음, @Valid, @Valid + BindingResult, 파라미터에 직접 붙인 제약) x 제약 세 가지(@NotNull, @NotEmpty, @NotBlank)
// x 보내는 name 값 네 가지(보내지 않음, "", " ", "pen")를 요청해 상태 코드, 검증이 실제로 돌았는지, 어긴 제약, 컨트롤러 실행 여부와 돌려준 글,
// 스프링이 던진 예외의 이름을 적는다. 조합마다 주소 앞에 /plain/notblank 같은 구분을 붙였다(화면에서는 모두 /items).
// 화면의 코드와 다른 점은 하나다. "검증이 실제로 돌았는지"를 보려고 항상 통과하는 제약 @Seen을 폼 클래스와 파라미터에 더 붙였다.
@SpringBootConfiguration
@EnableAutoConfiguration
public class ValidationProbe {
    static volatile boolean ctrl, seen;
    static volatile String ret, ex, viol;

    // 항상 통과하는 제약. 검증기가 이 객체(또는 파라미터)를 실제로 검사했는지만 기록한다.
    @Target({ ElementType.TYPE, ElementType.PARAMETER }) @Retention(RetentionPolicy.RUNTIME) @Constraint(validatedBy = SeenValidator.class)
    public @interface Seen { String message() default "seen"; Class<?>[] groups() default {}; Class<? extends Payload>[] payload() default {}; }
    public static class SeenValidator implements ConstraintValidator<Seen, Object> {
        @Override public boolean isValid(Object value, ConstraintValidatorContext context) { seen = true; return true; }
    }

    // 화면의 ItemForm과 같은 모양: 제약이 붙은 필드 하나와 getter, setter. 제약마다 클래스를 하나씩 둔다.
    @Seen public static class NotNullForm {
        @NotNull private String name;
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
    }
    @Seen public static class NotEmptyForm {
        @NotEmpty private String name;
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
    }
    @Seen public static class NotBlankForm {
        @NotBlank private String name;
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
    }

    @Bean SecurityFilterChain open(HttpSecurity http) throws Exception { return http.csrf(c -> c.disable()).authorizeHttpRequests(a -> a.anyRequest().permitAll()).build(); }

    static String code(MessageSourceResolvable e) { String[] c = e.getCodes(); return c == null || c.length == 0 ? "?" : c[c.length - 1]; }
    static String fields(Errors errors) {
        TreeSet<String> s = new TreeSet<>();
        for (FieldError fe : errors.getFieldErrors()) s.add(fe.getField() + ":" + fe.getCode());
        errors.getGlobalErrors().forEach(ge -> s.add("(객체):" + ge.getCode()));
        return s.isEmpty() ? "-" : String.join(",", s);
    }

    // 스프링이 요청을 거절할 때 던진 예외의 이름과, 그 안에 담긴 "어느 필드가 어느 제약을 어겼는지"를 적어 둔다. 처리는 하지 않고(null) 기본 처리기에 넘긴다.
    @Bean HandlerExceptionResolver recorder() { return new Recorder(); }
    static class Recorder implements HandlerExceptionResolver, Ordered {
        @Override public ModelAndView resolveException(HttpServletRequest req, HttpServletResponse res, Object handler, Exception e) {
            if (req.getDispatcherType() != DispatcherType.REQUEST) return null;
            ex = e.getClass().getSimpleName();
            if (e instanceof BindException be) viol = fields(be.getBindingResult());
            else if (e instanceof HandlerMethodValidationException he) {
                TreeSet<String> s = new TreeSet<>();
                for (ParameterValidationResult r : he.getParameterValidationResults()) {
                    if (r instanceof Errors errs) { for (FieldError fe : errs.getFieldErrors()) s.add(fe.getField() + ":" + fe.getCode()); }
                    else for (MessageSourceResolvable m : r.getResolvableErrors()) s.add(r.getMethodParameter().getParameterName() + ":" + code(m));
                }
                viol = s.isEmpty() ? "-" : String.join(",", s);
            } else if (e instanceof ConstraintViolationException ce) {
                TreeSet<String> s = new TreeSet<>();
                ce.getConstraintViolations().forEach(v -> s.add(v.getPropertyPath() + ":" + v.getConstraintDescriptor().getAnnotation().annotationType().getSimpleName()));
                viol = String.join(",", s);
            }
            return null;
        }
        @Override public int getOrder() { return Ordered.HIGHEST_PRECEDENCE; }
    }

    static String ran(String text) { ctrl = true; ret = text; return text; }
    static String added(String name) { return ran("등록: [" + name + "]"); }
    static String checked(String name, BindingResult errors) {
        if (errors.hasErrors()) { viol = fields(errors); return ran("오류 " + errors.getErrorCount() + "개"); }
        return added(name);
    }

    // 1) @Valid 없이 받기
    @RestController public static class PlainController {
        @PostMapping("/plain/notnull/items") public String a(@RequestBody NotNullForm form) { return added(form.getName()); }
        @PostMapping("/plain/notempty/items") public String b(@RequestBody NotEmptyForm form) { return added(form.getName()); }
        @PostMapping("/plain/notblank/items") public String c(@RequestBody NotBlankForm form) { return added(form.getName()); }
    }
    // 2) @Valid를 붙여 받기
    @RestController public static class ValidController {
        @PostMapping("/valid/notnull/items") public String a(@Valid @RequestBody NotNullForm form) { return added(form.getName()); }
        @PostMapping("/valid/notempty/items") public String b(@Valid @RequestBody NotEmptyForm form) { return added(form.getName()); }
        @PostMapping("/valid/notblank/items") public String c(@Valid @RequestBody NotBlankForm form) { return added(form.getName()); }
    }
    // 3) @Valid를 붙이고 바로 뒤에 BindingResult를 받기
    @RestController public static class BrController {
        @PostMapping("/br/notnull/items") public String a(@Valid @RequestBody NotNullForm form, BindingResult errors) { return checked(form.getName(), errors); }
        @PostMapping("/br/notempty/items") public String b(@Valid @RequestBody NotEmptyForm form, BindingResult errors) { return checked(form.getName(), errors); }
        @PostMapping("/br/notblank/items") public String c(@Valid @RequestBody NotBlankForm form, BindingResult errors) { return checked(form.getName(), errors); }
    }
    // 4) 객체로 묶지 않고, 파라미터에 제약을 직접 붙이기
    @RestController public static class ParamController {
        @GetMapping("/param/notnull/items") public String a(@RequestParam @NotNull @Seen String name) { return ran("검색: [" + name + "]"); }
        @GetMapping("/param/notempty/items") public String b(@RequestParam @NotEmpty @Seen String name) { return ran("검색: [" + name + "]"); }
        @GetMapping("/param/notblank/items") public String c(@RequestParam @NotBlank @Seen String name) { return ran("검색: [" + name + "]"); }
    }

    // ---- 아래는 화면의 조합에는 없고, 설명 글(assume)의 근거로만 쓴다 ----
    public interface OnCreate { }
    public static class GroupForm {
        @NotBlank(groups = OnCreate.class) private String name;
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
    }
    public static class Addr {
        @NotBlank private String city;
        public String getCity() { return city; }
        public void setCity(String city) { this.city = city; }
    }
    public static class NestValid {
        @Valid private Addr addr;
        public Addr getAddr() { return addr; }
        public void setAddr(Addr addr) { this.addr = addr; }
    }
    public static class NestPlain {
        private Addr addr;
        public Addr getAddr() { return addr; }
        public void setAddr(Addr addr) { this.addr = addr; }
    }
    public static class TwoForm {
        @NotBlank private String name;
        @Min(1) private int qty;
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public int getQty() { return qty; }
        public void setQty(int qty) { this.qty = qty; }
    }
    public static class BadTypeForm {
        @NotBlank private Integer qty;
        public Integer getQty() { return qty; }
        public void setQty(Integer qty) { this.qty = qty; }
    }
    static String city(Addr a) { return a == null ? "addr=null" : "city=[" + a.getCity() + "]"; }

    @RestController public static class ExtraController {
        @PostMapping("/x/validated/items") public String validated(@Validated @RequestBody NotBlankForm form) { return added(form.getName()); }
        @PostMapping("/x/model/notnull/items") public String ma(@Valid @ModelAttribute NotNullForm form) { return added(form.getName()); }
        @PostMapping("/x/model/notempty/items") public String mb(@Valid @ModelAttribute NotEmptyForm form) { return added(form.getName()); }
        @PostMapping("/x/model/notblank/items") public String mc(@Valid @ModelAttribute NotBlankForm form) { return added(form.getName()); }
        @PostMapping("/x/modelplain/items") public String mp(@ModelAttribute NotBlankForm form) { return added(form.getName()); }
        @PostMapping("/x/modelbr/items") public String mbr(@Valid @ModelAttribute NotBlankForm form, BindingResult errors) { return checked(form.getName(), errors); }
        @PostMapping("/x/nestvalid/items") public String nv(@Valid @RequestBody NestValid form) { return ran(city(form.getAddr())); }
        @PostMapping("/x/nestplain/items") public String np(@Valid @RequestBody NestPlain form) { return ran(city(form.getAddr())); }
        @PostMapping("/x/group-valid/items") public String gv(@Valid @RequestBody GroupForm form) { return added(form.getName()); }
        @PostMapping("/x/group-oncreate/items") public String gc(@Validated(OnCreate.class) @RequestBody GroupForm form) { return added(form.getName()); }
        @PostMapping("/x/default-oncreate/items") public String dc(@Validated(OnCreate.class) @RequestBody NotBlankForm form) { return added(form.getName()); }
        @PostMapping("/x/mixed/items") public String mixed(@Valid @RequestBody NotBlankForm form, @RequestParam @Min(1) int qty) { return added(form.getName() + "," + qty); }
        @GetMapping("/x/optparam/notnull/items") public String oa(@RequestParam(required = false) @NotNull @Seen String name) { return ran("검색: [" + name + "]"); }
        @GetMapping("/x/optparam/notblank/items") public String ob(@RequestParam(required = false) @NotBlank @Seen String name) { return ran("검색: [" + name + "]"); }
        @PostMapping("/x/two/items") public String two(@Valid @RequestBody TwoForm form, BindingResult errors) { return checked(form.getName(), errors); }
        @PostMapping("/x/twovalid/items") public String twov(@Valid @RequestBody TwoForm form) { return added(form.getName()); }
        @PostMapping("/x/badtype/items") public String bad(@Valid @RequestBody BadTypeForm form) { return ran("qty=" + form.getQty()); }
    }
    // BindingResult를 @Valid 파라미터 바로 뒤가 아닌 자리에 둔 경우
    @RestController public static class MisplacedController {
        @PostMapping("/x/misplaced/items") public String add(BindingResult errors, @Valid @RequestBody NotBlankForm form) { return checked(form.getName(), errors); }
    }
    // 검증 실패를 @ExceptionHandler로 받아 어느 필드가 어느 제약을 어겼는지 응답 본문에 적는 경우(이 컨트롤러에만 적용)
    @RestController public static class AdvisedController {
        @PostMapping("/x/advised/items") public String add(@Valid @RequestBody NotBlankForm form) { return added(form.getName()); }
    }
    @RestControllerAdvice(assignableTypes = AdvisedController.class) public static class Advice {
        @ExceptionHandler(MethodArgumentNotValidException.class) @ResponseStatus(HttpStatus.BAD_REQUEST)
        public Map<String, String> invalid(MethodArgumentNotValidException e) {
            Map<String, String> m = new TreeMap<>();
            for (FieldError fe : e.getBindingResult().getFieldErrors()) m.put(fe.getField(), fe.getCode());
            return m;
        }
    }
    // 컨트롤러 클래스에 @Validated를 붙인 경우(스프링 6.1 이전에 파라미터 제약을 검사시키던 방법)
    @Validated @RestController public static class ClassValidatedController {
        @GetMapping("/x/classv/items") public String find(@RequestParam @NotBlank @Seen String name) { return ran("검색: [" + name + "]"); }
        @PostMapping("/x/classv/items") public String add(@Valid @RequestBody NotBlankForm form) { return added(form.getName()); }
    }

    static final String[] VALS = { "none", "empty", "blank", "pen" };
    static String json(String val) { return switch (val) { case "none" -> "{}"; case "null" -> "{\"name\":null}"; case "empty" -> "{\"name\":\"\"}"; case "blank" -> "{\"name\":\" \"}"; default -> "{\"name\":\"pen\"}"; }; }
    static String query(String val) { return switch (val) { case "none" -> ""; case "empty" -> "name="; case "blank" -> "name=%20"; default -> "name=pen"; }; }
    static HttpRequest postJson(String url, String body) { return HttpRequest.newBuilder(URI.create(url)).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build(); }
    static HttpRequest postForm(String url, String body) { return HttpRequest.newBuilder(URI.create(url)).header("Content-Type", "application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString(body)).build(); }
    static HttpRequest get(String url, String q) { return HttpRequest.newBuilder(URI.create(url + (q.isEmpty() ? "" : "?" + q))).GET().build(); }

    static HttpClient client = HttpClient.newHttpClient();
    static HttpResponse<String> last;
    static String send(HttpRequest rq) throws Exception {
        ctrl = false; seen = false; ret = "-"; ex = "-"; viol = "-";
        last = client.send(rq, HttpResponse.BodyHandlers.ofString());
        return last.statusCode() + "|seen=" + seen + "|viol=" + viol + "|ctrl=" + ctrl + "|ret=" + ret + "|ex=" + ex;
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | spring framework " + SpringVersion.getVersion()
            + " | hibernate validator " + org.hibernate.validator.HibernateValidator.class.getPackage().getImplementationVersion()
            + " | locale " + java.util.Locale.getDefault());
        SpringApplication app = new SpringApplication(ValidationProbe.class);
        app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
        try (ConfigurableApplicationContext ctx = app.run("--server.port=0", "--logging.level.root=OFF")) {
            String base = "http://127.0.0.1:" + ctx.getEnvironment().getProperty("local.server.port");
            for (String how : new String[] { "plain", "valid", "br", "param" })
                for (String con : new String[] { "notnull", "notempty", "notblank" })
                    for (String val : VALS) {
                        String url = base + "/" + how + "/" + con + "/items";
                        out.add(how + "|" + con + "|" + val + " => " + send(how.equals("param") ? get(url, query(val)) : postJson(url, json(val))));
                    }
            // ---- 화면에 없는 경우 ----
            out.add("# extra validated(@Validated @RequestBody, @NotBlank)|empty => " + send(postJson(base + "/x/validated/items", json("empty"))));
            out.add("# extra validated(@Validated @RequestBody, @NotBlank)|pen => " + send(postJson(base + "/x/validated/items", json("pen"))));
            out.add("# extra valid notnull|{\"name\":null} => " + send(postJson(base + "/valid/notnull/items", json("null"))));
            for (String con : new String[] { "notnull", "notempty", "notblank" })
                for (String val : VALS)
                    out.add("# extra model(@Valid @ModelAttribute, 폼 본문 '" + query(val) + "')|" + con + "|" + val + " => " + send(postForm(base + "/x/model/" + con + "/items", query(val))));
            out.add("# extra modelplain(@ModelAttribute, @Valid 없음, @NotBlank)|empty => " + send(postForm(base + "/x/modelplain/items", query("empty"))));
            out.add("# extra modelbr(@Valid @ModelAttribute + BindingResult, @NotBlank)|empty => " + send(postForm(base + "/x/modelbr/items", query("empty"))));
            String nested = "{\"addr\":{\"city\":\"\"}}";
            out.add("# extra nestvalid(필드에 @Valid Addr addr)|" + nested + " => " + send(postJson(base + "/x/nestvalid/items", nested)));
            out.add("# extra nestplain(필드에 @Valid 없음)|" + nested + " => " + send(postJson(base + "/x/nestplain/items", nested)));
            out.add("# extra nestvalid(필드에 @Valid Addr addr)|{} => " + send(postJson(base + "/x/nestvalid/items", "{}")));
            out.add("# extra group(@NotBlank(groups = OnCreate.class) + @Valid)|empty => " + send(postJson(base + "/x/group-valid/items", json("empty"))));
            out.add("# extra group(@NotBlank(groups = OnCreate.class) + @Validated(OnCreate.class))|empty => " + send(postJson(base + "/x/group-oncreate/items", json("empty"))));
            out.add("# extra group(@NotBlank 그룹 없음 + @Validated(OnCreate.class))|empty => " + send(postJson(base + "/x/default-oncreate/items", json("empty"))));
            out.add("# extra mixed(@Valid @RequestBody + @RequestParam @Min(1) int qty)|name empty, qty=1 => " + send(postJson(base + "/x/mixed/items?qty=1", json("empty"))));
            out.add("# extra mixed(@Valid @RequestBody + @RequestParam @Min(1) int qty)|name pen, qty=0 => " + send(postJson(base + "/x/mixed/items?qty=0", json("pen"))));
            out.add("# extra mixed(@Valid @RequestBody + @RequestParam @Min(1) int qty)|name pen, qty=1 => " + send(postJson(base + "/x/mixed/items?qty=1", json("pen"))));
            out.add("# extra optparam(@RequestParam(required = false) @NotNull)|none => " + send(get(base + "/x/optparam/notnull/items", "")));
            out.add("# extra optparam(@RequestParam(required = false) @NotBlank)|none => " + send(get(base + "/x/optparam/notblank/items", "")));
            out.add("# extra two(@NotBlank name, @Min(1) int qty + BindingResult)|{} => " + send(postJson(base + "/x/two/items", "{}")));
            out.add("# extra twovalid(@NotBlank name, @Min(1) int qty)|{} => " + send(postJson(base + "/x/twovalid/items", "{}")));
            out.add("# extra badtype(@NotBlank Integer qty)|{\"qty\":1} => " + send(postJson(base + "/x/badtype/items", "{\"qty\":1}")));
            out.add("# extra classv(클래스에 @Validated, @RequestParam @NotBlank)|empty => " + send(get(base + "/x/classv/items", query("empty"))));
            out.add("# extra classv(클래스에 @Validated, @RequestParam @NotBlank)|pen => " + send(get(base + "/x/classv/items", query("pen"))));
            out.add("# extra classv(클래스에 @Validated, @Valid @RequestBody @NotBlank)|empty => " + send(postJson(base + "/x/classv/items", json("empty"))));
            out.add("# extra misplaced(BindingResult를 @Valid 파라미터 앞에 둠, @NotBlank)|empty => " + send(postJson(base + "/x/misplaced/items", json("empty"))));
            out.add("# extra advised(@ExceptionHandler(MethodArgumentNotValidException.class)로 직접 응답)|empty => " + send(postJson(base + "/x/advised/items", json("empty"))) + "|body=" + last.body());
            // 검증기가 만든 기본 메시지(서버의 언어 설정에 따라 달라진다. 결과로 삼지 않는다)
            jakarta.validation.Validator validator = ctx.getBean(jakarta.validation.Validator.class);
            List<String> msgs = new ArrayList<>();
            validator.validate(new NotNullForm()).forEach(v -> msgs.add("@NotNull: " + v.getMessage()));
            validator.validate(new NotEmptyForm()).forEach(v -> msgs.add("@NotEmpty: " + v.getMessage()));
            validator.validate(new NotBlankForm()).forEach(v -> msgs.add("@NotBlank: " + v.getMessage()));
            out.add("# extra 이 PC(" + java.util.Locale.getDefault() + ")에서 본 기본 메시지 => " + String.join(" / ", msgs));
            // 기본 오류 응답 본문에 어떤 항목이 들어 있는지(값은 시각 등이 섞여 있어 이름만 적는다)
            send(postJson(base + "/valid/notblank/items", json("empty")));
            List<String> keys = new ArrayList<>(); Matcher m = Pattern.compile("\"([A-Za-z]+)\":").matcher(last.body());
            while (m.find()) keys.add(m.group(1));
            out.add("# extra 기본 오류 응답 본문의 항목(valid|notblank|empty) => " + last.statusCode() + "|" + last.headers().firstValue("Content-Type").orElse("-") + "|" + String.join(",", keys));
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + out.stream().filter(l -> !l.startsWith("#")).count() + " combos");
    }
}
