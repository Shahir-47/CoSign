/**
 * Timezone utilities for handling user's preferred timezone
 */

/**
 * Get user's preferred timezone from localStorage or fall back to browser's timezone
 */
export function getUserTimezone(): string {
	try {
		const userData = localStorage.getItem("user");
		if (userData) {
			const user = JSON.parse(userData);
			if (user.timezone) {
				return user.timezone;
			}
		}
	} catch {
		// Fall back to browser timezone
	}
	return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get current time in user's timezone as individual components
 */
function getNowInUserTimezone(): {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
} {
	const userTimezone = getUserTimezone();
	const now = new Date();

	// Use Intl.DateTimeFormat to get time in user's timezone
	const formatter = new Intl.DateTimeFormat("en-CA", {
		timeZone: userTimezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});

	const parts = formatter.formatToParts(now);
	const getPart = (type: string): number => {
		const part = parts.find((p) => p.type === type);
		return part ? parseInt(part.value, 10) : 0;
	};

	return {
		year: getPart("year"),
		month: getPart("month"),
		day: getPart("day"),
		hour: getPart("hour"),
		minute: getPart("minute"),
		second: getPart("second"),
	};
}

/**
 * Parse a local datetime string into components
 * Handles formats like "2026-01-14T12:48:00" or "2026-01-14T12:48"
 */
function parseLocalDateTime(dateTimeString: string): {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
} {
	// Handle both "2026-01-14T12:48:00" and "2026-01-14T12:48"
	const [datePart, timePart = "00:00:00"] = dateTimeString.split("T");
	const [year, month, day] = datePart.split("-").map((s) => parseInt(s, 10));
	const timeParts = timePart.split(":").map((s) => parseInt(s, 10) || 0);

	return {
		year,
		month,
		day,
		hour: timeParts[0] || 0,
		minute: timeParts[1] || 0,
		second: timeParts[2] || 0,
	};
}

/**
 * Calculate time difference between a deadline and now
 * Returns milliseconds until deadline (negative if past)
 *
 * The deadline string from the backend is a LocalDateTime (no timezone),
 * representing the time in the user's preferred timezone.
 */
export function getTimeUntilDeadline(deadlineString: string): number {
	const deadline = parseLocalDateTime(deadlineString);
	const now = getNowInUserTimezone();

	// Convert both to milliseconds using Date constructor
	// (month is 0-indexed in JS Date)
	const deadlineMs = new Date(
		deadline.year,
		deadline.month - 1,
		deadline.day,
		deadline.hour,
		deadline.minute,
		deadline.second
	).getTime();

	const nowMs = new Date(
		now.year,
		now.month - 1,
		now.day,
		now.hour,
		now.minute,
		now.second
	).getTime();

	return deadlineMs - nowMs;
}

/**
 * Convert a datetime-local input value to a format suitable for the backend
 * Adds seconds if not present
 */
export function formatForBackend(dateTimeLocalValue: string): string {
	// datetime-local gives us "2026-01-14T12:48"
	// Add seconds for consistency: "2026-01-14T12:48:00"
	if (dateTimeLocalValue.length === 16) {
		return dateTimeLocalValue + ":00";
	}
	return dateTimeLocalValue;
}

/**
 * Get the minimum datetime for datetime-local input (now + offset in user's timezone)
 */
export function getMinDateTime(offsetMinutes: number = 1): string {
	const userTimezone = getUserTimezone();
	const now = new Date(Date.now() + offsetMinutes * 60000);

	const formatter = new Intl.DateTimeFormat("en-CA", {
		timeZone: userTimezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});

	const parts = formatter.formatToParts(now);
	const getPart = (type: string) =>
		parts.find((p) => p.type === type)?.value || "";

	// en-CA format gives us YYYY-MM-DD which is what we need
	return `${getPart("year")}-${getPart("month")}-${getPart("day")}T${getPart(
		"hour"
	)}:${getPart("minute")}`;
}

/**
 * Format a deadline string for display in user's timezone
 */
export function formatDeadlineDisplay(
	deadlineString: string,
	options?: Intl.DateTimeFormatOptions
): string {
	const userTimezone = getUserTimezone();

	// Parse the deadline string and create a date
	const parsed = parseLocalDateTime(deadlineString);
	const deadline = new Date(
		parsed.year,
		parsed.month - 1,
		parsed.day,
		parsed.hour,
		parsed.minute,
		parsed.second
	);

	// Format in user's timezone
	return deadline.toLocaleString("en-US", {
		timeZone: userTimezone,
		...options,
	});
}
