package com.actionables.personaltracker.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

/**
 * Native data layer for the home-screen widgets.
 *
 * IMPORTANT ARCHITECTURE NOTE
 * ---------------------------
 * This class does NOT introduce a second database. It reads and writes the
 * exact same state JSON the web app persists through Bridge.saveState()
 * (SharedPreferences "personal_tracker_native", key "state"). Every mutation
 * bumps state.mtime, so the web app's existing syncFromNative() adopts widget
 * writes automatically the next time it runs, and the existing Firestore
 * record sync picks the changes up from there. All schedule / recurrence /
 * money math below is a faithful port of the corresponding index.html logic.
 */
public class WidgetStore {
    public static final String PREFS = "personal_tracker_native";
    public static final String KEY = "state";

    /** Mood table \u2014 must stay identical to var MOODS in index.html. */
    public static final String[] MOOD_EMOJI = {"\uD83E\uDD29", "\uD83D\uDE04", "\uD83D\uDE0C", "\uD83D\uDE10", "\uD83D\uDE34", "\uD83D\uDE22", "\uD83D\uDE16"};
    public static final String[] MOOD_LABEL = {"Excellent", "Happy", "Calm", "Neutral", "Tired", "Sad", "Stressed"};

    public final Context ctx;
    public final JSONObject state;
    private boolean dirty = false;

    private WidgetStore(Context c, JSONObject s) { ctx = c; state = s; }

