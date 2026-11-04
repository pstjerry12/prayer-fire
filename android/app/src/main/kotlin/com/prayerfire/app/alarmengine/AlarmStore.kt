package com.prayerfire.app.alarmengine

import android.content.Context
import android.content.SharedPreferences

/** One prayer time the native alarm engine knows how to (re)schedule. */
data class ScheduledAlarm(
    val id: String,
    val hour: Int,
    val minute: Int,
    val label: String,
    val tone: String,
    /** "personal" (default) or "group". A group alarm's main button is "Join Live Prayer". */
    val kind: String = KIND_PERSONAL,
    /** For a group alarm: the group's call link (WhatsApp, Google Meet, Zoom...). Empty if the leader has set none. */
    val callUrl: String = ""
) {
    val isGroup: Boolean get() = kind == KIND_GROUP && callUrl.isNotBlank()

    companion object {
        const val KIND_PERSONAL = "personal"
        const val KIND_GROUP = "group"
    }
}

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
            .putString("alarm_${alarm.id}_kind", alarm.kind)
            .putString("alarm_${alarm.id}_call", alarm.callUrl)
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
            .remove("alarm_${id}_kind")
            .remove("alarm_${id}_call")
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
                tone = p.getString("alarm_${id}_tone", "classic") ?: "classic",
                kind = p.getString("alarm_${id}_kind", ScheduledAlarm.KIND_PERSONAL) ?: ScheduledAlarm.KIND_PERSONAL,
                callUrl = p.getString("alarm_${id}_call", "") ?: ""
            )
        }
    }
}

/** One day's prayer point and verse, shown on the full-screen alarm. */
data class AlarmContent(val point: String, val verse: String, val reference: String, val day: Long = -1L)

/**
 * The web app hands the native layer a couple of weeks of prayer points and verses (see
 * `setAlarmContent` in AlarmEnginePlugin). The alarm screen picks today's by date, so it still shows something
 * fresh when the app has not been opened for a few days. Kept in its own preferences file because
 * [AlarmStore.clear] wipes the alarm times every time the web app re-schedules.
 */
object AlarmContentStore {
    private const val PREFS = "alarm_engine_content"
    private const val KEY = "items"
    private val FALLBACK = AlarmContent(
        point = "Give this first part of your day to God. Thank Him, then bring Him what is on your heart.",
        verse = "Pray without ceasing.",
        reference = "1 Thessalonians 5:17"
    )

    fun save(context: Context, items: List<AlarmContent>) {
        val arr = org.json.JSONArray()
        items.take(31).forEach {
            arr.put(org.json.JSONObject().put("p", it.point).put("v", it.verse).put("r", it.reference).put("d", it.day))
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, arr.toString()).apply()
    }

    /** The local calendar day number (days since 1970, in the phone's time zone). The web app uses the same number. */
    fun localDay(): Long {
        val now = System.currentTimeMillis()
        return (now + java.util.TimeZone.getDefault().getOffset(now)) / 86_400_000L
    }

    /** Today's item. If the app has not been opened for longer than the list covers, the list repeats by day number. */
    fun today(context: Context): AlarmContent {
        return try {
            val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null) ?: return FALLBACK
            val arr = org.json.JSONArray(raw)
            if (arr.length() == 0) return FALLBACK
            val day = localDay()
            var pick: org.json.JSONObject? = null
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                if (o.optLong("d", -1L) == day) { pick = o; break }
            }
            val o = pick ?: arr.getJSONObject((day % arr.length()).toInt())
            AlarmContent(o.optString("p"), o.optString("v"), o.optString("r"), o.optLong("d", -1L))
        } catch (e: Exception) {
            FALLBACK
        }
    }
}
