package com.cosign.backend.socket;

import com.cosign.backend.model.User;
import com.cosign.backend.repository.UserRepository;
import com.cosign.backend.service.SocketService;
import com.cosign.backend.util.JwtUtils;
import org.jspecify.annotations.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Component
public class CoSignSocketHandler extends TextWebSocketHandler {

    private final SocketService socketService;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;

    public CoSignSocketHandler(SocketService socketService, JwtUtils jwtUtils, UserRepository userRepository) {
        this.socketService = socketService;
        this.jwtUtils = jwtUtils;
        this.userRepository = userRepository;
    }

    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) throws Exception {
        // Get Token from query params: ws://localhost:8080/ws?token=XYZ
        String token = getTokenFromSession(session);

        // Validate Token
        if (token != null && jwtUtils.validateJwtToken(token)) {
            String email = jwtUtils.getUserNameFromJwtToken(token);
            Optional<User> userOpt = userRepository.findByEmail(email);

            if (userOpt.isPresent()) {
                Long userId = userOpt.get().getId();

                // Store userId in session attributes for easy access on close
                session.getAttributes().put("userId", userId);

                socketService.addSession(userId, session);
                return;
            }
        }

        // Close if unauthorized
        session.close(CloseStatus.POLICY_VIOLATION);
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) {
        Long userId = (Long) session.getAttributes().get("userId");
        if (userId != null) {
            socketService.removeSession(userId);
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