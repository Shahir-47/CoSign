import { useState, useRef } from "react";
import {
	Upload,
	X,
	File,
	Image,
	Film,
	FileText,
	Music,
	Loader2,
	AlertCircle,
} from "lucide-react";
import { api } from "../../utils/api";
import styles from "./FileUploader.module.css";

export interface UploadedFile {
	s3Key: string;
	originalFilename: string;
	mimeType: string;
	contentHash: string; // SHA-256 hash of file content
	previewUrl?: string;
}

interface FileUploaderProps {
	files: UploadedFile[];
	onChange: (files: UploadedFile[]) => void;
	maxFiles?: number;
	maxSizeMB?: number;
}

interface UploadingFile {
	id: string;
	file: File;
	progress: number;
	error?: string;
}

/**
 * Compute SHA-256 hash of a file using Web Crypto API
 */
async function computeFileHash(file: File): Promise<string> {
	const buffer = await file.arrayBuffer();
	const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getFileIcon(mimeType: string) {
	if (mimeType.startsWith("image/")) return Image;
	if (mimeType.startsWith("video/")) return Film;
	if (mimeType.startsWith("audio/")) return Music;
	if (mimeType.includes("pdf") || mimeType.includes("document"))
		return FileText;
	return File;
}

export default function FileUploader({
	files,
	onChange,
	maxFiles = 10,
	maxSizeMB = 50,
}: FileUploaderProps) {
	const [uploading, setUploading] = useState<UploadingFile[]>([]);
	const [dragActive, setDragActive] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleFiles = async (fileList: FileList | null) => {
		if (!fileList) return;

		const newFiles = Array.from(fileList);
		const remaining = maxFiles - files.length;

		if (newFiles.length > remaining) {
			alert(`You can only upload ${remaining} more file(s).`);
			return;
		}

		// Start uploading each file
		for (const file of newFiles) {
			if (file.size > maxSizeMB * 1024 * 1024) {
				alert(`${file.name} is too large. Maximum size is ${maxSizeMB}MB.`);
				continue;
			}

			const uploadId = crypto.randomUUID();
			setUploading((prev) => [...prev, { id: uploadId, file, progress: 0 }]);

			try {
				// Compute file content hash for duplicate detection
				const contentHash = await computeFileHash(file);

				setUploading((prev) =>
					prev.map((u) => (u.id === uploadId ? { ...u, progress: 15 } : u))
				);

				// Get presigned URL
				const presignResponse = await api.post<{ url: string; key: string }>(
					"/uploads/presign",
					{
						name: file.name,
						type: file.type,
					}
				);

				setUploading((prev) =>
					prev.map((u) => (u.id === uploadId ? { ...u, progress: 30 } : u))
				);

				// Upload to S3 directly
				const uploadResponse = await fetch(presignResponse.url, {
					method: "PUT",
					body: file,
					headers: {
						"Content-Type": file.type,
					},
				});

				if (!uploadResponse.ok) {
					throw new Error("Failed to upload file to storage");
				}

				setUploading((prev) =>
					prev.map((u) => (u.id === uploadId ? { ...u, progress: 100 } : u))
				);

				// Create preview URL for images
				let previewUrl: string | undefined;
				if (file.type.startsWith("image/")) {
					previewUrl = URL.createObjectURL(file);
				}

				// Add to uploaded files
				const uploadedFile: UploadedFile = {
					s3Key: presignResponse.key,
					originalFilename: file.name,
					mimeType: file.type,
					contentHash,
					previewUrl,
				};

				onChange([...files, uploadedFile]);

				// Remove from uploading list
				setUploading((prev) => prev.filter((u) => u.id !== uploadId));
			} catch (error) {
				console.error("Upload failed:", error);
				setUploading((prev) =>
					prev.map((u) =>
						u.id === uploadId
							? { ...u, error: "Upload failed. Please try again." }
							: u
					)
				);
			}
		}
	};

	const removeFile = (index: number) => {
		const newFiles = [...files];
		const removed = newFiles.splice(index, 1)[0];
		if (removed.previewUrl) {
			URL.revokeObjectURL(removed.previewUrl);
		}
		onChange(newFiles);
	};

	const removeUploadingFile = (id: string) => {
		setUploading((prev) => prev.filter((u) => u.id !== id));
	};

	const handleDrag = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === "dragenter" || e.type === "dragover") {
			setDragActive(true);
		} else if (e.type === "dragleave") {
			setDragActive(false);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);
		handleFiles(e.dataTransfer.files);
	};

	return (
		<div className={styles.uploader}>
			{/* Drop Zone */}
			<div
				className={`${styles.dropzone} ${dragActive ? styles.active : ""}`}
				onDragEnter={handleDrag}
				onDragLeave={handleDrag}
				onDragOver={handleDrag}
				onDrop={handleDrop}
				onClick={() => inputRef.current?.click()}
			>
				<input
					ref={inputRef}
					type="file"
					multiple
					onChange={(e) => handleFiles(e.target.files)}
					className={styles.hiddenInput}
				/>
				<Upload size={24} className={styles.uploadIcon} />
				<p className={styles.dropzoneText}>
					<span className={styles.dropzoneHighlight}>Click to upload</span> or
					drag and drop
				</p>
				<p className={styles.dropzoneHint}>
					Any file type up to {maxSizeMB}MB (max {maxFiles} files)
				</p>
			</div>

			{/* File List */}
			{(files.length > 0 || uploading.length > 0) && (
				<div className={styles.fileList}>
					{/* Uploading Files */}
					{uploading.map((upload) => (
						<div
							key={upload.id}
							className={`${styles.fileItem} ${
								upload.error ? styles.error : ""
							}`}
						>
							<div className={styles.fileIcon}>
								{upload.error ? (
									<AlertCircle size={20} />
								) : (
									<Loader2 size={20} className={styles.spinner} />
								)}
							</div>
							<div className={styles.fileInfo}>
								<span className={styles.fileName}>{upload.file.name}</span>
								<span className={styles.fileSize}>
									{upload.error || `Uploading... ${upload.progress}%`}
								</span>
							</div>
							<button
								type="button"
								className={styles.removeButton}
								onClick={() => removeUploadingFile(upload.id)}
							>
								<X size={16} />
							</button>
						</div>
					))}

					{/* Uploaded Files */}
					{files.map((file, index) => {
						const FileIcon = getFileIcon(file.mimeType);
						return (
							<div key={file.s3Key} className={styles.fileItem}>
								{file.previewUrl ? (
									<img
										src={file.previewUrl}
										alt={file.originalFilename}
										className={styles.preview}
									/>
								) : (
									<div className={styles.fileIcon}>
										<FileIcon size={20} />
									</div>
								)}
								<div className={styles.fileInfo}>
									<span className={styles.fileName}>
										{file.originalFilename}
									</span>
									<span className={styles.fileSize}>{file.mimeType}</span>
								</div>
								<button
									type="button"
									className={styles.removeButton}
									onClick={() => removeFile(index)}
								>
									<X size={16} />
								</button>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
