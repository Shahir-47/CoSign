import { useState, useMemo, useRef } from "react";
import type { FormEvent } from "react";
import { User, Mail, Lock, Globe, Camera, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import Input from "../shared/Input";
import Select from "../shared/Select";
import Button from "../shared/Button";
import Avatar from "../shared/Avatar";
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
	profilePictureKey?: string;
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
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [formData, setFormData] = useState<SignupFormData>(() => ({
		fullName: "",
		email: "",
		password: "",
		timezone: detectedTimezone,
	}));

	const [errors, setErrors] = useState<FormErrors>({});
	const [touched, setTouched] = useState<Record<string, boolean>>({});
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

	const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validate file type
		if (!file.type.startsWith("image/")) {
			toast.error("Please select an image file");
			return;
		}

		// Validate file size (5MB max)
		if (file.size > 5 * 1024 * 1024) {
			toast.error("Image must be less than 5MB");
			return;
		}

		setIsUploadingAvatar(true);

		try {
			// Create preview
			const reader = new FileReader();
			reader.onload = (event) => {
				setAvatarPreview(event.target?.result as string);
			};
			reader.readAsDataURL(file);

			// Get presigned URL for avatar upload (public endpoint)
			const presignResponse = await fetch("/api/auth/signup-avatar-presign", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: file.name,
					type: file.type,
				}),
			});

			if (!presignResponse.ok) {
				throw new Error("Failed to get upload URL");
			}

			const { url, key } = await presignResponse.json();

			// Upload to S3
			await fetch(url, {
				method: "PUT",
				body: file,
				headers: {
					"Content-Type": file.type,
				},
			});

			setFormData((prev) => ({ ...prev, profilePictureKey: key }));
			toast.success("Photo uploaded!");
		} catch (err) {
			console.error("Upload error:", err);
			toast.error("Failed to upload photo");
			setAvatarPreview(null);
		} finally {
			setIsUploadingAvatar(false);
		}
	};

	const validateField = (
		name: keyof SignupFormData,
		value: string,
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

	const handleBlur = (name: keyof FormErrors) => {
		setTouched((prev) => ({ ...prev, [name]: true }));
		setErrors((prev) => ({
			...prev,
			[name]: validateField(name, formData[name]),
		}));
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();

		// Validate all fields (except optional profilePictureKey)
		const newErrors: FormErrors = {};
		const fieldsToValidate: (keyof FormErrors)[] = [
			"fullName",
			"email",
			"password",
			"timezone",
		];
		fieldsToValidate.forEach((key) => {
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

			{/* Avatar Upload Section */}
			<div className={styles.avatarSection}>
				<div className={styles.avatarWrapper}>
					<Avatar
						src={avatarPreview}
						name={formData.fullName || "User"}
						size="lg"
					/>
					<button
						type="button"
						className={styles.avatarOverlay}
						onClick={() => fileInputRef.current?.click()}
						disabled={isUploadingAvatar || isLoading}
					>
						{isUploadingAvatar ? (
							<Loader2 size={20} className={styles.spinning} />
						) : (
							<Camera size={20} />
						)}
					</button>
				</div>
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					onChange={handleAvatarSelect}
					className={styles.hiddenInput}
				/>
				<span className={styles.avatarHint}>
					Add a profile photo (optional)
				</span>
			</div>

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
