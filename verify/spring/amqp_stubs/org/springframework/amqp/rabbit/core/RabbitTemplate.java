package org.springframework.amqp.rabbit.core;

import org.springframework.amqp.AmqpException;

// 대역: 시그니처만 옮김(public void convertAndSend(@Nullable String routingKey, Object object) throws AmqpException)
public class RabbitTemplate {
    public void convertAndSend(String routingKey, Object object) throws AmqpException { }
}
