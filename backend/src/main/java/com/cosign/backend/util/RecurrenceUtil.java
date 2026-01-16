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
     */
    public static LocalDateTime getNextOccurrence(String rruleStr, LocalDateTime currentDeadline) {
        if (rruleStr == null || rruleStr.isEmpty()) return null;

        try {
            // Clean format by removing "RRULE:" prefix if frontend sent it
            String cleanRule = rruleStr.toUpperCase().startsWith("RRULE:")
                    ? rruleStr.substring(6)
                    : rruleStr;

            Recur recur = new Recur(cleanRule);

            // Convert Java LocalDateTime to ical DateTime
            DateTime seedDate = toIcalDateTime(currentDeadline);

            // Get next date strictly AFTER the current deadline
            Date nextDate = recur.getNextDate(seedDate, seedDate);

            // If nextDate is null, the recurrence has ended (UNTIL/COUNT reached)
            if (nextDate == null) {
                return null;
            }

            return toLocalDateTime((DateTime) nextDate);

        } catch (Exception e) {
            logger.error("Failed to parse recurrence rule: {}", rruleStr, e);
            return null;
        }
    }

    private static DateTime toIcalDateTime(LocalDateTime ldt) {
        Date date = Date.from(ldt.atZone(ZoneId.systemDefault()).toInstant());
        return new DateTime(date);
    }

    private static LocalDateTime toLocalDateTime(DateTime dt) {
        return dt.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
    }
}