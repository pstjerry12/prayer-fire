package com.prayerfire.app.alarmengine

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * The alarm notification's Stop and Snooze buttons. Both only silence the alarm — they never open the app.
 * (Pray Now is separate: see AlarmPrayActivity.)
 */
class AlarmActionReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_STOP = "com.prayerfire.app.alarmengine.ACTION_STOP_RINGING"
        const val ACTION_SNOOZE = "com.prayerfire.app.alarmengine.ACTION_SNOOZE_RINGING"
    }

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            ACTION_STOP -> AlarmRingService.stopRinging(context)
            ACTION_SNOOZE -> {
                val id = intent.getStringExtra(AlarmScheduler.EXTRA_ID)
                AlarmRingService.stopRinging(context)
                if (id != null) {
                    AlarmScheduler.snooze(
                        context,
                        ScheduledAlarm(
                            id = id,
                            hour = 0,
                            minute = 0,
                            label = intent.getStringExtra(AlarmScheduler.EXTRA_LABEL) ?: "Prayer Time",
                            tone = intent.getStringExtra(AlarmScheduler.EXTRA_TONE) ?: "classic",
                            kind = intent.getStringExtra(AlarmScheduler.EXTRA_KIND) ?: ScheduledAlarm.KIND_PERSONAL,
                            callUrl = intent.getStringExtra(AlarmScheduler.EXTRA_CALL_URL) ?: ""
                        )
                    )
                }
            }
        }
    }
}
