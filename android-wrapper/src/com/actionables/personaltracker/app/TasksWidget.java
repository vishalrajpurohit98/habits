package com.actionables.personaltracker.app;

import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

/**
 * TASKS widget (v4): scrollable list of today's / overdue tasks.
 * Row circle = one-tap complete (native, instant). Row body = exact task in-app.
 * Large + = New Task composer in-app. TODAY | OVERDUE filter persists per widget.
 */
public class TasksWidget extends BaseWidget {

    @Override protected boolean hasList() { return true; }

    @Override protected RemoteViews render(Context ctx, WidgetStore st, int id, int bucket) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_tasks);
        v.setOnClickPendingIntent(R.id.add_btn, WidgetHub.openAppDeep(ctx, "addTask", "1"));

        v.setRemoteAdapter(R.id.list, WidgetHub.listService(ctx, id, "tasks"));
        v.setEmptyView(R.id.list, R.id.empty);
        v.setPendingIntentTemplate(R.id.list, WidgetHub.listTemplate(ctx, id));

        String mode = WidgetHub.getPref(ctx, "tf_" + id, "today");
        boolean over = "overdue".equals(mode);
        int[] c = st.todayTaskCounts(); // {done, total, overdue, open}
        int todayLeft = Math.max(0, c[1] - c[0]);
        v.setTextViewText(R.id.f_today, todayLeft > 0 ? "TODAY \u00B7 " + todayLeft : "TODAY");
        v.setTextViewText(R.id.f_over, c[2] > 0 ? "OVERDUE \u00B7 " + c[2] : "OVERDUE");
        v.setInt(R.id.f_today, "setBackgroundResource", over ? R.drawable.widget_chip_dim : R.drawable.chip_active_blue);
        v.setInt(R.id.f_over, "setBackgroundResource", over ? R.drawable.chip_active_red : R.drawable.widget_chip_dim);
        v.setTextColor(R.id.f_today, over ? 0xFF9AA0AC : 0xFF0B0D12);
        v.setTextColor(R.id.f_over, over ? 0xFF0B0D12 : (c[2] > 0 ? 0xFFFF6B5E : 0xFF9AA0AC));
        v.setOnClickPendingIntent(R.id.f_today, filterIntent(ctx, id, "today"));
        v.setOnClickPendingIntent(R.id.f_over, filterIntent(ctx, id, "overdue"));

        v.setViewVisibility(R.id.filters, bucket == WidgetHub.SMALL ? View.GONE : View.VISIBLE);
        v.setTextViewText(R.id.empty, over ? "Nothing overdue \u2713" : "All clear for today \u2713");
        return v;
    }

    static android.app.PendingIntent filterIntent(Context ctx, int id, String val) {
        Intent i = new Intent(ctx, WidgetActionReceiver.class);
        i.setAction(WidgetActionReceiver.ACTION_PREFIX + WidgetActionReceiver.SET_TFILTER);
        i.putExtra("widgetId", id);
        i.putExtra("val", val);
        i.setData(android.net.Uri.parse("hbwidget://tfilter/" + id + "/" + val));
        int f = android.app.PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= 23) f |= android.app.PendingIntent.FLAG_IMMUTABLE;
        return android.app.PendingIntent.getBroadcast(ctx, ("tfilter/" + id + "/" + val).hashCode(), i, f);
    }
}
