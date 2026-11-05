package com.prayerfire.app.alarmengine

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.prayerfire.app.MainActivity
import com.prayerfire.app.R

/**
 * Foreground service that does the actual ringing: loops the chosen tone on
 * the ALARM stream at a moderate volume for exactly 3 minutes, then stops
 * itself.
 * Also posts the full-screen-intent notification that launches
 * AlarmRingActivity over the lock screen (phone locked or idle) or shows as a
 * heads-up banner (phone in use) — it never forces the app open.
 * The notification has three buttons: Stop and Snooze silence the alarm
 * without opening anything; "Pray Now" (or "Join Live Prayer" for a group
 * prayer time) is the only one that opens something.
 */
class AlarmRingService : Service() {

    companion object {
        const val CHANNEL_ID = "prayer_alarm_ring"
        const val NOTIFICATION_ID = 7719
        const val RING_DURATION_MS = 3 * 60 * 1000L

        // How loud the alarm rings, as a percentage of the phone's maximum
        // alarm volume. It used to be forced to 100%, which testers found far
        // too loud. Raise or lower this number to taste (1-100).
        const val ALARM_VOLUME_PERCENT = 50
        const val ACTION_STOP = "com.prayerfire.app.alarmengine.ACTION_STOP"

        /** True while the tone is ringing. The full-screen alarm screen watches it and closes itself when it turns off. */
        @Volatile
        var ringing = false
            private set

        // One player for the whole process. Previously each service start
        // created its own MediaPlayer in an instance field and never released
        // the old one — if the alarm fired again while still ringing (or the
        // service was re-delivered), the first looping player was orphaned:
        // nothing referenced it any more, so Stop/DISMISS could not silence
        // it and it kept ringing until the process was killed (e.g. by
        // installing an update). Every start and every stop now goes through
        // this single reference.
        @Volatile
        private var activePlayer: MediaPlayer? = null

        @Synchronized
        private fun releaseActivePlayer() {
            val player = activePlayer
            activePlayer = null
            if (player == null) return
            try {
                player.setOnErrorListener(null)
                if (player.isPlaying) player.stop()
            } catch (e: Exception) {
                // not in a stoppable state — release below still frees it
            }
            try {
                player.release()
            } catch (e: Exception) {
                // already released
            }
        }

        /**
         * Silences the alarm from anywhere (notification Stop, the ringing
         * screen, or the web app). Releases the sound first, directly, so it
         * stops even if the service itself is mid-restart, then tears down
         * the service and its notification.
         */
        fun stopRinging(context: Context) {
            ringing = false
            releaseActivePlayer()
            val app = context.applicationContext
            try {
                app.stopService(Intent(app, AlarmRingService::class.java))
            } catch (e: Exception) {
                // service not running
            }
            try {
                (app.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                    .cancel(NOTIFICATION_ID)
            } catch (e: Exception) {
                // ignore
            }
        }

        /** Deep link that opens the app straight on the prayer session (see `listenPrayNow` in capacitorAlarm.ts). */
        private fun prayNowLink(context: Context) = Uri.parse("${context.getString(R.string.custom_url_scheme)}://pray")

        /** Only web links are ever opened as a call link (never intent:, javascript:, file: ...). */
        fun safeCallUrl(url: String?): Uri? {
            val u = url?.trim().orEmpty()
            if (!(u.startsWith("https://", true) || u.startsWith("http://", true))) return null
            return try { Uri.parse(u) } catch (e: Exception) { null }
        }

        /**
         * The one button that opens something. A personal prayer time opens Prayer Fire on the Start-Up Prayer session
         * (not the home screen); a group prayer time opens the group's call link ("Join Live Prayer").
         * The alarm is silenced first. Call this from a user tap only.
         */
        fun prayNow(context: Context, kind: String, callUrl: String?) {
            stopRinging(context)
            val call = if (kind == ScheduledAlarm.KIND_GROUP) safeCallUrl(callUrl) else null
            try {
                if (call != null) {
                    context.startActivity(Intent(Intent.ACTION_VIEW, call).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                    return
                }
            } catch (e: Exception) {
                // no app can open the link: fall through to the prayer session
            }
            try {
                context.startActivity(
                    Intent(Intent.ACTION_VIEW, prayNowLink(context), context, MainActivity::class.java).addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                            Intent.FLAG_ACTIVITY_CLEAR_TOP or
                            Intent.FLAG_ACTIVITY_SINGLE_TOP
                    )
                )
            } catch (e: Exception) {
                // background-launch restriction — the alarm is already silenced
            }
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private val stopHandler = Handler(Looper.getMainLooper())
    private val stopRunnable = Runnable { stopSelfSafely() }

    override fun onBind(intent: Intent?) = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // The notification's own "Stop" action posts this directly to the
        // running service — the full-screen ringing Activity is a nice-to-have
        // (and on Android 14+ needs its own separately-granted permission to
        // auto-launch), but it was never the only way to silence the alarm:
        // without this, a user whose device didn't auto-launch that Activity
        // had no way to stop the ringing except opening the app itself.
        if (intent?.action == ACTION_STOP) {
            stopSelfSafely()
            return START_NOT_STICKY
        }

        val id = intent?.getStringExtra(AlarmScheduler.EXTRA_ID) ?: "prayer"
        val label = intent?.getStringExtra(AlarmScheduler.EXTRA_LABEL) ?: "Prayer Time"
        val tone = intent?.getStringExtra(AlarmScheduler.EXTRA_TONE) ?: "classic"
        val kind = intent?.getStringExtra(AlarmScheduler.EXTRA_KIND) ?: ScheduledAlarm.KIND_PERSONAL
        val callUrl = intent?.getStringExtra(AlarmScheduler.EXTRA_CALL_URL) ?: ""
        val alarm = ScheduledAlarm(id, 0, 0, label, tone, kind, callUrl)

        startForeground(NOTIFICATION_ID, buildNotification(alarm))
        ringing = true
        acquireWakeLock()
        startRinging(tone)

        stopHandler.removeCallbacks(stopRunnable)
        stopHandler.postDelayed(stopRunnable, RING_DURATION_MS)

        return START_NOT_STICKY
    }

    /** Intent extras that describe the alarm, so the buttons know which alarm they belong to. */
    private fun putAlarm(intent: Intent, alarm: ScheduledAlarm): Intent = intent.apply {
        putExtra(AlarmScheduler.EXTRA_ID, alarm.id)
        putExtra(AlarmScheduler.EXTRA_LABEL, alarm.label)
        putExtra(AlarmScheduler.EXTRA_TONE, alarm.tone)
        putExtra(AlarmScheduler.EXTRA_KIND, alarm.kind)
        putExtra(AlarmScheduler.EXTRA_CALL_URL, alarm.callUrl)
    }

    private fun buildNotification(alarm: ScheduledAlarm): Notification {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm.getNotificationChannel(CHANNEL_ID) == null) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Prayer Alarms",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Full-screen prayer time alarms"
                // The MediaPlayer below plays the actual tone on the ALARM
                // stream — keep the channel silent so it doesn't layer a
                // second, competing sound on the notification stream.
                setSound(null, null)
                enableVibration(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            nm.createNotificationChannel(channel)
        }

        val code = alarm.id.hashCode()
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

        // Full-screen alarm screen: Android shows it over the lock screen when the phone is locked or idle, and shows
        // an ordinary heads-up banner instead when the phone is in use, so the app is never forced open.
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this, code,
            putAlarm(Intent(this, AlarmRingActivity::class.java), alarm).addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            ),
            flags
        )

