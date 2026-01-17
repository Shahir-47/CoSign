import {
	createContext,
	useState,
	useEffect,
	useCallback,
	useRef,
	type ReactNode,
} from "react";
import { toast } from "react-toastify";
import { setGlobalLogoutHandler } from "../utils/api";

interface User {
	email: string;
	fullName: string;
	timezone: string;
}

interface AuthContextType {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (token: string, user: User) => void;
	logout: (message?: string) => void;
	updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Export context for useAuth hook
export { AuthContext };

// Helper to get initial auth state from localStorage
function getInitialAuthState(): { token: string | null; user: User | null } {
	try {
		const storedToken = localStorage.getItem("token");
		const storedUser = localStorage.getItem("user");
		if (storedToken && storedUser) {
			return { token: storedToken, user: JSON.parse(storedUser) };
		}
	} catch {
		// Invalid stored data, clear it
		localStorage.removeItem("token");
		localStorage.removeItem("user");
	}
	return { token: null, user: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
	// Use lazy initializers to avoid useEffect for initial state
	const [user, setUser] = useState<User | null>(
		() => getInitialAuthState().user
	);
	const [token, setToken] = useState<string | null>(
		() => getInitialAuthState().token
	);
	const [isLoading] = useState(false); // No longer need loading state since we initialize synchronously
	const logoutInProgressRef = useRef(false);

	const logout = useCallback((message?: string) => {
		// Prevent multiple simultaneous logouts
		if (logoutInProgressRef.current) return;
		logoutInProgressRef.current = true;

		localStorage.removeItem("token");
		localStorage.removeItem("user");
		setToken(null);
		setUser(null);

		if (message) {
			toast.warning(message);
		}

		// Reset after state update - ProtectedRoute will handle redirect
		setTimeout(() => {
			logoutInProgressRef.current = false;
		}, 100);
	}, []);

	// Register global logout handler for API interceptor
	useEffect(() => {
		setGlobalLogoutHandler(logout);
	}, [logout]);

	const login = useCallback((newToken: string, newUser: User) => {
		localStorage.setItem("token", newToken);
		localStorage.setItem("user", JSON.stringify(newUser));
		setToken(newToken);
		setUser(newUser);
	}, []);

	const updateUser = useCallback((updatedUser: User) => {
		localStorage.setItem("user", JSON.stringify(updatedUser));
		setUser(updatedUser);
	}, []);

	const value: AuthContextType = {
		user,
		token,
		isAuthenticated: !!token && !!user,
		isLoading,
		login,
		logout,
		updateUser,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
