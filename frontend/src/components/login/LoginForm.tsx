import { useState } from "react";
import type { FormEvent } from "react";
import { Mail, Lock } from "lucide-react";
import Input from "../shared/Input";
import Button from "../shared/Button";
import styles from "./LoginForm.module.css";

interface LoginFormProps {
	onSubmit: (data: LoginFormData) => Promise<void>;
	isLoading: boolean;
	error?: string;
}

export interface LoginFormData {
	email: string;
	password: string;
}

interface FormErrors {
	email?: string;
	password?: string;
}

export default function LoginForm({
	onSubmit,
	isLoading,
	error,
}: LoginFormProps) {
	const [formData, setFormData] = useState<LoginFormData>({
		email: "",
		password: "",
	});

	const [errors, setErrors] = useState<FormErrors>({});
	const [touched, setTouched] = useState<Record<string, boolean>>({});

	const validateField = (
		name: keyof LoginFormData,
		value: string
	): string | undefined => {
		switch (name) {
			case "email": {
				if (!value.trim()) return "Email is required";
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(value)) return "Please enter a valid email";
				return undefined;
			}
			case "password":
				if (!value) return "Password is required";
				return undefined;
			default:
				return undefined;
		}
	};

	const handleChange = (name: keyof LoginFormData, value: string) => {
		setFormData((prev) => ({ ...prev, [name]: value }));
		if (touched[name]) {
			setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
		}
	};

	const handleBlur = (name: keyof LoginFormData) => {
		setTouched((prev) => ({ ...prev, [name]: true }));
		setErrors((prev) => ({
			...prev,
			[name]: validateField(name, formData[name]),
		}));
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();

		// Validate all fields
		const newErrors: FormErrors = {};
		(Object.keys(formData) as (keyof LoginFormData)[]).forEach((key) => {
			const fieldError = validateField(key, formData[key]);
			if (fieldError) newErrors[key] = fieldError;
		});

		setErrors(newErrors);
		setTouched({ email: true, password: true });

		if (Object.keys(newErrors).length === 0) {
			await onSubmit(formData);
		}
	};

	return (
		<form className={styles.form} onSubmit={handleSubmit}>
			{error && <div className={styles.serverError}>{error}</div>}

			<Input
				label="Email Address"
				type="email"
				name="email"
				placeholder="Enter your email"
				icon={Mail}
				value={formData.email}
				onChange={(e) => handleChange("email", e.target.value)}
				onBlur={() => handleBlur("email")}
				error={touched.email ? errors.email : undefined}
				disabled={isLoading}
				autoComplete="email"
			/>

			<Input
				label="Password"
				type="password"
				name="password"
				placeholder="Enter your password"
				icon={Lock}
				value={formData.password}
				onChange={(e) => handleChange("password", e.target.value)}
				onBlur={() => handleBlur("password")}
				error={touched.password ? errors.password : undefined}
				disabled={isLoading}
				autoComplete="current-password"
			/>

			<div className={styles.submit}>
				<Button type="submit" fullWidth isLoading={isLoading}>
					Sign In
				</Button>
			</div>
		</form>
	);
}
