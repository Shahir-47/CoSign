import { useEffect, useState, useCallback } from "react";
import {
	X,
	Download,
	Maximize2,
	Minimize2,
	ChevronRight,
	ChevronDown,
	File,
	FileText,
	Image,
	Film,
	Music,
	FileSpreadsheet,
	FileArchive,
	Loader2,
} from "lucide-react";
import styles from "./ViewAttachmentModal.module.css";

interface ViewAttachmentModalProps {
	attachment: {
		filename: string;
		url: string;
		mimeType: string;
	} | null;
	isOpen: boolean;
	onClose: () => void;
}

interface DirectoryNode {
	name: string;
	path: string;
	children: DirectoryNode[];
}

// Directory tree for ZIP file display
function DirectoryTreeNode({ node }: { node: DirectoryNode }) {
	const [collapsed, setCollapsed] = useState(false);
	const hasChildren = node.children && node.children.length > 0;

	return (
		<div className={styles.treeNode}>
			<div
				className={`${styles.treeNodeContent} ${
					hasChildren ? styles.clickable : ""
				}`}
				onClick={() => hasChildren && setCollapsed(!collapsed)}
			>
				{hasChildren ? (
					collapsed ? (
						<ChevronRight size={16} />
					) : (
						<ChevronDown size={16} />
					)
				) : (
					<File size={14} className={styles.fileIcon} />
				)}
				<span>{node.name}</span>
			</div>
			{!collapsed && hasChildren && (
				<div className={styles.treeChildren}>
					{node.children.map((child) => (
						<DirectoryTreeNode key={child.path} node={child} />
					))}
				</div>
			)}
		</div>
	);
}

// Get file extension from filename or mimeType
function getFileExtension(filename: string, mimeType: string): string {
	const ext = filename.split(".").pop()?.toLowerCase() || "";
	if (ext) return ext;

	// Fallback to mimeType
	const mimeMap: Record<string, string> = {
		"application/pdf": "pdf",
		"application/msword": "doc",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document":
			"docx",
		"application/vnd.ms-excel": "xls",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
		"application/vnd.ms-powerpoint": "ppt",
		"application/vnd.openxmlformats-officedocument.presentationml.presentation":
			"pptx",
		"application/zip": "zip",
		"text/plain": "txt",
		"text/html": "html",
		"text/csv": "csv",
	};

	return mimeMap[mimeType] || "";
}

