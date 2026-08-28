package com.actionables.personaltracker.app;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

/**
 * Widget-side twin of the app's "universal AI action engine".
 *
 * The web app mirrors its AI configuration (provider / model / key) into
 * native prefs via Bridge.setAiConfig, so this class can call the exact same
 * provider with the exact same prompt schema (uaiPrompt) over the exact same
 * data context (buildDataContext) and execute the same actions against the
 * shared state. Nothing here invents a second AI \u2014 it is the in-app AI,
 * reachable from the home screen.
 */
public final class NativeAi {
    private NativeAi() {}

    /* ==================== configuration ==================== */

    public static class Cfg { public String provider = "", model = "", key = ""; }

    public static Cfg cfg(Context ctx) {
        Cfg c = new Cfg();
        try {
            String raw = ctx.getSharedPreferences(WidgetStore.PREFS, Context.MODE_PRIVATE).getString("ai_cfg", "");
            if (raw != null && !raw.isEmpty()) {
                JSONObject o = new JSONObject(raw);
                c.provider = o.optString("provider", "gemini");
                c.model = o.optString("model", "");
                c.key = o.optString("key", "");
            }
        } catch (Exception ignored) {}
        return c;
    }

    public static boolean hasKey(Context ctx) { return !cfg(ctx).key.isEmpty(); }

    /* ==================== provider calls (mirrors gemCall / openAICall) ==================== */

    static String endpointFor(String provider) {
        switch (provider) {
            case "groq": return "https://api.groq.com/openai/v1/chat/completions";
            case "openrouter": return "https://openrouter.ai/api/v1/chat/completions";
            case "mistral": return "https://api.mistral.ai/v1/chat/completions";
            case "cerebras": return "https://api.cerebras.ai/v1/chat/completions";
            case "grok": return "https://api.x.ai/v1/chat/completions";
            default: return null; // gemini handled separately
        }
    }

