package com.cosign.backend.util;

import net.fortuna.ical4j.model.DateTime;
import net.fortuna.ical4j.model.Recur;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

public class RecurrenceUtil {

    private static final Logger logger = LoggerFactory.getLogger(RecurrenceUtil.class);

    /**
     * Calculates the next deadline based on the RRULE string.
     * Supports: Indefinite (FREQ=WEEKLY), End Date (UNTIL=...), and Count (COUNT=...)
     * 
     * @param rruleStr The RRULE string
     * @param currentDeadline The current deadline in the user's timezone (stored as LocalDateTime)
     * @param userTimezone The user's timezone (e.g., "America/New_York")
     * @return The next occurrence as LocalDateTime in the user's timezone, or null if no more occurrences
     */
    public static LocalDateTime getNextOccurrence(String rruleStr, LocalDateTime currentDeadline, String userTimezone) {
        if (rruleStr == null || rruleStr.isEmpty()) return null;

        try {
            // Clean format by removing "RRULE:" prefix if frontend sent it
            String cleanRule = rruleStr.toUpperCase().startsWith("RRULE:")
                    ? rruleStr.substring(6)
                    : rruleStr;

            Recur recur = new Recur(cleanRule);

            // Use user's timezone for date calculations
            ZoneId zoneId = ZoneId.of(userTimezone);

            // Convert Java LocalDateTime to ical DateTime using user's timezone
            DateTime seedDate = toIcalDateTime(currentDeadline, zoneId);

            // Get next date strictly AFTER the current deadline
            Date nextDate = recur.getNextDate(seedDate, seedDate);

            // If nextDate is null, the recurrence has ended (UNTIL/COUNT reached)
            if (nextDate == null) {
                return null;
            }

            return toLocalDateTime((DateTime) nextDate, zoneId);

        } catch (Exception e) {
            logger.error("Failed to parse recurrence rule: {}", rruleStr, e);
            return null;
        }
    }

    /**
     * Overload for backward compatibility - uses system default timezone
     * @deprecated Use getNextOccurrence(String, LocalDateTime, String) with explicit timezone
     */
    @Deprecated
    public static LocalDateTime getNextOccurrence(String rruleStr, LocalDateTime currentDeadline) {
        return getNextOccurrence(rruleStr, currentDeadline, ZoneId.systemDefault().getId());
    }

    private static DateTime toIcalDateTime(LocalDateTime ldt, ZoneId zoneId) {
        Date date = Date.from(ldt.atZone(zoneId).toInstant());
        return new DateTime(date);
    }

    private static LocalDateTime toLocalDateTime(DateTime dt, ZoneId zoneId) {
        return dt.toInstant().atZone(zoneId).toLocalDateTime();
    }
}