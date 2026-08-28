package com.actionables.personaltracker.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

/**
 * Shared plumbing for the widget system: full-refresh dispatch, size
 * bucketing, per-widget preferences and collision-free PendingIntents
 * (spec \u00A733: explicit intents, unique request codes + data URIs).
 */
public final class WidgetHub {
    private WidgetHub() {}

    public static final String WIDGET_PREFS = "widget_prefs";

    /** One stateless renderer per widget type (perf: reused, no broadcasts needed). */
    static final BaseWidget[] RENDERERS = {
            new QuickLogWidget(), new TasksWidget(), new HabitsWidget(), new MoneyWidget(),
            new WorkoutWidget(), new MoodWidget(), new SleepWidget(), new AiWidget()
    };

    /* perf: refreshes are coalesced on the main thread so a burst of saves
       (e.g. cloud sync applying records, or several quick edits) produces ONE
       state parse + ONE render pass instead of 7 broadcasts per save. */
    private static final android.os.Handler UI = new android.os.Handler(android.os.Looper.getMainLooper());
    private static final Runnable REFRESH = new Runnable() {
        @Override public void run() { synchronized (UI) { sPendingAt = 0; } doRefreshNow(sAppCtx); }
    };
    private static volatile Context sAppCtx;
    private static long sPendingAt;

    /** Near-immediate coalesced refresh (direct widget taps, popup saves). */
    public static void refreshAll(Context ctx) { schedule(ctx, 60); }

    /** Debounced refresh for high-frequency sources (every web-app persist). */
    public static void refreshAllDebounced(Context ctx) { schedule(ctx, 350); }

    private static void schedule(Context ctx, long delayMs) {
        try {
            sAppCtx = ctx.getApplicationContext();
            long at = android.os.SystemClock.uptimeMillis() + delayMs;
            synchronized (UI) {
                if (sPendingAt != 0 && sPendingAt <= at) return; // a sooner refresh is already queued
                UI.removeCallbacks(REFRESH);
                sPendingAt = at;
                UI.postAtTime(REFRESH, at);
            }
        } catch (Exception ignored) { /* never break the caller (e.g. the WebView bridge) */ }
    }

    /** Render every placed widget from a single parsed state snapshot. */
    static void doRefreshNow(Context app) {
        if (app == null) return;
        try {
            AppWidgetManager mgr = AppWidgetManager.getInstance(app);
            if (mgr == null) return;
            WidgetStore st = null;
            for (BaseWidget r : RENDERERS) {
                int[] ids;
                try { ids = mgr.getAppWidgetIds(new ComponentName(app, r.getClass())); }
                catch (Exception e) { continue; }
                if (ids == null || ids.length == 0) continue;
                if (st == null) st = WidgetStore.load(app); // parse once, only if widgets exist
                for (int id : ids) {
                    try {
                        android.widget.RemoteViews rv = r.render(app, st, id, bucket(mgr, id));
                        if (rv != null) mgr.updateAppWidget(id, rv);
                    } catch (Exception ignored) { }
                }
            }
        } catch (Exception ignored) { }
    }

    /* ==================== size buckets ==================== */

    public static final int SMALL = 0, MEDIUM = 1, LARGE = 2;

