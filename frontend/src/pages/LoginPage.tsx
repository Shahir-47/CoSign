import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useWebSocket } from "../context/useWebSocket";
import AuthLayout from "../components/shared/AuthLayout";
import Card, {
	CardHeader,
	CardContent,
	CardFooter,
} from "../components/shared/Card";
import LoginHeader from "../components/login/LoginHeader";
import LoginForm from "../components/login/LoginForm";
import type { LoginFormData } from "../components/login/LoginForm";
import LoginFooter from "../components/login/LoginFooter";
import styles from "./LoginPage.module.css";

interface LoginResponse {
	token: string;
	email: string;
	fullName: string;
	timezone: string;
}

export default function LoginPage() {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | undefined>();
	const navigate = useNavigate();
	const { connect } = useWebSocket();

	const handleSubmit = async (data: LoginFormData) => {
		setIsLoading(true);
		setError(undefined);

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(errorText || "Invalid email or password");
			}

			const result: LoginResponse = await response.json();

			// Store the token and user info in localStorage
			localStorage.setItem("token", result.token);
			localStorage.setItem(
				"user",
				JSON.stringify({
					email: result.email,
					fullName: result.fullName,
					timezone: result.timezone,
				})
			);

			// Connect to WebSocket after login
			connect();

			toast.success(`Welcome back, ${result.fullName}!`);

			// Navigate to dashboard (or home for now)
			navigate("/");
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "An unexpected error occurred"
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AuthLayout>
			<Card className={styles.card}>
				<CardHeader>
					<LoginHeader />
				</CardHeader>
				<CardContent>
					<LoginForm
						onSubmit={handleSubmit}
						isLoading={isLoading}
						error={error}
					/>
				</CardContent>
				<CardFooter>
					<LoginFooter />
				</CardFooter>
			</Card>
		</AuthLayout>
	);
}
