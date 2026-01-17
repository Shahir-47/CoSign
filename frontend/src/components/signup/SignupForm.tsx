import { useState, useMemo } from "react";
import type { FormEvent } from "react";
import { User, Mail, Lock, Globe } from "lucide-react";
import Input from "../shared/Input";
import Select from "../shared/Select";
import Button from "../shared/Button";
import styles from "./SignupForm.module.css";

interface SignupFormProps {
	onSubmit: (data: SignupFormData) => Promise<void>;
	isLoading: boolean;
	error?: string;
}

export interface SignupFormData {
	fullName: string;
	email: string;
	password: string;
	timezone: string;
}

interface FormErrors {
	fullName?: string;
	email?: string;
	password?: string;
	timezone?: string;
}

// Generate timezone options from Intl API
function getTimezoneOptions(): { value: string; label: string }[] {
	const timezones = Intl.supportedValuesOf("timeZone");
	return timezones.map((tz) => {
		const formatter = new Intl.DateTimeFormat("en-US", {
			timeZone: tz,
			timeZoneName: "shortOffset",
		});
		const parts = formatter.formatToParts(new Date());
		const offset = parts.find((p) => p.type === "timeZoneName")?.value || "";
		return {
			value: tz,
			label: `${tz.replace(/_/g, " ")} (${offset})`,
		};
	});
}

// Detect user's timezone
function detectTimezone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone;
	} catch {
		return "America/New_York";
	}
}

export default function SignupForm({
	onSubmit,
	isLoading,
	error,
}: SignupFormProps) {
	const timezoneOptions = useMemo(() => getTimezoneOptions(), []);
	const detectedTimezone = useMemo(() => detectTimezone(), []);

	const [formData, setFormData] = useState<SignupFormData>(() => ({
		fullName: "",
		email: "",
		password: "",
		timezone: detectedTimezone,
	}));

	const [errors, setErrors] = useState<FormErrors>({});
	const [touched, setTouched] = useState<Record<string, boolean>>({});

	const validateField = (
		name: keyof SignupFormData,
		value: string
	): string | undefined => {
		switch (name) {
			case "fullName":
				if (!value.trim()) return "Full name is required";
				if (value.trim().length < 2)
					return "Name must be at least 2 characters";
				return undefined;
			case "email": {
				if (!value.trim()) return "Email is required";
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(value)) return "Please enter a valid email";
				return undefined;
			}
			case "password":
				if (!value) return "Password is required";
				if (value.length < 8) return "Password must be at least 8 characters";
				return undefined;
			case "timezone":
				if (!value) return "Please select a timezone";
				return undefined;
			default:
				return undefined;
		}
	};

	const handleChange = (name: keyof SignupFormData, value: string) => {
		setFormData((prev) => ({ ...prev, [name]: value }));
		if (touched[name]) {
			setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
		}
	};

	const handleBlur = (name: keyof SignupFormData) => {
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
		(Object.keys(formData) as (keyof SignupFormData)[]).forEach((key) => {
			const error = validateField(key, formData[key]);
			if (error) newErrors[key] = error;
		});

		setErrors(newErrors);
		setTouched({ fullName: true, email: true, password: true, timezone: true });

		if (Object.keys(newErrors).length === 0) {
			await onSubmit(formData);
		}
	};

	return (
		<form className={styles.form} onSubmit={handleSubmit}>
			{error && <div className={styles.serverError}>{error}</div>}

			<Input
				label="Full Name"
				type="text"
				name="name"
				placeholder="Enter your full name"
				icon={User}
				value={formData.fullName}
				onChange={(e) => handleChange("fullName", e.target.value)}
				onBlur={() => handleBlur("fullName")}
				error={touched.fullName ? errors.fullName : undefined}
				disabled={isLoading}
				autoComplete="name"
			/>

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
				placeholder="Create a strong password"
				icon={Lock}
				value={formData.password}
				onChange={(e) => handleChange("password", e.target.value)}
				onBlur={() => handleBlur("password")}
				error={touched.password ? errors.password : undefined}
				helperText={
					!errors.password && !touched.password
						? "At least 8 characters"
						: undefined
				}
				disabled={isLoading}
				autoComplete="new-password"
			/>

			<Select
				label="Timezone"
				icon={Globe}
				options={timezoneOptions}
				value={formData.timezone}
				onChange={(e) => handleChange("timezone", e.target.value)}
				onBlur={() => handleBlur("timezone")}
				error={touched.timezone ? errors.timezone : undefined}
				disabled={isLoading}
			/>

			<div className={styles.submit}>
				<Button type="submit" fullWidth isLoading={isLoading}>
					Create Account
				</Button>
			</div>
		</form>
	);
}
