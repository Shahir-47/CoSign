import { useState } from "react";
import {
	X,
	Inbox,
	FolderKanban,
	Briefcase,
	Rocket,
	Home,
	Heart,
	Dumbbell,
	BookOpen,
	List,
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../shared/Button";
import Input from "../shared/Input";
import { api } from "../../utils/api";
import type { TaskList, TaskListRequest } from "../../types";
import styles from "./CreateListModal.module.css";

interface CreateListModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: (list: TaskList) => void;
}

const ICONS = [
	{ name: "inbox", Icon: Inbox },
	{ name: "folder", Icon: FolderKanban },
	{ name: "briefcase", Icon: Briefcase },
	{ name: "rocket", Icon: Rocket },
	{ name: "home", Icon: Home },
	{ name: "heart", Icon: Heart },
	{ name: "dumbbell", Icon: Dumbbell },
	{ name: "book", Icon: BookOpen },
	{ name: "list", Icon: List },
];

const COLORS = [
	"#6366f1", // indigo
	"#8b5cf6", // violet
	"#ec4899", // pink
	"#ef4444", // red
	"#f97316", // orange
	"#eab308", // yellow
	"#22c55e", // green
	"#14b8a6", // teal
	"#06b6d4", // cyan
	"#3b82f6", // blue
];

export default function CreateListModal({
	isOpen,
	onClose,
	onSuccess,
}: CreateListModalProps) {
	const [name, setName] = useState("");
	const [selectedIcon, setSelectedIcon] = useState("folder");
	const [selectedColor, setSelectedColor] = useState(COLORS[0]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | undefined>();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(undefined);

		if (!name.trim()) {
			setError("List name is required");
			return;
		}

		setIsLoading(true);

		try {
			const request: TaskListRequest = {
				name: name.trim(),
				icon: selectedIcon,
				colorHex: selectedColor,
			};

			const newList = await api.post<TaskList>("/lists", request);
			toast.success(`List "${newList.name}" created!`);
			onSuccess(newList);
			handleClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create list");
		} finally {
			setIsLoading(false);
		}
	};

	const handleClose = () => {
		setName("");
		setSelectedIcon("folder");
		setSelectedColor(COLORS[0]);
		setError(undefined);
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className={styles.overlay} onClick={handleClose}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				<div className={styles.header}>
					<h2 className={styles.title}>Create New List</h2>
					<button className={styles.closeButton} onClick={handleClose}>
						<X size={20} />
					</button>
				</div>

				<form onSubmit={handleSubmit} className={styles.form}>
					<div className={styles.preview}>
						<div
							className={styles.previewIcon}
							style={{ backgroundColor: selectedColor }}
						>
							{(() => {
								const iconData = ICONS.find((i) => i.name === selectedIcon);
								const Icon = iconData?.Icon ?? List;
								return <Icon size={24} />;
							})()}
						</div>
						<span className={styles.previewName}>{name || "New List"}</span>
					</div>

					<Input
						label="List Name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="e.g., Work, Personal, Side Projects"
						autoFocus
					/>

					<div className={styles.field}>
						<label className={styles.label}>Icon</label>
						<div className={styles.iconGrid}>
							{ICONS.map(({ name: iconName, Icon }) => (
								<button
									key={iconName}
									type="button"
									className={`${styles.iconButton} ${
										selectedIcon === iconName ? styles.selected : ""
									}`}
									onClick={() => setSelectedIcon(iconName)}
								>
									<Icon size={20} />
								</button>
							))}
						</div>
					</div>

					<div className={styles.field}>
						<label className={styles.label}>Color</label>
						<div className={styles.colorGrid}>
							{COLORS.map((color) => (
								<button
									key={color}
									type="button"
									className={`${styles.colorButton} ${
										selectedColor === color ? styles.selected : ""
									}`}
									style={{ backgroundColor: color }}
									onClick={() => setSelectedColor(color)}
								/>
							))}
						</div>
					</div>

					{error && <p className={styles.error}>{error}</p>}

					<div className={styles.actions}>
						<Button
							type="button"
							variant="secondary"
							onClick={handleClose}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" isLoading={isLoading}>
							Create List
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
