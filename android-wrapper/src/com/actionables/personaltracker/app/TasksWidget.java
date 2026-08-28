package com.actionables.personaltracker.app;

import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.util.List;

/** Tasks widget (v2): overdue-first list, one-tap complete, tap a row to edit. */
public class TasksWidget extends BaseWidget {

    static final int[] BOX = {R.id.r1_box, R.id.r2_box, R.id.r3_box, R.id.r4_box, R.id.r5_box, R.id.r6_box};
    static final int[] CHK = {R.id.r1_chk, R.id.r2_chk, R.id.r3_chk, R.id.r4_chk, R.id.r5_chk, R.id.r6_chk};
    static final int[] TIT = {R.id.r1_title, R.id.r2_title, R.id.r3_title, R.id.r4_title, R.id.r5_title, R.id.r6_title};
    static final int[] MET = {R.id.r1_meta, R.id.r2_meta, R.id.r3_meta, R.id.r4_meta, R.id.r5_meta, R.id.r6_meta};

    @Override protected RemoteViews render(Context ctx, WidgetStore st, int id, int bucket) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_tasks);
        v.setOnClickPendingIntent(R.id.add_btn, WidgetHub.popup(ctx, WidgetDialogActivity.A_ADD_TASK, id));

        List<JSONObject> tasks = st.tasksForWidget();
        int slots = bucket == WidgetHub.LARGE ? 6 : bucket == WidgetHub.MEDIUM ? 4 : 2;
        boolean showMeta = bucket != WidgetHub.SMALL;
        int shown = Math.min(slots, tasks.size());

        for (int i = 0; i < BOX.length; i++) {
            if (i < shown) {
                JSONObject t = tasks.get(i);
                String tid = t.optString("id");
                boolean over = "overdue".equals(WidgetStore.taskStatus(t));
                boolean high = "high".equals(t.optString("priority"));
                v.setViewVisibility(BOX[i], View.VISIBLE);
                v.setTextViewText(TIT[i], (high ? "\uD83D\uDD34 " : "") + t.optString("title", "Task"));
                v.setTextViewText(CHK[i], "");
                v.setInt(CHK[i], "setBackgroundResource", over ? R.drawable.widget_check_red : R.drawable.widget_check_off);
                String meta = WidgetStore.taskMeta(t);
                v.setTextViewText(MET[i], showMeta ? meta : "");
                v.setTextColor(MET[i], ctx.getColor(over ? R.color.wg_red : R.color.wg_dim));
                v.setViewVisibility(MET[i], showMeta && !meta.isEmpty() ? View.VISIBLE : View.GONE);
                v.setOnClickPendingIntent(CHK[i], WidgetHub.broadcast(ctx, WidgetActionReceiver.TOGGLE_TASK, id, "taskId", tid));
                v.setOnClickPendingIntent(TIT[i], WidgetHub.popup(ctx, WidgetDialogActivity.A_TASK_DETAIL, id, "taskId", tid));
            } else v.setViewVisibility(BOX[i], View.GONE);
        }

        v.setViewVisibility(R.id.empty, tasks.isEmpty() ? View.VISIBLE : View.GONE);
        int[] c = st.todayTaskCounts();
        String cnt = c[1] > 0 ? c[0] + "/" + c[1] : "";
        if (c[2] > 0) cnt += (cnt.isEmpty() ? "" : "  \u00B7  ") + c[2] + " OVERDUE";
        v.setTextViewText(R.id.t_count, cnt);
        v.setTextColor(R.id.t_count, ctx.getColor(c[2] > 0 ? R.color.wg_red : R.color.wg_dim));

        int more = tasks.size() - shown;
        v.setTextViewText(R.id.t_more, more > 0 ? "\uFF0B" + more + " more \u2197" : "");
        if (more > 0) v.setOnClickPendingIntent(R.id.t_more, WidgetHub.openApp(ctx, "pgTasks"));
        return v;
    }
}