    /** Blocking HTTP call \u2014 must run on a background thread. Returns the model's text. */
    public static String call(Cfg c, String prompt, int maxTokens) throws Exception {
        if (c.key.isEmpty()) throw new Exception("No API key");
        String url, body;
        boolean gemini = !"groq openrouter mistral cerebras grok".contains(c.provider);
        if (gemini) {
            String model = c.model.isEmpty() ? "gemini-2.5-flash" : c.model;
            url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";
            JSONObject part = new JSONObject().put("text", prompt);
            JSONObject content = new JSONObject().put("parts", new JSONArray().put(part));
            body = new JSONObject()
                    .put("contents", new JSONArray().put(content))
                    .put("generationConfig", new JSONObject().put("maxOutputTokens", maxTokens))
                    .toString();
        } else {
            url = endpointFor(c.provider);
            JSONObject msg = new JSONObject().put("role", "user").put("content", prompt);
            body = new JSONObject()
                    .put("model", c.model)
                    .put("messages", new JSONArray().put(msg))
                    .put("max_tokens", maxTokens)
                    .toString();
        }
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        try {
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(30000);
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");
            if (gemini) conn.setRequestProperty("x-goog-api-key", c.key);
            else conn.setRequestProperty("Authorization", "Bearer " + c.key);
            byte[] payload = body.getBytes(StandardCharsets.UTF_8);
            OutputStream os = conn.getOutputStream();
            os.write(payload); os.flush(); os.close();
            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) throw new Exception("API " + code);
            String raw = read(conn.getInputStream());
            JSONObject d = new JSONObject(raw);
            if (gemini) {
                return d.getJSONArray("candidates").getJSONObject(0)
                        .getJSONObject("content").getJSONArray("parts")
                        .getJSONObject(0).getString("text");
            }
            return d.getJSONArray("choices").getJSONObject(0)
                    .getJSONObject("message").getString("content");
        } finally {
            try { conn.disconnect(); } catch (Exception ignored) {}
        }
    }

    static String read(InputStream in) throws Exception {
        BufferedReader r = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
        StringBuilder b = new StringBuilder();
        String line;
        while ((line = r.readLine()) != null) b.append(line).append('\n');
        r.close();
        return b.toString();
    }

    /* ==================== data context (mirrors buildDataContext) ==================== */

    public static String context(WidgetStore st) {
        StringBuilder L = new StringBuilder();
        Calendar now = Calendar.getInstance();
        String ts = WidgetStore.today();
        String[] dow = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};
        L.append("TODAY: ").append(ts).append(" (").append(dow[now.get(Calendar.DAY_OF_WEEK) - 1]).append(")\n");

        JSONArray hs = st.state.optJSONArray("habits");
        int active = 0;
        if (hs != null) for (int i = 0; i < hs.length(); i++) {
            JSONObject h = hs.optJSONObject(i);
            if (h != null && !h.optBoolean("arch", false)) active++;
        }
        L.append("HABITS (").append(active).append("):\n");
        if (hs != null) for (int i = 0; i < hs.length(); i++) {
            JSONObject h = hs.optJSONObject(i);
            if (h == null || h.optBoolean("arch", false)) continue;
            int done7 = 0, due7 = 0;
            StringBuilder hist = new StringBuilder();
            for (int d = 0; d < 7; d++) {
                Calendar c = WidgetStore.addDays(now, -d);
                String ds = WidgetStore.fmt(c);
                if (st.dueOn(h, c)) {
                    due7++;
                    if (hist.length() > 0) hist.append(',');
                    if (WidgetStore.isDone(h, ds)) { done7++; hist.append(ds).append(":done"); }
                    else hist.append(ds).append(":miss");
                }
            }
            int rate = due7 > 0 ? Math.round(done7 * 100f / due7) : 0;
            L.append("- \"").append(h.optString("name")).append("\" id=").append(h.optString("id"))
                    .append(" streak=").append(st.streak(h))
                    .append(" done_today=").append(WidgetStore.isDone(h, ts))
                    .append(" 7d_rate=").append(rate).append("% last7=[").append(hist).append("]\n");
        }

        L.append("TASKS:\n");
        JSONArray tsk = st.state.optJSONArray("tasks");
        java.util.ArrayList<JSONObject> all = new java.util.ArrayList<>();
        if (tsk != null) for (int i = 0; i < tsk.length(); i++) {
            JSONObject t = tsk.optJSONObject(i);
            if (t != null) all.add(t);
        }
        all.sort((a, b) -> Long.compare(WidgetStore.taskDueMs(a), WidgetStore.taskDueMs(b)));
        int shown = 0;
        for (JSONObject t : all) {
            if (shown++ >= 30) break;
            int[] sp = st.taskSubProgress(t);
            L.append("- \"").append(t.optString("title").replace("\"", "")).append("\" id=").append(t.optString("id"))
                    .append(" status=").append(WidgetStore.taskStatus(t))
                    .append(" priority=").append(t.optString("priority", "medium"))
                    .append(" due=").append(t.optString("dueDate", "").isEmpty() ? "none" : t.optString("dueDate"))
                    .append(" ").append(t.optString("dueTime", ""))
                    .append(" subtasks=").append(sp[0]).append("/").append(sp[1])
                    .append(" comments=").append(t.optJSONArray("comments") == null ? 0 : t.optJSONArray("comments").length())
                    .append('\n');
        }

        L.append("MOOD (last 7):\n");
        for (int dm = 0; dm < 7; dm++) {
            String ds = WidgetStore.fmt(WidgetStore.addDays(now, -dm));
            int mi = st.moodOf(ds);
            if (mi >= 0) L.append("  ").append(ds).append(": ").append(WidgetStore.MOOD_LABEL[mi]).append(" (").append(mi).append(")\n");
        }

        L.append("SLEEP (last 7):\n");
        for (int d2 = 0; d2 < 7; d2++) {
            String ds = WidgetStore.fmt(WidgetStore.addDays(now, -d2));
            JSONObject sl = st.sleepOn(ds);
            if (sl != null && sl.optInt("mins", 0) > 0)
                L.append("  ").append(ds).append(": ").append(sl.optInt("mins") / 60).append('h').append(sl.optInt("mins") % 60)
                        .append("m bed=").append(sl.optString("bed")).append(" wake=").append(sl.optString("wake")).append('\n');
        }

        List<JSONObject> exs = st.activeExercises();
        if (!exs.isEmpty()) {
            L.append("EXERCISES (").append(exs.size()).append("):\n");
            JSONArray wl = st.state.optJSONArray("wlog");
            for (JSONObject ex : exs) {
                String unit = WidgetStore.exUnit(ex.optString("mtype", "reps"));
                java.util.ArrayList<JSONObject> logs = new java.util.ArrayList<>();
                if (wl != null) for (int i = 0; i < wl.length(); i++) {
                    JSONObject w = wl.optJSONObject(i);
                    if (w != null && ex.optString("id").equals(w.optString("exId"))) logs.add(w);
                }
                logs.sort((a, b) -> b.optString("d", "").compareTo(a.optString("d", "")));
                double pb = 0; String pbDate = ""; StringBuilder recent = new StringBuilder(); int sessions = 0;
                for (int i = 0; i < logs.size(); i++) {
                    double v = WidgetStore.setsTotal(ex, logs.get(i).optJSONArray("sets"));
                    if (v > 0) sessions++;
                    if (v > pb) { pb = v; pbDate = logs.get(i).optString("d"); }
                    if (i < 7 && v > 0) {
                        if (recent.length() > 0) recent.append(", ");
                        recent.append(logs.get(i).optString("d")).append(':').append(num(v)).append(unit);
                    }
                }
                L.append("- \"").append(ex.optString("name")).append("\" type=").append(ex.optString("mtype", "reps"))
                        .append(" unit=").append(unit).append(" personal_best=").append(num(pb)).append(unit)
                        .append(pbDate.isEmpty() ? "" : " (" + pbDate + ")").append(" sessions=").append(sessions).append('\n');
                if (recent.length() > 0) L.append("  recent: ").append(recent).append('\n');
            }
        }

        double[] mm = st.monthMoney();
        L.append("MONEY this month: income=").append(num(mm[0])).append(" expenses=").append(num(mm[1]))
                .append(" net=").append(num(mm[0] - mm[1])).append('\n');
        List<String> cats = st.expenseCategories();
        if (!cats.isEmpty()) L.append("CATEGORIES: ").append(join(cats)).append('\n');
        for (JSONObject a : st.activeAccounts())
            L.append("ACCOUNT: \"").append(a.optString("name")).append("\" id=").append(a.optString("id"))
                    .append(" bal=").append(num(st.acctBalance(a.optString("id")))).append('\n');
        return L.toString();
    }

    static String num(double d) { return d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d); }

    static String join(List<String> l) {
        StringBuilder b = new StringBuilder();
        for (String s : l) { if (b.length() > 0) b.append(", "); b.append(s); }
        return b.toString();
    }

    /* ==================== prompt (mirrors uaiPrompt) ==================== */

    public static String prompt(WidgetStore st, String text) {
        String yesterday = WidgetStore.fmt(WidgetStore.addDays(Calendar.getInstance(), -1));
        return "You are the universal AI assistant for Personal Tracker. You can READ/CREATE/UPDATE/DELETE across: Habits, Tasks, Expenses, Mood, Sleep, Settings.\n\n"
                + "APP DATA:\n" + context(st) + "\n\n"
                + "RESPOND WITH ONLY ONE JSON OBJECT (no markdown, no backticks, no extra text):\n"
                + "{\"action\":\"TYPE\",\"params\":{...},\"message\":\"short confirmation\"}\n\n"
                + "ACTIONS:\n"
                + "add_expense: {amt,cat,sub,note,kind(\"exp\"/\"inc\"),date(\"YYYY-MM-DD\"),acct}\n"
                + "delete_expense: {date,cat,amt} if ambiguous set confirm:true\n"
                + "add_habit: {name,goal(default 1)}\n"
                + "complete_habit: {name,date}\n"
                + "uncomplete_habit: {name,date}\n"
                + "delete_habit: {name} always confirm:true\n"
                + "set_mood: {mood(0=Excellent,1=Happy,2=Calm,3=Neutral,4=Tired,5=Sad,6=Stressed),date,note}\n"
                + "delete_mood: {date}\n"
                + "set_sleep: {date,bed(\"HH:MM\" 24h),wake(\"HH:MM\" 24h),mins(total)}\n"
                + "delete_sleep: {date}\n"
                + "add_task: {title,description,dueDate,dueTime,priority(high/medium/low),reminders([1,2]),recurrence({freq(none/daily/weekdays/weekly/monthly/custom),interval,endDate}),subtasks([titles])}\n"
                + "complete_task: {id,title}\n"
                + "reopen_task: {id,title}\n"
                + "update_task: {id,match,newTitle,description,dueDate,dueTime,priority,status,reminders,recurrence}\n"
                + "change_setting: {key,value} (theme:dark/light, curr:symbol)\n"
                + "query: {} message=answer the question from app data\n"
                + "clarify: {} message=ask for missing info\n\n"
                + "For update_task, use match for the existing task title and id when available; title is the new title only when renaming. Task due dates may be in the future.\n"
                + "RULES: yesterday=" + yesterday + " today=" + WidgetStore.today() + ". \"slept at 11\"=23:00. Map mood words: happy=1,calm=2,tired=4,sad=5,stressed=6,great=0,neutral=3. Match habits by name. Keep message under 2 lines.\n"
                + "For QUERIES: answer with specific numbers from the data. For workout questions, use exercise logs/personal bests. For \"best workout\" questions, reference the personal_best and recent sessions. For \"how to improve\" questions, analyze patterns (consistency, progression, frequency) and give actionable advice. For summaries, cover the requested timeframe with real data points.\n\n"
                + "User: " + text;
    }

    /* ==================== response parsing ==================== */

    /** Parsed model output: either a structured action or freeform text. */
    public static class Parsed {
        public JSONObject action; // {action, params, message, confirm}
        public String freeform;
    }

    public static Parsed parse(String raw) {
        Parsed p = new Parsed();
        String clean = raw == null ? "" : raw.replaceAll("```json|```", "").trim();
        try {
            int a = clean.indexOf('{'), b = clean.lastIndexOf('}');
            if (a >= 0 && b > a) {
                JSONObject o = new JSONObject(clean.substring(a, b + 1));
                if (o.has("action")) { p.action = o; return p; }
            }
        } catch (Exception ignored) {}
        p.freeform = clean.isEmpty() ? raw : clean;
        return p;
    }

    /* ==================== execution (mirrors executeAction) ==================== */

    public static final int R_OK = 0, R_ERR = 1, R_QUERY = 2, R_CLARIFY = 3, R_CONFIRM = 4;

    public static class Res {
        public int kind;
        public String msg = "", detail = "";
        /** When kind==R_CONFIRM: re-run execute with this and confirmed=true. */
        public JSONObject pending;
        /** True when the executed action does not need a widget-visible confirmation first. */
        public boolean instant;
        static Res ok(String m, String d) { Res r = new Res(); r.kind = R_OK; r.msg = m; r.detail = d == null ? "" : d; return r; }
        static Res err(String m) { Res r = new Res(); r.kind = R_ERR; r.msg = m; return r; }
        static Res confirm(String m, JSONObject pending) { Res r = new Res(); r.kind = R_CONFIRM; r.msg = m; r.pending = pending; return r; }
    }

    /** Applies one {action,params,message} object to the store. Caller commits. */
    public static Res execute(WidgetStore st, JSONObject r, boolean confirmed) {
        try {
            String a = r.optString("action", "");
            JSONObject p = r.optJSONObject("params");
            if (p == null) p = new JSONObject();
            String msg = r.optString("message", "Done");
            String d = p.optString("date", WidgetStore.today());
            boolean futureOk = a.equals("add_task") || a.equals("update_task");
            if (!d.matches("\\d{4}-\\d{2}-\\d{2}") || (d.compareTo(WidgetStore.today()) > 0 && !futureOk))
                return Res.err("Use a valid date today or earlier.");

            switch (a) {
                case "add_task": {
                    String title = p.optString("title", "").trim();
                    if (title.isEmpty()) return Res.err("Enter a task name.");
                    String td = p.optString("dueDate", "");
                    if (!td.isEmpty() && !td.matches("\\d{4}-\\d{2}-\\d{2}")) return Res.err("Use a valid task due date.");
                    java.util.ArrayList<Integer> rem = new java.util.ArrayList<>();
                    JSONArray ra = p.optJSONArray("reminders");
                    if (ra != null) for (int i = 0; i < ra.length(); i++) rem.add(ra.optInt(i));
                    java.util.ArrayList<String> subs = new java.util.ArrayList<>();
                    JSONArray sa = p.optJSONArray("subtasks");
                    if (sa != null) for (int i = 0; i < sa.length(); i++) {
                        Object o = sa.opt(i);
                        if (o instanceof JSONObject) subs.add(((JSONObject) o).optString("title"));
                        else if (o != null) subs.add(String.valueOf(o));
                    }
                    JSONObject rc = p.optJSONObject("recurrence");
                    String freq = rc == null ? "none" : rc.optString("freq", "none");
                    JSONObject t = st.addTask(title, p.optString("description", ""), td,
                            p.optString("dueTime", ""), p.optString("priority", "medium"), rem, freq, subs);
                    if (rc != null) {
                        JSONObject trc = t.optJSONObject("recurrence");
                        if (trc != null) {
                            if (rc.has("interval")) trc.put("interval", Math.max(1, rc.optInt("interval", 1)));
                            if (rc.has("endDate")) trc.put("endDate", rc.optString("endDate", ""));
                        }
                    }
                    Res res = Res.ok(msg, "Task created \u00B7 " + (td.isEmpty() ? "no due date" : td));
                    return res;
                }
                case "complete_task":
                case "reopen_task": {
                    JSONObject t = null;
                    String id = p.optString("id", "");
                    if (!id.isEmpty()) t = st.findTask(id);
                    if (t == null) t = st.taskByQuery(p.optString("title", ""));
                    if (t == null) return Res.err(p.optString("title", "").isEmpty()
                            ? "Task not found." : "I found no single matching task. Specify the task name more clearly.");
                    boolean wantDone = a.equals("complete_task");
                    boolean isDone = "completed".equals(t.optString("status"));
                    if (wantDone == isDone) return Res.ok(msg, t.optString("title") + " \u00B7 already " + (wantDone ? "completed" : "open"));
                    String m = st.toggleTask(t.optString("id"));
                    Res res = Res.ok(msg, t.optString("title") + (m != null && m.startsWith("Completed \u00B7") ? " \u00B7 " + m.substring(12) : ""));
                    res.instant = true;
                    return res;
                }
                case "update_task": {
                    JSONObject t = null;
                    String id = p.optString("id", "");
                    if (!id.isEmpty()) t = st.findTask(id);
                    if (t == null) t = st.taskByQuery(p.optString("match", p.optString("title", "")));
                    if (t == null) return Res.err("Task not found.");
                    boolean wasCompleted = "completed".equals(t.optString("status"));
                    if (p.has("newTitle")) {
                        String nt = p.optString("newTitle", "").trim();
                        if (!nt.isEmpty()) t.put("title", nt.length() > 100 ? nt.substring(0, 100) : nt);
                    }
                    if (p.has("description")) t.put("description", p.optString("description", ""));
                    if (p.has("dueDate")) t.put("dueDate", p.optString("dueDate", "").matches("\\d{4}-\\d{2}-\\d{2}") ? p.optString("dueDate") : "");
                    if (p.has("dueTime")) t.put("dueTime", p.optString("dueTime", ""));
                    String pr = p.optString("priority", "");
                    if (pr.matches("high|medium|low")) t.put("priority", pr);
                    String stt = p.optString("status", "");
                    if (stt.matches("open|inprogress|completed")) {
                        t.put("status", stt);
                        t.put("completedAt", stt.equals("completed") ? System.currentTimeMillis() : 0);
                    }
                    if (p.has("reminders") && p.optJSONArray("reminders") != null) t.put("reminders", p.optJSONArray("reminders"));
                    if (p.has("recurrence") && p.optJSONObject("recurrence") != null) t.put("recurrence", p.optJSONObject("recurrence"));
                    if (!wasCompleted && "completed".equals(t.optString("status"))) st.taskCreateNextOccurrence(t);
                    t.put("updatedAt", System.currentTimeMillis());
                    st.markDirty();
                    return Res.ok(msg, t.optString("title"));
                }
                case "add_expense": {
                    String kind = "inc".equals(p.optString("kind")) ? "inc" : "exp";
                    double amt = p.optDouble("amt", 0);
                    if (!(amt > 0)) return Res.err("Enter an amount greater than zero.");
                    JSONObject acct = st.acctResolve(p.optString("acct", ""));
                    List<JSONObject> accts = st.activeAccounts();
                    if (acct == null && accts.size() == 1) acct = accts.get(0);
                    if (acct == null) return Res.err("Choose a valid active account.");
                    String cat = p.optString("cat", "Other");
                    if (cat.length() > 40) cat = cat.substring(0, 40);
                    List<String> known = kind.equals("inc") ? st.incomeCategories() : st.expenseCategories();
                    if (!known.isEmpty() && !known.contains(cat)) cat = "Other";
                    JSONObject x = st.addExpense(amt, cat, p.optString("note", ""), acct.optString("id"));
                    x.put("kind", kind);
                    x.put("d", d);
                    x.put("sub", cut(p.optString("sub", ""), 40));
                    x.put("payee", cut(p.optString("payee", ""), 60));
                    return Res.ok(msg, (kind.equals("inc") ? "+" : "\u2212") + st.inr(amt) + " \u00B7 " + cat + " \u00B7 " + d);
                }
                case "delete_expense": {
                    JSONObject del = null;
                    String id = p.optString("id", "");
                    if (!id.isEmpty()) del = st.findTx(id);
                    if (del == null) {
                        JSONArray tx = st.state.optJSONArray("tx");
                        java.util.ArrayList<JSONObject> f = new java.util.ArrayList<>();
                        if (tx != null) for (int i = 0; i < tx.length(); i++) {
                            JSONObject x = tx.optJSONObject(i);
                            if (x == null || !"exp".equals(x.optString("kind"))) continue;
                            if (!d.equals(x.optString("d"))) continue;
                            if (p.has("cat") && !p.optString("cat").isEmpty() && !p.optString("cat").equals(x.optString("cat"))) continue;
                            if (p.has("amt") && Math.abs(x.optDouble("amt", 0) - p.optDouble("amt", 0)) >= 0.01) continue;
                            f.add(x);
                        }
                        if (f.isEmpty()) return Res.err("No matching expense for " + d);
                        if (f.size() > 1) return Res.err("I found multiple matching expenses. Specify the merchant or amount.");
                        del = f.get(0);
                    }
                    if (!confirmed && !r.optBoolean("confirm", false)) {
                        JSONObject pending = new JSONObject(r.toString());
                        pending.put("confirm", true);
                        pending.getJSONObject("params").put("id", del.optString("id"));
                        return Res.confirm("Delete " + st.inr(del.optDouble("amt", 0)) + " \u00B7 "
                                + (del.optString("payee", "").isEmpty() ? del.optString("cat", "expense") : del.optString("payee")) + "?", pending);
                    }
                    st.deleteTx(del.optString("id"));
                    return Res.ok(msg, "Removed " + st.inr(del.optDouble("amt", 0)) + " \u00B7 " + del.optString("cat"));
                }
                case "add_habit": {
                    String name = p.optString("name", "").trim();
                    if (name.isEmpty()) return Res.err("Enter a habit name.");
                    JSONObject h = st.addHabit(name, "\uD83C\uDF31", "daily", 3);
                    int goal = p.optInt("goal", 1);
                    if (goal > 1) { h.put("type", "count"); h.put("target", goal); }
                    return Res.ok(msg, "\"" + name + "\" created");
                }
                case "complete_habit":
                case "uncomplete_habit": {
                    JSONObject h = habitByName(st, p.optString("name", ""));
                    if (h == null) return Res.err("Habit \"" + p.optString("name") + "\" not found");
                    st.setHabitVal(h.optString("id"), d, a.equals("complete_habit") ? WidgetStore.targ(h) : 0);
                    Res res = Res.ok(msg, h.optString("name") + " \u00B7 " + d);
                    res.instant = true;
                    return res;
                }
                case "delete_habit": {
                    JSONObject h = habitByName(st, p.optString("name", ""));
                    if (h == null) return Res.err("Habit not found");
                    if (!confirmed && !r.optBoolean("confirm", false)) {
                        JSONObject pending = new JSONObject(r.toString());
                        pending.put("confirm", true);
                        return Res.confirm("Delete habit \u201C" + h.optString("name") + "\u201D? This removes its history.", pending);
                    }
                    st.deleteHabit(h.optString("id"));
                    return Res.ok(msg, "Deleted \u201C" + h.optString("name") + "\u201D");
                }
                case "set_mood": {
                    int mi = p.optInt("mood", 3);
                    if (mi < 0 || mi > 6) return Res.err("Mood must be between 0 and 6.");
                    st.setMood(d, mi, p.optString("note", ""));
                    return Res.ok(msg, WidgetStore.MOOD_EMOJI[mi] + " " + WidgetStore.MOOD_LABEL[mi] + " \u00B7 " + d);
                }
                case "delete_mood": st.setMood(d, -1, null); return Res.ok(msg, null);
                case "set_sleep": {
                    String bed = p.optString("bed", "23:00"), wake = p.optString("wake", "06:00");
                    if (!bed.matches("([01]\\d|2[0-3]):[0-5]\\d") || !wake.matches("([01]\\d|2[0-3]):[0-5]\\d"))
                        return Res.err("Use valid 24-hour bed and wake times.");
                    int mins = WidgetStore.sleepMins(bed, wake);
                    if (mins <= 0) return Res.err("Sleep duration must be greater than zero.");
                    st.setSleep(d, bed, wake, p.optString("note", ""));
                    return Res.ok(msg, "Bed " + bed + " \u00B7 Wake " + wake + " \u00B7 " + (mins / 60) + "h" + (mins % 60) + "m");
                }
                case "delete_sleep": st.deleteSleep(d); return Res.ok(msg, null);
                case "change_setting": {
                    String key = p.optString("key", ""), value = p.optString("value", "");
                    JSONObject set = st.state.optJSONObject("set");
                    if (set == null) { set = new JSONObject(); st.state.put("set", set); }
                    if (key.equals("theme")) {
                        if (!value.matches("dark|light|auto|amoled")) return Res.err("Unsupported theme.");
                        set.put("theme", value);
                    } else if (key.equals("curr")) {
                        if (value.isEmpty()) return Res.err("Currency cannot be empty.");
                        set.put("curr", value.length() > 4 ? value.substring(0, 4) : value);
                    } else return Res.err("Unsupported setting.");
                    st.markDirty();
                    return Res.ok(msg, null);
                }
                case "query": { Res res = new Res(); res.kind = R_QUERY; res.msg = msg; return res; }
                case "clarify": { Res res = new Res(); res.kind = R_CLARIFY; res.msg = msg; return res; }
                default: return Res.err("Unsupported AI action.");
            }
        } catch (Exception e) {
            return Res.err("Could not complete that action.");
        }
    }

    static JSONObject habitByName(WidgetStore st, String name) {
        String q = name == null ? "" : name.trim().toLowerCase(Locale.US);
        if (q.isEmpty()) return null;
        JSONArray hs = st.state.optJSONArray("habits");
        JSONObject contains = null;
        if (hs != null) for (int i = 0; i < hs.length(); i++) {
            JSONObject h = hs.optJSONObject(i);
            if (h == null || h.optBoolean("arch", false)) continue;
            String nm = h.optString("name", "").toLowerCase(Locale.US);
            if (nm.equals(q)) return h;
            if (contains == null && nm.contains(q)) contains = h;
        }
        return contains;
    }

    static String cut(String s, int n) { return s != null && s.length() > n ? s.substring(0, n) : (s == null ? "" : s); }

    /** Short preview body for the confirmation card, built from the action params. */
    public static String preview(WidgetStore st, JSONObject r) {
        try {
            String a = r.optString("action");
            JSONObject p = r.optJSONObject("params");
            if (p == null) p = new JSONObject();
            String d = p.optString("date", WidgetStore.today());
            switch (a) {
                case "add_expense":
                    return ("inc".equals(p.optString("kind")) ? "+" : "\u2212") + st.inr(p.optDouble("amt", 0))
                            + " \u00B7 " + p.optString("cat", "Other")
                            + (p.optString("note", "").isEmpty() ? "" : "\n" + p.optString("note"))
                            + "\n" + d;
                case "add_task":
                    return p.optString("title") + (p.optString("dueDate", "").isEmpty() ? "" : "\nDue " + p.optString("dueDate")
                            + (p.optString("dueTime", "").isEmpty() ? "" : " " + p.optString("dueTime")));
                case "add_habit": return p.optString("name");
                case "set_mood": {
                    int mi = Math.max(0, Math.min(6, p.optInt("mood", 3)));
                    return WidgetStore.MOOD_EMOJI[mi] + " " + WidgetStore.MOOD_LABEL[mi]
                            + (p.optString("note", "").isEmpty() ? "" : "\n" + p.optString("note"));
                }
                case "set_sleep": return p.optString("bed") + " \u2192 " + p.optString("wake") + " \u00B7 " + d;
                case "update_task": return p.optString("match", p.optString("title", "")) + " \u2192 updated";
                case "change_setting": return p.optString("key") + " \u2192 " + p.optString("value");
                default: return "";
            }
        } catch (Exception e) { return ""; }
    }
}
