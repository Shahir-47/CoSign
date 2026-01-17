import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import AuthLayout from "../components/shared/AuthLayout";
import Card, { CardContent, CardFooter } from "../components/shared/Card";
import VerifyEmailStatus from "../components/verify-email/VerifyEmailStatus";
import VerifyEmailActions from "../components/verify-email/VerifyEmailActions";
import styles from "./VerifyEmailPage.module.css";

type VerificationStatus = "loading" | "success" | "error";

// Map technical error messages to user-friendly ones
function getUserFriendlyVerifyError(error: string): string {
	const lowerError = error.toLowerCase();

	if (lowerError.includes("expired")) {
		return "This verification link has expired. Please request a new one.";
	}
	if (lowerError.includes("invalid") || lowerError.includes("not found")) {
		return "This verification link is invalid. Please check your email for the correct link.";
	}
	if (lowerError.includes("already verified")) {
		return "Your email has already been verified. You can log in now.";
	}

	return error;
}

export default function VerifyEmailPage() {
	const [searchParams] = useSearchParams();
	const [status, setStatus] = useState<VerificationStatus>("loading");
	const [error, setError] = useState<string | undefined>();

	const token = searchParams.get("token");

	const verifyEmail = useCallback(async () => {
		if (!token) {
			setStatus("error");
			setError("Verification token is missing. Please check your email link.");
			return;
		}

		setStatus("loading");
		setError(undefined);

		try {
			const response = await fetch(
				`/api/auth/verify-email?token=${encodeURIComponent(token)}`
			);

			if (!response.ok) {
				const errorText = await response.text();
				const userFriendlyError = getUserFriendlyVerifyError(
					errorText || "Failed to verify email"
				);
				throw new Error(userFriendlyError);
			}

			setStatus("success");
			toast.success("Email verified successfully! You can now log in.");
		} catch (err) {
			setStatus("error");
			const errorMessage =
				err instanceof Error ? err.message : "An unexpected error occurred";
			setError(errorMessage);
			toast.error(errorMessage);
		}
	}, [token]);

	useEffect(() => {
		verifyEmail();
	}, [verifyEmail]);

	const handleRetry = () => {
		verifyEmail();
	};

	return (
		<AuthLayout>
			<Card className={styles.card}>
				<CardContent>
					<VerifyEmailStatus
						status={status}
						error={error}
						onRetry={handleRetry}
					/>
				</CardContent>
				<CardFooter>
					<VerifyEmailActions status={status} />
				</CardFooter>
			</Card>
		</AuthLayout>
	);
}
