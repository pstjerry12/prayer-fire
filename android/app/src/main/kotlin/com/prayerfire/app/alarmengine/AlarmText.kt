package com.prayerfire.app.alarmengine

import android.content.Context
import org.json.JSONObject

/**
 * The words on the alarm screen and the alarm notification (title, Stop, Snooze, Pray Now...), in the language chosen in the app.
 * The web app saves them here (see `setAlarmText` in AlarmEnginePlugin) whenever the language changes; until then, or if anything
 * is missing, the English wording passed to [get] is used, so the alarm never shows a blank.
 */
object AlarmText {
    private const val PREFS = "alarm_engine_text"
    private const val KEY = "strings"

    fun save(context: Context, json: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json).apply()
    }

    fun get(context: Context, key: String, fallback: String): String {
        val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null) ?: return fallback
        return try {
            JSONObject(raw).optString(key, "").ifBlank { fallback }
        } catch (e: Exception) {
            fallback
        }
    }
}
