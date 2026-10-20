package expo.modules.t3agentnotifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

/**
 * Android blocks a background app's network a few seconds after it leaves the
 * foreground and destroys its sockets. A foreground service keeps the process
 * exempt, so the environment socket survives an app switch until the hold ends.
 */
class ConnectionHoldService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private val release = Runnable { stopSelf() }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val title = intent?.getStringExtra(EXTRA_TITLE).orEmpty()
    val text = intent?.getStringExtra(EXTRA_TEXT).orEmpty()
    val holdMs = intent?.getLongExtra(EXTRA_HOLD_MS, 0L) ?: 0L
    try {
      ServiceCompat.startForeground(this, NOTIFICATION_ID, notification(title, text), TYPE)
    } catch (_: IllegalStateException) {
      // Android 12+ refuses the start once the app has left the foreground for too long.
      stopSelf()
      return START_NOT_STICKY
    }
    handler.removeCallbacks(release)
    handler.postDelayed(release, holdMs)
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(release)
    super.onDestroy()
  }

  private fun notification(title: String, text: String) = run {
    if (Build.VERSION.SDK_INT >= 26) {
      getSystemService(NotificationManager::class.java).createNotificationChannel(
        NotificationChannel(CHANNEL, "Background connection", NotificationManager.IMPORTANCE_LOW)
      )
    }
    val icon = resources.getIdentifier("notification_icon", "drawable", packageName)
    // No action buttons: they make Android show the notification at once instead
    // of after its 10-second delay, so a quick app switch would flash it.
    NotificationCompat.Builder(this, CHANNEL)
      .setSmallIcon(if (icon != 0) icon else android.R.drawable.ic_dialog_info)
      .setContentTitle(title)
      .setContentText(text)
      .setOngoing(true)
      .setShowWhen(false)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setContentIntent(openApp())
      .build()
  }

  private fun openApp(): PendingIntent? {
    val intent = packageManager.getLaunchIntentForPackage(packageName) ?: return null
    return PendingIntent.getActivity(
      this,
      NOTIFICATION_ID,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  companion object {
    private const val CHANNEL = "background-connection"
    private const val NOTIFICATION_ID = 73002
    private const val EXTRA_TITLE = "title"
    private const val EXTRA_TEXT = "text"
    private const val EXTRA_HOLD_MS = "holdMs"
    private val TYPE =
      if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0

    fun start(context: Context, title: String, text: String, holdMs: Long): Boolean =
      try {
        ContextCompat.startForegroundService(
          context,
          Intent(context, ConnectionHoldService::class.java)
            .putExtra(EXTRA_TITLE, title)
            .putExtra(EXTRA_TEXT, text)
            .putExtra(EXTRA_HOLD_MS, holdMs)
        )
        true
      } catch (_: IllegalStateException) {
        false
      }

    fun stop(context: Context) {
      context.stopService(Intent(context, ConnectionHoldService::class.java))
    }
  }
}
