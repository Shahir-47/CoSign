import { useState, useEffect } from "react";
import {
	Layers,
	FolderKanban,
	Briefcase,
	Rocket,
	Home,
	Heart,
	Dumbbell,
	BookOpen,
	Plus,
	MoreHorizontal,
	Pencil,
	Trash2,
	List,
	Inbox,
} from "lucide-react";
import type { TaskList } from "../../types";
import { api } from "../../utils/api";
import EditListModal from "./EditListModal";
import styles from "./ListsSidebar.module.css";

interface ListsSidebarProps {
	selectedListId: number | null;
	onSelectList: (listId: number | null) => void;
	onCreateList: () => void;
	refreshKey?: number;
	onSelectedListNameChange?: (name: string | null) => void;
	isOpen?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
	inbox: Inbox,
	folder: FolderKanban,
	briefcase: Briefcase,
	rocket: Rocket,
	home: Home,
	heart: Heart,
	dumbbell: Dumbbell,
	book: BookOpen,
	list: List,
};

function getIconComponent(iconName?: string) {
	if (!iconName) return List;
	return ICON_MAP[iconName.toLowerCase()] || List;
}

export default function ListsSidebar({
	selectedListId,
	onSelectList,
	onCreateList,
	refreshKey,
	onSelectedListNameChange,
	isOpen,
}: ListsSidebarProps) {
	const [lists, setLists] = useState<TaskList[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
	const [editingList, setEditingList] = useState<TaskList | null>(null);

	const fetchLists = async () => {
		try {
			const data = await api.get<TaskList[]>("/lists");
			setLists(data);

			// Auto-select default list if none selected
			if (selectedListId === null && data.length > 0) {
				const defaultList = data.find((l) => l.isDefault);
				if (defaultList) {
					onSelectList(defaultList.id);
					onSelectedListNameChange?.(defaultList.name);
				}
			} else if (selectedListId !== null) {
				// Update name for current selection
				const selected = data.find((l) => l.id === selectedListId);
				onSelectedListNameChange?.(selected?.name ?? null);
			}
		} catch (err) {
			console.error("Failed to fetch lists:", err);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchLists();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [refreshKey]);

	const handleDeleteList = async (listId: number) => {
		if (
			!confirm("Delete this list? Tasks will be moved to your default list.")
		) {
			return;
		}

		try {
			await api.delete(`/lists/${listId}`);
			await fetchLists();
			if (selectedListId === listId) {
				const defaultList = lists.find((l) => l.isDefault);
				onSelectList(defaultList?.id ?? null);
			}
		} catch (err) {
			console.error("Failed to delete list:", err);
		}
		setMenuOpenId(null);
	};

	if (isLoading) {
		return (
			<aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
				<div className={styles.header}>
					<h2 className={styles.title}>Lists</h2>
				</div>
				<div className={styles.loading}>Loading...</div>
			</aside>
		);
	}

	return (
		<aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
			<div className={styles.header}>
				<h2 className={styles.title}>Lists</h2>
				<button
					className={styles.addButton}
					onClick={onCreateList}
					title="Create new list"
				>
					<Plus size={18} />
				</button>
			</div>

			<nav className={styles.listNav}>
				<button
					className={`${styles.listItem} ${
						selectedListId === null ? styles.active : ""
					}`}
					onClick={() => {
						onSelectList(null);
						onSelectedListNameChange?.(null);
					}}
				>
					<div className={styles.listIcon} style={{ color: "#6366f1" }}>
						<Layers size={18} />
					</div>
					<span className={styles.listName}>All Tasks</span>
					<span className={styles.listCount}>
						{lists.reduce((sum, l) => sum + l.taskCount, 0)}
					</span>
				</button>

				{lists.map((list) => {
					const IconComponent = getIconComponent(list.icon);
					return (
						<div key={list.id} className={styles.listItemWrapper}>
							<button
								className={`${styles.listItem} ${
									selectedListId === list.id ? styles.active : ""
								}`}
								onClick={() => {
									onSelectList(list.id);
									onSelectedListNameChange?.(list.name);
								}}
							>
								<div
									className={styles.listIcon}
									style={{ color: list.colorHex || "#6366f1" }}
								>
									<IconComponent size={18} />
								</div>
								<span className={styles.listName}>{list.name}</span>
								<span className={styles.listCount}>{list.taskCount}</span>
							</button>

							{!list.isDefault && (
								<div className={styles.menuWrapper}>
									<button
										className={styles.menuTrigger}
										onClick={(e) => {
											e.stopPropagation();
											setMenuOpenId(menuOpenId === list.id ? null : list.id);
										}}
									>
										<MoreHorizontal size={16} />
									</button>

									{menuOpenId === list.id && (
										<div className={styles.menu}>
											<button
												className={styles.menuItem}
												onClick={() => {
													setEditingList(list);
													setMenuOpenId(null);
												}}
											>
												<Pencil size={14} />
												<span>Edit</span>
											</button>
											{/* Do not show delete for the default list */}
											{!list.isDefault && (
												<button
													className={`${styles.menuItem} ${styles.danger}`}
													onClick={() => handleDeleteList(list.id)}
												>
													<Trash2 size={14} />
													<span>Delete</span>
												</button>
											)}
										</div>
									)}
								</div>
							)}
						</div>
					);
				})}
			</nav>

			<EditListModal
				isOpen={editingList !== null}
				list={editingList}
				onClose={() => setEditingList(null)}
				onSuccess={(updatedList) => {
					// Update list in local state
					setLists((prev) =>
						prev.map((l) => (l.id === updatedList.id ? updatedList : l)),
					);
					// Update selected list name if this is the selected list
					if (selectedListId === updatedList.id) {
						onSelectedListNameChange?.(updatedList.name);
					}
					setEditingList(null);
				}}
			/>
		</aside>
	);
}
