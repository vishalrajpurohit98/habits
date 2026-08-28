package com.actionables.personaltracker.app;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Offline AI/action parser for widget voice commands (spec \u00A76\u2013\u00A78).
 *
 * Turns free text like "I completed my workout and spent 500 on dinner"
 * into structured actions against the app's own data. Understands multiple
 * actions in one command, asks for missing information instead of guessing,
 * and never invents values the user did not provide (spec \u00A721).
 */
public final class AiParser {
    private AiParser() {}

    /* ==================== model ==================== */

    public static final String T_EXPENSE = "expense";
    public static final String T_TASK_ADD = "task_add";
    public static final String T_TASK_DONE = "task_done";
    public static final String T_HABIT_DONE = "habit_done";
    public static final String T_MOOD = "mood";
    public static final String T_SLEEP = "sleep";
    public static final String T_PLAN = "workout_plan";
    public static final String T_SET = "workout_set";

    public static class Action {
        public String type;
        // expense
        public double amount; public String category = "", note = "", acctId = "", acctName = "";
        public boolean needsCategory;
        // task add
        public String title = "", dueDate = "", dueTime = "";
        // complete
        public String targetId = "", targetName = "";
        // mood
        public int moodIdx = -1; public String moodNote = "";
        // sleep
        public String bed = "", wake = "";
        // workout
        public String planName = ""; public List<String> exercises = new ArrayList<>();
        public String exName = ""; public double setValue; public int setCount = 1;
        public String mtype = "reps", unit = ""; public int reps;
        /** Can run without confirmation when it is the only action (spec \u00A78). */
        public boolean immediate;

        public String cardTitle(WidgetStore st) {
            switch (type) {
                case T_EXPENSE: return st.inr(amount) + " Expense";
                case T_TASK_ADD: return "\u2713 New Task";
                case T_TASK_DONE: return "\u2713 Complete Task";
                case T_HABIT_DONE: return "\uD83C\uDF31 Complete";
                case T_MOOD: return "Mood: " + (moodIdx >= 0 ? WidgetStore.MOOD_EMOJI[moodIdx] : "?");
                case T_SLEEP: return "\uD83D\uDCA4 Sleep " + WidgetStore.durFmt(WidgetStore.sleepMins(bed, wake));
                case T_PLAN: return "\uD83C\uDFCB New Workout";
                case T_SET: return "\uD83C\uDFCB " + exName;
                default: return "Action";
            }
        }

        public String cardBody(WidgetStore st) {
            switch (type) {
                case T_EXPENSE: {
                    StringBuilder b = new StringBuilder();
                    b.append(needsCategory ? "Category: ?" : category);
                    if (!note.isEmpty()) b.append("\n").append(note);
                    b.append("\n").append(acctName.isEmpty() ? "Default account" : acctName).append(" \u00B7 Today");
                    return b.toString();
                }
                case T_TASK_ADD: {
                    StringBuilder b = new StringBuilder(title);
                    if (!dueDate.isEmpty()) b.append("\nDue ").append(WidgetStore.niceDate(dueDate));
                    if (!dueTime.isEmpty()) b.append(" at ").append(WidgetStore.time12(dueTime));
                    return b.toString();
                }
                case T_TASK_DONE: return targetName + "\nStatus: Completed";
                case T_HABIT_DONE: return targetName + "\nStatus: Completed";
                case T_MOOD: return (moodIdx >= 0 ? WidgetStore.MOOD_LABEL[moodIdx] : "")
                        + (moodNote.isEmpty() ? "" : "\nNote: " + moodNote);
                case T_SLEEP: return WidgetStore.time12(bed) + " \u2192 " + WidgetStore.time12(wake);
                case T_PLAN: {
                    StringBuilder b = new StringBuilder(planName);
                    for (int i = 0; i < exercises.size(); i++) b.append("\n").append(i + 1).append(". ").append(exercises.get(i));
                    return b.toString();
                }
                case T_SET: {
                    String v = (setValue == Math.floor(setValue) ? String.valueOf((long) setValue) : String.valueOf(setValue));
                    String base = "weight".equals(mtype) ? v + " kg" : v + " " + ("reps".equals(mtype) ? "reps" : mtype);
                    if ("weight".equals(mtype) && reps > 0) base += " \u00D7 " + reps + " reps";
                    return base + (setCount > 1 ? " \u00B7 " + setCount + " sets" : "");
                }
                default: return "";
            }
        }
    }

