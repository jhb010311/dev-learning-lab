기초개념 "메시지 큐" 실습(src/lessons/269_queue_basic.js)과 "메시지 큐 기본" 실습(src/lessons/76_mq.js)의 화면 코드를 컴파일해 보려고 만든 대역이다. 실행하지 않는다.
spring-amqp(spring-rabbit)는 이 컴퓨터에 없어서, 화면 코드가 쓰는 클래스와 메서드의 이름·인자·돌려주는 타입만 공식 API 문서(Spring AMQP 4.1.2 API)와 소스(spring-amqp main 브랜치)에서 옮겼다(2026-10-23 확인).
  org.springframework.amqp.core.Queue: public Queue(String name)  ("The queue is durable, non-exclusive and non auto-delete.")
  org.springframework.amqp.rabbit.core.RabbitTemplate: public void convertAndSend(@Nullable String routingKey, Object object) throws AmqpException
      ("Convert a Java object to an Amqp Message and send it to a default exchange with a specific routing key." / 소스: DEFAULT_EXCHANGE = "")
  org.springframework.amqp.AmqpException: RuntimeException을 물려받는다
  org.springframework.amqp.rabbit.annotation.RabbitListener: @Target({TYPE, METHOD, ANNOTATION_TYPE}) @Retention(RUNTIME), String[] queues() default {}
      (실제 선언에 있는 @MessageMapping·@Repeatable과 다른 속성들은 옮기지 않았다)
사용: node verify/spring/cmp_queue_basic.js (queue_basic), node verify/spring/cmp_mq.js (mq)
