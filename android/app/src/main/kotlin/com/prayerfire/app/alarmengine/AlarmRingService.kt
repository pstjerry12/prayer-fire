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

/**
 * Foreground service that does the actual ringing: loops the chosen tone on
 * the ALARM stream at max volume for exactly 3 minutes, then stops itself.
 * Also posts the full-screen-intent notification that launches
 * AlarmRingActivity over the lock screen.
 */
class AlarmRingService : Service() {

    companion object {
        const val CHANNEL_ID = "prayer_alarm_ring"
        const val NOTIFICATION_ID = 7719
        const val RING_DURATION_MS = 3 * 60 * 1000L
    }

    private var mediaPlayer: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private val stopHandler = Handler(Looper.getMainLooper())
    private val stopRunnable = Runnable { stopSelfSafely() }

    override fun onBind(intent: Intent?) = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
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

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("🔥 Prayer Time")
            .setContentText("$label — it's time to pray!")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
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
            audioManager.setStreamVolume(
                AudioManager.STREAM_ALARM,
                audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM),
                0
            )
        } catch (e: SecurityException) {
            // Some OEMs restrict programmatic volume changes — ringing still
            // plays at whatever the current alarm-stream volume already is.
        }

        val resId = resources.getIdentifier(tone, "raw", packageName)
            .takeIf { it != 0 }
            ?: resources.getIdentifier("classic", "raw", packageName)

        try {
            mediaPlayer = MediaPlayer().apply {
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
            mediaPlayer = null
        }
    }

    private fun stopSelfSafely() {
        stopHandler.removeCallbacks(stopRunnable)

        try {
            mediaPlayer?.let {
                if (it.isPlaying) it.stop()
                it.release()
            }
        } catch (e: Exception) {
            // already released
        }
        mediaPlayer = null

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
