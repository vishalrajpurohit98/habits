package com.actionables.personaltracker.app;

import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * One RemoteViewsService for every scrollable widget list (spec v4 \u00A77).
 * The "kind" extra selects the dataset: tasks | habits | workouts.
 *
 * Rows expose two tap targets via fill-in intents merged into the widget's
 * click template (WidgetHub.listTemplate \u2192 WidgetActionReceiver.LIST_CLICK):
 *   op=toggle_task / toggle_habit  \u2192 quick action, executed natively
 *   op=open_task / open_habit / open_workout \u2192 exact-item deep link into the app
 */
public class WidgetListService extends RemoteViewsService {

    @Override public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new Factory(getApplicationContext(),
                intent.getStringExtra("kind"),
                intent.getIntExtra("widgetId", 0));
    }

    /** Immutable row snapshot so the factory never holds live JSON. */
    static class Row {
        String id, title, meta, tag = "";
        int tagColor = 0xFF9AA0AC;
        boolean done, high, overdue;
        String chkText = "";
    }

    static class Factory implements RemoteViewsFactory {
        final Context ctx;
        final String kind;
        final int widgetId;
        final List<Row> rows = new ArrayList<>();

        Factory(Context ctx, String kind, int widgetId) {
            this.ctx = ctx;
            this.kind = kind == null ? "tasks" : kind;
            this.widgetId = widgetId;
        }

        @Override public void onCreate() { }

        @Override public void onDataSetChanged() {
            rows.clear();
            try {
                WidgetStore st = WidgetStore.load(ctx);
                if ("habits".equals(kind)) buildHabits(st);
                else if ("workouts".equals(kind)) buildWorkouts(st);
                else buildTasks(st);
            } catch (Exception ignored) { }
        }

        void buildTasks(WidgetStore st) {
            String mode = WidgetHub.getPref(ctx, "tf_" + widgetId, "today");
            for (JSONObject t : st.tasksFiltered(mode)) {
                Row r = new Row();
                r.id = t.optString("id");
                r.high = "high".equals(t.optString("priority"));
                r.overdue = "overdue".equals(WidgetStore.taskStatus(t));
                r.title = t.optString("title", "Task");
                r.done = "completed".equals(WidgetStore.taskStatus(t));
                r.meta = WidgetStore.taskMeta(t);
                if (r.done) { r.tag = "DONE"; r.tagColor = 0xFF7ED957; r.chkText = "\u2713"; }
                else if (r.high) { r.tag = "HIGH"; r.tagColor = 0xFFFF6B5E; }
                else { String p = t.optString("priority", "medium"); r.tag = p.equals("low") ? "LOW" : "MED"; }
                rows.add(r);
            }
        }

        void buildHabits(WidgetStore st) {
            for (WidgetStore.HabitRow h : st.habitsToday()) {
                Row r = new Row();
                r.id = h.id;
                r.title = h.name;
                r.done = h.done;
                if ("count".equals(h.type)) {
                    String v = num(h.val), tg = num(h.targ);
                    r.tag = h.done ? "DONE" : v + "/" + tg + (h.unit.isEmpty() ? "" : " " + h.unit);
                    r.chkText = h.done ? "\u2713" : (h.val > 0 ? v : "");
                } else {
                    r.tag = h.done ? "DONE" : (h.meta != null && !h.meta.isEmpty() ? h.meta : "0/1");
                    r.chkText = h.done ? "\u2713" : "";
                }
                r.tagColor = h.done ? 0xFF7ED957 : 0xFF9AA0AC;
                rows.add(r);
            }
        }

        void buildWorkouts(WidgetStore st) {
            for (String[] e : st.exercisesForWidget()) {
                Row r = new Row();
                r.id = e[0]; r.title = e[1]; r.meta = e[2];
                rows.add(r);
            }
        }

        static String num(double d) { return d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d); }

        @Override public RemoteViews getViewAt(int pos) {
            if (pos < 0 || pos >= rows.size()) return null;
            Row r = rows.get(pos);
            if ("workouts".equals(kind)) {
                RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_row_workout);
                v.setTextViewText(R.id.row_title, r.title);
                v.setTextViewText(R.id.row_meta, r.meta);
                Intent fi = new Intent();
                fi.putExtra("op", "open_workout");
                fi.putExtra("id", r.id);
                v.setOnClickFillInIntent(R.id.row_body, fi);
                return v;
            }
            boolean habit = "habits".equals(kind);
            RemoteViews v = new RemoteViews(ctx.getPackageName(),
                    habit ? R.layout.widget_row_habit : R.layout.widget_row_task);
            v.setTextViewText(R.id.row_title, (r.high && !r.done ? "\uD83D\uDD34 " : "") + r.title);
            v.setTextColor(R.id.row_title, r.done ? 0xFF9AA0AC : 0xFFFFFFFF);
            if (!habit) {
                v.setTextViewText(R.id.row_meta, r.meta == null ? "" : r.meta);
                v.setTextColor(R.id.row_meta, r.overdue ? 0xFFFF6B5E : 0xFF9AA0AC);
            }
            v.setTextViewText(R.id.row_tag, r.tag);
            v.setTextColor(R.id.row_tag, r.tagColor);
            v.setTextViewText(R.id.row_chk, r.chkText);
            v.setInt(R.id.row_chk, "setBackgroundResource",
                    habit ? (r.done ? R.drawable.chk_habit_on : R.drawable.chk_habit_off)
                          : (r.done ? R.drawable.chk_task_on
                                    : (r.overdue ? R.drawable.widget_check_red : R.drawable.chk_task_off)));
            Intent open = new Intent();
            open.putExtra("op", habit ? "open_habit" : "open_task");
            open.putExtra("id", r.id);
            v.setOnClickFillInIntent(R.id.row_body, open);
            Intent tog = new Intent();
            tog.putExtra("op", habit ? "toggle_habit" : "toggle_task");
            tog.putExtra("id", r.id);
            v.setOnClickFillInIntent(R.id.row_chk, tog);
            return v;
        }

        @Override public int getCount() { return rows.size(); }
        @Override public RemoteViews getLoadingView() { return null; }
        @Override public int getViewTypeCount() { return 2; }
        @Override public long getItemId(int position) { return position; }
        @Override public boolean hasStableIds() { return false; }
        @Override public void onDestroy() { rows.clear(); }
    }
}