    public static class Result {
        public List<Action> actions = new ArrayList<>();
        /** Read-only answer to render immediately (no save). */
        public String answer;
        /** Multiple candidate targets ("which one did you mean?"). */
        public List<String[]> choices; public Action pendingChoice;
        public String error;
    }

    /* ==================== entry point ==================== */

    public static Result parse(WidgetStore st, String rawInput, String scope) {
        Result r = new Result();
        String input = rawInput == null ? "" : rawInput.trim();
        if (input.isEmpty()) { r.error = "AI could not understand the command."; return r; }
        String low = input.toLowerCase(Locale.US);

        // 1) Read-only queries execute immediately (spec \u00A78).
        if (low.matches(".*\\b(what|which|show|list)\\b.*\\btasks?\\b.*") || low.matches("tasks?( for)?( today)?\\??")) {
            r.answer = readTasks(st);
            return r;
        }

        // 2) Whole-string intents that legitimately contain "and"/commas.
        Action whole = parseCreateWorkout(low, input);
        if (whole == null) whole = parseSleep(low);
        if (whole == null) whole = parseWorkoutSet(st, low, input);
        if (whole != null) { r.actions.add(whole); return r; }

        // 3) Split into clauses and parse each (spec \u00A77: multiple actions).
        for (String seg : splitClauses(low)) {
            Action a = parseClause(st, seg, scope, r);
            if (a != null) r.actions.add(a);
            if (r.choices != null) return r; // needs disambiguation first
        }

        if (r.actions.isEmpty() && r.answer == null)
            r.error = "AI could not understand the command.";
        if (r.actions.size() == 1) {
            Action a = r.actions.get(0);
            // Clear single completions can run immediately (spec \u00A78).
            a.immediate = (a.type.equals(T_TASK_DONE) || a.type.equals(T_HABIT_DONE));
        }
        return r;
    }

    /* ==================== clause handling ==================== */

    static final Pattern CLAUSE_START = Pattern.compile(
            "^(i |i'm|im |i am|spent|paid|bought|add|added|create|created|mark|complete|completed|finish|finished|did|done|log|logged|slept|sleep|feeling|feel|mood|new |make |set )");

    static List<String> splitClauses(String low) {
        String[] parts = low.split("\\s*(?:,|;|\\.|\\band then\\b|\\bthen\\b|\\band\\b)\\s*");
        List<String> out = new ArrayList<>();
        for (String p : parts) {
            p = p.trim();
            if (p.isEmpty()) continue;
            if (!out.isEmpty() && !CLAUSE_START.matcher(p).find()) {
                // not a new clause \u2014 glue back ("dinner and drinks")
                out.set(out.size() - 1, out.get(out.size() - 1) + " and " + p);
            } else out.add(p);
        }
        if (out.isEmpty()) out.add(low.trim());
        return out;
    }

    static Action parseClause(WidgetStore st, String seg, String scope, Result r) {
        Action a;
        if ((a = parseSleep(seg)) != null) return a;
        if ((a = parseMood(seg)) != null) return a;
        if ((a = parseTaskAdd(seg)) != null) return a;
        if ((a = parseComplete(st, seg, r)) != null) return a;
        if ((a = parseExpense(st, seg, scope)) != null) return a;
        if ((a = parseWorkoutSet(st, seg, seg)) != null) return a;
        // Scope fallback: a bare number in the money widget is an expense (spec \u00A78 "Add 500").
        if (("money".equals(scope) || "all".equals(scope)) && seg.matches(".*\\b\\d{1,7}(?:\\.\\d+)?\\b.*")
                && seg.matches(".*(add|spent|spend|paid|expense|\\d).*")) {
            Matcher m = Pattern.compile("(\\d{1,7}(?:\\.\\d+)?)").matcher(seg);
            if (m.find()) {
                Action e = new Action(); e.type = T_EXPENSE;
                e.amount = Double.parseDouble(m.group(1));
                e.needsCategory = true;
                return e;
            }
        }
        return null;
    }

