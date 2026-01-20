import { useState, useRef, useEffect, useMemo } from "react";
import { X, Camera, Upload, Loader2, Check } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../context/useAuth";
import { apiRequest } from "../../utils/api";
import { getTimezoneOptions } from "../../utils/timezone";
import Avatar from "../shared/Avatar";
import Button from "../shared/Button";
import Input from "../shared/Input";
import styles from "./ProfileSettingsModal.module.css";

interface ProfileSettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	onProfileUpdated?: (timezoneChanged: boolean) => void;
}

export default function ProfileSettingsModal({
	isOpen,
	onClose,
	onProfileUpdated,
}: ProfileSettingsModalProps) {
	const { user, updateUser } = useAuth();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const timezoneOptions = useMemo(() => getTimezoneOptions(), []);

	const [fullName, setFullName] = useState(user?.fullName || "");
	const [timezone, setTimezone] = useState(user?.timezone || "UTC");
	const [newPictureKey, setNewPictureKey] = useState<string | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	// Reset form to current user data when modal opens
	useEffect(() => {
		if (isOpen && user) {
			setFullName(user.fullName || "");
			setTimezone(user.timezone || "UTC");
			setPreviewUrl(null);
			setNewPictureKey(null);
		}
	}, [isOpen, user]);

	if (!isOpen || !user) return null;

	const displayUrl = previewUrl || user.profilePictureUrl || null;

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

		setIsUploading(true);

		try {
			// Create preview
			const reader = new FileReader();
			reader.onload = (event) => {
				setPreviewUrl(event.target?.result as string);
			};
			reader.readAsDataURL(file);

			// Get presigned URL for avatar upload
			const presignResponse = await apiRequest<{ url: string; key: string }>(
				"/uploads/presign",
				{
					method: "POST",
					body: JSON.stringify({
						name: file.name,
						type: file.type,
						folder: "avatars",
					}),
				},
			);

			// Upload to S3
			await fetch(presignResponse.url, {
				method: "PUT",
				body: file,
				headers: {
					"Content-Type": file.type,
				},
			});

			setNewPictureKey(presignResponse.key);
			toast.success("Image uploaded successfully");
		} catch (error) {
			console.error("Upload error:", error);
			toast.error("Failed to upload image");
			setPreviewUrl(null);
		} finally {
			setIsUploading(false);
		}
	};

	const handleSave = async () => {
		if (!fullName.trim()) {
			toast.error("Name is required");
			return;
		}

		const timezoneChanged = timezone !== user.timezone;
		setIsSaving(true);

		try {
			const response = await apiRequest<{
				email: string;
				fullName: string;
				timezone: string;
				profilePictureUrl: string | null;
			}>("/user/profile", {
				method: "PUT",
				body: JSON.stringify({
					fullName: fullName.trim(),
					timezone,
					profilePictureKey: newPictureKey || undefined,
				}),
			});

			// Update auth context
			updateUser({
				fullName: response.fullName,
				timezone: response.timezone,
				profilePictureUrl: response.profilePictureUrl || undefined,
			});

			toast.success("Profile updated successfully");
			onProfileUpdated?.(timezoneChanged);
			onClose();
		} catch (error) {
			console.error("Save error:", error);
			toast.error("Failed to update profile");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className={styles.overlay} onClick={onClose}>
			<div
				className={styles.modal}
				onClick={(e) => e.stopPropagation()}
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className={styles.header}>
					<h2>Profile Settings</h2>
					<button className={styles.closeButton} onClick={onClose}>
						<X size={20} />
					</button>
				</div>

				<div className={styles.content}>
					{/* Avatar Section */}
					<div className={styles.avatarSection}>
						<div className={styles.avatarWrapper}>
							<Avatar src={displayUrl} name={user.fullName} size="xl" />
							<button
								className={styles.avatarOverlay}
								onClick={() => fileInputRef.current?.click()}
								disabled={isUploading}
							>
								{isUploading ? (
									<Loader2 size={24} className={styles.spinning} />
								) : (
									<Camera size={24} />
								)}
							</button>
						</div>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							onChange={handleFileSelect}
							className={styles.hiddenInput}
						/>
						<button
							className={styles.uploadButton}
							onClick={() => fileInputRef.current?.click()}
							disabled={isUploading}
						>
							<Upload size={16} />
							{isUploading ? "Uploading..." : "Upload Photo"}
						</button>
						{newPictureKey && (
							<span className={styles.uploadSuccess}>
								<Check size={14} />
								New photo ready to save
							</span>
						)}
					</div>

					{/* Form Section */}
					<div className={styles.form}>
						<div className={styles.field}>
							<label className={styles.label}>Email</label>
							<div className={styles.readOnlyField}>{user.email}</div>
						</div>

						<Input
							label="Full Name"
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							placeholder="Enter your name"
							autoComplete="off"
						/>

						<div className={styles.field}>
							<label className={styles.label}>Timezone</label>
							<select
								value={timezone}
								onChange={(e) => setTimezone(e.target.value)}
								className={styles.select}
							>
								{timezoneOptions.map((tz) => (
									<option key={tz.value} value={tz.value}>
										{tz.label}
									</option>
								))}
							</select>
						</div>
					</div>
				</div>

				<div className={styles.footer}>
					<Button variant="secondary" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={handleSave} isLoading={isSaving}>
						Save Changes
					</Button>
				</div>
			</div>
		</div>
	);
}
