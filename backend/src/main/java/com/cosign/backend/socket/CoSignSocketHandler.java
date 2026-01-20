package com.cosign.backend.socket;

import com.cosign.backend.model.User;
import com.cosign.backend.repository.UserRepository;
import com.cosign.backend.service.SocketService;
import com.cosign.backend.service.TaskService;
import com.cosign.backend.util.JwtUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jspecify.annotations.NonNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Component
public class CoSignSocketHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(CoSignSocketHandler.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();

    private final SocketService socketService;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;
    private final TaskService taskService;

    public CoSignSocketHandler(SocketService socketService, JwtUtils jwtUtils, 
                               UserRepository userRepository, @Lazy TaskService taskService) {
        this.socketService = socketService;
        this.jwtUtils = jwtUtils;
        this.userRepository = userRepository;
        this.taskService = taskService;
    }

    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) throws Exception {
        logger.info("WebSocket connection attempt from: {}", session.getRemoteAddress());
        
        // Get Token from query params: ws://localhost:8080/ws?token=XYZ
        String token = getTokenFromSession(session);

        // Validate Token
        if (token != null && jwtUtils.validateJwtToken(token)) {
            String email = jwtUtils.getUserNameFromJwtToken(token);
            Optional<User> userOpt = userRepository.findByEmail(email);

            if (userOpt.isPresent()) {
                Long userId = userOpt.get().getId();

                // Store userId and email in session attributes for easy access
                session.getAttributes().put("userId", userId);
                session.getAttributes().put("userEmail", email);

                socketService.addSession(userId, session);
                logger.info("WebSocket connected successfully for user: {} (ID: {})", email, userId);
                return;
            } else {
                logger.warn("WebSocket connection failed: user not found for email {}", email);
            }
        } else {
            logger.warn("WebSocket connection failed: invalid or missing token");
        }

        // Close if unauthorized
        session.close(CloseStatus.POLICY_VIOLATION);
    }

    @Override
    protected void handleTextMessage(@NonNull WebSocketSession session, @NonNull TextMessage message) {
        try {
            String userEmail = (String) session.getAttributes().get("userEmail");
            if (userEmail == null) {
                logger.warn("Received message from unauthenticated session");
                return;
            }

            JsonNode json = objectMapper.readTree(message.getPayload());
            String type = json.has("type") ? json.get("type").asText() : null;

            if ("TRIGGER_DEADLINE_CHECK".equals(type)) {
                Long taskId = json.has("taskId") ? json.get("taskId").asLong() : null;
                if (taskId != null) {
                    logger.info("Deadline check triggered for task {} by user {}", taskId, userEmail);
                    taskService.triggerDeadlineCheck(taskId, userEmail);
                }
            }
            // Add more message types here as needed
        } catch (Exception e) {
            logger.error("Error handling WebSocket message: {}", e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) {
        Long userId = (Long) session.getAttributes().get("userId");
        if (userId != null) {
            socketService.removeSession(userId, session);
        }
    }

    private String getTokenFromSession(WebSocketSession session) {
        try {
            List<String> tokens = UriComponentsBuilder.fromUri(Objects.requireNonNull(session.getUri()))
                    .build()
                    .getQueryParams()
                    .get("token");
            return (tokens != null && !tokens.isEmpty()) ? tokens.getFirst() : null;
        } catch (Exception e) {
            return null;
        }
    }
}
