import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { WebSocketProvider } from "./context/WebSocketContext";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import SignupPage from "./pages/SignupPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";

function App() {
	return (
		<Router>
			<AuthProvider>
				<WebSocketProvider>
					<Routes>
						<Route
							path="/"
							element={
								<ProtectedRoute>
									<HomePage />
								</ProtectedRoute>
							}
						/>
						<Route path="/signup" element={<SignupPage />} />
						<Route path="/login" element={<LoginPage />} />
						<Route path="/verify-email" element={<VerifyEmailPage />} />
					</Routes>
					<ToastContainer
						position="bottom-right"
						autoClose={8000}
						hideProgressBar={false}
						newestOnTop
						closeOnClick
						rtl={false}
						pauseOnFocusLoss
						draggable
						pauseOnHover
						theme="dark"
					/>
				</WebSocketProvider>
			</AuthProvider>
		</Router>
	);
}

export default App;
