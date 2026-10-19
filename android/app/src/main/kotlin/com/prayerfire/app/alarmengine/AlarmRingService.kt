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
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.prayerfire.app.MainActivity

/**
 * Foreground service that does the actual ringing: loops the chosen tone on
 * the ALARM stream at a moderate volume for exactly 5 minutes, then stops
 * itself.
 * Also posts the full-screen-intent notification that launches
 * AlarmRingActivity over the lock screen.
 */
class AlarmRingService : Service() {

    companion object {
        const val CHANNEL_ID = "prayer_alarm_ring"
        const val NOTIFICATION_ID = 7719
        const val RING_DURATION_MS = 5 * 60 * 1000L

        // How loud the alarm rings, as a percentage of the phone's maximum
        // alarm volume. It used to be forced to 100%, which testers found far
        // too loud. Raise or lower this number to taste (1-100).
        const val ALARM_VOLUME_PERCENT = 50
        const val ACTION_STOP = "com.prayerfire.app.alarmengine.ACTION_STOP"

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

        /** Brings the app to the front (its sign-in screen if signed out). */
        fun openApp(context: Context) {
            try {
                context.startActivity(
                    Intent(context, MainActivity::class.java).addFlags(
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

        startForeground(NOTIFICATION_ID, buildNotification(id, label))
        acquireWakeLock()
        startRinging(tone)

        stopHandler.removeCallbacks(stopRunnable)
        stopHandler.postDelayed(stopRunnable, RING_DURATION_MS)

        return START_NOT_STICKY
    }

    private fun buildNotification(id: String, label: String): Notification {
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

        val fullScreenIntent = Intent(this, AlarmRingActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra(AlarmScheduler.EXTRA_ID, id)
            putExtra(AlarmScheduler.EXTRA_LABEL, label)
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            id.hashCode(),
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Stop goes through a tiny invisible Activity rather than a service or
        // broadcast PendingIntent: it silences the alarm and opens the app in
        // one tap, and an Activity PendingIntent started from a notification
        // is allowed to launch the app even on Android 12+ (which blocks
        // "notification trampolines" via services/receivers).
        val stopIntent = Intent(this, AlarmStopActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_HISTORY)
        }
        val stopPendingIntent = PendingIntent.getActivity(
            this,
            id.hashCode() + 1,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("🔥 Prayer Time")
            .setContentText("$label — it's time to pray!")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stopPendingIntent)
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