    /* ==================== expense ==================== */

    static final String[][] CAT_WORDS = {
            {"Food", "dinner lunch breakfast snack snacks coffee tea food groceries grocery restaurant meal pizza burger biryani zomato swiggy cake juice"},
            {"Transport", "uber ola taxi cab auto rickshaw bus train metro fuel petrol diesel parking toll flight ticket travel"},
            {"Shopping", "clothes clothing shirt shoes dress amazon flipkart shopping electronics phone gadget bag"},
            {"Bills & Utilities", "electricity internet wifi mobile recharge gas water bill bills rent maintenance subscription"},
            {"Entertainment", "movie movies cinema netflix spotify game games gaming concert event party"},
            {"Health", "medicine medicines doctor pharmacy chemist hospital gym fitness clinic dentist"}
    };

    static Action parseExpense(WidgetStore st, String seg, String scope) {
        if (!seg.matches(".*\\b(spent|spend|paid|pay|bought|buy|expense|cost|add(?:ed)?)\\b.*")
                || !seg.matches(".*\\d.*")) return null;
        Matcher m = Pattern.compile("(?:\u20B9|rs\\.?|inr)?\\s*(\\d{1,7}(?:\\.\\d{1,2})?)").matcher(seg);
        if (!m.find()) return null;
        Action a = new Action(); a.type = T_EXPENSE;
        a.amount = Double.parseDouble(m.group(1));

        // account: "from hdfc" / "using cash" / "via upi" / "with icici"
        Matcher am = Pattern.compile("\\b(?:from|via|using|with|through)\\s+(?:my\\s+)?([a-z][a-z0-9 ]{1,30})$|\\b(?:from|via|using|with|through)\\s+(?:my\\s+)?([a-z][a-z0-9]{1,20})\\b").matcher(seg);
        String acctHint = "";
        if (am.find()) acctHint = (am.group(1) != null ? am.group(1) : am.group(2)).trim();
        if (!acctHint.isEmpty()) {
            for (JSONObject ac : st.activeAccounts()) {
                String nm = ac.optString("name", "").toLowerCase(Locale.US);
                if (nm.contains(acctHint) || acctHint.contains(nm.split(" ")[0])) {
                    a.acctId = ac.optString("id"); a.acctName = ac.optString("name"); break;
                }
            }
        }

        // description: "on X" / "for X"
        Matcher dm = Pattern.compile("\\b(?:on|for)\\s+(.+)$").matcher(seg);
        String desc = "";
        if (dm.find()) {
            desc = dm.group(1).trim();
            desc = desc.replaceAll("\\b(?:from|via|using|with|through)\\s+.*$", "").trim();
            desc = desc.replaceAll("\\b(?:today|yesterday|tonight)\\b", "").trim();
        }
        if (!desc.isEmpty()) a.note = cap(desc);

        // category inference from the user's own category list
        List<String> cats = st.expenseCategories();
        String hay = seg + " " + desc;
        for (String[] cw : CAT_WORDS) {
            for (String w : cw[1].split(" ")) {
                if (hay.matches(".*\\b" + Pattern.quote(w) + "\\b.*")) {
                    if (cats.contains(cw[0])) a.category = cw[0];
                    break;
                }
            }
            if (!a.category.isEmpty()) break;
        }
        if (a.category.isEmpty()) {
            for (String c : cats)
                if (hay.contains(c.toLowerCase(Locale.US))) { a.category = c; break; }
        }
        if (a.category.isEmpty()) a.needsCategory = true; // ask, don't guess (spec \u00A78)
        return a;
    }

    /* ==================== task add ==================== */

