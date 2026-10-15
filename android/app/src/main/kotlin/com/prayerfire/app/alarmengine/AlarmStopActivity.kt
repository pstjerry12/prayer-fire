package com.prayerfire.app.alarmengine

import android.app.Activity
import android.os.Bundle

/**
 * Invisible trampoline behind the alarm notification's "Stop" button:
 * silences the alarm, opens Prayer Fire, and closes itself. It has no UI of
 * its own (translucent theme, finishes in onCreate).
 */
class AlarmStopActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        AlarmRingService.stopRinging(this)
        AlarmRingService.openApp(this)
        finish()
    }
}
