package com.prayerfire.app.alarmengine

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * Full-screen alarm screen, launched via a full-screen-intent notification so it can wake the phone and show over
 * the lock screen. Android only does that when the phone is locked or idle; when the phone is in use it shows a
 * heads-up banner instead, so this screen never takes over someone who is using their phone.
 *
 * Shows today's prayer point and verse and three buttons: Stop and Snooze (silence the alarm, open nothing) and
 * Pray Now / Join Live Prayer (the only one that opens the app or the group's call link).
 */
class AlarmRingActivity : AppCompatActivity() {

    private val handler = Handler(Looper.getMainLooper())
    private val closeWhenQuiet = object : Runnable {
        override fun run() {
            // The 3-minute ring ended, or Stop/Snooze/Pray Now was pressed in the notification: close this screen too.
            if (!AlarmRingService.ringing) {
                finish()
            } else {
                handler.postDelayed(this, 1000)
            }
        }
    }

    private fun alarmFromIntent(intent: Intent) = ScheduledAlarm(
        id = intent.getStringExtra(AlarmScheduler.EXTRA_ID) ?: "prayer",
        hour = 0,
        minute = 0,
        label = intent.getStringExtra(AlarmScheduler.EXTRA_LABEL) ?: "Prayer Time",
        tone = intent.getStringExtra(AlarmScheduler.EXTRA_TONE) ?: "classic",
        kind = intent.getStringExtra(AlarmScheduler.EXTRA_KIND) ?: ScheduledAlarm.KIND_PERSONAL,
        callUrl = intent.getStringExtra(AlarmScheduler.EXTRA_CALL_URL) ?: ""
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        showOverLockScreen()
        setContentView(buildLayout(alarmFromIntent(intent)))
        handler.postDelayed(closeWhenQuiet, 1500)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        setContentView(buildLayout(alarmFromIntent(intent)))
    }

    override fun onDestroy() {
        handler.removeCallbacks(closeWhenQuiet)
        super.onDestroy()
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

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    private fun roundedButton(text: String, fill: Int, textColor: Int, strokeColor: Int? = null): Button =
        Button(this).apply {
            this.text = text
            isAllCaps = false
            textSize = 17f
            setTextColor(textColor)
            background = GradientDrawable().apply {
                cornerRadius = dp(16).toFloat()
                setColor(fill)
                if (strokeColor != null) setStroke(dp(1), strokeColor)
            }
            minimumHeight = dp(56)
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
                topMargin = dp(12)
            }
        }

    private fun buildLayout(alarm: ScheduledAlarm): View {
        val content = AlarmContentStore.today(this)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(24), dp(48), dp(24), dp(32))
        }

        root.addView(TextView(this).apply {
            text = AlarmText.get(this@AlarmRingActivity, "title", "🔥 Prayer Time")
            setTextColor(Color.WHITE)
            textSize = 30f
            gravity = Gravity.CENTER
        })
        root.addView(TextView(this).apply {
            text = alarm.label
            setTextColor(ACCENT_TEXT)
            textSize = 20f
            gravity = Gravity.CENTER
            setPadding(0, dp(6), 0, dp(24))
        })

        // Today's prayer point and verse.
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(18), dp(20), dp(18))
            background = GradientDrawable().apply {
                cornerRadius = dp(20).toFloat()
                setColor(CARD)
                setStroke(dp(1), CARD_EDGE)
            }
        }
        card.addView(TextView(this).apply {
            text = "TODAY'S PRAYER POINT"
            setTextColor(ACCENT_TEXT)
            textSize = 12f
            letterSpacing = 0.1f
        })
        card.addView(TextView(this).apply {
            text = content.point
            setTextColor(Color.WHITE)
            textSize = 17f
            setPadding(0, dp(6), 0, dp(16))
        })
        card.addView(TextView(this).apply {
            text = "TODAY'S VERSE"
            setTextColor(ACCENT_TEXT)
            textSize = 12f
            letterSpacing = 0.1f
        })
        card.addView(TextView(this).apply {
            text = "“${content.verse}”"
            setTextColor(Color.WHITE)
            textSize = 17f
            setTypeface(typeface, android.graphics.Typeface.ITALIC)
            setPadding(0, dp(6), 0, dp(2))
        })
        card.addView(TextView(this).apply {
            text = content.reference
            setTextColor(MUTED)
            textSize = 14f
        })
        root.addView(card, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))

        root.addView(View(this), LinearLayout.LayoutParams(1, dp(16)))

        // Main button first: Pray Now, or Join Live Prayer for a group prayer time.
        val main = roundedButton(if (alarm.isGroup) AlarmText.get(this, "joinLive", "Join Live Prayer") else AlarmText.get(this, "prayNow", "Pray Now"), PRIMARY, Color.WHITE).apply {
            setOnClickListener {
                AlarmRingService.prayNow(this@AlarmRingActivity, alarm.kind, alarm.callUrl)
                finish()
            }
        }
        root.addView(main)

        val snooze = roundedButton(AlarmText.get(this, "snooze", "Snooze {n} min").replace("{n}", AlarmScheduler.SNOOZE_MINUTES.toString()), Color.TRANSPARENT, Color.WHITE, CARD_EDGE).apply {
            setOnClickListener {
                AlarmRingService.stopRinging(this@AlarmRingActivity)
                AlarmScheduler.snooze(this@AlarmRingActivity, alarm)
                finish()
            }
        }
        root.addView(snooze)

        val stop = roundedButton(AlarmText.get(this, "stop", "Stop"), Color.TRANSPARENT, MUTED, CARD_EDGE).apply {
            setOnClickListener {
                AlarmRingService.stopRinging(this@AlarmRingActivity)
                finish()
            }
        }
        root.addView(stop)

        return ScrollView(this).apply {
            setBackgroundColor(BACKGROUND)
            isFillViewport = true
            addView(root)
        }
    }

    companion object {
        // Same family as the app's dark Evergreen theme.
        private val BACKGROUND = Color.parseColor("#0B1712")
        private val CARD = Color.parseColor("#12261D")
        private val CARD_EDGE = Color.parseColor("#2A4A3B")
        private val PRIMARY = Color.parseColor("#059669")
        private val ACCENT_TEXT = Color.parseColor("#6EE7B7")
        private val MUTED = Color.parseColor("#9FB8AB")
    }
}
