import { useState, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import {
	Bold,
	Italic,
	Underline as UnderlineIcon,
	Strikethrough,
	List,
	ListOrdered,
	AlignLeft,
	AlignCenter,
	AlignRight,
	Link as LinkIcon,
	Unlink,
	Quote,
	Undo,
	Redo,
	Image as ImageIcon,
	Loader2,
} from "lucide-react";
import { api } from "../../utils/api";
import styles from "./RichTextEditor.module.css";

interface RichTextEditorProps {
	content: string;
	onChange: (content: string) => void;
	onBlur?: () => void;
	placeholder?: string;
	enableImageUpload?: boolean;
	minHeight?: string;
	disabled?: boolean;
}

interface PresignResponse {
	presignedUrl: string;
	s3Key: string;
}

export default function RichTextEditor({
	content,
	onChange,
	onBlur,
	placeholder = "Write your proof description...",
	enableImageUpload = false,
	minHeight,
	disabled = false,
}: RichTextEditorProps) {
	// Force re-render when editor state changes (for toolbar button highlighting)
	const [, setForceUpdate] = useState(0);
	const [isUploading, setIsUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: false,
			}),
			Underline,
			TextAlign.configure({
				types: ["paragraph"],
			}),
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					class: styles.link,
				},
			}),
			Placeholder.configure({
				placeholder,
			}),
			Image.configure({
				inline: true,
				allowBase64: false,
				HTMLAttributes: {
					class: styles.image,
				},
			}),
		],
		content,
		editable: !disabled,
		onUpdate: ({ editor }) => {
			onChange(editor.getHTML());
		},
		onBlur: () => {
			onBlur?.();
		},
		onSelectionUpdate: () => {
			// Re-render to update toolbar button states
			setForceUpdate((n) => n + 1);
		},
		onTransaction: () => {
			// Re-render on any transaction (includes formatting changes)
			setForceUpdate((n) => n + 1);
		},
	});

	// Image upload handler
	const handleImageUpload = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const onFileSelect = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			if (!editor || !e.target.files?.length) return;

			const file = e.target.files[0];
			if (!file.type.startsWith("image/")) {
				alert("Please select an image file");
				return;
			}

			setIsUploading(true);

			try {
				// Get presigned URL
				const presignResponse = await api.get<PresignResponse>(
					`/api/uploads/presign?filename=${encodeURIComponent(
						file.name
					)}&contentType=${encodeURIComponent(file.type)}`
				);

				// Upload to S3
				await fetch(presignResponse.presignedUrl, {
					method: "PUT",
					body: file,
					headers: {
						"Content-Type": file.type,
					},
				});

				// Get the public URL (using the download presign endpoint)
				const downloadUrl = await api.get<{ url: string }>(
					`/api/uploads/download/${encodeURIComponent(presignResponse.s3Key)}`
				);

				// Insert image into editor
				editor.chain().focus().setImage({ src: downloadUrl.url }).run();
			} catch (error) {
				console.error("Failed to upload image:", error);
				alert("Failed to upload image. Please try again.");
			} finally {
				setIsUploading(false);
				// Reset input
				if (fileInputRef.current) {
					fileInputRef.current.value = "";
				}
			}
		},
		[editor]
	);

	if (!editor) return null;

	const setLink = () => {
		const previousUrl = editor.getAttributes("link").href;
		const url = window.prompt("URL", previousUrl);

		if (url === null) return;

		if (url === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
			return;
		}

		editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
	};

	return (
		<div className={`${styles.editor} ${disabled ? styles.disabled : ""}`}>
			{/* Toolbar */}
			<div className={styles.toolbar}>
				<div className={styles.toolbarGroup}>
					<button
						type="button"
						className={`${styles.toolbarButton} ${
							editor.isActive("bold") ? styles.active : ""
						}`}
						onClick={() => editor.chain().focus().toggleBold().run()}
						disabled={disabled}
						title="Bold"
					>
						<Bold size={16} />
					</button>
					<button
						type="button"
						className={`${styles.toolbarButton} ${
							editor.isActive("italic") ? styles.active : ""
						}`}
						onClick={() => editor.chain().focus().toggleItalic().run()}
						title="Italic"
					>
						<Italic size={16} />
					</button>
					<button
						type="button"
						className={`${styles.toolbarButton} ${
							editor.isActive("underline") ? styles.active : ""
						}`}
						onClick={() => editor.chain().focus().toggleUnderline().run()}
						title="Underline"
					>
						<UnderlineIcon size={16} />
					</button>
					<button
						type="button"
						className={`${styles.toolbarButton} ${
							editor.isActive("strike") ? styles.active : ""
						}`}
						onClick={() => editor.chain().focus().toggleStrike().run()}
						title="Strikethrough"
					>
						<Strikethrough size={16} />
					</button>
				</div>

				<div className={styles.divider} />

				<div className={styles.toolbarGroup}>
					<button
						type="button"
						className={`${styles.toolbarButton} ${
							editor.isActive("bulletList") ? styles.active : ""
						}`}
						onClick={() => editor.chain().focus().toggleBulletList().run()}
						title="Bullet List"
					>
						<List size={16} />
					</button>
					<button
						type="button"
						className={`${styles.toolbarButton} ${
							editor.isActive("orderedList") ? styles.active : ""
						}`}
						onClick={() => editor.chain().focus().toggleOrderedList().run()}
						title="Numbered List"
					>
						<ListOrdered size={16} />
					</button>
					<button
						type="button"
						className={`${styles.toolbarButton} ${
							editor.isActive("blockquote") ? styles.active : ""
						}`}
						onClick={() => editor.chain().focus().toggleBlockquote().run()}
						title="Quote"
					>
						<Quote size={16} />
					</button>
				</div>

				<div className={styles.divider} />

				<div className={styles.toolbarGroup}>
					<button
						type="button"
						className={`${styles.toolbarButton} ${
							editor.isActive({ textAlign: "left" }) ? styles.active : ""
						}`}
						onClick={() => editor.chain().focus().setTextAlign("left").run()}
						title="Align Left"
					>
						<AlignLeft size={16} />
					</button>
					<button
						type="button"
						className={`${styles.toolbarButton} ${
							editor.isActive({ textAlign: "center" }) ? styles.active : ""
						}`}
						onClick={() => editor.chain().focus().setTextAlign("center").run()}
						title="Align Center"
					>
						<AlignCenter size={16} />
					</button>
					<button
						type="button"
						className={`${styles.toolbarButton} ${
							editor.isActive({ textAlign: "right" }) ? styles.active : ""
						}`}
						onClick={() => editor.chain().focus().setTextAlign("right").run()}
						title="Align Right"
					>
						<AlignRight size={16} />
					</button>
				</div>

				<div className={styles.divider} />

				<div className={styles.toolbarGroup}>
					<button
						type="button"
						className={`${styles.toolbarButton} ${
							editor.isActive("link") ? styles.active : ""
						}`}
						onClick={setLink}
						title="Add Link"
					>
						<LinkIcon size={16} />
					</button>
					{editor.isActive("link") && (
						<button
							type="button"
							className={styles.toolbarButton}
							onClick={() => editor.chain().focus().unsetLink().run()}
							title="Remove Link"
						>
							<Unlink size={16} />
						</button>
					)}
					{enableImageUpload && (
						<button
							type="button"
							className={styles.toolbarButton}
							onClick={handleImageUpload}
							disabled={isUploading}
							title="Insert Image"
						>
							{isUploading ? (
								<Loader2 size={16} className={styles.spinning} />
							) : (
								<ImageIcon size={16} />
							)}
						</button>
					)}
				</div>

				<div className={styles.spacer} />

				<div className={styles.toolbarGroup}>
					<button
						type="button"
						className={styles.toolbarButton}
						onClick={() => editor.chain().focus().undo().run()}
						disabled={!editor.can().undo()}
						title="Undo"
					>
						<Undo size={16} />
					</button>
					<button
						type="button"
						className={styles.toolbarButton}
						onClick={() => editor.chain().focus().redo().run()}
						disabled={!editor.can().redo()}
						title="Redo"
					>
						<Redo size={16} />
					</button>
				</div>
			</div>

			{/* Editor Content */}
			<EditorContent
				editor={editor}
				className={styles.content}
				style={minHeight ? { minHeight } : undefined}
			/>

			{/* Hidden file input for image upload */}
			{enableImageUpload && (
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					onChange={onFileSelect}
					style={{ display: "none" }}
				/>
			)}
		</div>
	);
}