    public static WidgetStore load(Context c) {
        JSONObject s;
        try {
            String raw = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "");
            s = (raw == null || raw.isEmpty()) ? new JSONObject() : new JSONObject(raw);
        } catch (Exception e) { s = new JSONObject(); }
        return new WidgetStore(c, s);
    }

    /** Persist the mutated state (single write per user action) and refresh every widget. */
    public boolean commit() {
        if (!dirty) { WidgetHub.refreshAll(ctx); return true; }
        try {
            state.put("mtime", System.currentTimeMillis());
            SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            boolean ok = p.edit().putString(KEY, state.toString()).commit();
            WidgetHub.refreshAll(ctx);
            return ok;
        } catch (Exception e) { return false; }
    }

    public void markDirty() { dirty = true; }

    /* ==================== small helpers (ported from index.html) ==================== */

    static String pad(int n) { return n < 10 ? "0" + n : String.valueOf(n); }

    public static String fmt(Calendar d) {
        return d.get(Calendar.YEAR) + "-" + pad(d.get(Calendar.MONTH) + 1) + "-" + pad(d.get(Calendar.DAY_OF_MONTH));
    }

    public static String today() { return fmt(Calendar.getInstance()); }

    public static Calendar toDate(String ds) {
        Calendar c = Calendar.getInstance();
        try {
            c.set(Integer.parseInt(ds.substring(0, 4)), Integer.parseInt(ds.substring(5, 7)) - 1,
                    Integer.parseInt(ds.substring(8, 10)), 0, 0, 0);
            c.set(Calendar.MILLISECOND, 0);
        } catch (Exception ignored) {}
        return c;
    }

    public static Calendar addDays(Calendar d, int n) {
        Calendar c = (Calendar) d.clone(); c.add(Calendar.DAY_OF_MONTH, n); return c;
    }

    public static int dayDiff(String a, String b) {
        long ms = toDate(b).getTimeInMillis() - toDate(a).getTimeInMillis();
        return (int) Math.round(ms / 86400000.0);
    }

    /** Monday-start week, identical to weekStart() in index.html. */
    public static Calendar weekStart(Calendar d) {
        Calendar x = (Calendar) d.clone();
        int off = (x.get(Calendar.DAY_OF_WEEK) - Calendar.SUNDAY + 6) % 7; // JS getDay(): Sun=0
        x.add(Calendar.DAY_OF_MONTH, -off);
        return x;
    }

    static String rand(int n) {
        String chars = "0123456789abcdefghijklmnopqrstuvwxyz";
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < n; i++) b.append(chars.charAt((int) (Math.random() * chars.length())));
        return b.toString();
    }

    public static String newId(String prefix, int randLen) {
        return prefix + Long.toString(System.currentTimeMillis(), 36) + rand(randLen);
    }

    JSONArray arr(String k) {
        JSONArray a = state.optJSONArray(k);
        if (a == null) { a = new JSONArray(); try { state.put(k, a); } catch (JSONException ignored) {} }
        return a;
    }

    JSONObject obj(String k) {
        JSONObject o = state.optJSONObject(k);
        if (o == null) { o = new JSONObject(); try { state.put(k, o); } catch (JSONException ignored) {} }
        return o;
    }

    public String currency() {
        JSONObject set = state.optJSONObject("set");
        String c = set == null ? "" : set.optString("curr", "");
        return c.isEmpty() ? "\u20B9" : c;
    }

    /** Indian-grouped currency formatting, identical to inr() in index.html. */
    public String inr(double n) {
        boolean neg = n < 0;
        long v = Math.round(Math.abs(n));
        String s = String.valueOf(v), out;
        if (s.length() <= 3) out = s;
        else {
            String last3 = s.substring(s.length() - 3), rest = s.substring(0, s.length() - 3);
            StringBuilder r = new StringBuilder();
            int c = 0;
            for (int i = rest.length() - 1; i >= 0; i--) {
                r.insert(0, rest.charAt(i));
                if (++c == 2 && i > 0) { r.insert(0, ','); c = 0; }
            }
            out = r + "," + last3;
        }
        return (neg ? "-" : "") + currency() + out;
    }

    /* ==================== vacation / habit schedule engine ==================== */

    boolean onVacation(String ds) {
        JSONObject set = state.optJSONObject("set");
        if (set == null) return false;
        JSONArray vp = set.optJSONArray("vacPeriods");
        if (vp != null) for (int i = 0; i < vp.length(); i++) {
            JSONObject v = vp.optJSONObject(i);
            if (v != null && ds.compareTo(v.optString("from", "\uFFFF")) >= 0
                    && ds.compareTo(v.optString("until", "")) <= 0) return true;
        }
        String f = set.optString("vacFrom", ""), u = set.optString("vacUntil", "");
        return !f.isEmpty() && !u.isEmpty() && ds.compareTo(f) >= 0 && ds.compareTo(u) <= 0;
    }

    public JSONObject findHabit(String id) {
        JSONArray hs = state.optJSONArray("habits");
        if (hs != null) for (int i = 0; i < hs.length(); i++) {
            JSONObject h = hs.optJSONObject(i);
            if (h != null && id.equals(h.optString("id"))) return h;
        }
        return null;
    }

    public static int targ(JSONObject h) {
        String t = h.optString("type", "check");
        if (t.equals("count") || t.equals("time") || t.equals("money"))
            return Math.max(1, h.optInt("target", 1));
        return 1;
    }

    public static double val(JSONObject h, String ds) {
        JSONObject done = h.optJSONObject("done");
        return done == null ? 0 : done.optDouble(ds, 0);
    }

    public static boolean isDone(JSONObject h, String ds) { return val(h, ds) >= targ(h); }

    public static boolean isFroz(JSONObject h, String ds) {
        JSONObject f = h.optJSONObject("frozen");
        return f != null && f.opt(ds) != null && !f.isNull(ds) && f.optBoolean(ds, true);
    }

    JSONObject sched(JSONObject h) {
        JSONObject s = h.optJSONObject("sched");
        return s == null ? new JSONObject() : s;
    }

    int quota(JSONObject h) { return Math.max(1, sched(h).optInt("quota", 3)); }

    /** Completions strictly before d in the wquota/mquota window \u2014 mirrors quotaCountExcl(). */
    int quotaCountExcl(JSONObject h, Calendar d) {
        String kind = sched(h).optString("kind", "daily");
        Calendar from; int span;
        if (kind.equals("wquota")) { from = weekStart(d); span = 7; }
        else {
            from = (Calendar) d.clone(); from.set(Calendar.DAY_OF_MONTH, 1);
            span = from.getActualMaximum(Calendar.DAY_OF_MONTH);
        }
        int n = 0; String ds = fmt(d); Calendar x = (Calendar) from.clone();
        for (int i = 0; i < span; i++) {
            String xs = fmt(x);
            if (xs.compareTo(ds) < 0 && isDone(h, xs)) n++;
            x.add(Calendar.DAY_OF_MONTH, 1);
        }
        return n;
    }

    /** Progress for the current week/month window \u2014 mirrors quotaProgress(). */
    public int[] quotaProgress(JSONObject h) {
        Calendar now = Calendar.getInstance(), from;
        if (sched(h).optString("kind").equals("wquota")) from = weekStart(now);
        else { from = (Calendar) now.clone(); from.set(Calendar.DAY_OF_MONTH, 1); }
        int n = 0; Calendar d = (Calendar) from.clone(); String t = today();
        while (fmt(d).compareTo(t) <= 0) { if (isDone(h, fmt(d))) n++; d.add(Calendar.DAY_OF_MONTH, 1); }
        return new int[]{n, quota(h)};
    }

    /** Faithful port of dueOn(h, d) from index.html. */
    public boolean dueOn(JSONObject h, Calendar d) {
        String ds = fmt(d);
        String start = h.optString("start", ""), end = h.optString("end", "");
        if (!start.isEmpty() && ds.compareTo(start) < 0) return false;
        if (!end.isEmpty() && ds.compareTo(end) > 0) return false;
        if (h.optBoolean("arch", false)) {
            String at = h.optString("archAt", "");
            if (at.isEmpty() || ds.compareTo(at) >= 0) return false;
        }
        if (onVacation(ds)) return false;
        JSONObject sc = sched(h);
        String k = sc.optString("kind", "daily");
        int dow = d.get(Calendar.DAY_OF_WEEK) - Calendar.SUNDAY; // JS getDay(): Sun=0
        int dom = d.get(Calendar.DAY_OF_MONTH);
        switch (k) {
            case "daily": return true;
            case "wquota":
            case "mquota":
                if (isDone(h, ds)) return true;
                return quotaCountExcl(h, d) < quota(h);
            case "weekend": return dow == 0 || dow == 6;
            case "odd": return dom % 2 == 1;
            case "even": return dom % 2 == 0;
            case "dow": {
                JSONArray dows = sc.optJSONArray("dows");
                if (dows == null || dows.length() == 0) return dow >= 1 && dow <= 5;
                for (int i = 0; i < dows.length(); i++) if (dows.optInt(i, -1) == dow) return true;
                return false;
            }
            case "everyx": {
                String base = h.optString("start", h.optString("created", ds));
                if (base.isEmpty()) base = ds;
                int diff = dayDiff(base, ds);
                int x = Math.max(2, sc.optInt("x", 2));
                return diff >= 0 && diff % x == 0;
            }
            default: return true;
        }
    }

    /** Why a habit is not due today \u2014 mirrors notDueMsg(). */
    public String notDueMsg(JSONObject h, Calendar d) {
        String k = sched(h).optString("kind", "daily");
        int q = quota(h);
        if (k.equals("wquota") && quotaCountExcl(h, d) >= q) return "Weekly quota already met (" + q + "/" + q + ") \uD83C\uDF89";
        if (k.equals("mquota") && quotaCountExcl(h, d) >= q) return "Monthly quota already met (" + q + "/" + q + ") \uD83C\uDF89";
        if (k.equals("dow")) return "Only due on its selected weekdays";
        if (k.equals("weekend")) return "Weekend-only habit";
        if (k.equals("everyx")) return "Due every " + Math.max(2, sched(h).optInt("x", 2)) + " days \u2014 not this day";
        if (k.equals("odd")) return "Odd dates only";
        if (k.equals("even")) return "Even dates only";
        return "Not scheduled on this day";
    }

    /** Row model for the Habit widget. */
    public static class HabitRow {
        public String id, name, emoji, meta;
        public boolean done, trophy;
    }

    /**
     * Habits relevant for TODAY only (spec \u00A711/\u00A713): due today, plus quota
     * habits whose weekly/monthly target is already met (shown as \uD83C\uDFC6 rows).
     */
    public List<HabitRow> habitsToday() {
        List<HabitRow> out = new ArrayList<>();
        JSONArray hs = state.optJSONArray("habits");
        if (hs == null) return out;
        Calendar now = Calendar.getInstance();
        String t = today();
        for (int i = 0; i < hs.length(); i++) {
            JSONObject h = hs.optJSONObject(i);
            if (h == null || h.optBoolean("arch", false)) continue;
            String start = h.optString("start", "");
            if (!start.isEmpty() && t.compareTo(start) < 0) continue;
            String end = h.optString("end", "");
            if (!end.isEmpty() && t.compareTo(end) > 0) continue;
            if (isFroz(h, t)) continue;
            boolean due = dueOn(h, now);
            HabitRow r = new HabitRow();
            r.id = h.optString("id"); r.name = h.optString("name", "Habit");
            r.emoji = h.optString("emoji", "\u2B50");
            String kind = sched(h).optString("kind", "daily");
            boolean quotaKind = kind.equals("wquota") || kind.equals("mquota");
            if (due) {
                r.done = isDone(h, t);
                if (quotaKind) { int[] qp = quotaProgress(h); r.meta = qp[0] + "/" + qp[1]; }
                out.add(r);
            } else if (quotaKind && quotaCountExcl(h, now) >= quota(h)) {
                r.done = true; r.trophy = true;
                r.meta = (kind.equals("wquota") ? "Weekly" : "Monthly") + " target met";
                out.add(r);
            }
        }
        return out;
    }

    /**
     * Habit completion writer \u2014 mirrors setVal() (incl. hlog hour push) and
     * additionally keeps linked task occurrences in sync (spec \u00A712).
     */
    public boolean setHabitVal(String hid, String ds, double v) {
        JSONObject h = findHabit(hid);
        if (h == null) return false;
        try {
            boolean was = isDone(h, ds);
            JSONObject done = h.optJSONObject("done");
            if (done == null) { done = new JSONObject(); h.put("done", done); }
            if (v <= 0) done.remove(ds); else done.put(ds, v);
            boolean now = isDone(h, ds);
            if (!was && now && ds.equals(today())) {
                JSONObject hlog = obj("hlog");
                JSONArray a = hlog.optJSONArray(hid);
                if (a == null) a = new JSONArray();
                a.put(Calendar.getInstance().get(Calendar.HOUR_OF_DAY));
                while (a.length() > 40) a.remove(0);
                hlog.put(hid, a);
            }
            // Habit -> linked task sync (both complete and un-complete).
            if (was != now) syncLinkedTasks(hid, ds, now);
            markDirty();
            return true;
        } catch (JSONException e) { return false; }
    }

    /** Toggle a habit occurrence like tapMain()/toggleDay(); returns user-facing error or null. */
    public String toggleHabit(String hid, String ds) {
        JSONObject h = findHabit(hid);
        if (h == null) return "Habit not found";
        if (isFroz(h, ds)) return "This day is frozen";
        if (isDone(h, ds)) { setHabitVal(hid, ds, 0); return null; }
        Calendar d = toDate(ds);
        if (!dueOn(h, d)) return notDueMsg(h, d);
        setHabitVal(hid, ds, targ(h));
        return null;
    }

    void syncLinkedTasks(String hid, String ds, boolean completed) throws JSONException {
        JSONArray ts = state.optJSONArray("tasks");
        if (ts == null) return;
        long now = System.currentTimeMillis();
        for (int i = 0; i < ts.length(); i++) {
            JSONObject tk = ts.optJSONObject(i);
            if (tk == null) continue;
            if (!hid.equals(tk.optString("linkedHabitId"))) continue;
            if (!ds.equals(tk.optString("linkedHabitOccurrenceDate"))) continue;
            boolean isCompleted = "completed".equals(tk.optString("status"));
            if (completed && !isCompleted) {
                tk.put("status", "completed"); tk.put("completedAt", now); tk.put("updatedAt", now);
            } else if (!completed && isCompleted) {
                tk.put("status", "open"); tk.put("completedAt", 0); tk.put("updatedAt", now);
            }
        }
    }

    /* ==================== tasks ==================== */

    public JSONObject findTask(String id) {
        JSONArray ts = state.optJSONArray("tasks");
        if (ts != null) for (int i = 0; i < ts.length(); i++) {
            JSONObject t = ts.optJSONObject(i);
            if (t != null && id.equals(t.optString("id"))) return t;
        }
        return null;
    }

    public static long taskDueMs(JSONObject t) {
        String d = t.optString("dueDate", "");
        if (d.isEmpty()) return Long.MAX_VALUE;
        String tm = t.optString("dueTime", "");
        if (tm.isEmpty()) tm = "23:59";
        try {
            Calendar c = toDate(d);
            c.set(Calendar.HOUR_OF_DAY, Integer.parseInt(tm.substring(0, 2)));
            c.set(Calendar.MINUTE, Integer.parseInt(tm.substring(3, 5)));
            return c.getTimeInMillis();
        } catch (Exception e) { return Long.MAX_VALUE; }
    }

    public static String taskStatus(JSONObject t) {
        if (t == null) return "open";
        if ("completed".equals(t.optString("status"))) return "completed";
        if (!t.optString("dueDate", "").isEmpty() && taskDueMs(t) < System.currentTimeMillis()) return "overdue";
        String s = t.optString("status", "open");
        return s.isEmpty() ? "open" : s;
    }

    /** Overdue + today's open tasks, sorted like the app (overdue first, then due time). */
    public List<JSONObject> tasksForWidget() {
        List<JSONObject> out = new ArrayList<>();
        JSONArray ts = state.optJSONArray("tasks");
        if (ts == null) return out;
        String t = today();
        for (int i = 0; i < ts.length(); i++) {
            JSONObject k = ts.optJSONObject(i);
            if (k == null) continue;
            String st = taskStatus(k);
            if (st.equals("overdue")) out.add(k);
            else if (t.equals(k.optString("dueDate")) && !st.equals("completed")) out.add(k);
        }
        out.sort((a, b) -> {
            int ra = taskStatus(a).equals("overdue") ? 0 : 1;
            int rb = taskStatus(b).equals("overdue") ? 0 : 1;
            if (ra != rb) return ra - rb;
            return Long.compare(taskDueMs(a), taskDueMs(b));
        });
        return out;
    }

    public int[] todayTaskCounts() { // {completedToday, totalToday(open+done), overdue, open}
        JSONArray ts = state.optJSONArray("tasks");
        int done = 0, total = 0, over = 0, open = 0;
        String t = today();
        if (ts != null) for (int i = 0; i < ts.length(); i++) {
            JSONObject k = ts.optJSONObject(i);
            if (k == null) continue;
            String st = taskStatus(k);
            if (st.equals("overdue")) { over++; open++; }
            if (t.equals(k.optString("dueDate"))) {
                total++;
                if (st.equals("completed")) done++; else open++;
            }
        }
        return new int[]{done, total, over, open};
    }

    static String time12(String hm) {
        try {
            int h = Integer.parseInt(hm.substring(0, 2)), m = Integer.parseInt(hm.substring(3, 5));
            String ap = h >= 12 ? "PM" : "AM";
            int h12 = h % 12; if (h12 == 0) h12 = 12;
            return h12 + (m > 0 ? ":" + pad(m) : "") + " " + ap;
        } catch (Exception e) { return hm; }
    }

    public static String taskMeta(JSONObject t) {
        String st = taskStatus(t);
        if (st.equals("overdue")) return "OVERDUE";
        String tm = t.optString("dueTime", "");
        return tm.isEmpty() ? "" : time12(tm);
    }

    /** Create a task with normTask()-equivalent defaults. Returns the new task. */
    public JSONObject addTask(String title, String desc, String dueDate, String dueTime,
                              String priority, List<Integer> reminders, String recurFreq,
                              List<String> subtasks) throws JSONException {
        JSONObject t = new JSONObject();
        long now = System.currentTimeMillis();
        t.put("id", newId("k", 6));
        String ti = title == null ? "" : title.trim();
        if (ti.length() > 100) ti = ti.substring(0, 100);
        t.put("title", ti.isEmpty() ? "Task" : ti);
        t.put("description", desc == null ? "" : (desc.length() > 1000 ? desc.substring(0, 1000) : desc));
        t.put("status", "open");
        t.put("priority", priority != null && (priority.equals("high") || priority.equals("low")) ? priority : "medium");
        t.put("dueDate", dueDate != null && dueDate.matches("\\d{4}-\\d{2}-\\d{2}") ? dueDate : "");
        t.put("dueTime", dueTime != null && dueTime.matches("([01]\\d|2[0-3]):[0-5]\\d") ? dueTime : "");
        JSONArray rem = new JSONArray();
        if (reminders != null) for (int r : reminders) if (r == 1 || r == 2) rem.put(r);
        t.put("reminders", rem);
        JSONObject rc = new JSONObject();
        String f = recurFreq == null ? "none" : recurFreq;
        if (!f.matches("none|daily|weekdays|weekly|monthly|custom")) f = "none";
        rc.put("freq", f); rc.put("interval", 1); rc.put("endDate", "");
        if (f.equals("monthly") && t.optString("dueDate").length() == 10)
            rc.put("dayOfMonth", Integer.parseInt(t.optString("dueDate").substring(8)));
        t.put("recurrence", rc);
        JSONArray subs = new JSONArray();
        if (subtasks != null) for (String s : subtasks) {
            String sv = s == null ? "" : s.trim();
            if (sv.isEmpty()) continue;
            JSONObject st = new JSONObject();
            st.put("id", "s" + rand(6));
            st.put("title", sv.length() > 120 ? sv.substring(0, 120) : sv);
            st.put("done", false);
            subs.put(st);
        }
        t.put("subtasks", subs);
        t.put("comments", new JSONArray());
        t.put("linkedHabitId", ""); t.put("linkedHabitOccurrenceDate", "");
        t.put("seriesId", ""); t.put("occurrenceKey", "");
        t.put("createdAt", now); t.put("updatedAt", now); t.put("completedAt", 0);
        arr("tasks").put(t);
        markDirty();
        return t;
    }

    static String taskNextDate(JSONObject t) {
        String due = t.optString("dueDate", "");
        if (due.isEmpty()) return "";
        JSONObject rc = t.optJSONObject("recurrence");
        String f = rc == null ? "none" : rc.optString("freq", "none");
        Calendar d = toDate(due);
        switch (f) {
            case "daily": return fmt(addDays(d, 1));
            case "weekdays": {
                Calendar n = addDays(d, 1);
                while (n.get(Calendar.DAY_OF_WEEK) == Calendar.SUNDAY || n.get(Calendar.DAY_OF_WEEK) == Calendar.SATURDAY)
                    n.add(Calendar.DAY_OF_MONTH, 1);
                return fmt(n);
            }
            case "weekly": return fmt(addDays(d, 7));
            case "monthly": {
                int day = rc != null ? rc.optInt("dayOfMonth", d.get(Calendar.DAY_OF_MONTH)) : d.get(Calendar.DAY_OF_MONTH);
                Calendar n = (Calendar) d.clone();
                n.set(Calendar.DAY_OF_MONTH, 1); n.add(Calendar.MONTH, 1);
                n.set(Calendar.DAY_OF_MONTH, Math.min(day, n.getActualMaximum(Calendar.DAY_OF_MONTH)));
                return fmt(n);
            }
            case "custom": {
                int iv = rc != null ? Math.max(1, rc.optInt("interval", 1)) : 1;
                return fmt(addDays(d, iv));
            }
            default: return "";
        }
    }

    /** Mirrors taskCreateNextOccurrence() so recurring tasks roll on completion. */
    JSONObject taskCreateNextOccurrence(JSONObject t) throws JSONException {
        JSONObject rc = t.optJSONObject("recurrence");
        String f = rc == null ? "none" : rc.optString("freq", "none");
        if (f.equals("none") || t.optString("dueDate", "").isEmpty()) return null;
        String nd = taskNextDate(t);
        int guard = 0;
        JSONObject probe = new JSONObject(t.toString());
        while (!nd.isEmpty() && nd.compareTo(today()) <= 0 && guard++ < 100) {
            probe.put("dueDate", nd);
            nd = taskNextDate(probe);
        }
        if (nd.isEmpty()) return null;
        String end = rc.optString("endDate", "");
        if (!end.isEmpty() && nd.compareTo(end) > 0) return null;
        String series = t.optString("seriesId", "");
        if (series.isEmpty()) series = t.optString("id");
        JSONArray ts = arr("tasks");
        for (int i = 0; i < ts.length(); i++) {
            JSONObject x = ts.optJSONObject(i);
            if (x != null && series.equals(x.optString("seriesId")) && nd.equals(x.optString("dueDate"))) return null;
        }
        JSONObject nt = new JSONObject(t.toString());
        long now = System.currentTimeMillis();
        nt.put("id", newId("k", 6));
        nt.put("seriesId", series);
        nt.put("occurrenceKey", series + "|" + nd);
        nt.put("dueDate", nd);
        nt.put("status", "open");
        nt.put("completedAt", 0);
        nt.put("createdAt", now); nt.put("updatedAt", now);
        JSONArray subs = nt.optJSONArray("subtasks");
        if (subs != null) for (int i = 0; i < subs.length(); i++) {
            JSONObject st = subs.optJSONObject(i);
            if (st != null) { st.put("done", false); st.put("id", "s" + rand(6)); }
        }
        ts.put(nt);
        return nt;
    }

    /** Toggle complete like toggleTaskComplete(), incl. recurrence + linked habit sync. Returns toast text. */
    public String toggleTask(String id) {
        JSONObject t = findTask(id);
        if (t == null) return "Task not found";
        try {
            long now = System.currentTimeMillis();
            boolean was = "completed".equals(t.optString("status"));
            String msg;
            if (was) {
                t.put("status", "open"); t.put("completedAt", 0); t.put("updatedAt", now);
                msg = "Reopened";
            } else {
                t.put("status", "completed"); t.put("completedAt", now); t.put("updatedAt", now);
                JSONObject nx = taskCreateNextOccurrence(t);
                msg = nx != null ? "Completed \u00B7 next " + niceDate(nx.optString("dueDate")) : "Completed \u2713";
            }
            // Task -> linked habit sync (spec \u00A712).
            String hid = t.optString("linkedHabitId", "");
            String hds = t.optString("linkedHabitOccurrenceDate", "");
            if (!hid.isEmpty() && !hds.isEmpty()) {
                JSONObject h = findHabit(hid);
                if (h != null && !isFroz(h, hds)) {
                    if (!was && !isDone(h, hds)) setHabitVal(hid, hds, targ(h));
                    else if (was && isDone(h, hds)) setHabitVal(hid, hds, 0);
                }
            }
            markDirty();
            return msg;
        } catch (JSONException e) { return "Unable to update task"; }
    }

    public static String niceDate(String ds) {
        if (ds == null || ds.length() != 10) return ds == null ? "" : ds;
        if (ds.equals(today())) return "Today";
        String[] mo = {"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"};
        try { return Integer.parseInt(ds.substring(8)) + " " + mo[Integer.parseInt(ds.substring(5, 7)) - 1]; }
        catch (Exception e) { return ds; }
    }

    /* ==================== habits: creation ==================== */

    /** Create a habit with normHabit()-equivalent defaults (daily check habit unless configured). */
    public JSONObject addHabit(String name, String emoji, String schedKind, int quota) throws JSONException {
        JSONObject h = new JSONObject();
        h.put("id", newId("", 5));
        String nm = name == null ? "" : name.trim();
        h.put("name", nm.isEmpty() ? "Habit" : nm);
        h.put("emoji", emoji == null || emoji.isEmpty() ? "\uD83C\uDF31" : emoji);
        h.put("color", "#FFAE1F");
        h.put("cat", "Other"); h.put("notes", ""); h.put("quote", "");
        h.put("type", "check"); h.put("target", 1); h.put("unit", "");
        JSONObject sc = new JSONObject();
        String k = schedKind == null ? "daily" : schedKind;
        if (!k.matches("daily|dow|wquota|mquota|weekend|odd|even|everyx")) k = "daily";
        sc.put("kind", k);
        JSONArray dows = new JSONArray(); for (int i = 1; i <= 5; i++) dows.put(i);
        sc.put("dows", dows); sc.put("x", 2); sc.put("quota", Math.max(1, quota));
        h.put("sched", sc);
        h.put("section", "any");
        JSONObject rem = new JSONObject();
        rem.put("times", new JSONArray()); rem.put("repeat", false); rem.put("missed", false);
        h.put("rem", rem);
        String t = today();
        h.put("created", t); h.put("start", t); h.put("end", "");
        h.put("done", new JSONObject()); h.put("frozen", new JSONObject());
        h.put("arch", false); h.put("archAt", "");
        h.put("dnotes", new JSONObject()); h.put("fz", 1);
        arr("habits").put(h);
        markDirty();
        return h;
    }

    /* ==================== money ==================== */

    public List<JSONObject> activeAccounts() {
        List<JSONObject> out = new ArrayList<>();
        JSONArray as = state.optJSONArray("accts");
        if (as != null) for (int i = 0; i < as.length(); i++) {
            JSONObject a = as.optJSONObject(i);
            if (a != null && a.optBoolean("active", true)) out.add(a);
        }
        return out;
    }

    public JSONObject acctById(String id) {
        JSONArray as = state.optJSONArray("accts");
        if (as != null) for (int i = 0; i < as.length(); i++) {
            JSONObject a = as.optJSONObject(i);
            if (a != null && id.equals(a.optString("id"))) return a;
        }
        return null;
    }

    /** Faithful port of acctBalance(). */
    public double acctBalance(String id) {
        JSONObject a = acctById(id);
        if (a == null) return 0;
        double bal = a.optDouble("open", 0);
        JSONArray tx = state.optJSONArray("tx");
        if (tx != null) for (int i = 0; i < tx.length(); i++) {
            JSONObject x = tx.optJSONObject(i);
            if (x == null) continue;
            String kind = x.optString("kind", "exp");
            double amt = x.optDouble("amt", 0);
            if (kind.equals("exp") && id.equals(x.optString("acct"))) bal -= amt;
            else if (kind.equals("inc") && id.equals(x.optString("acct"))) bal += amt;
            else if (kind.equals("xfer")) {
                if (id.equals(x.optString("acct"))) bal -= amt;
                if (id.equals(x.optString("to"))) bal += amt;
            }
        }
        return bal;
    }

    public double todayExpenseTotal() {
        double sum = 0;
        JSONArray tx = state.optJSONArray("tx");
        String t = today();
        if (tx != null) for (int i = 0; i < tx.length(); i++) {
            JSONObject x = tx.optJSONObject(i);
            if (x != null && "exp".equals(x.optString("kind", "exp")) && t.equals(x.optString("d")))
                sum += x.optDouble("amt", 0);
        }
        return sum;
    }

    /** Top spending categories today, as "Cat<TAB>amount" pairs. */
    public List<String[]> todayTopCats(int max) {
        JSONArray tx = state.optJSONArray("tx");
        String t = today();
        java.util.LinkedHashMap<String, Double> m = new java.util.LinkedHashMap<>();
        if (tx != null) for (int i = 0; i < tx.length(); i++) {
            JSONObject x = tx.optJSONObject(i);
            if (x == null || !"exp".equals(x.optString("kind", "exp")) || !t.equals(x.optString("d"))) continue;
            String c = x.optString("cat", "");
            if (c.isEmpty()) c = "Other";
            m.put(c, m.getOrDefault(c, 0d) + x.optDouble("amt", 0));
        }
        List<java.util.Map.Entry<String, Double>> es = new ArrayList<>(m.entrySet());
        es.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));
        List<String[]> out = new ArrayList<>();
        for (int i = 0; i < es.size() && i < max; i++)
            out.add(new String[]{es.get(i).getKey(), inr(es.get(i).getValue())});
        return out;
    }

    public List<String> expenseCategories() {
        List<String> out = new ArrayList<>();
        JSONObject cats = state.optJSONObject("cats");
        if (cats != null) {
            java.util.Iterator<String> it = cats.keys();
            while (it.hasNext()) out.add(it.next());
        }
        if (out.isEmpty()) {
            out.add("Food"); out.add("Transport"); out.add("Shopping");
            out.add("Bills & Utilities"); out.add("Entertainment"); out.add("Health"); out.add("Other");
        }
        return out;
    }

    /** Add an expense transaction with the app's tx field defaults. */
    public JSONObject addExpense(double amt, String cat, String note, String acctId) throws JSONException {
        JSONObject x = new JSONObject();
        x.put("id", newId("t", 5));
        x.put("d", today());
        x.put("kind", "exp");
        x.put("amt", Math.max(0, amt));
        x.put("acct", acctId == null ? "" : acctId);
        x.put("to", "");
        String c = cat == null || cat.isEmpty() ? "Other" : cat;
        x.put("cat", c.length() > 40 ? c.substring(0, 40) : c);
        x.put("sub", "");
        x.put("payee", "");
        x.put("method", "");
        String n = note == null ? "" : note;
        x.put("note", n.length() > 200 ? n.substring(0, 200) : n);
        x.put("tags", ""); x.put("receipt", ""); x.put("receiptData", "");
        x.put("recurId", ""); x.put("recurDate", "");
        x.put("created", System.currentTimeMillis());
        arr("tx").put(x);
        markDirty();
        return x;
    }

    /* ==================== mood ==================== */

    public int moodOf(String ds) {
        JSONObject m = state.optJSONObject("mood");
        if (m == null) return -1;
        int v = m.optInt(ds, -1);
        return v >= 0 && v < MOOD_EMOJI.length ? v : -1;
    }

    public String moodNote(String ds) {
        JSONObject m = state.optJSONObject("moodNotes");
        return m == null ? "" : m.optString(ds, "");
    }

    /** Mirrors setMood(): i outside range clears mood + note. */
    public void setMood(String ds, int i, String note) {
        if (ds.compareTo(today()) > 0) return;
        try {
            JSONObject m = obj("mood"), mn = obj("moodNotes");
            if (i < 0 || i >= MOOD_EMOJI.length) { m.remove(ds); mn.remove(ds); }
            else {
                m.put(ds, i);
                if (note != null && !note.trim().isEmpty()) mn.put(ds, note.trim());
            }
            markDirty();
        } catch (JSONException ignored) {}
    }

    /* ==================== sleep ==================== */

    /** Latest sleep entry (by wake date). */
    public JSONObject lastSleep() {
        JSONArray sl = state.optJSONArray("sleep");
        JSONObject best = null;
        if (sl != null) for (int i = 0; i < sl.length(); i++) {
            JSONObject e = sl.optJSONObject(i);
            if (e == null) continue;
            if (best == null || e.optString("d", "").compareTo(best.optString("d", "")) >= 0) best = e;
        }
        return best;
    }

    public static int sleepMins(String bed, String wake) {
        try {
            int b = Integer.parseInt(bed.substring(0, 2)) * 60 + Integer.parseInt(bed.substring(3, 5));
            int w = Integer.parseInt(wake.substring(0, 2)) * 60 + Integer.parseInt(wake.substring(3, 5));
            int m = w - b;
            if (m <= 0) m += 1440;
            return Math.min(1440, m);
        } catch (Exception e) { return 0; }
    }

    public static String durFmt(int mins) { return (mins / 60) + "h " + pad(mins % 60) + "m"; }

    /** Add/replace today's sleep entry ('d' = the date you woke up, like the app). */
    public JSONObject addSleep(String bed, String wake, String note) throws JSONException {
        String t = today();
        JSONArray sl = arr("sleep");
        JSONObject e = null;
        for (int i = 0; i < sl.length(); i++) {
            JSONObject x = sl.optJSONObject(i);
            if (x != null && t.equals(x.optString("d"))) { e = x; break; }
        }
        if (e == null) { e = new JSONObject(); e.put("d", t); sl.put(e); }
        e.put("bed", bed == null ? "" : bed);
        e.put("wake", wake == null ? "" : wake);
        e.put("mins", sleepMins(bed, wake));
        e.put("note", note == null ? "" : (note.length() > 160 ? note.substring(0, 160) : note));
        markDirty();
        return e;
    }

    /* ==================== workout ==================== */

    public JSONObject findExercise(String id) {
        JSONArray ex = state.optJSONArray("exs");
        if (ex != null) for (int i = 0; i < ex.length(); i++) {
            JSONObject e = ex.optJSONObject(i);
            if (e != null && id.equals(e.optString("id"))) return e;
        }
        return null;
    }

    public JSONObject exerciseByName(String name) {
        JSONArray ex = state.optJSONArray("exs");
        if (ex == null || name == null) return null;
        String q = name.trim().toLowerCase(Locale.US);
        for (int i = 0; i < ex.length(); i++) {
            JSONObject e = ex.optJSONObject(i);
            if (e != null && e.optString("name", "").trim().toLowerCase(Locale.US).equals(q)) return e;
        }
        return null;
    }

    /** Find or create an exercise using the app's exercise defaults. */
    public JSONObject ensureExercise(String name, String mtype, String unit) throws JSONException {
        JSONObject e = exerciseByName(name);
        if (e != null) return e;
        e = new JSONObject();
        e.put("id", newId("e", 4));
        String nm = name == null ? "" : name.trim();
        if (nm.isEmpty()) nm = "Exercise";
        e.put("name", nm.length() > 40 ? nm.substring(0, 40) : nm);
        String mt = mtype == null ? "reps" : mtype;
        if (!mt.matches("reps|weight|time|distance|count")) mt = "reps";
        e.put("mtype", mt);
        e.put("unit", unit == null ? "" : unit);
        e.put("sets", true);
        e.put("goal", 0);
        e.put("active", true);
        e.put("created", System.currentTimeMillis());
        arr("exs").put(e);
        markDirty();
        return e;
    }

    /** Append a workout log entry {id, exId, d, sets[], created} \u2014 the app's wlog shape. */
    public JSONObject addWorkoutLog(String exId, List<Double> sets) throws JSONException {
        JSONObject w = new JSONObject();
        w.put("id", newId("w", 5));
        w.put("exId", exId);
        w.put("d", today());
        JSONArray a = new JSONArray();
        if (sets != null) for (double s : sets) a.put(Math.max(0, s));
        w.put("sets", a);
        w.put("created", System.currentTimeMillis());
        arr("wlog").put(w);
        markDirty();
        return w;
    }

    public boolean workoutLoggedToday() {
        JSONArray wl = state.optJSONArray("wlog");
        String t = today();
        if (wl != null) for (int i = 0; i < wl.length(); i++) {
            JSONObject w = wl.optJSONObject(i);
            if (w != null && t.equals(w.optString("d"))) return true;
        }
        return false;
    }

    /**
     * Workout plans live under state.wplans inside the SAME state document \u2014
     * carried along untouched by the web app's normState()/stateForStorage().
     */
    public JSONArray plans() { return arr("wplans"); }

    public JSONObject latestPlan() {
        JSONArray p = state.optJSONArray("wplans");
        JSONObject best = null;
        if (p != null) for (int i = 0; i < p.length(); i++) {
            JSONObject e = p.optJSONObject(i);
            if (e == null) continue;
            if (best == null || e.optLong("created", 0) >= best.optLong("created", 0)) best = e;
        }
        return best;
    }

    public JSONObject addPlan(String name, List<String> exerciseNames) throws JSONException {
        JSONObject p = new JSONObject();
        p.put("id", newId("p", 5));
        String nm = name == null ? "" : name.trim();
        p.put("name", nm.isEmpty() ? "Workout" : (nm.length() > 40 ? nm.substring(0, 40) : nm));
        JSONArray ids = new JSONArray();
        if (exerciseNames != null) for (String en : exerciseNames) {
            if (en == null || en.trim().isEmpty()) continue;
            ids.put(ensureExercise(en, "reps", "").optString("id"));
        }
        p.put("exIds", ids);
        p.put("created", System.currentTimeMillis());
        plans().put(p);
        markDirty();
        return p;
    }

    /* ==================== quick log summary ==================== */

    public int[] habitCounts() {
        List<HabitRow> rows = habitsToday();
        int done = 0;
        for (HabitRow r : rows) if (r.done) done++;
        return new int[]{done, rows.size()};
    }

    /* ==================== extensions for the v2 widget set + cloud AI ==================== */

    /** Consecutive-day streak, ported from streak() in index.html. */
    public int streak(JSONObject h) {
        Calendar d = Calendar.getInstance();
        int guard = 0, s = 0;
        String ds = fmt(d);
        if (dueOn(h, d) && !isDone(h, ds) && !isFroz(h, ds)) d = addDays(d, -1);
        String created = h.optString("created", ""), start = h.optString("start", "");
        while (guard++ < 3000) {
            ds = fmt(d);
            if (!created.isEmpty() && ds.compareTo(created) < 0 && ds.compareTo(start) < 0) break;
            if (!dueOn(h, d)) { d = addDays(d, -1); continue; }
            if (isDone(h, ds) || isFroz(h, ds)) { s++; d = addDays(d, -1); }
            else break;
        }
        return s;
    }

    public int maxStreak() {
        JSONArray hs = state.optJSONArray("habits");
        int mx = 0;
        if (hs != null) for (int i = 0; i < hs.length(); i++) {
            JSONObject h = hs.optJSONObject(i);
            if (h == null || h.optBoolean("arch", false)) continue;
            int s = streak(h);
            if (s > mx) mx = s;
        }
        return mx;
    }

    /** 7-day completion dots ending today: 0=nothing due, 1=missed, 2=partial, 3=all done. */
    public int[] weekDots() {
        int[] out = new int[7];
        Calendar now = Calendar.getInstance();
        JSONArray hs = state.optJSONArray("habits");
        for (int wi = 6; wi >= 0; wi--) {
            Calendar d = addDays(now, -wi);
            String ds = fmt(d);
            int due = 0, done = 0;
            if (hs != null && !onVacation(ds)) for (int i = 0; i < hs.length(); i++) {
                JSONObject h = hs.optJSONObject(i);
                if (h == null) continue;
                if (h.optBoolean("arch", false)) {
                    String at = h.optString("archAt", "");
                    if (at.isEmpty() || ds.compareTo(at) >= 0) continue;
                }
                if (!dueOn(h, d)) continue;
                due++;
                if (isDone(h, ds) || isFroz(h, ds)) done++;
            }
            out[6 - wi] = due == 0 ? 0 : (done >= due ? 3 : (done > 0 ? 2 : 1));
        }
        return out;
    }

    /** Date-aware sleep upsert (mirrors the app's set_sleep action). */
    public JSONObject setSleep(String d, String bed, String wake, String note) throws JSONException {
        JSONArray sl = arr("sleep");
        JSONObject e = null;
        for (int i = 0; i < sl.length(); i++) {
            JSONObject x = sl.optJSONObject(i);
            if (x != null && d.equals(x.optString("d"))) { e = x; break; }
        }
        if (e == null) { e = new JSONObject(); e.put("d", d); sl.put(e); }
        e.put("bed", bed == null ? "" : bed);
        e.put("wake", wake == null ? "" : wake);
        e.put("mins", sleepMins(bed, wake));
        e.put("note", note == null ? "" : (note.length() > 160 ? note.substring(0, 160) : note));
        markDirty();
        return e;
    }

    public boolean deleteSleep(String d) {
        JSONArray sl = state.optJSONArray("sleep");
        if (sl == null) return false;
        for (int i = 0; i < sl.length(); i++) {
            JSONObject x = sl.optJSONObject(i);
            if (x != null && d.equals(x.optString("d"))) { sl.remove(i); markDirty(); return true; }
        }
        return false;
    }

    public JSONObject sleepOn(String d) {
        JSONArray sl = state.optJSONArray("sleep");
        if (sl != null) for (int i = 0; i < sl.length(); i++) {
            JSONObject x = sl.optJSONObject(i);
            if (x != null && d.equals(x.optString("d"))) return x;
        }
        return null;
    }

    /** Permanently delete a habit + its hour log (mirrors delete_habit). */
    public boolean deleteHabit(String id) {
        JSONArray hs = state.optJSONArray("habits");
        if (hs == null) return false;
        for (int i = 0; i < hs.length(); i++) {
            JSONObject h = hs.optJSONObject(i);
            if (h != null && id.equals(h.optString("id"))) {
                hs.remove(i);
                JSONObject hlog = state.optJSONObject("hlog");
                if (hlog != null) hlog.remove(id);
                markDirty();
                return true;
            }
        }
        return false;
    }

    public JSONObject findTx(String id) {
        JSONArray tx = state.optJSONArray("tx");
        if (tx != null) for (int i = 0; i < tx.length(); i++) {
            JSONObject x = tx.optJSONObject(i);
            if (x != null && id.equals(x.optString("id"))) return x;
        }
        return null;
    }

    public boolean deleteTx(String id) {
        JSONArray tx = state.optJSONArray("tx");
        if (tx == null) return false;
        for (int i = 0; i < tx.length(); i++) {
            JSONObject x = tx.optJSONObject(i);
            if (x != null && id.equals(x.optString("id"))) { tx.remove(i); markDirty(); return true; }
        }
        return false;
    }

    /** Most recent transactions (date desc, then created desc). */
    public List<JSONObject> recentTx(int n) {
        List<JSONObject> out = new ArrayList<>();
        JSONArray tx = state.optJSONArray("tx");
        if (tx != null) for (int i = 0; i < tx.length(); i++) {
            JSONObject x = tx.optJSONObject(i);
            if (x != null) out.add(x);
        }
        out.sort((a, b) -> {
            int c = b.optString("d", "").compareTo(a.optString("d", ""));
            if (c != 0) return c;
            return Long.compare(b.optLong("created", 0), a.optLong("created", 0));
        });
        return out.size() > n ? out.subList(0, n) : out;
    }

    /** Resolve an account by id or (case-insensitive) name. */
    public JSONObject acctResolve(String q) {
        if (q == null || q.isEmpty()) return null;
        JSONObject byId = acctById(q);
        if (byId != null) return byId;
        String ql = q.trim().toLowerCase(Locale.US);
        for (JSONObject a : activeAccounts()) {
            String nm = a.optString("name", "").toLowerCase(Locale.US);
            if (nm.equals(ql) || nm.contains(ql) || ql.contains(nm)) return a;
        }
        return null;
    }

    /** Unique open-task lookup by title fragment; returns null when 0 or >1 match. */
    public JSONObject taskByQuery(String q) {
        if (q == null || q.trim().isEmpty()) return null;
        String ql = q.trim().toLowerCase(Locale.US);
        JSONArray ts = state.optJSONArray("tasks");
        JSONObject hit = null; int n = 0;
        if (ts != null) for (int i = 0; i < ts.length(); i++) {
            JSONObject t = ts.optJSONObject(i);
            if (t == null) continue;
            String ti = t.optString("title", "").toLowerCase(Locale.US);
            if (ti.equals(ql)) return t; // exact wins immediately
            if (ti.contains(ql)) { hit = t; n++; }
        }
        return n == 1 ? hit : null;
    }

    public int[] taskSubProgress(JSONObject t) {
        JSONArray subs = t.optJSONArray("subtasks");
        int done = 0, total = 0;
        if (subs != null) for (int i = 0; i < subs.length(); i++) {
            JSONObject s = subs.optJSONObject(i);
            if (s == null) continue;
            total++;
            if (s.optBoolean("done", false)) done++;
        }
        return new int[]{done, total};
    }

    /** This month's income/expense totals. */
    public double[] monthMoney() {
        String t = today(), ms = t.substring(0, 8) + "01";
        double inc = 0, exp = 0;
        JSONArray tx = state.optJSONArray("tx");
        if (tx != null) for (int i = 0; i < tx.length(); i++) {
            JSONObject x = tx.optJSONObject(i);
            if (x == null) continue;
            String d = x.optString("d", "");
            if (d.compareTo(ms) < 0 || d.compareTo(t) > 0) continue;
            if ("exp".equals(x.optString("kind"))) exp += x.optDouble("amt", 0);
            else if ("inc".equals(x.optString("kind"))) inc += x.optDouble("amt", 0);
        }
        return new double[]{inc, exp};
    }

    public List<String> incomeCategories() {
        List<String> out = new ArrayList<>();
        JSONArray a = state.optJSONArray("incCats");
        if (a != null) for (int i = 0; i < a.length(); i++) {
            String v = a.optString(i, "");
            if (!v.isEmpty()) out.add(v);
        }
        return out;
    }

    /** Unit for an exercise's measurement type (mirrors MTYPES). */
    public static String exUnit(String mtype) {
        if ("weight".equals(mtype)) return "kg";
        if ("time".equals(mtype)) return "min";
        if ("distance".equals(mtype)) return "km";
        if ("count".equals(mtype)) return "";
        return "reps";
    }

    /** Session score for a set list (mirrors setsTotal: weight=max, others=sum). */
    public static double setsTotal(JSONObject ex, JSONArray sets) {
        if (sets == null || sets.length() == 0) return 0;
        boolean max = "weight".equals(ex.optString("mtype"));
        double v = 0;
        for (int i = 0; i < sets.length(); i++) {
            double s = sets.optDouble(i, 0);
            if (max) { if (s > v) v = s; } else v += s;
        }
        return v;
    }

    public List<JSONObject> activeExercises() {
        List<JSONObject> out = new ArrayList<>();
        JSONArray ex = state.optJSONArray("exs");
        if (ex != null) for (int i = 0; i < ex.length(); i++) {
            JSONObject e = ex.optJSONObject(i);
            if (e != null && e.optBoolean("active", true)) out.add(e);
        }
        return out;
    }

    /** "Bench Press · 65kg" style line for the latest logged session, or null. */
    public String lastWorkoutLine() {
        JSONArray wl = state.optJSONArray("wlog");
        JSONObject best = null;
        if (wl != null) for (int i = 0; i < wl.length(); i++) {
            JSONObject w = wl.optJSONObject(i);
            if (w == null) continue;
            if (best == null) { best = w; continue; }
            int c = w.optString("d", "").compareTo(best.optString("d", ""));
            if (c > 0 || (c == 0 && w.optLong("created", 0) >= best.optLong("created", 0))) best = w;
        }
        if (best == null) return null;
        JSONObject ex = findExercise(best.optString("exId"));
        if (ex == null) return null;
        double v = setsTotal(ex, best.optJSONArray("sets"));
        String num = v == Math.floor(v) ? String.valueOf((long) v) : String.valueOf(v);
        return ex.optString("name") + " \u00B7 " + num + exUnit(ex.optString("mtype"));
    }

    /** Top expense categories for today, "Food \u2212\u20B9450" style lines. */
    public List<String> topCategoriesToday(int n) {
        String t = today();
        java.util.HashMap<String, Double> sum = new java.util.HashMap<>();
        JSONArray tx = state.optJSONArray("tx");
        if (tx != null) for (int i = 0; i < tx.length(); i++) {
            JSONObject x = tx.optJSONObject(i);
            if (x == null || !"exp".equals(x.optString("kind")) || !t.equals(x.optString("d"))) continue;
            String c = x.optString("cat", "Other");
            Double cur = sum.get(c);
            sum.put(c, (cur == null ? 0 : cur) + x.optDouble("amt", 0));
        }
        java.util.ArrayList<java.util.Map.Entry<String, Double>> es = new java.util.ArrayList<>(sum.entrySet());
        es.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));
        List<String> out = new ArrayList<>();
        for (int i = 0; i < es.size() && i < n; i++)
            out.add(es.get(i).getKey() + " \u2212" + inr(es.get(i).getValue()));
        return out;
    }
}