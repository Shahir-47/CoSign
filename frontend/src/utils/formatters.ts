// Shared formatting utilities

/**
 * Format an RRULE string for human-readable display
 * @param rruleStr - The RRULE string (e.g., "FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20251231T000000Z")
 * @returns A human-readable string (e.g., "Weekly on Mon, Wed, until 12/31/2025")
 */
export function formatRRuleDisplay(rruleStr: string): string {
	if (!rruleStr) return "Does not repeat";

	try {
		const cleanRule = rruleStr.toUpperCase().startsWith("RRULE:")
			? rruleStr.substring(6)
			: rruleStr;

		const parts: Record<string, string> = {};
		cleanRule.split(";").forEach((part) => {
			const [key, value] = part.split("=");
			if (key && value) parts[key] = value;
		});

		let result = "";
		const freq = parts["FREQ"];
		const interval = parseInt(parts["INTERVAL"] || "1");

		// Frequency
		if (interval === 1) {
			switch (freq) {
				case "DAILY":
					result = "Daily";
					break;
				case "WEEKLY":
					result = "Weekly";
					break;
				case "MONTHLY":
					result = "Monthly";
					break;
				case "YEARLY":
					result = "Yearly";
					break;
				default:
					result = freq || "Custom";
			}
		} else {
			switch (freq) {
				case "DAILY":
					result = `Every ${interval} days`;
					break;
				case "WEEKLY":
					result = `Every ${interval} weeks`;
					break;
				case "MONTHLY":
					result = `Every ${interval} months`;
					break;
				case "YEARLY":
					result = `Every ${interval} years`;
					break;
				default:
					result = `Every ${interval} ${freq?.toLowerCase() || "intervals"}`;
			}
		}

		// Weekdays
		if (parts["BYDAY"]) {
			const dayMap: Record<string, string> = {
				MO: "Mon",
				TU: "Tue",
				WE: "Wed",
				TH: "Thu",
				FR: "Fri",
				SA: "Sat",
				SU: "Sun",
			};
			const days = parts["BYDAY"].split(",").map((d) => dayMap[d] || d);
			if (days.length > 0 && days.length < 7) {
				result += ` on ${days.join(", ")}`;
			}
		}

		// End condition
		if (parts["UNTIL"]) {
			const until = parts["UNTIL"];
			// Parse UNTIL date (format: YYYYMMDDTHHmmssZ or YYYYMMDD)
			const year = parseInt(until.substring(0, 4));
			const month = parseInt(until.substring(4, 6)) - 1; // 0-indexed
			const day = parseInt(until.substring(6, 8));
			const date = new Date(year, month, day);
			const formattedDate = date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			});
			result += `, until ${formattedDate}`;
		} else if (parts["COUNT"]) {
			result += `, ${parts["COUNT"]} times`;
		}

		return result;
	} catch {
		return rruleStr;
	}
}

/**
 * Get a short version of the repeat pattern for compact display (e.g., on cards)
 * @param rruleStr - The RRULE string
 * @returns A short display string (e.g., "Weekly", "Daily ×10", "Weekly → 12/31")
 */
export function formatRRuleShort(rruleStr: string): string {
	if (!rruleStr) return "";

	try {
		const cleanRule = rruleStr.toUpperCase().startsWith("RRULE:")
			? rruleStr.substring(6)
			: rruleStr;

		const parts: Record<string, string> = {};
		cleanRule.split(";").forEach((part) => {
			const [key, value] = part.split("=");
			if (key && value) parts[key] = value;
		});

		const freq = parts["FREQ"];
		const interval = parseInt(parts["INTERVAL"] || "1");

		let result = "";
		if (interval === 1) {
			switch (freq) {
				case "DAILY":
					result = "Daily";
					break;
				case "WEEKLY":
					result = "Weekly";
					break;
				case "MONTHLY":
					result = "Monthly";
					break;
				case "YEARLY":
					result = "Yearly";
					break;
				default:
					result = "Repeats";
			}
		} else {
			switch (freq) {
				case "DAILY":
					result = `Every ${interval}d`;
					break;
				case "WEEKLY":
					result = `Every ${interval}w`;
					break;
				case "MONTHLY":
					result = `Every ${interval}mo`;
					break;
				case "YEARLY":
					result = `Every ${interval}y`;
					break;
				default:
					result = "Repeats";
			}
		}

		// Add end condition indicator (compact)
		if (parts["COUNT"]) {
			const count = parseInt(parts["COUNT"]);
			result += `, ${count} times`;
		} else if (parts["UNTIL"]) {
			// Parse UNTIL date (format: YYYYMMDD or YYYYMMDDTHHMMSSZ)
			const until = parts["UNTIL"];
			const year = parseInt(until.substring(0, 4));
			const month = parseInt(until.substring(4, 6)) - 1; // 0-indexed
			const day = parseInt(until.substring(6, 8));
			const date = new Date(year, month, day);
			const formattedDate = date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			});
			result += ` until ${formattedDate}`;
		}

		return result;
	} catch {
		return "Repeats";
	}
}
