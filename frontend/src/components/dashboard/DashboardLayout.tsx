import { useNavigate } from "react-router-dom";
import {
	LogOut,
	Plus,
	ClipboardList,
	ClipboardCheck,
	Users,
} from "lucide-react";
import Logo from "../shared/Logo";
import ListsSidebar from "./ListsSidebar";
import styles from "./DashboardLayout.module.css";

interface DashboardLayoutProps {
	children: React.ReactNode;
	activeTab: "my-tasks" | "verification-requests";
	onTabChange: (tab: "my-tasks" | "verification-requests") => void;
	onCreateTask: () => void;
	selectedListId: number | null;
	onSelectList: (listId: number | null) => void;
	onCreateList: () => void;
	refreshListsKey?: number;
	onOpenVerifiersModal: () => void;
}

function getUser(): {
	fullName: string;
	email: string;
	timezone: string;
} | null {
	const userData = localStorage.getItem("user");
	if (userData) {
		try {
			return JSON.parse(userData);
		} catch {
			return null;
		}
	}
	return null;
}

export default function DashboardLayout({
	children,
	activeTab,
	onTabChange,
	onCreateTask,
	selectedListId,
	onSelectList,
	onCreateList,
	refreshListsKey,
	onOpenVerifiersModal,
}: DashboardLayoutProps) {
	const navigate = useNavigate();
	const user = getUser();

	const handleLogout = () => {
		localStorage.removeItem("token");
		localStorage.removeItem("user");
		navigate("/login");
	};

	return (
		<div className={styles.layout}>
			<header className={styles.header}>
				<div className={styles.headerLeft}>
					<Logo size="sm" />
				</div>

				<nav className={styles.nav}>
					<button
						className={`${styles.navButton} ${
							activeTab === "my-tasks" ? styles.active : ""
						}`}
						onClick={() => onTabChange("my-tasks")}
					>
						<ClipboardList size={18} />
						<span>My Tasks</span>
					</button>
					<button
						className={`${styles.navButton} ${
							activeTab === "verification-requests" ? styles.active : ""
						}`}
						onClick={() => onTabChange("verification-requests")}
					>
						<ClipboardCheck size={18} />
						<span>To Verify</span>
					</button>
				</nav>

				<div className={styles.headerRight}>
					<button className={styles.createButton} onClick={onCreateTask}>
						<Plus size={18} />
						<span>New Task</span>
					</button>

					<button
						className={styles.verifiersButton}
						onClick={onOpenVerifiersModal}
						title="Manage Verifiers"
					>
						<Users size={18} />
						<span>Verifiers</span>
					</button>

					<div className={styles.userSection}>
						{user && (
							<div className={styles.userInfo}>
								<span className={styles.userName}>{user.fullName}</span>
								<span className={styles.userEmail}>{user.email}</span>
							</div>
						)}
						<button
							className={styles.logoutButton}
							onClick={handleLogout}
							title="Logout"
						>
							<LogOut size={18} />
						</button>
					</div>
				</div>
			</header>

			<main className={styles.main}>
				{activeTab === "my-tasks" && (
					<ListsSidebar
						selectedListId={selectedListId}
						onSelectList={onSelectList}
						onCreateList={onCreateList}
						refreshKey={refreshListsKey}
					/>
				)}
				<div className={styles.content}>{children}</div>
			</main>
		</div>
	);
}
