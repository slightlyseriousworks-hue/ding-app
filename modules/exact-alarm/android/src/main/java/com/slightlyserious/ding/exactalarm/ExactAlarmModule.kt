package com.slightlyserious.ding.exactalarm

import android.app.AlarmManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * TEMPORARY. See modules/exact-alarm/README.md for why, and when to delete it.
 *
 * Two small checks that expo-notifications 57 does not offer yet:
 *   - can Ding use exact alarms right now?
 *   - open Ding's "Alarms & reminders" page in Android Settings.
 *
 * expo-notifications already schedules an exact alarm by itself whenever Android allows it,
 * so this module never schedules anything.
 */
class ExactAlarmModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExactAlarm")

    // Android 11 and older allow exact alarms for every app.
    Function("canScheduleExactAlarms") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function true
      val context = appContext.reactContext ?: return@Function false
      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      alarmManager.canScheduleExactAlarms()
    }

    // Returns false if there was nothing to open (Android 11 and older, or no screen found).
    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function false
      val context = appContext.reactContext ?: return@Function false
      val packageUri = Uri.parse("package:${context.packageName}")

      // Ding's own "Alarms & reminders" page, or Ding's App info page if a phone lacks it.
      val intents = listOf(
        Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, packageUri),
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, packageUri)
      )
      val activity = appContext.currentActivity
      for (intent in intents) {
        try {
          if (activity != null) {
            activity.startActivity(intent)
          } else {
            context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
          }
          return@Function true
        } catch (e: ActivityNotFoundException) {
          // Try the next screen.
        }
      }
      false
    }
  }
}