    static Action parseTaskAdd(String seg) {
        Matcher m = Pattern.compile("\\b(?:add|create|new)\\s+(?:a\\s+|new\\s+)?task\\s*(?:to|for|called|named|:)?\\s*(.+)$").matcher(seg);
        if (!m.find()) {
            m = Pattern.compile("\\bremind me to\\s+(.+)$").matcher(seg);
            if (!m.find()) return null;
        }
        Action a = new Action(); a.type = T_TASK_ADD;
        String rest = m.group(1).trim();

        Matcher tm = Pattern.compile("\\bat\\s+(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm|a\\.m\\.|p\\.m\\.)?\\b").matcher(rest);
        if (tm.find()) {
            int h = Integer.parseInt(tm.group(1));
            int mi = tm.group(2) == null ? 0 : Integer.parseInt(tm.group(2));
            String ap = tm.group(3);
            if (ap != null && ap.startsWith("p") && h < 12) h += 12;
            if (ap != null && ap.startsWith("a") && h == 12) h = 0;
            if (ap == null && h >= 1 && h <= 7) h += 12; // "at 5" usually means evening
            if (h >= 0 && h <= 23) a.dueTime = WidgetStore.pad(h) + ":" + WidgetStore.pad(mi);
            rest = rest.substring(0, tm.start()).trim() + " " + rest.substring(tm.end()).trim();
        }
        java.util.Calendar now = java.util.Calendar.getInstance();
        if (rest.matches(".*\\btomorrow\\b.*")) {
            a.dueDate = WidgetStore.fmt(WidgetStore.addDays(now, 1));
            rest = rest.replaceAll("\\btomorrow\\b", "").trim();
        } else if (rest.matches(".*\\b(today|tonight)\\b.*")) {
            a.dueDate = WidgetStore.today();
            rest = rest.replaceAll("\\b(today|tonight)\\b", "").trim();
        } else {
            String[] days = {"sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"};
            for (int i = 0; i < 7; i++) {
                if (rest.matches(".*\\b(?:on\\s+)?" + days[i] + "\\b.*")) {
                    java.util.Calendar d = (java.util.Calendar) now.clone();
                    int cur = d.get(java.util.Calendar.DAY_OF_WEEK) - 1;
                    int diff = (i - cur + 7) % 7; if (diff == 0) diff = 7;
                    d.add(java.util.Calendar.DAY_OF_MONTH, diff);
                    a.dueDate = WidgetStore.fmt(d);
                    rest = rest.replaceAll("\\b(?:on\\s+)?" + days[i] + "\\b", "").trim();
                    break;
                }
            }
        }
        rest = rest.replaceAll("\\s{2,}", " ").replaceAll("[,.]$", "").trim();
        if (rest.isEmpty()) return null;
        a.title = cap(rest);
        if (a.dueDate.isEmpty()) a.dueDate = WidgetStore.today(); // "add a task" from a widget defaults to today
        return a;
    }

    /* ==================== complete task / habit ==================== */

    static Action parseComplete(WidgetStore st, String seg, Result r) {
        Matcher m = Pattern.compile("\\bmark\\s+(.+?)\\s+(?:as\\s+)?(?:completed?|done|finished)\\b").matcher(seg);
        if (!m.find()) m = Pattern.compile("^(?:i\\s+(?:have\\s+|just\\s+)?)?(?:completed|finished|did|done(?:\\s+with)?)\\s+(?:my\\s+|the\\s+)?(.+)$").matcher(seg);
        if (!m.find()) m = Pattern.compile("^complete\\s+(?:my\\s+|the\\s+)?(.+)$").matcher(seg);
        if (!m.find()) return null;
        String q = m.group(1).trim().replaceAll("\\b(today|now)\\b", "").replaceAll("[,.]$", "").trim();
        if (q.isEmpty()) return null;
        return resolveComplete(st, q, r);
    }

