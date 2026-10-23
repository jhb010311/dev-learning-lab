package app;

// 화면 코드의 "예시로 만든 것(선언 생략)": Product
public record Product(long id, String name, int price) implements java.io.Serializable {
}
