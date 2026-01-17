import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import { getUserFriendlyMessage } from "../utils/api";
import AuthLayout from "../components/shared/AuthLayout";
import Card, {
	CardHeader,
	CardContent,
	CardFooter,
} from "../components/shared/Card";
import SignupHeader from "../components/signup/SignupHeader";
import SignupForm from "../components/signup/SignupForm";
import type { SignupFormData } from "../components/signup/SignupForm";
import SignupFooter from "../components/signup/SignupFooter";
import styles from "./SignupPage.module.css";

export default function SignupPage() {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | undefined>();
	const [success, setSuccess] = useState(false);
	const [submittedEmail, setSubmittedEmail] = useState("");

	const handleSubmit = async (data: SignupFormData) => {
		setIsLoading(true);
		setError(undefined);

		try {
			const response = await fetch("/api/auth/signup", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorText = await response.text();
				const userFriendlyError = getUserFriendlyMessage(
					errorText,
					response.status,
					"/auth/signup"
				);
				throw new Error(userFriendlyError);
			}

			setSubmittedEmail(data.email);
			setSuccess(true);
			toast.success("Account created! Please check your email to verify.");
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "An unexpected error occurred";
			setError(errorMessage);
			toast.error(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	if (success) {
		return (
			<AuthLayout>
				<Card className={styles.card}>
					<CardContent>
						<SuccessMessage email={submittedEmail} />
					</CardContent>
				</Card>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout>
			<Card className={styles.card}>
				<CardHeader>
					<SignupHeader />
				</CardHeader>
				<CardContent>
					<SignupForm
						onSubmit={handleSubmit}
						isLoading={isLoading}
						error={error}
					/>
				</CardContent>
				<CardFooter>
					<SignupFooter />
				</CardFooter>
			</Card>
		</AuthLayout>
	);
}

interface SuccessMessageProps {
	email: string;
}

function SuccessMessage({ email }: SuccessMessageProps) {
	const [isResending, setIsResending] = useState(false);
	const [resendStatus, setResendStatus] = useState<
		"idle" | "success" | "error"
	>("idle");
	const [resendError, setResendError] = useState<string | undefined>();
	const [cooldown, setCooldown] = useState(0);

	const handleResend = async () => {
		if (cooldown > 0 || isResending) return;

		setIsResending(true);
		setResendStatus("idle");
		setResendError(undefined);

		try {
			const response = await fetch("/api/auth/resend-verification", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email }),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(errorText || "Failed to resend verification email");
			}

			setResendStatus("success");
			toast.success("Verification email sent! Please check your inbox.");
			// Start 60 second cooldown
			setCooldown(60);
			const interval = setInterval(() => {
				setCooldown((prev) => {
					if (prev <= 1) {
						clearInterval(interval);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		} catch (err) {
			setResendStatus("error");
			const errorMessage =
				err instanceof Error ? err.message : "An unexpected error occurred";
			setResendError(errorMessage);
			toast.error(errorMessage);
		} finally {
			setIsResending(false);
		}
	};

	return (
		<div className={styles.success}>
			<div className={styles.successIcon}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="48"
					height="48"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<rect width="20" height="16" x="2" y="4" rx="2" />
					<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
				</svg>
			</div>
			<h2 className={styles.successTitle}>Check Your Email</h2>
			<p className={styles.successText}>
				We've sent a verification link to <strong>{email}</strong>
			</p>
			<p className={styles.successSubtext}>
				Click the link in the email to verify your account and get started with
				CoSign. The link will expire in 24 hours.
			</p>

			<div className={styles.resendSection}>
				{resendStatus === "success" && (
					<p className={styles.resendSuccess}>
						Verification email sent successfully!
					</p>
				)}
				{resendStatus === "error" && (
					<p className={styles.resendError}>{resendError}</p>
				)}
				<button
					className={styles.resendButton}
					onClick={handleResend}
					disabled={isResending || cooldown > 0}
				>
					<RefreshCw size={16} className={isResending ? styles.spinning : ""} />
					{isResending
						? "Sending..."
						: cooldown > 0
						? `Resend in ${cooldown}s`
						: "Resend Verification Email"}
				</button>
			</div>

			<div className={styles.successTips}>
				<p>Didn't receive the email?</p>
				<ul>
					<li>Check your spam or junk folder</li>
					<li>Make sure the email address is correct</li>
					<li>Wait a few minutes and check again</li>
				</ul>
			</div>
		</div>
	);
}
