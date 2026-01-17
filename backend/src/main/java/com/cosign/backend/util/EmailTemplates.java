package com.cosign.backend.util;

/**
 * Branded email templates for CoSign
 */
public class EmailTemplates {

    private static final String BRAND_COLOR = "#6366f1";
    private static final String TEXT_PRIMARY = "#f5f5f7";
    private static final String TEXT_SECONDARY = "#a1a1aa";
    private static final String BG_PRIMARY = "#0f0f14";
    private static final String BG_CARD = "#1a1a24";
    private static final String BORDER_COLOR = "#2d2d3a";

    /**
     * Wraps content in a branded email template
     */
    public static String wrapInTemplate(String title, String content) {
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>%s</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: %s; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color: %s;">
                    <tr>
                        <td align="center" style="padding: 40px 20px;">
                            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width: 560px;">
                                
                                <!-- Logo -->
                                <tr>
                                    <td align="center" style="padding-bottom: 32px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="background-color: %s; padding: 10px 14px; border-radius: 10px;">
                                                    <span style="color: white; font-size: 20px; font-weight: bold;">✓✓</span>
                                                </td>
                                                <td style="padding-left: 12px;">
                                                    <span style="color: %s; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">CoSign</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                                <!-- Main Card -->
                                <tr>
                                    <td style="background-color: %s; border: 1px solid %s; border-radius: 16px; padding: 32px;">
                                        %s
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td align="center" style="padding-top: 32px;">
                                        <p style="margin: 0; color: %s; font-size: 13px;">
                                            Enforce accountability, honor commitments.
                                        </p>
                                        <p style="margin: 8px 0 0; color: %s; font-size: 12px;">
                                            © 2026 CoSign. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                                
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """.formatted(
                title,
                BG_PRIMARY, BG_PRIMARY,
                BRAND_COLOR, BRAND_COLOR,
                BG_CARD, BORDER_COLOR,
                content,
                TEXT_SECONDARY, TEXT_SECONDARY
            );
    }

    /**
     * Creates a primary action button
     */
    public static String button(String text, String url) {
        return """
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                    <td style="background-color: %s; border-radius: 8px; padding: 14px 28px;">
                        <a href="%s" style="color: white; text-decoration: none; font-size: 15px; font-weight: 600;">%s</a>
                    </td>
                </tr>
            </table>
            """.formatted(BRAND_COLOR, url, text);
    }

    /**
     * Verification email template
     */
    public static String verificationEmail(String verificationLink) {
        String content = """
            <h1 style="margin: 0 0 8px; color: %s; font-size: 24px; font-weight: 700;">Welcome to CoSign!</h1>
            <p style="margin: 0 0 24px; color: %s; font-size: 15px; line-height: 1.6;">
                Thanks for signing up. Please verify your email address to get started with accountability-driven productivity.
            </p>
            %s
            <p style="margin: 0; color: %s; font-size: 13px; line-height: 1.5;">
                If you didn't create an account, you can safely ignore this email.
            </p>
            <p style="margin: 16px 0 0; color: %s; font-size: 12px;">
                This link expires in 24 hours.
            </p>
            """.formatted(
                TEXT_PRIMARY,
                TEXT_SECONDARY,
                button("Verify Email Address", verificationLink),
                TEXT_SECONDARY,
                TEXT_SECONDARY
            );

        return wrapInTemplate("Verify your email - CoSign", content);
    }

    /**
     * Penalty triggered email template
     */
    public static String penaltyEmail(String creatorName, String taskTitle, String penaltyContent, String attachmentsHtml) {
        String attachmentSection = "";
        if (attachmentsHtml != null && !attachmentsHtml.isEmpty()) {
            attachmentSection = """
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid %s;">
                    <p style="margin: 0 0 12px; color: %s; font-size: 14px; font-weight: 600;">Attachments:</p>
                    <div style="color: %s; font-size: 14px;">%s</div>
                </div>
                """.formatted(BORDER_COLOR, TEXT_PRIMARY, BRAND_COLOR, attachmentsHtml);
        }

        String content = """
            <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; background-color: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">
                    ⚠️ Penalty Triggered
                </span>
            </div>
            
            <h1 style="margin: 0 0 8px; color: %s; font-size: 22px; font-weight: 700; text-align: center;">
                Task Failed
            </h1>
            <p style="margin: 0 0 24px; color: %s; font-size: 15px; line-height: 1.6; text-align: center;">
                <strong style="color: %s;">%s</strong> failed to complete their commitment and the penalty has been revealed.
            </p>
            
            <div style="background-color: %s; border: 1px solid %s; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 4px; color: %s; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Failed Task</p>
                <p style="margin: 0; color: %s; font-size: 16px; font-weight: 600;">%s</p>
            </div>
            
            <div style="background-color: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 10px; padding: 20px;">
                <p style="margin: 0 0 12px; color: #ef4444; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                    🔓 Revealed Penalty
                </p>
                <div style="color: %s; font-size: 15px; line-height: 1.6;">
                    %s
                </div>
                %s
            </div>
            
            <p style="margin: 24px 0 0; color: %s; font-size: 13px; text-align: center;">
                As their verifier, it's your discretion whether to act on this penalty.
            </p>
            """.formatted(
                TEXT_PRIMARY,
                TEXT_SECONDARY, TEXT_PRIMARY, creatorName,
                BG_PRIMARY, BORDER_COLOR,
                TEXT_SECONDARY, TEXT_PRIMARY, taskTitle,
                TEXT_PRIMARY, penaltyContent,
                attachmentSection,
                TEXT_SECONDARY
            );

        return wrapInTemplate("Penalty Triggered - CoSign", content);
    }

    /**
     * Task verification request email template
     */
    public static String verificationRequestEmail(String creatorName, String taskTitle, String proofContent, String verifyUrl) {
        String content = """
            <h1 style="margin: 0 0 8px; color: %s; font-size: 22px; font-weight: 700;">Verification Requested</h1>
            <p style="margin: 0 0 24px; color: %s; font-size: 15px; line-height: 1.6;">
                <strong style="color: %s;">%s</strong> has submitted proof for their task and needs your verification.
            </p>
            
            <div style="background-color: %s; border: 1px solid %s; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 4px; color: %s; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Task</p>
                <p style="margin: 0; color: %s; font-size: 16px; font-weight: 600;">%s</p>
            </div>
            
            <div style="background-color: %s; border: 1px solid %s; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; color: %s; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Submitted Proof</p>
                <div style="color: %s; font-size: 14px; line-height: 1.6;">%s</div>
            </div>
            
            %s
            
            <p style="margin: 0; color: %s; font-size: 13px; text-align: center;">
                Review the proof and approve or reject it in your CoSign dashboard.
            </p>
            """.formatted(
                TEXT_PRIMARY,
                TEXT_SECONDARY, TEXT_PRIMARY, creatorName,
                BG_PRIMARY, BORDER_COLOR,
                TEXT_SECONDARY, TEXT_PRIMARY, taskTitle,
                BG_PRIMARY, BORDER_COLOR,
                TEXT_SECONDARY, TEXT_PRIMARY, proofContent,
                button("Review in CoSign", verifyUrl),
                TEXT_SECONDARY
            );

        return wrapInTemplate("Verification Requested - CoSign", content);
    }
}
