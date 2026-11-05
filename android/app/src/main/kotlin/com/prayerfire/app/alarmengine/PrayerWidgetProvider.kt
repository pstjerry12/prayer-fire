package com.prayerfire.app.alarmengine

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import com.prayerfire.app.MainActivity
import com.prayerfire.app.R

/**
 * The home-screen widget: today's prayer point and verse (the same content the alarm screen shows, handed over by the
 * web app) plus the fire streak and a "Pray now" button that opens the Start-Up Prayer session. Tapping anywhere else on
 * the widget opens the app. It needs no network and no account: everything it shows is already on the phone.
 */
class PrayerWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            manager.updateAppWidget(id, buildViews(context))
        }
    }

    companion object {
        private const val PREFS = "prayer_widget"
        private const val KEY_STREAK = "streak"
        private const val KEY_DAY = "streak_day"

        /** Saves the streak the web app computed, with the day it was true on, then redraws every widget. */
        fun saveStreak(context: Context, streak: Int) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putInt(KEY_STREAK, streak.coerceIn(0, 100000))
                .putLong(KEY_DAY, AlarmContentStore.localDay())
                .apply()
            refreshAll(context)
        }

        /** The streak to show: kept for today and yesterday (the web app counts a streak from yesterday until you pray today). */
        fun streakToShow(context: Context): Int {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val day = prefs.getLong(KEY_DAY, -1L)
            return if (day >= AlarmContentStore.localDay() - 1) prefs.getInt(KEY_STREAK, 0) else 0
        }

        fun refreshAll(context: Context) {
            try {
                val manager = AppWidgetManager.getInstance(context)
                val ids = manager.getAppWidgetIds(ComponentName(context, PrayerWidgetProvider::class.java))
                for (id in ids) manager.updateAppWidget(id, buildViews(context))
            } catch (e: Exception) {
                // a widget that cannot redraw now will redraw at its next scheduled update
            }
        }

        private fun open(context: Context, link: String?, requestCode: Int): PendingIntent {
            val intent = if (link != null) {
                Intent(Intent.ACTION_VIEW, Uri.parse(link), context, MainActivity::class.java)
            } else {
                Intent(context, MainActivity::class.java).setAction(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        fun buildViews(context: Context): RemoteViews {
            val content = AlarmContentStore.today(context)
            val views = RemoteViews(context.packageName, R.layout.widget_prayer)
            views.setTextViewText(R.id.widget_point, content.point)
            val verse = if (content.reference.isBlank()) content.verse else "“${content.verse}”  ${content.reference}"
            views.setTextViewText(R.id.widget_verse, verse)

            val streak = streakToShow(context)
            if (streak > 0) {
                views.setTextViewText(R.id.widget_streak, "🔥 $streak")
                views.setViewVisibility(R.id.widget_streak, View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.widget_streak, View.GONE)
            }

            views.setOnClickPendingIntent(R.id.widget_root, open(context, null, 7001))
            views.setOnClickPendingIntent(R.id.widget_pray, open(context, "${context.getString(R.string.custom_url_scheme)}://pray", 7002))
            return views
        }
    }
}
