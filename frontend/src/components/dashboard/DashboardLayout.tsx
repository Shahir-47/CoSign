import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
	LogOut,
	Plus,
	CheckSquare,
	ClipboardCheck,
	Users,
	Wifi,
	WifiOff,
	Eye,
	Settings,
	ChevronDown,
} from "lucide-react";
import { toast } from "react-toastify";
import { useWebSocket } from "../../context/useWebSocket";
import { useAuth } from "../../context/useAuth";
import Logo from "../shared/Logo";
import Avatar from "../shared/Avatar";
import ListsSidebar from "./ListsSidebar";
import ProfileSettingsModal from "./ProfileSettingsModal";
import styles from "./DashboardLayout.module.css";

interface DashboardLayoutProps {
	children: React.ReactNode;
	activeTab: "my-tasks" | "verification-requests" | "supervising";
	onTabChange: (
		tab: "my-tasks" | "verification-requests" | "supervising",
	) => void;
	onCreateTask: () => void;
	selectedListId: number | null;
	onSelectList: (listId: number | null) => void;
	onCreateList: () => void;
	refreshListsKey?: number;
	onOpenVerifiersModal: () => void;
	onSelectedListNameChange?: (name: string | null) => void;
	isProfileModalOpen?: boolean;
	onOpenProfileModal?: () => void;
	onCloseProfileModal?: () => void;
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
	isProfileModalOpen,
	onOpenProfileModal,
	onCloseProfileModal,
}: DashboardLayoutProps) {
	const navigate = useNavigate();
	const { user } = useAuth();
	const { isConnected, disconnect } = useWebSocket();
	const [showProfileDropdown, setShowProfileDropdown] = useState(false);
	
	// Use prop if provided, otherwise use local state for backwards compatibility
	const [localShowProfileModal, setLocalShowProfileModal] = useState(false);
	const showProfileModal = isProfileModalOpen ?? localShowProfileModal;
	const handleOpenProfile = onOpenProfileModal ?? (() => setLocalShowProfileModal(true));
	const handleCloseProfile = onCloseProfileModal ?? (() => setLocalShowProfileModal(false));
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setShowProfileDropdown(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

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
						<CheckSquare size={18} />
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
							<div className={styles.profileDropdown} ref={dropdownRef}>
								<button
									className={styles.profileButton}
									onClick={() => setShowProfileDropdown(!showProfileDropdown)}
								>
									<Avatar
										src={user.profilePictureUrl}
										name={user.fullName}
										size="sm"
									/>
									<div className={styles.profileInfo}>
										<span className={styles.profileName}>{user.fullName}</span>
										<span className={styles.profileEmail}>{user.email}</span>
									</div>
									<ChevronDown
										size={16}
										className={`${styles.chevron} ${showProfileDropdown ? styles.open : ""}`}
									/>
								</button>

								{showProfileDropdown && (
									<div className={styles.dropdownMenu}>
										<button
											className={styles.dropdownItem}
											onClick={() => {
												setShowProfileDropdown(false);
												handleOpenProfile();
											}}
										>
											<Settings size={16} />
											Profile Settings
										</button>
										<div className={styles.dropdownDivider} />
										<button
											className={`${styles.dropdownItem} ${styles.danger}`}
											onClick={handleLogout}
										>
											<LogOut size={16} />
											Log Out
										</button>
									</div>
								)}
							</div>
						)}
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

			<ProfileSettingsModal
				isOpen={showProfileModal}
				onClose={handleCloseProfile}
			/>
		</div>
	);
}
