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
        boolean over = "overdue".equals(mode), all = "all".equals(mode);
        int[] c = st.todayTaskCounts(); // {done, total, overdue, open}
        int todayLeft = Math.max(0, c[1] - c[0]);
        String sub = (todayLeft > 0 ? todayLeft + " today" : "0 today")
                + (c[2] > 0 ? " \u00B7 " + c[2] + " overdue" : "");
        v.setTextViewText(R.id.t_sub, sub);
        v.setViewVisibility(R.id.t_sub, bucket == WidgetHub.SMALL ? View.GONE : View.VISIBLE);

        chip(v, R.id.f_today, !over && !all, R.drawable.chip_active_blue, 0xFF0B0D12);
        chip(v, R.id.f_over, over, R.drawable.chip_active_red, 0xFF0B0D12);
        chip(v, R.id.f_all, all, R.drawable.chip_active_ink, 0xFF0B0D12);
        v.setOnClickPendingIntent(R.id.f_today, filterIntent(ctx, id, "today"));
        v.setOnClickPendingIntent(R.id.f_over, filterIntent(ctx, id, "overdue"));
        v.setOnClickPendingIntent(R.id.f_all, filterIntent(ctx, id, "all"));

        v.setViewVisibility(R.id.filters, bucket == WidgetHub.SMALL ? View.GONE : View.VISIBLE);
        v.setTextViewText(R.id.empty, over ? "Nothing overdue \u2713" : (all ? "No open tasks \u2713" : "No tasks today \u2713"));
        return v;
    }

    static void chip(RemoteViews v, int cid, boolean active, int activeBg, int activeInk) {
        v.setInt(cid, "setBackgroundResource", active ? activeBg : R.drawable.widget_chip_dim);
        v.setTextColor(cid, active ? activeInk : 0xFF9AA0AC);
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
