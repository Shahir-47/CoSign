import { useState } from "react";
import type { FormEvent } from "react";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { getUserFriendlyMessage } from "../utils/api";
import AuthLayout from "../components/shared/AuthLayout";
import Card, {
	CardHeader,
	CardContent,
	CardFooter,
} from "../components/shared/Card";
import Input from "../components/shared/Input";
import Button from "../components/shared/Button";
import styles from "./ForgotPasswordPage.module.css";

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | undefined>();
	const [success, setSuccess] = useState(false);
	const [emailError, setEmailError] = useState<string | undefined>();

	const validateEmail = (value: string): string | undefined => {
		if (!value.trim()) return "Email is required";
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(value)) return "Please enter a valid email";
		return undefined;
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();

		const validationError = validateEmail(email);
		if (validationError) {
			setEmailError(validationError);
			return;
		}

		setIsLoading(true);
		setError(undefined);

		try {
			const response = await fetch("/api/auth/forgot-password", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email }),
			});

			if (!response.ok) {
				const errorText = await response.text();
				const userFriendlyError = getUserFriendlyMessage(
					errorText,
					response.status,
					"/auth/forgot-password"
				);
				throw new Error(userFriendlyError);
			}

			setSuccess(true);
			toast.success("Password reset email sent!");
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Something went wrong";
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
						<div className={styles.successContent}>
							<div className={styles.successIcon}>
								<CheckCircle size={48} />
							</div>
							<h1 className={styles.successTitle}>Check Your Email</h1>
							<p className={styles.successMessage}>
								If an account exists with <strong>{email}</strong>, we've sent a
								password reset link. Please check your inbox and spam folder.
							</p>
							<p className={styles.successNote}>The link expires in 1 hour.</p>
							<Link to="/login" className={styles.backLink}>
								<ArrowLeft size={18} />
								Back to Login
							</Link>
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
						<h1 className={styles.title}>Forgot Password?</h1>
						<p className={styles.subtitle}>
							Enter your email address and we'll send you a link to reset your
							password.
						</p>
					</div>
				</CardHeader>

				<CardContent>
					<form
						onSubmit={handleSubmit}
						className={styles.form}
						autoComplete="off"
					>
						{error && <div className={styles.error}>{error}</div>}

						<Input
							type="email"
							label="Email Address"
							placeholder="Enter your email"
							value={email}
							onChange={(e) => {
								setEmail(e.target.value);
								if (emailError) setEmailError(validateEmail(e.target.value));
							}}
							onBlur={() => setEmailError(validateEmail(email))}
							error={emailError}
							icon={<Mail size={18} />}
							name="email"
							autoComplete="email"
						/>

						<Button
							type="submit"
							isLoading={isLoading}
							disabled={isLoading}
							fullWidth
						>
							Send Reset Link
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
