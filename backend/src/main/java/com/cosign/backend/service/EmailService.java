package com.cosign.backend.service;

import com.cosign.backend.util.EmailTemplates;
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

        String htmlContent = EmailTemplates.verificationEmail(verificationLink);

        CreateEmailOptions params = CreateEmailOptions.builder()
                .from("CoSign <verify@cosign.shahirahmed.com>")
                .to(toEmail)
                .subject("Verify your email - CoSign")
                .html(htmlContent)
                .build();

        try {
            CreateEmailResponse data = resend.emails().send(params);
            logger.info("Verification email sent successfully to {}. ID: {}", toEmail, data.getId());
        } catch (ResendException e) {
            logger.error("Failed to send verification email to {}", toEmail, e);
            throw new RuntimeException("Failed to send verification email", e);
        }
    }

    public void sendEmail(String toEmail, String subject, String htmlContent) {
        Resend resend = new Resend(resendApiKey);

        CreateEmailOptions params = CreateEmailOptions.builder()
                .from("CoSign <notifications@cosign.shahirahmed.com>")
                .to(toEmail)
                .subject(subject)
                .html(htmlContent)
                .build();

        try {
            CreateEmailResponse data = resend.emails().send(params);
            logger.info("Email sent successfully to {}. ID: {}", toEmail, data.getId());
        } catch (ResendException e) {
            logger.error("Failed to send email to {}", toEmail, e);
            throw new RuntimeException("Failed to send email", e);
        }
    }

    public void sendPenaltyEmail(String toEmail, String creatorName, String taskTitle, String penaltyContent, String attachmentsHtml) {
        Resend resend = new Resend(resendApiKey);

        String htmlContent = EmailTemplates.penaltyEmail(creatorName, taskTitle, penaltyContent, attachmentsHtml);

        CreateEmailOptions params = CreateEmailOptions.builder()
                .from("CoSign <notifications@cosign.shahirahmed.com>")
                .to(toEmail)
                .subject("⚠️ Penalty Triggered: " + creatorName + " failed a task")
                .html(htmlContent)
                .build();

        try {
            CreateEmailResponse data = resend.emails().send(params);
            logger.info("Penalty email sent successfully to {}. ID: {}", toEmail, data.getId());
        } catch (ResendException e) {
            logger.error("Failed to send penalty email to {}", toEmail, e);
            throw new RuntimeException("Failed to send penalty email", e);
        }
    }

    public void sendPasswordResetEmail(String toEmail, String resetLink) {
        Resend resend = new Resend(resendApiKey);

        String htmlContent = EmailTemplates.passwordResetEmail(resetLink);

        CreateEmailOptions params = CreateEmailOptions.builder()
                .from("CoSign <security@cosign.shahirahmed.com>")
                .to(toEmail)
                .subject("Reset your password - CoSign")
                .html(htmlContent)
                .build();

        try {
            CreateEmailResponse data = resend.emails().send(params);
            logger.info("Password reset email sent to {}. ID: {}", toEmail, data.getId());
        } catch (ResendException e) {
            logger.error("Failed to send password reset email to {}", toEmail, e);
            throw new RuntimeException("Failed to send password reset email", e);
        }
    }
}