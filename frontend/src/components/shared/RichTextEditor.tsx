import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
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
} from "lucide-react";
import styles from "./RichTextEditor.module.css";

interface RichTextEditorProps {
	content: string;
	onChange: (content: string) => void;
	placeholder?: string;
}

export default function RichTextEditor({
	content,
	onChange,
	placeholder = "Write your proof description...",
}: RichTextEditorProps) {
	// Force re-render when editor state changes (for toolbar button highlighting)
	const [, setForceUpdate] = useState(0);

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
		],
		content,
		onUpdate: ({ editor }) => {
			onChange(editor.getHTML());
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
		<div className={styles.editor}>
			{/* Toolbar */}
			<div className={styles.toolbar}>
				<div className={styles.toolbarGroup}>
					<button
						type="button"
						className={`${styles.toolbarButton} ${
							editor.isActive("bold") ? styles.active : ""
						}`}
						onClick={() => editor.chain().focus().toggleBold().run()}
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
			<EditorContent editor={editor} className={styles.content} />
		</div>
	);
}