    static Action resolveComplete(WidgetStore st, String q, Result r) {
        String ql = q.toLowerCase(Locale.US);
        List<String[]> hits = new ArrayList<>(); // {kind, id, name}

        // habits first for workout-ish words
        boolean workoutish = ql.matches(".*\\b(workout|gym|exercise|training)\\b.*");
        JSONArray hs = st.state.optJSONArray("habits");
        if (hs != null) for (int i = 0; i < hs.length(); i++) {
            JSONObject h = hs.optJSONObject(i);
            if (h == null || h.optBoolean("arch", false)) continue;
            String nm = h.optString("name", "").toLowerCase(Locale.US);
            if (nm.isEmpty()) continue;
            boolean match = nm.contains(ql) || ql.contains(nm)
                    || (workoutish && nm.matches(".*\\b(workout|gym|exercise|training)\\b.*"));
            if (match) hits.add(new String[]{"habit", h.optString("id"), h.optString("name")});
        }
        JSONArray ts = st.state.optJSONArray("tasks");
        if (ts != null) for (int i = 0; i < ts.length(); i++) {
            JSONObject t = ts.optJSONObject(i);
            if (t == null || "completed".equals(t.optString("status"))) continue;
            String ti = t.optString("title", "").toLowerCase(Locale.US);
            if (ti.contains(ql) || ql.contains(ti)) hits.add(new String[]{"task", t.optString("id"), t.optString("title")});
        }
        if (hits.isEmpty()) return null;
        // exact-name preference
        if (hits.size() > 1) {
            List<String[]> exact = new ArrayList<>();
            for (String[] h : hits) if (h[2].toLowerCase(Locale.US).equals(ql)) exact.add(h);
            if (exact.size() == 1) hits = exact;
        }
        Action a = new Action();
        if (hits.size() > 1) {
            a.type = "?"; a.targetName = q;
            r.choices = hits; r.pendingChoice = a;
            return null;
        }
        String[] h = hits.get(0);
        a.type = h[0].equals("habit") ? T_HABIT_DONE : T_TASK_DONE;
        a.targetId = h[1]; a.targetName = h[2];
        return a;
    }

    /* ==================== mood ==================== */

    static final String[][] MOOD_WORDS = {
            {"0", "excellent amazing awesome fantastic incredible euphoric"},
            {"1", "happy great good glad joyful delighted cheerful"},
            {"2", "calm relaxed peaceful fine okay ok content"},
            {"3", "neutral meh average alright"},
            {"4", "tired sleepy exhausted drained fatigued"},
            {"5", "sad down low unhappy depressed gloomy blue"},
            {"6", "stressed anxious angry frustrated upset worried mad tense overwhelmed"}
    };

    static Action parseMood(String seg) {
        Matcher m = Pattern.compile("\\b(?:i'?m|i am|feeling|feel|mood(?:\\s+is)?)\\s+(?:really\\s+|very\\s+|so\\s+|a bit\\s+|quite\\s+|pretty\\s+)?([a-z]+)").matcher(seg);
        if (!m.find()) return null;
        String w = m.group(1);
        int idx = -1;
        for (String[] mw : MOOD_WORDS)
            for (String x : mw[1].split(" "))
                if (x.equals(w)) { idx = Integer.parseInt(mw[0]); break; }
        if (idx < 0) return null;
        Action a = new Action(); a.type = T_MOOD; a.moodIdx = idx;
        Matcher nm = Pattern.compile("\\b(?:because of|because|since|due to|about)\\s+(.+)$").matcher(seg);
        if (nm.find()) {
            String reason = nm.group(1).replaceAll("^of\\s+", "").replaceAll("[,.]$", "").trim();
            if (!reason.isEmpty()) a.moodNote = cap(reason);
        }
        return a;
    }

    /* ==================== sleep ==================== */

    static Action parseSleep(String seg) {
        if (!seg.contains("slept") && !seg.contains("sleep")) return null;
        Matcher m = Pattern.compile("(?:slept|sleep)\\s+(?:from\\s+)?(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?)\\s*(?:to|till|until|-|\u2013)\\s*(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?)").matcher(seg);
        String t1 = null, t2 = null;
        if (m.find()) { t1 = m.group(1); t2 = m.group(2); }
        else {
            Matcher m2 = Pattern.compile("(?:slept|sleep|bed)\\s+(?:at\\s+)?(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?)(?:.*?(?:woke(?:\\s*up)?|got up|wake)\\s*(?:at\\s+)?(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?))").matcher(seg);
            if (m2.find()) { t1 = m2.group(1); t2 = m2.group(2); }
        }
        if (t1 == null || t2 == null) return null;
        Action a = new Action(); a.type = T_SLEEP;
        a.bed = parseTime(t1, true);
        a.wake = parseTime(t2, false);
        if (a.bed.isEmpty() || a.wake.isEmpty()) return null;
        return a;
    }

