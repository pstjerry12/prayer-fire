package com.prayerfire.app.alarmengine

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

/**
 * Fires when AlarmManager wakes the device for a prayer time. Re-arms
 * tomorrow's exact alarm first (AlarmManager has no "repeat daily" mode that
 * stays exact), then starts the foreground ringing service — all of this
 * runs even if the app/JS layer was killed.
 */
class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra(AlarmScheduler.EXTRA_ID) ?: return
        val label = intent.getStringExtra(AlarmScheduler.EXTRA_LABEL) ?: "Prayer Time"
        val tone = intent.getStringExtra(AlarmScheduler.EXTRA_TONE) ?: "classic"

        val stored = AlarmStore.all(context).find { it.id == id }
        if (stored != null) {
            AlarmScheduler.schedule(context, stored)
        }

        val serviceIntent = Intent(context, AlarmRingService::class.java).apply {
            putExtra(AlarmScheduler.EXTRA_ID, id)
            putExtra(AlarmScheduler.EXTRA_LABEL, label)
            putExtra(AlarmScheduler.EXTRA_TONE, tone)
        }
        ContextCompat.startForegroundService(context, serviceIntent)
    }
}
