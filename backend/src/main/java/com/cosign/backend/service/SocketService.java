package com.cosign.backend.service;

import com.cosign.backend.model.User;
import com.cosign.backend.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SocketService {

    private static final Logger logger = LoggerFactory.getLogger(SocketService.class);

    // Concurrent map to store active sessions which maps UserId to Session
    private final Map<Long, WebSocketSession> userSessions = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;

    // Used @Lazy for UserRepository to avoid potential circular deps if Repo depends on Service later
    public SocketService(ObjectMapper objectMapper, @Lazy UserRepository userRepository) {
        this.objectMapper = objectMapper;
        this.userRepository = userRepository;
    }

    public void addSession(Long userId, WebSocketSession session) {
        userSessions.put(userId, session);
        logger.info("User {} connected via Socket", userId);
        broadcastUserStatus(userId, true);
    }

    public void removeSession(Long userId) {
        // Capture the session object returned by remove()
        WebSocketSession session = userSessions.remove(userId);

        // Safely close it if it exists and is currently open
        if (session != null) {
            try {
                if (session.isOpen()) {
                    session.close();
                }
            } catch (IOException e) {
                logger.error("Error closing session for user {}", userId, e);
            }
        }

        logger.info("User {} disconnected", userId);
        broadcastUserStatus(userId, false);
    }

    public void sendToUser(Long userId, String eventType, Object payload) {
        WebSocketSession session = userSessions.get(userId);

        if (session != null && session.isOpen()) {
            try {
                Map<String, Object> message = Map.of(
                        "type", eventType,
                        "payload", payload
                );
                String json = objectMapper.writeValueAsString(message);

                synchronized (session) {
                    session.sendMessage(new TextMessage(json));
                }
            } catch (IOException e) {
                logger.error("Error sending socket message to user {}", userId, e);
            }
        }
    }

    /**
     * Broadcasts ONLINE/OFFLINE status to relevant users.
     * Logic:
     * If I am a User, notify my Saved Verifiers.
     * If I am a Verifier, notify the Users who saved me.
     */
    private void broadcastUserStatus(Long userId, boolean isOnline) {
        // Run in a separate thread to not block the socket handler
        new Thread(() -> {
            try {
                User user = userRepository.findById(userId).orElse(null);
                if (user == null) return;

                // Notify my Saved Verifiers
                Set<User> myVerifiers = user.getSavedVerifiers();
                for (User verifier : myVerifiers) {
                    sendToUser(verifier.getId(), "USER_STATUS", Map.of(
                            "userId", userId,
                            "isOnline", isOnline
                    ));
                }

                // Notify users who have saved Me
                List<User> myClients = userRepository.findUsersBySavedVerifier(userId);
                for (User client : myClients) {
                    sendToUser(client.getId(), "USER_STATUS", Map.of(
                            "userId", userId,
                            "isOnline", isOnline
                    ));
                }

            } catch (Exception e) {
                logger.error("Failed to broadcast status for user {}", userId, e);
            }
        }).start();
    }

}