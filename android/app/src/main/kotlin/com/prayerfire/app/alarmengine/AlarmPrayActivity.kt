package com.prayerfire.app.alarmengine

import android.app.Activity
import android.os.Bundle

/**
 * Invisible trampoline behind the alarm notification's "Pray Now" / "Join Live Prayer" button: silences the alarm,
 * opens the prayer session (or the group's call link), and closes itself. It has no UI of its own (translucent
 * theme, finishes in onCreate). This is the only alarm button that opens anything.
 */
class AlarmPrayActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        AlarmRingService.prayNow(
            this,
            intent.getStringExtra(AlarmScheduler.EXTRA_KIND) ?: ScheduledAlarm.KIND_PERSONAL,
            intent.getStringExtra(AlarmScheduler.EXTRA_CALL_URL)
        )
        finish()
    }
}