    /** Bucket from the launcher-provided dp bounds (approx. cell math). */
    /** Grid columns for a placed widget (used by size-adaptive renders). */
    public static int cols(Context ctx, int widgetId) {
        try {
            Bundle o = AppWidgetManager.getInstance(ctx).getAppWidgetOptions(widgetId);
            int w = o == null ? 250 : o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250);
            return Math.max(1, (w + 30) / 70);
        } catch (Exception e) { return 4; }
    }

    /** Grid rows for a placed widget (portrait-biased, like bucket()). */
    public static int rows(Context ctx, int widgetId) {
        try {
            Bundle o = AppWidgetManager.getInstance(ctx).getAppWidgetOptions(widgetId);
            int h = 110;
            if (o != null) {
                h = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, h);
                int minH = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, h);
                h = Math.max(minH, Math.min(h, minH * 2));
            }
            return Math.max(1, (h + 30) / 70);
        } catch (Exception e) { return 2; }
    }

    public static int bucket(AppWidgetManager mgr, int widgetId) {
        int w = 250, h = 110;
        try {
            Bundle o = mgr.getAppWidgetOptions(widgetId);
            if (o != null) {
                w = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, w);
                h = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, h);
                int minH = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, h);
                h = Math.max(minH, Math.min(h, minH * 2)); // stay close to portrait height
            }
        } catch (Exception ignored) {}
        int cols = Math.max(1, (w + 30) / 70);
        int rows = Math.max(1, (h + 30) / 70);
        if (rows >= 3 && cols >= 3) return LARGE;
        if (cols <= 2) return SMALL;
        if (rows <= 1) return SMALL;
        return MEDIUM;
    }

    /* ==================== PendingIntents ==================== */

    static int flags() {
        return PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
    }

    /** Stable, collision-free request code from the action route. */
    static int req(String route) {
        int h = route.hashCode();
        return h == Integer.MIN_VALUE ? 7 : Math.abs(h);
    }

    /** Broadcast PendingIntent to WidgetActionReceiver with a unique data URI. */
    public static PendingIntent broadcast(Context ctx, String action, int widgetId, String... kv) {
        Intent i = new Intent(ctx, WidgetActionReceiver.class).setAction(WidgetActionReceiver.ACTION_PREFIX + action);
        StringBuilder route = new StringBuilder("hbwidget://act/" + action + "/" + widgetId);
        i.putExtra("widgetId", widgetId);
        for (int k = 0; k + 1 < kv.length; k += 2) {
            i.putExtra(kv[k], kv[k + 1]);
            route.append('/').append(kv[k]).append('=').append(kv[k + 1]);
        }
        i.setData(Uri.parse(route.toString()));
        return PendingIntent.getBroadcast(ctx, req(route.toString()), i, flags());
    }

    /** Activity PendingIntent to the native popup with a unique data URI. */
    public static PendingIntent popup(Context ctx, String action, int widgetId, String... kv) {
        Intent i = new Intent(ctx, WidgetDialogActivity.class);
        i.putExtra(WidgetDialogActivity.EXTRA_ACTION, action);
        i.putExtra("widgetId", widgetId);
        StringBuilder route = new StringBuilder("hbwidget://popup/" + action + "/" + widgetId);
        for (int k = 0; k + 1 < kv.length; k += 2) {
            i.putExtra(kv[k], kv[k + 1]);
            route.append('/').append(kv[k]).append('=').append(kv[k + 1]);
        }
        i.setData(Uri.parse(route.toString()));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK
                | Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS);
        return PendingIntent.getActivity(ctx, req(route.toString()), i, flags());
    }

    /** Explicit "open the full app" PendingIntent (used only where the user asks for it). */
    public static PendingIntent openApp(Context ctx, String tab) {
        Intent i = new Intent(ctx, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (tab != null) i.putExtra("tab", tab);
        i.setData(Uri.parse("hbwidget://app/" + (tab == null ? "home" : tab)));
        return PendingIntent.getActivity(ctx, req("app/" + tab), i, flags());
    }

    /* ==================== per-widget prefs ==================== */

    static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE);
    }

    public static String getPref(Context ctx, String key, String def) {
        return prefs(ctx).getString(key, def);
    }

    public static void setPref(Context ctx, String key, String val) {
        prefs(ctx).edit().putString(key, val).apply();
    }

    public static void clearWidgetPrefs(Context ctx, int widgetId) {
        SharedPreferences p = prefs(ctx);
        SharedPreferences.Editor e = p.edit();
        for (String k : p.getAll().keySet()) if (k.endsWith("_" + widgetId)) e.remove(k);
        e.apply();
    }
}
