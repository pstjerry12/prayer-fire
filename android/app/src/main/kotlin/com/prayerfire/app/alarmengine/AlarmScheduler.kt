package com.prayerfire.app.alarmengine

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import java.util.Calendar

/** Wraps AlarmManager.setExactAndAllowWhileIdle for a single prayer time. */
object AlarmScheduler {
    const val EXTRA_ID = "alarm_id"
    const val EXTRA_LABEL = "alarm_label"
    const val EXTRA_TONE = "alarm_tone"
    const val EXTRA_KIND = "alarm_kind"
    const val EXTRA_CALL_URL = "alarm_call_url"
    /** Set on the one-off alarm created by Snooze, so the receiver does not treat it as the daily alarm. */
    const val EXTRA_SNOOZE = "alarm_snooze"

    /** How long Snooze waits before ringing again. */
    const val SNOOZE_MINUTES = 10

    private fun pendingIntent(context: Context, alarm: ScheduledAlarm, snooze: Boolean = false): PendingIntent {
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra(EXTRA_ID, alarm.id)
            putExtra(EXTRA_LABEL, alarm.label)
            putExtra(EXTRA_TONE, alarm.tone)
            putExtra(EXTRA_KIND, alarm.kind)
            putExtra(EXTRA_CALL_URL, alarm.callUrl)
            putExtra(EXTRA_SNOOZE, snooze)
        }
        return PendingIntent.getBroadcast(
            context,
            // A different request code for the snooze alarm, so it never replaces tomorrow's daily alarm.
            if (snooze) alarm.id.hashCode() + 7 else alarm.id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    fun nextTriggerMillis(hour: Int, minute: Int): Long {
        val now = Calendar.getInstance()
        val next = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        if (!next.after(now)) next.add(Calendar.DAY_OF_MONTH, 1)
        return next.timeInMillis
    }

    fun schedule(context: Context, alarm: ScheduledAlarm) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val triggerAt = nextTriggerMillis(alarm.hour, alarm.minute)
        val pi = pendingIntent(context, alarm)
        try {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
        } catch (e: SecurityException) {
            // SCHEDULE_EXACT_ALARM was revoked (e.g. the user turned it off in
            // Settings) between our permission check and this call — fall back
            // to an inexact alarm instead of crashing the reschedule path.
            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pi)
        }
    }

    fun cancel(context: Context, alarm: ScheduledAlarm) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(pendingIntent(context, alarm))
        alarmManager.cancel(pendingIntent(context, alarm, snooze = true))
    }

    /** Rings this alarm once more in [SNOOZE_MINUTES]. Tomorrow's daily alarm is not touched. */
    fun snooze(context: Context, alarm: ScheduledAlarm) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val triggerAt = System.currentTimeMillis() + SNOOZE_MINUTES * 60_000L
        val pi = pendingIntent(context, alarm, snooze = true)
        try {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
        } catch (e: SecurityException) {
            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pi)
        }
    }
}
