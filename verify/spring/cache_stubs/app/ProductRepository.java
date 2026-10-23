package app;

import org.springframework.data.jpa.repository.JpaRepository;

// 화면 코드의 "예시로 만든 것(선언 생략)": ProductRepository
public interface ProductRepository extends JpaRepository<Product, Long> {
}
