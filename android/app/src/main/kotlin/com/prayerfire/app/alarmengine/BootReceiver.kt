package com.prayerfire.app.alarmengine

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Re-arms every stored prayer alarm after a reboot (exact alarms don't survive it). */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        AlarmStore.all(context).forEach { AlarmScheduler.schedule(context, it) }
    }
}
