/**
 * Timezone utilities for handling user's preferred timezone
 */

export interface TimezoneOption {
	value: string;
	label: string;
}

export interface LocalDateTimeParts {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
}

// Generate timezone options from Intl API
export function getTimezoneOptions(): TimezoneOption[] {
	const timezones = Intl.supportedValuesOf("timeZone");
	return timezones.map((tz) => {
		const formatter = new Intl.DateTimeFormat("en-US", {
			timeZone: tz,
			timeZoneName: "shortOffset",
		});
		const parts = formatter.formatToParts(new Date());
		const offset = parts.find((p) => p.type === "timeZoneName")?.value || "";
		return {
			value: tz,
			label: `${tz.replace(/_/g, " ")} (${offset})`,
		};
	});
}

// Detect user's timezone
export function detectTimezone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone;
	} catch {
		return "America/New_York";
	}
}

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
function getNowInTimezone(
	timezone: string,
	referenceTime?: number,
): LocalDateTimeParts {
	const now = referenceTime ? new Date(referenceTime) : new Date();

	// Use Intl.DateTimeFormat to get time in user's timezone
	const formatter = new Intl.DateTimeFormat("en-CA", {
		timeZone: timezone,
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

export function getNowLocalDateTimeParts(
	timezone?: string,
	referenceTime?: number,
): LocalDateTimeParts {
	const resolvedTimezone = timezone || getUserTimezone();
	return getNowInTimezone(resolvedTimezone, referenceTime);
}

/**
 * Parse a local datetime string into components
 * Handles formats like "2026-01-14T12:48:00" or "2026-01-14T12:48"
 */
export function parseLocalDateTime(dateTimeString: string): LocalDateTimeParts {
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

export function getLocalDateTimeValue(dateTimeString: string): number {
	const parsed = parseLocalDateTime(dateTimeString);
	return Date.UTC(
		parsed.year,
		parsed.month - 1,
		parsed.day,
		parsed.hour,
		parsed.minute,
		parsed.second,
	);
}

export function getNowLocalDateTimeValue(
	timezone?: string,
	referenceTime?: number,
): number {
	const now = getNowLocalDateTimeParts(timezone, referenceTime);
	return Date.UTC(
		now.year,
		now.month - 1,
		now.day,
		now.hour,
		now.minute,
		now.second,
	);
}

/**
 * Calculate time difference between a deadline and now
 * Returns milliseconds until deadline (negative if past)
 *
 * The deadline string from the backend is a LocalDateTime (no timezone),
 * representing the time in the user's preferred timezone.
 */
export function getTimeUntilDeadline(
	deadlineString: string,
	timezone?: string,
): number {
	const deadlineMs = getLocalDateTimeValue(deadlineString);
	const nowMs = getNowLocalDateTimeValue(timezone);
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
export function getMinDateTime(
	offsetMinutes: number = 1,
	timezone?: string,
): string {
	const userTimezone = timezone || getUserTimezone();
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
		"hour",
	)}:${getPart("minute")}`;
}

/**
 * Format a LocalDateTime string without shifting the local clock time
 */
export function formatDeadlineDisplay(
	deadlineString: string,
	options?: Intl.DateTimeFormatOptions,
): string {
	// Parse the deadline string and create a date
	const parsed = parseLocalDateTime(deadlineString);
	const deadline = new Date(
		Date.UTC(
			parsed.year,
			parsed.month - 1,
			parsed.day,
			parsed.hour,
			parsed.minute,
			parsed.second,
		),
	);

	// Format using the local date/time components
	return deadline.toLocaleString("en-US", {
		timeZone: "UTC",
		...options,
	});
}
