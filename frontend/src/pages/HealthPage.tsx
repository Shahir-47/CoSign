import { useState, useEffect, useCallback } from "react";
import {
	CheckCircle,
	XCircle,
	Loader2,
	Server,
	Database,
	Wifi,
	Clock,
} from "lucide-react";
import styles from "./HealthPage.module.css";

interface HealthStatus {
	api: "healthy" | "unhealthy" | "checking";
	websocket: "healthy" | "unhealthy" | "checking";
	latency: number | null;
	lastChecked: Date | null;
}

export default function HealthPage() {
	const [status, setStatus] = useState<HealthStatus>({
		api: "checking",
		websocket: "checking",
		latency: null,
		lastChecked: null,
	});

	const checkHealth = useCallback(async () => {
		setStatus((prev) => ({
			...prev,
			api: "checking",
			websocket: "checking",
		}));

		// Check API health
		const startTime = performance.now();
		try {
			const response = await fetch("/api/health", {
				method: "GET",
				cache: "no-store",
			});
			const endTime = performance.now();

			setStatus((prev) => ({
				...prev,
				api: response.ok ? "healthy" : "unhealthy",
				latency: Math.round(endTime - startTime),
				lastChecked: new Date(),
			}));
		} catch {
			setStatus((prev) => ({
				...prev,
				api: "unhealthy",
				latency: null,
				lastChecked: new Date(),
			}));
		}

		// Check WebSocket
		try {
			const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
			const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
			const ws = new WebSocket(wsUrl);

			const wsTimeout = setTimeout(() => {
				ws.close();
				setStatus((prev) => ({ ...prev, websocket: "unhealthy" }));
			}, 5000);

			ws.onopen = () => {
				clearTimeout(wsTimeout);
				ws.close();
				setStatus((prev) => ({ ...prev, websocket: "healthy" }));
			};

			ws.onerror = () => {
				clearTimeout(wsTimeout);
				setStatus((prev) => ({ ...prev, websocket: "unhealthy" }));
			};
		} catch {
			setStatus((prev) => ({ ...prev, websocket: "unhealthy" }));
		}
	}, []);

	useEffect(() => {
		// Wrap in setTimeout to avoid synchronous setState warning
		const timeoutId = setTimeout(checkHealth, 0);
		const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
		return () => {
			clearTimeout(timeoutId);
			clearInterval(interval);
		};
	}, [checkHealth]);

	const getStatusIcon = (state: "healthy" | "unhealthy" | "checking") => {
		switch (state) {
			case "healthy":
				return <CheckCircle size={20} className={styles.healthy} />;
			case "unhealthy":
				return <XCircle size={20} className={styles.unhealthy} />;
			case "checking":
				return <Loader2 size={20} className={styles.checking} />;
		}
	};

	const getOverallStatus = () => {
		if (status.api === "checking" || status.websocket === "checking") {
			return "checking";
		}
		if (status.api === "healthy" && status.websocket === "healthy") {
			return "healthy";
		}
		if (status.api === "unhealthy" && status.websocket === "unhealthy") {
			return "unhealthy";
		}
		return "degraded";
	};

	const overallStatus = getOverallStatus();

	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<div className={styles.header}>
					<h1 className={styles.title}>System Status</h1>
					<p className={styles.subtitle}>CoSign service health overview</p>
				</div>

				<div className={`${styles.overallStatus} ${styles[overallStatus]}`}>
					{overallStatus === "checking" ? (
						<Loader2 size={24} className={styles.checking} />
					) : overallStatus === "healthy" ? (
						<CheckCircle size={24} />
					) : (
						<XCircle size={24} />
					)}
					<span>
						{overallStatus === "checking"
							? "Checking..."
							: overallStatus === "healthy"
							? "All Systems Operational"
							: overallStatus === "degraded"
							? "Partial Outage"
							: "Service Disruption"}
					</span>
				</div>

				<div className={styles.services}>
					<div className={styles.service}>
						<div className={styles.serviceInfo}>
							<Server size={20} />
							<span>API Server</span>
						</div>
						<div className={styles.serviceStatus}>
							{status.latency !== null && status.api === "healthy" && (
								<span className={styles.latency}>{status.latency}ms</span>
							)}
							{getStatusIcon(status.api)}
						</div>
					</div>

					<div className={styles.service}>
						<div className={styles.serviceInfo}>
							<Wifi size={20} />
							<span>WebSocket</span>
						</div>
						<div className={styles.serviceStatus}>
							{getStatusIcon(status.websocket)}
						</div>
					</div>

					<div className={styles.service}>
						<div className={styles.serviceInfo}>
							<Database size={20} />
							<span>Database</span>
						</div>
						<div className={styles.serviceStatus}>
							{getStatusIcon(status.api)}
						</div>
					</div>
				</div>

				{status.lastChecked && (
					<div className={styles.footer}>
						<Clock size={14} />
						<span>Last checked: {status.lastChecked.toLocaleTimeString()}</span>
						<button className={styles.refreshButton} onClick={checkHealth}>
							Refresh
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
