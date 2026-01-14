package com.cosign.backend.service;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class EmailService {

    @Value("${resend.api.key}")
    private String resendApiKey;

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    public void sendVerificationEmail(String toEmail, String verificationLink) {
        Resend resend = new Resend(resendApiKey);

        String htmlContent = String.format(
                "<h1>Welcome to CoSign!</h1>" +
                        "<p>Please verify your email by clicking the link below:</p>" +
                        "<a href=\"%s\">Verify Email</a>",
                verificationLink
        );

        CreateEmailOptions params = CreateEmailOptions.builder()
                .from("CoSign <verify@cosign.shahirahmed.com>")
                .to(toEmail)
                .subject("Verify your email")
                .html(htmlContent)
                .build();

        try {
            CreateEmailResponse data = resend.emails().send(params);
            logger.info("Email sent successfully to {}. ID: {}", toEmail, data.getId());
        } catch (ResendException e) {
            logger.error("Failed to send verification email to {}", toEmail, e);
            throw new RuntimeException("Failed to send verification email", e);
        }
    }
}