    /** "11:30", "6", "9 pm" \u2192 "HH:MM" 24h. bedBias: assume evening for 7\u201311 without meridiem. */
    static String parseTime(String s, boolean bedBias) {
        Matcher m = Pattern.compile("(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm)?").matcher(s.trim());
        if (!m.find()) return "";
        int h = Integer.parseInt(m.group(1));
        int mi = m.group(2) == null ? 0 : Integer.parseInt(m.group(2));
        String ap = m.group(3);
        if (h > 23 || mi > 59) return "";
        if (ap != null) {
            if (ap.equals("pm") && h < 12) h += 12;
            if (ap.equals("am") && h == 12) h = 0;
        } else if (h <= 12) {
            if (bedBias) { // bed time: 7\u201311 \u2192 PM, 12 \u2192 midnight
                if (h >= 7 && h <= 11) h += 12;
                else if (h == 12) h = 0;
            } else { // wake time: 12 \u2192 noon, else AM
                if (h == 12) h = 12;
            }
        }
        return WidgetStore.pad(h) + ":" + WidgetStore.pad(mi);
    }

    /* ==================== workout ==================== */

    static Action parseCreateWorkout(String low, String orig) {
        Matcher m = Pattern.compile("\\b(?:create|add|make|new)\\b.*?\\bworkout\\b\\s*(?:called|named)?\\s*([a-z0-9][a-z0-9 \\-']*?)(?:\\s+with\\s+(.+))?$").matcher(low);
        if (!m.find()) return null;
        Action a = new Action(); a.type = T_PLAN;
        String name = m.group(1) == null ? "" : m.group(1).trim();
        name = name.replaceAll("^(a|new)\\s+", "").trim();
        a.planName = name.isEmpty() ? "Workout" : titleCase(name);
        String exs = m.group(2);
        if (exs != null) {
            for (String e : exs.split("\\s*(?:,|\\band\\b)\\s*")) {
                e = e.trim().replaceAll("[.]$", "");
                if (!e.isEmpty()) a.exercises.add(titleCase(e));
            }
        }
        return a;
    }

    static Action parseWorkoutSet(WidgetStore st, String low, String orig) {
        // "bench press 65 kilos for 8 reps" / "bench press 65 kg x 8" / "squats 12 reps" / "3 sets of 10 pushups"
        Matcher m = Pattern.compile("^([a-z][a-z '\\-]{2,40}?)\\s+(\\d{1,4}(?:\\.\\d+)?)\\s*(kg|kilo|kilos|kilograms?|lb|lbs|pounds?)\\b(?:\\s*(?:for|x|\u00D7)?\\s*(\\d{1,3})\\s*reps?)?").matcher(low);
        if (m.find()) {
            Action a = new Action(); a.type = T_SET;
            a.exName = titleCase(m.group(1).trim());
            a.setValue = Double.parseDouble(m.group(2));
            a.mtype = "weight";
            a.unit = m.group(3).startsWith("k") ? "kg" : "lb";
            if (m.group(4) != null) a.reps = Integer.parseInt(m.group(4));
            fillFromExisting(st, a);
            return a;
        }
        m = Pattern.compile("^(?:did\\s+|logged?\\s+)?([a-z][a-z '\\-]{2,40}?)\\s+(\\d{1,3})\\s*reps?\\b").matcher(low);
        if (m.find()) {
            Action a = new Action(); a.type = T_SET;
            a.exName = titleCase(m.group(1).trim());
            a.setValue = Integer.parseInt(m.group(2));
            a.mtype = "reps";
            fillFromExisting(st, a);
            return a;
        }
        m = Pattern.compile("(\\d{1,2})\\s*sets?\\s*of\\s*(\\d{1,4})\\s*([a-z][a-z '\\-]{2,40})?").matcher(low);
        if (m.find()) {
            Action a = new Action(); a.type = T_SET;
            a.setCount = Integer.parseInt(m.group(1));
            a.setValue = Integer.parseInt(m.group(2));
            a.mtype = "reps";
            a.exName = m.group(3) == null ? "" : titleCase(m.group(3).trim());
            if (a.exName.isEmpty()) return null;
            fillFromExisting(st, a);
            return a;
        }
        return null;
    }

