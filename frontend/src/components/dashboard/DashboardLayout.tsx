import { useNavigate } from "react-router-dom";
import {
	LogOut,
	Plus,
	ClipboardList,
	ClipboardCheck,
	Users,
	Wifi,
	WifiOff,
	Eye,
} from "lucide-react";
import { toast } from "react-toastify";
import { useWebSocket } from "../../context/useWebSocket";
import Logo from "../shared/Logo";
import ListsSidebar from "./ListsSidebar";
import styles from "./DashboardLayout.module.css";

interface DashboardLayoutProps {
	children: React.ReactNode;
	activeTab: "my-tasks" | "verification-requests" | "supervising";
	onTabChange: (
		tab: "my-tasks" | "verification-requests" | "supervising"
	) => void;
	onCreateTask: () => void;
	selectedListId: number | null;
	onSelectList: (listId: number | null) => void;
	onCreateList: () => void;
	refreshListsKey?: number;
	onOpenVerifiersModal: () => void;
	onSelectedListNameChange?: (name: string | null) => void;
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
	onSelectedListNameChange,
}: DashboardLayoutProps) {
	const navigate = useNavigate();
	const user = getUser();
	const { isConnected, disconnect } = useWebSocket();

	const handleLogout = () => {
		disconnect();
		localStorage.removeItem("token");
		localStorage.removeItem("user");
		toast.info("You have been logged out");
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
					<button
						className={`${styles.navButton} ${
							activeTab === "supervising" ? styles.active : ""
						}`}
						onClick={() => onTabChange("supervising")}
					>
						<Eye size={18} />
						<span>Supervising</span>
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
						<div
							className={`${styles.connectionStatus} ${
								isConnected ? styles.connected : styles.disconnected
							}`}
							title={
								isConnected
									? "Connected - Real-time updates active"
									: "Disconnected - Reconnecting..."
							}
						>
							{isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
						</div>
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
						onSelectedListNameChange={onSelectedListNameChange}
					/>
				)}
				<div className={styles.content}>{children}</div>
			</main>
		</div>
	);
}
