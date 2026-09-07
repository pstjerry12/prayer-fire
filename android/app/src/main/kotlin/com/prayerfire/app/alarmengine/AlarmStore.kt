package com.prayerfire.app.alarmengine

import android.content.Context
import android.content.SharedPreferences

/** One prayer time the native alarm engine knows how to (re)schedule. */
data class ScheduledAlarm(
    val id: String,
    val hour: Int,
    val minute: Int,
    val label: String,
    val tone: String
)

/**
 * Persists scheduled alarms outside of AlarmManager itself, since AlarmManager
 * has no "list pending alarms" API. BootReceiver and the daily-reschedule step
 * in AlarmReceiver both read this to re-arm alarms without the JS layer
 * needing to run.
 */
object AlarmStore {
    private const val PREFS = "alarm_engine_prefs"
    private const val KEY_IDS = "alarm_ids"

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun save(context: Context, alarm: ScheduledAlarm) {
        val p = prefs(context)
        val ids = (p.getStringSet(KEY_IDS, emptySet()) ?: emptySet()).toMutableSet()
        ids.add(alarm.id)
        p.edit()
            .putStringSet(KEY_IDS, ids)
            .putInt("alarm_${alarm.id}_hour", alarm.hour)
            .putInt("alarm_${alarm.id}_minute", alarm.minute)
            .putString("alarm_${alarm.id}_label", alarm.label)
            .putString("alarm_${alarm.id}_tone", alarm.tone)
            .apply()
    }

    fun remove(context: Context, id: String) {
        val p = prefs(context)
        val ids = (p.getStringSet(KEY_IDS, emptySet()) ?: emptySet()).toMutableSet()
        ids.remove(id)
        p.edit()
            .putStringSet(KEY_IDS, ids)
            .remove("alarm_${id}_hour")
            .remove("alarm_${id}_minute")
            .remove("alarm_${id}_label")
            .remove("alarm_${id}_tone")
            .apply()
    }

    /** Removes everything and returns what was stored, so callers can cancel each one. */
    fun clear(context: Context): List<ScheduledAlarm> {
        val existing = all(context)
        prefs(context).edit().clear().apply()
        return existing
    }

    fun all(context: Context): List<ScheduledAlarm> {
        val p = prefs(context)
        val ids = p.getStringSet(KEY_IDS, emptySet()) ?: emptySet()
        return ids.mapNotNull { id ->
            val hour = p.getInt("alarm_${id}_hour", -1)
            val minute = p.getInt("alarm_${id}_minute", -1)
            if (hour < 0 || minute < 0) return@mapNotNull null
            ScheduledAlarm(
                id = id,
                hour = hour,
                minute = minute,
                label = p.getString("alarm_${id}_label", "") ?: "",
                tone = p.getString("alarm_${id}_tone", "classic") ?: "classic"
            )
        }
    }
}
