package com.prayerfire.app.alarmengine

import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Bridges the web app to the native alarm engine: AlarmManager exact
 * scheduling, a foreground service that rings at max alarm volume for 3
 * minutes, and the Android 12+/13+/14+ permissions all of that needs.
 *
 * Web (and iOS) keep using @capacitor/local-notifications as before — this
 * plugin is additive, only used on Android for prayer times where the user
 * has turned on "Ring like an alarm".
 */
@CapacitorPlugin(name = "AlarmEngine")
class AlarmEnginePlugin : Plugin() {

    @PluginMethod
    fun scheduleAlarm(call: PluginCall) {
        val id = call.getString("id")
        val hour = call.getInt("hour")
        val minute = call.getInt("minute")
        val label = call.getString("label") ?: "Prayer Time"
        val tone = call.getString("tone") ?: "classic"

        if (id == null || hour == null || minute == null) {
            call.reject("id, hour and minute are required")
            return
        }

        val alarm = ScheduledAlarm(id, hour, minute, label, tone)
        AlarmStore.save(context, alarm)
        AlarmScheduler.schedule(context, alarm)
        call.resolve()
    }

    @PluginMethod
    fun cancelAlarm(call: PluginCall) {
        val id = call.getString("id")
        if (id == null) {
            call.reject("id is required")
            return
        }
        AlarmStore.all(context).find { it.id == id }?.let {
            AlarmScheduler.cancel(context, it)
        }
        AlarmStore.remove(context, id)
        call.resolve()
    }

    @PluginMethod
    fun cancelAllAlarms(call: PluginCall) {
        AlarmStore.clear(context).forEach { AlarmScheduler.cancel(context, it) }
        call.resolve()
    }

    @PluginMethod
    fun dismissRinging(call: PluginCall) {
        context.stopService(Intent(context, AlarmRingService::class.java))
        call.resolve()
    }

    // ── SCHEDULE_EXACT_ALARM (Android 12+) ──────────────────────────────
    @PluginMethod
    fun checkExactAlarmPermission(call: PluginCall) {
        val ret = JSObject()
        ret.put("granted", canScheduleExactAlarms())
        call.resolve(ret)
    }

    /** No direct system permission dialog exists for this — it always opens Settings. */
    @PluginMethod
    fun requestExactAlarmPermission(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                data = Uri.fromParts("package", context.packageName, null)
            }
            activity.startActivity(intent)
        }
        val ret = JSObject()
        ret.put("opened", true)
        call.resolve(ret)
    }

    private fun canScheduleExactAlarms(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        return alarmManager.canScheduleExactAlarms()
    }

    // ── USE_FULL_SCREEN_INTENT (Android 14+) ────────────────────────────
    @PluginMethod
    fun checkFullScreenIntentPermission(call: PluginCall) {
        val ret = JSObject()
        ret.put("granted", canUseFullScreenIntent())
        call.resolve(ret)
    }

    /** Also always opens Settings — Android 14 has no in-app grant dialog for this one. */
    @PluginMethod
    fun requestFullScreenIntentPermission(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            val intent = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
                data = Uri.fromParts("package", context.packageName, null)
            }
            activity.startActivity(intent)
        }
        val ret = JSObject()
        ret.put("opened", true)
        call.resolve(ret)
    }

    private fun canUseFullScreenIntent(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return true
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        return nm.canUseFullScreenIntent()
    }

    // ── Ignore battery optimizations ─────────────────────────────────────
    // Samsung/Xiaomi and several other OEMs aggressively kill background
    // alarms despite AlarmManager + a foreground service doing everything
    // "correctly" — this exemption is the mitigation Android itself provides.
    @PluginMethod
    fun checkBatteryOptimizationExemption(call: PluginCall) {
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val ret = JSObject()
        ret.put("granted", pm.isIgnoringBatteryOptimizations(context.packageName))
        call.resolve(ret)
    }

    @PluginMethod
    fun requestBatteryOptimizationExemption(call: PluginCall) {
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        if (!pm.isIgnoringBatteryOptimizations(context.packageName)) {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.fromParts("package", context.packageName, null)
            }
            activity.startActivity(intent)
        }
        val ret = JSObject()
        ret.put("opened", true)
        call.resolve(ret)
    }
}