        // Stop and Snooze are broadcasts: they silence the alarm and open nothing.
        val stopPendingIntent = PendingIntent.getBroadcast(
            this, code + 1,
            putAlarm(Intent(this, AlarmActionReceiver::class.java).setAction(AlarmActionReceiver.ACTION_STOP), alarm),
            flags
        )
        val snoozePendingIntent = PendingIntent.getBroadcast(
            this, code + 2,
            putAlarm(Intent(this, AlarmActionReceiver::class.java).setAction(AlarmActionReceiver.ACTION_SNOOZE), alarm),
            flags
        )
        // Pray Now / Join Live Prayer is the only button that opens something. It goes through a tiny invisible
        // Activity: an Activity PendingIntent started from a notification is allowed to launch on Android 12+
        // (which blocks "notification trampolines" via services/receivers).
        val prayPendingIntent = PendingIntent.getActivity(
            this, code + 3,
            putAlarm(Intent(this, AlarmPrayActivity::class.java), alarm).addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_HISTORY
            ),
            flags
        )

        val body = if (alarm.isGroup) "${alarm.label} — your group is praying together." else "${alarm.label} — it's time to pray!"
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("🔥 Prayer Time")
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stopPendingIntent)
            .addAction(android.R.drawable.ic_lock_idle_alarm, "Snooze ${AlarmScheduler.SNOOZE_MINUTES} min", snoozePendingIntent)
            .addAction(
                android.R.drawable.ic_menu_send,
                if (alarm.isGroup) "Join Live Prayer" else "Pray Now",
                prayPendingIntent
            )
            .setOngoing(true)
            .setAutoCancel(false)
            .build()
    }

    private fun acquireWakeLock() {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "PrayerFire:AlarmRingWakeLock"
        ).apply {
            setReferenceCounted(false)
            acquire(RING_DURATION_MS + 10_000L)
        }
    }

    private fun startRinging(tone: String) {
        val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        try {
            val max = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            val level = (max * ALARM_VOLUME_PERCENT / 100).coerceIn(1, max)
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, level, 0)
        } catch (e: SecurityException) {
            // Some OEMs restrict programmatic volume changes — ringing still
            // plays at whatever the current alarm-stream volume already is.
        }

        val resId = resources.getIdentifier(tone, "raw", packageName)
            .takeIf { it != 0 }
            ?: resources.getIdentifier("classic", "raw", packageName)

        // Never leave a previous player alive underneath the new one.
        releaseActivePlayer()

        try {
            activePlayer = MediaPlayer().apply {
                setOnErrorListener { _, _, _ ->
                    releaseActivePlayer()
                    true
                }
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                if (resId != 0) {
                    val afd = resources.openRawResourceFd(resId)
                    setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                    afd.close()
                } else {
                    setDataSource(applicationContext, android.provider.Settings.System.DEFAULT_ALARM_ALERT_URI)
                }
                isLooping = true
                prepare()
                start()
            }
        } catch (e: Exception) {
            releaseActivePlayer()
        }
    }

    private fun stopSelfSafely() {
        stopHandler.removeCallbacks(stopRunnable)
        ringing = false

        releaseActivePlayer()

        try {
            if (wakeLock?.isHeld == true) wakeLock?.release()
        } catch (e: Exception) {
            // ignore
        }
        wakeLock = null

        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        stopSelfSafely()
        super.onDestroy()
    }
}
