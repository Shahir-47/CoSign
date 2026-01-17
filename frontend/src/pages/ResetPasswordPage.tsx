import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Lock, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getUserFriendlyMessage } from "../utils/api";
import AuthLayout from "../components/shared/AuthLayout";
import Card, { CardHeader, CardContent, CardFooter } from "../components/shared/Card";
import Input from "../components/shared/Input";
import Button from "../components/shared/Button";
import styles from "./ResetPasswordPage.module.css";

export default function ResetPasswordPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const token = searchParams.get("token");

	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | undefined>();
	const [success, setSuccess] = useState(false);
	const [passwordError, setPasswordError] = useState<string | undefined>();
	const [confirmError, setConfirmError] = useState<string | undefined>();

	useEffect(() => {
		if (!token) {
			setError("Invalid or missing reset token. Please request a new password reset link.");
		}
	}, [token]);

	const validatePassword = (value: string): string | undefined => {
		if (!value) return "Password is required";
		if (value.length < 8) return "Password must be at least 8 characters";
		return undefined;
	};

	const validateConfirmPassword = (value: string): string | undefined => {
		if (!value) return "Please confirm your password";
		if (value !== password) return "Passwords do not match";
		return undefined;
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();

		const pwdError = validatePassword(password);
		const confError = validateConfirmPassword(confirmPassword);

		if (pwdError || confError) {
			setPasswordError(pwdError);
			setConfirmError(confError);
			return;
		}

		if (!token) {
			setError("Invalid reset token");
			return;
		}

		setIsLoading(true);
		setError(undefined);

		try {
			const response = await fetch("/api/auth/reset-password", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ token, newPassword: password }),
			});

			if (!response.ok) {
				const errorText = await response.text();
				const userFriendlyError = getUserFriendlyMessage(
					errorText,
					response.status,
					"/auth/reset-password"
				);
				throw new Error(userFriendlyError);
			}

			setSuccess(true);
			toast.success("Password reset successfully!");
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Something went wrong";
			setError(errorMessage);
			toast.error(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	// No token - show error
	if (!token) {
		return (
			<AuthLayout>
				<Card className={styles.card}>
					<CardContent>
						<div className={styles.errorContent}>
							<div className={styles.errorIcon}>
								<AlertTriangle size={48} />
							</div>
							<h1 className={styles.errorTitle}>Invalid Link</h1>
							<p className={styles.errorMessage}>
								This password reset link is invalid or has expired. Please
								request a new one.
							</p>
							<Link to="/forgot-password">
								<Button>Request New Link</Button>
							</Link>
						</div>
					</CardContent>
				</Card>
			</AuthLayout>
		);
	}

	// Success state
	if (success) {
		return (
			<AuthLayout>
				<Card className={styles.card}>
					<CardContent>
						<div className={styles.successContent}>
							<div className={styles.successIcon}>
								<CheckCircle size={48} />
							</div>
							<h1 className={styles.successTitle}>Password Reset!</h1>
							<p className={styles.successMessage}>
								Your password has been successfully reset. You can now log in
								with your new password.
							</p>
							<Button onClick={() => navigate("/login")}>
								Go to Login
							</Button>
						</div>
					</CardContent>
				</Card>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout>
			<Card className={styles.card}>
				<CardHeader>
					<div className={styles.header}>
						<h1 className={styles.title}>Reset Password</h1>
						<p className={styles.subtitle}>
							Enter your new password below.
						</p>
					</div>
				</CardHeader>

				<CardContent>
					<form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
						{error && <div className={styles.error}>{error}</div>}

						<Input
							type="password"
							label="New Password"
							placeholder="Enter new password"
							value={password}
							onChange={(e) => {
								setPassword(e.target.value);
								if (passwordError) setPasswordError(validatePassword(e.target.value));
								if (confirmPassword && confirmError) {
									setConfirmError(
										e.target.value !== confirmPassword
											? "Passwords do not match"
											: undefined
									);
								}
							}}
							onBlur={() => setPasswordError(validatePassword(password))}
							error={passwordError}
							icon={<Lock size={18} />}
							name="new-password"
							autoComplete="new-password"
						/>

						<Input
							type="password"
							label="Confirm Password"
							placeholder="Confirm new password"
							value={confirmPassword}
							onChange={(e) => {
								setConfirmPassword(e.target.value);
								if (confirmError) setConfirmError(validateConfirmPassword(e.target.value));
							}}
							onBlur={() => setConfirmError(validateConfirmPassword(confirmPassword))}
							error={confirmError}
							icon={<Lock size={18} />}
							name="confirm-password"
							autoComplete="new-password"
						/>

						<Button
							type="submit"
							isLoading={isLoading}
							disabled={isLoading}
							fullWidth
						>
							Reset Password
						</Button>
					</form>
				</CardContent>

				<CardFooter>
					<div className={styles.footer}>
						<Link to="/login" className={styles.backLink}>
							<ArrowLeft size={16} />
							Back to Login
						</Link>
					</div>
				</CardFooter>
			</Card>
		</AuthLayout>
	);
}