    static void fillFromExisting(WidgetStore st, Action a) {
        JSONObject ex = st.exerciseByName(a.exName);
        if (ex != null) {
            a.mtype = ex.optString("mtype", a.mtype);
            a.unit = ex.optString("unit", a.unit);
            a.exName = ex.optString("name", a.exName);
        }
    }

    /* ==================== read queries ==================== */

    static String readTasks(WidgetStore st) {
        List<JSONObject> ts = st.tasksForWidget();
        if (ts.isEmpty()) return "Nothing due today \uD83C\uDF89";
        StringBuilder b = new StringBuilder();
        int n = 0;
        for (JSONObject t : ts) {
            if (n++ >= 8) { b.append("\n+").append(ts.size() - 8).append(" more"); break; }
            boolean over = "overdue".equals(WidgetStore.taskStatus(t));
            if (b.length() > 0) b.append("\n");
            b.append(over ? "\uD83D\uDD34 " : "\u2610 ").append(t.optString("title"));
            String meta = WidgetStore.taskMeta(t);
            if (!meta.isEmpty()) b.append("  \u00B7  ").append(meta);
        }
        return b.toString();
    }

    /* ==================== execution ==================== */

    /** Apply one action to the store (no commit here \u2014 caller batches + commits once). */
    public static String execute(WidgetStore st, Action a) throws Exception {
        switch (a.type) {
            case T_EXPENSE: {
                String acct = a.acctId;
                if (acct.isEmpty()) {
                    List<JSONObject> as = st.activeAccounts();
                    if (!as.isEmpty()) acct = as.get(0).optString("id");
                }
                st.addExpense(a.amount, a.needsCategory ? "Other" : a.category, a.note, acct);
                return st.inr(a.amount) + " expense saved";
            }
            case T_TASK_ADD: {
                st.addTask(a.title, "", a.dueDate, a.dueTime, "medium", null, "none", null);
                return "Task added: " + a.title;
            }
            case T_TASK_DONE: {
                String msg = st.toggleTask(a.targetId);
                return msg == null ? a.targetName + " completed" : a.targetName + ": " + msg;
            }
            case T_HABIT_DONE: {
                JSONObject h = st.findHabit(a.targetId);
                String t = WidgetStore.today();
                if (h == null) return "Habit not found";
                if (WidgetStore.isDone(h, t)) return a.targetName + " was already completed \u2713";
                String err = st.toggleHabit(a.targetId, t);
                return err != null ? err : a.targetName + " completed \u2713";
            }
            case T_MOOD: {
                st.setMood(WidgetStore.today(), a.moodIdx, a.moodNote);
                return "Mood logged: " + WidgetStore.MOOD_LABEL[a.moodIdx];
            }
            case T_SLEEP: {
                st.addSleep(a.bed, a.wake, "");
                return "Sleep logged: " + WidgetStore.durFmt(WidgetStore.sleepMins(a.bed, a.wake));
            }
            case T_PLAN: {
                st.addPlan(a.planName, a.exercises);
                return "Workout created: " + a.planName;
            }
            case T_SET: {
                JSONObject ex = st.ensureExercise(a.exName, a.mtype, a.unit);
                List<Double> sets = new ArrayList<>();
                for (int i = 0; i < Math.max(1, a.setCount); i++) sets.add(a.setValue);
                st.addWorkoutLog(ex.optString("id"), sets);
                return a.exName + " logged";
            }
            default: return "Done";
        }
    }

    /* ==================== text utils ==================== */

    static String cap(String s) {
        if (s == null || s.isEmpty()) return "";
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    static String titleCase(String s) {
        StringBuilder b = new StringBuilder();
        for (String w : s.split(" ")) {
            if (w.isEmpty()) continue;
            if (b.length() > 0) b.append(' ');
            b.append(Character.toUpperCase(w.charAt(0))).append(w.substring(1));
        }
        return b.toString();
    }
}