// Get file icon component based on extension/mimeType
function getFileIcon(ext: string, mimeType: string) {
	if (mimeType.startsWith("image/")) return Image;
	if (mimeType.startsWith("video/")) return Film;
	if (mimeType.startsWith("audio/")) return Music;
	if (["pdf", "doc", "docx", "txt", "html"].includes(ext)) return FileText;
	if (["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
	if (ext === "zip") return FileArchive;
	if (["ppt", "pptx"].includes(ext)) return FileText;
	return File;
}

// Get file category for display
function getFileCategory(ext: string, mimeType: string): string {
	if (mimeType.startsWith("image/")) return "Image";
	if (mimeType.startsWith("video/")) return "Video";
	if (mimeType.startsWith("audio/")) return "Audio";
	if (ext === "pdf") return "PDF Document";
	if (["doc", "docx"].includes(ext)) return "Word Document";
	if (["xls", "xlsx"].includes(ext)) return "Excel Spreadsheet";
	if (ext === "csv") return "CSV File";
	if (["ppt", "pptx"].includes(ext)) return "PowerPoint";
	if (ext === "zip") return "Archive File";
	if (ext === "txt") return "Text File";
	if (ext === "html") return "HTML File";
	return `${ext.toUpperCase()} File`;
}

export default function ViewAttachmentModal({
	attachment,
	isOpen,
	onClose,
}: ViewAttachmentModalProps) {
	const [fullScreen, setFullScreen] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [textData, setTextData] = useState("");
	const [zipTree, setZipTree] = useState<DirectoryNode | null>(null);
	const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
	const [csvColumns, setCsvColumns] = useState<string[]>([]);

	const ext = attachment
		? getFileExtension(attachment.filename, attachment.mimeType)
		: "";
	const FileIcon = attachment ? getFileIcon(ext, attachment.mimeType) : File;
	const category = attachment ? getFileCategory(ext, attachment.mimeType) : "";

	// Build tree structure from ZIP files object
	const buildTree = useCallback(
		(files: Record<string, unknown>): DirectoryNode => {
			const root: DirectoryNode = { name: "/", path: "/", children: [] };
			Object.keys(files).forEach((path) => {
				const parts = path.split("/").filter(Boolean);
				let node = root;
				parts.forEach((p, i) => {
					let child = node.children.find((c) => c.name === p);
					if (!child) {
						child = {
							name: p,
							path: parts.slice(0, i + 1).join("/"),
							children: [],
						};
						node.children.push(child);
					}
					node = child;
				});
			});
			return root;
		},
		[]
	);

	// Load and process file content
	useEffect(() => {
		if (!isOpen || !attachment) return;

		let isCancelled = false;
		setLoading(true);
		setError(null);
		setTextData("");
		setZipTree(null);
		setCsvData([]);
		setCsvColumns([]);

		const loadContent = async () => {
			try {
				const fileExt = getFileExtension(
					attachment.filename,
					attachment.mimeType
				);

				// Handle ZIP files
				if (fileExt === "zip") {
					const JSZip = (await import("jszip")).default;
					const response = await fetch(attachment.url);
					const buffer = await response.arrayBuffer();
					const zip = await JSZip.loadAsync(buffer);
					if (!isCancelled) {
						setZipTree(buildTree(zip.files));
						setLoading(false);
					}
					return;
				}

				// Handle text/HTML files
				if (fileExt === "txt" || fileExt === "html") {
					const response = await fetch(attachment.url);
					const text = await response.text();
					if (!isCancelled) {
						setTextData(text);
						setLoading(false);
					}
					return;
				}

				// Handle CSV files
				if (fileExt === "csv") {
					const Papa = (await import("papaparse")).default;
					const response = await fetch(attachment.url);
					const csvText = await response.text();
					if (!isCancelled) {
						const result = Papa.parse<Record<string, string>>(csvText, {
							header: true,
							skipEmptyLines: true,
						});
						setCsvData(result.data);
						if (result.data.length > 0) {
							setCsvColumns(Object.keys(result.data[0]));
						}
						setLoading(false);
					}
					return;
				}

				// For other files, just mark as loaded (they use iframes or direct display)
				setLoading(false);
			} catch (err) {
				console.error("Error loading file:", err);
				if (!isCancelled) {
					setError("Could not load preview. Please download instead.");
					setLoading(false);
				}
			}
		};

		loadContent();

		return () => {
			isCancelled = true;
		};
	}, [isOpen, attachment, buildTree]);

	// Reset fullscreen when modal closes
	useEffect(() => {
		if (!isOpen) {
			setFullScreen(false);
		}
	}, [isOpen]);

	const handleDownload = async () => {
		if (!attachment) return;

		try {
			const response = await fetch(attachment.url);
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);

			const a = document.createElement("a");
			a.href = url;
			a.download = attachment.filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch {
			// Fallback: open in new tab
			window.open(attachment.url, "_blank");
		}
	};

	const renderContent = () => {
		if (loading) {
			return (
				<div className={styles.loadingState}>
					<Loader2 size={32} className={styles.spinner} />
					<span>Loading preview...</span>
				</div>
			);
		}

		if (error) {
			return (
				<div className={styles.errorState}>
					<p>{error}</p>
					<button onClick={handleDownload} className={styles.downloadButton}>
						<Download size={18} />
						Download File
					</button>
				</div>
			);
		}

		if (!attachment) return null;

		const { mimeType, url, filename } = attachment;

		// Image
		if (mimeType.startsWith("image/")) {
			return (
				<img
					src={url}
					alt={filename}
					className={`${styles.imagePreview} ${
						fullScreen ? styles.fullScreenImage : ""
					}`}
				/>
			);
		}

		// Video
		if (mimeType.startsWith("video/")) {
			return <video src={url} controls className={styles.videoPreview} />;
		}

		// Audio
		if (mimeType.startsWith("audio/")) {
			return <audio src={url} controls className={styles.audioPreview} />;
		}

		// PDF
		if (ext === "pdf") {
			return (
				<iframe
					src={`${url}#toolbar=1&navpanes=1&scrollbar=1`}
					className={styles.pdfPreview}
					title={filename}
				/>
			);
		}

		// Text/HTML
		if (ext === "txt" || ext === "html") {
			return <pre className={styles.textPreview}>{textData}</pre>;
		}

		// CSV
		if (ext === "csv" && csvData.length > 0) {
			return (
				<div className={styles.csvPreview}>
					<table>
						<thead>
							<tr>
								{csvColumns.map((col) => (
									<th key={col}>{col}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{csvData.slice(0, 100).map((row, i) => (
								<tr key={i}>
									{csvColumns.map((col) => (
										<td key={col}>{row[col]}</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
					{csvData.length > 100 && (
						<p className={styles.csvNote}>
							Showing first 100 of {csvData.length} rows
						</p>
					)}
				</div>
			);
		}

		// ZIP
		if (ext === "zip" && zipTree) {
			return (
				<div className={styles.zipPreview}>
					<DirectoryTreeNode node={zipTree} />
				</div>
			);
		}

		// Office documents (Word, Excel, PowerPoint)
		if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)) {
			const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
				url
			)}`;
			return (
				<iframe
					src={officeViewerUrl}
					className={styles.officePreview}
					title={filename}
				/>
			);
		}

		// Fallback - no preview available
		return (
			<div className={styles.noPreview}>
				<FileIcon size={48} />
				<p className={styles.noPreviewText}>No preview available</p>
				<p className={styles.fileCategory}>{category}</p>
				<button onClick={handleDownload} className={styles.downloadButton}>
					<Download size={18} />
					Download File
				</button>
			</div>
		);
	};

	if (!isOpen || !attachment) return null;

	return (
		<div className={styles.overlay} onClick={onClose}>
			<div
				className={`${styles.modal} ${fullScreen ? styles.fullScreen : ""}`}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className={styles.header}>
					<div className={styles.headerLeft}>
						<FileIcon size={20} />
						<span className={styles.filename}>{attachment.filename}</span>
					</div>
					<div className={styles.headerRight}>
						<button
							className={styles.headerButton}
							onClick={() => setFullScreen(!fullScreen)}
							title={fullScreen ? "Exit Full Screen" : "Full Screen"}
						>
							{fullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
						</button>
						{ext !== "pdf" && (
							<button
								className={styles.headerButton}
								onClick={handleDownload}
								title="Download"
							>
								<Download size={18} />
							</button>
						)}
						<button
							className={`${styles.headerButton} ${styles.closeButton}`}
							onClick={onClose}
							title="Close"
						>
							<X size={18} />
						</button>
					</div>
				</div>

				{/* Content */}
				<div className={styles.content}>{renderContent()}</div>
			</div>
		</div>
	);
}
