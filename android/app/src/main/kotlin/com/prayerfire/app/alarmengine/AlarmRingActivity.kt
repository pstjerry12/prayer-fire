package com.prayerfire.app.alarmengine

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * Full-screen ringing UI, launched via a full-screen-intent notification so
 * it can wake and show over the lock screen. Mirrors the web app's own
 * "Test Alarm" overlay (black background, fire emoji, red DISMISS button)
 * for a consistent feel between the native and web ringing experiences.
 */
class AlarmRingActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        showOverLockScreen()

        val label = intent.getStringExtra(AlarmScheduler.EXTRA_LABEL) ?: "Prayer Time"
        setContentView(buildLayout(label))
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
    }

    private fun showOverLockScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // requestDismissKeyguard is API 26+ — minSdk here is 24, so guard it.
        // FLAG_SHOW_WHEN_LOCKED above already gets us over a non-secure
        // lock screen on 24/25; a PIN/pattern lock still intercepts either way.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        }
    }

    private fun buildLayout(label: String): LinearLayout {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0D0D0D"))
            setPadding(64, 64, 64, 64)
        }

        val title = TextView(this).apply {
            text = "🔥 Prayer Time!"
            setTextColor(Color.WHITE)
            textSize = 30f
            gravity = Gravity.CENTER
        }
        val subtitle = TextView(this).apply {
            text = label
            setTextColor(Color.parseColor("#FFB74D"))
            textSize = 20f
            gravity = Gravity.CENTER
            setPadding(0, 20, 0, 56)
        }
        val dismiss = Button(this).apply {
            text = "DISMISS"
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#E53935"))
            textSize = 18f
            setPadding(72, 40, 72, 40)
            setOnClickListener {
                stopService(Intent(this@AlarmRingActivity, AlarmRingService::class.java))
                finish()
            }
        }

        root.addView(title)
        root.addView(subtitle)
        root.addView(dismiss)
        return root
    }
}
