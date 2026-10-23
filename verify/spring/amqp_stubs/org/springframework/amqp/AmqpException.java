package org.springframework.amqp;

// 대역: 공식 클래스는 RuntimeException을 물려받는다
public class AmqpException extends RuntimeException {
    public AmqpException(String message) { super(message); }
}
