package com.cosign.backend.config;

import com.cosign.backend.socket.CoSignSocketHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final CoSignSocketHandler coSignSocketHandler;

    @Value("${app.frontend.url}")
    private String clientUrl;

    public WebSocketConfig(CoSignSocketHandler coSignSocketHandler) {
        this.coSignSocketHandler = coSignSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(coSignSocketHandler, "/ws")
                .setAllowedOrigins(clientUrl);
    }
}