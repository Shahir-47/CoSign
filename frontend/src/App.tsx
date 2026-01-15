import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { WebSocketProvider } from "./context/WebSocketContext";
import SignupPage from "./pages/SignupPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";

function App() {
	return (
		<Router>
			<WebSocketProvider>
				<Routes>
					<Route path="/" element={<HomePage />} />
					<Route path="/signup" element={<SignupPage />} />
					<Route path="/login" element={<LoginPage />} />
					<Route path="/verify-email" element={<VerifyEmailPage />} />
				</Routes>
				<ToastContainer
					position="bottom-right"
					autoClose={4000}
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
		</Router>
	);
}

export default App;
