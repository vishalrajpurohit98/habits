package com.actionables.personaltracker.app;

import android.Manifest;
import android.app.Activity;
import android.app.DatePickerDialog;
import android.app.TimePickerDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.speech.RecognizerIntent;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.InputMethodManager;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

/**
 * The native popup used by every widget action (spec \u00A72): a translucent
 * dialog-style activity that renders forms, pickers and the AI voice flow \u2014
 * WITHOUT ever launching MainActivity. All UI is built programmatically so
 * the RemoteViews layout namespace stays reserved for the widgets.
 */
public class WidgetDialogActivity extends Activity {

    public static final String EXTRA_ACTION = "wd_action";

    public static final String A_QUICK_PICK = "QUICK_PICK";
    public static final String A_ADD_TASK = "ADD_TASK";
    public static final String A_TASK_DETAIL = "TASK_DETAIL";
    public static final String A_ADD_EXPENSE = "ADD_EXPENSE";
    public static final String A_PICK_ACCOUNT = "PICK_ACCOUNT";
    public static final String A_ADD_HABIT = "ADD_HABIT";
    public static final String A_LOG_SLEEP = "LOG_SLEEP";
    public static final String A_MOOD_DETAIL = "MOOD_DETAIL";
    public static final String A_NEW_WORKOUT = "NEW_WORKOUT";
    public static final String A_START_WORKOUT = "START_WORKOUT";
    public static final String A_AI = "AI_COMMAND";

    static final int REQ_WIDGET_SPEECH = 7101;
    static final int REQ_WIDGET_MIC_PERM = 7102;

    static final int INK = 0xFFFFFFFF, DIM = 0xFF9AA0AC, ACC = 0xFFFFAE1F, ACC_INK = 0xFF221A05;
    static final int RED = 0xFFFF6B5E, GREEN = 0xFF7ED957, CARD = 0xFF12100A, INNER = 0xFF1E1910, LINE = 0x24FFFFFF;

    WidgetStore st;
    String action, aiScope = "all";
    int widgetId;
    LinearLayout root;
    ScrollView scroller;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        setFinishOnTouchOutside(true);
        st = WidgetStore.load(this);
        action = getIntent().getStringExtra(EXTRA_ACTION);
        widgetId = getIntent().getIntExtra("widgetId", 0);
        if (action == null) { finish(); return; }

        scroller = new ScrollView(this);
        scroller.setVerticalScrollBarEnabled(false);
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackground(rounded(CARD, 24, LINE));
        int p = dp(20);
        root.setPadding(p, p, p, p);
        scroller.addView(root, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        setContentView(scroller);

        try { dispatch(); } catch (Exception e) { toast("Something went wrong"); finish(); }
    }

    void dispatch() {
        switch (action) {
            case A_QUICK_PICK: uiQuickPick(); break;
            case A_ADD_TASK: uiTask(null); break;
            case A_TASK_DETAIL: uiTask(st.findTask(s("taskId"))); break;
            case A_ADD_EXPENSE: uiExpense(s("acctId"), 0, "", ""); break;
            case A_PICK_ACCOUNT: uiPickAccount(); break;
            case A_ADD_HABIT: uiHabit(); break;
            case A_LOG_SLEEP: uiSleep("", ""); break;
            case A_MOOD_DETAIL: uiMood(); break;
            case A_NEW_WORKOUT: uiNewWorkout(null); break;
            case A_START_WORKOUT: uiStartWorkout(); break;
            case A_AI:
                aiScope = s("scope") == null ? "all" : s("scope");
                uiAiHome();
                if ("1".equals(s("voice"))) startSpeech();
                break;
            default: finish();
        }
    }

    String s(String k) { return getIntent().getStringExtra(k); }

    /* =============================================================
       QUICK LOG: activity chooser (spec \u00A75 dropdown)
       ============================================================= */

    void uiQuickPick() {
        title("\u26A1 Quick Log", "What do you want to log?");
        String[][] opts = {
                {"sleep", "\uD83D\uDCA4", "Sleep"}, {"habit", "\uD83C\uDF31", "Habit"},
                {"task", "\u2713", "Task"}, {"mood", "\uD83D\uDE42", "Mood"},
                {"workout", "\uD83C\uDFCB", "Workout"}, {"exp", st.currency(), "Expense"},
                {"ai", "\uD83C\uDF99", "Ask AI"}};
        for (String[] o : opts) {
            TextView r = listRow(o[1] + "   " + o[2]);
            r.setOnClickListener(v -> {
                WidgetHub.setPref(this, "ql_" + widgetId, o[0]);
                WidgetHub.refreshAll(this);
                finish();
            });
            root.addView(r, rowLp());
        }
        root.addView(btnRow(mkBtn("Cancel", false, v -> finish()), null));
    }

    /* =============================================================
       TASKS: add + detail popup (spec \u00A79\u2013\u00A710)
       ============================================================= */

    String tDate = "", tTime = "", tPri = "medium", tRecur = "none";
    List<Integer> tRem = new ArrayList<>();
    LinearLayout subBox;
    List<EditText> newSubs = new ArrayList<>();
    List<CheckBox> existingSubs = new ArrayList<>();

    void uiTask(JSONObject task) {
        boolean edit = task != null;
        title(edit ? "\u2713 Task" : "\u2713 New Task", edit ? WidgetStore.taskStatus(task).toUpperCase() : "Add without opening the app");

        EditText name = field("Task name", edit ? task.optString("title") : "");
        EditText desc = field("Description (optional)", edit ? task.optString("description") : "");
        desc.setSingleLine(false); desc.setMaxLines(3);

        if (edit) {
            tDate = task.optString("dueDate", ""); tTime = task.optString("dueTime", "");
            tPri = task.optString("priority", "medium");
            JSONObject rc = task.optJSONObject("recurrence");
            tRecur = rc == null ? "none" : rc.optString("freq", "none");
            JSONArray rem = task.optJSONArray("reminders");
            if (rem != null) for (int i = 0; i < rem.length(); i++) tRem.add(rem.optInt(i));
        }

        label("Due");
        LinearLayout due = hRow();
        TextView dBtn = pill(tDate.isEmpty() ? "\uD83D\uDCC5 Date" : WidgetStore.niceDate(tDate), false);
        TextView tBtn = pill(tTime.isEmpty() ? "\uD83D\uDD52 Time" : WidgetStore.time12(tTime), false);
        TextView clr = pill("\u2715", false);
        dBtn.setOnClickListener(v -> {
            Calendar c = tDate.isEmpty() ? Calendar.getInstance() : WidgetStore.toDate(tDate);
            new DatePickerDialog(this, (dp, y, m, d2) -> {
                Calendar x = Calendar.getInstance(); x.set(y, m, d2);
                tDate = WidgetStore.fmt(x); dBtn.setText(WidgetStore.niceDate(tDate));
            }, c.get(Calendar.YEAR), c.get(Calendar.MONTH), c.get(Calendar.DAY_OF_MONTH)).show();
        });
        tBtn.setOnClickListener(v -> new TimePickerDialog(this, (tp, h, m) -> {
            tTime = WidgetStore.pad(h) + ":" + WidgetStore.pad(m); tBtn.setText(WidgetStore.time12(tTime));
        }, 9, 0, false).show());
        clr.setOnClickListener(v -> { tDate = ""; tTime = ""; dBtn.setText("\uD83D\uDCC5 Date"); tBtn.setText("\uD83D\uDD52 Time"); });
        due.addView(dBtn, chipLp()); due.addView(tBtn, chipLp()); due.addView(clr, chipLp());
        root.addView(due);

        label("Priority");
        root.addView(chipSelect(new String[]{"high", "medium", "low"},
                new String[]{"\uD83D\uDD34 High", "Medium", "Low"}, tPri, v -> tPri = v, true));

        label("Reminder");
        String remSel = tRem.contains(1) && tRem.contains(2) ? "both" : tRem.contains(1) ? "1" : tRem.contains(2) ? "2" : "none";
        root.addView(chipSelect(new String[]{"none", "1", "2", "both"},
                new String[]{"None", "1 day before", "2 days", "1 & 2 days"}, remSel, v -> {
                    tRem.clear();
                    if (v.equals("1") || v.equals("both")) tRem.add(1);
                    if (v.equals("2") || v.equals("both")) tRem.add(2);
                }, false));

        label("Repeats");
        root.addView(chipSelect(new String[]{"none", "daily", "weekdays", "weekly", "monthly", "custom"},
                new String[]{"Doesn't repeat", "Daily", "Weekdays", "Weekly", "Monthly", "Custom"},
                tRecur, v -> tRecur = v, false));

        label("Subtasks");
        subBox = new LinearLayout(this); subBox.setOrientation(LinearLayout.VERTICAL);
        root.addView(subBox);
        int doneN = 0, totN = 0;
        if (edit) {
            JSONArray subs = task.optJSONArray("subtasks");
            if (subs != null) for (int i = 0; i < subs.length(); i++) {
                JSONObject sx = subs.optJSONObject(i);
                if (sx == null) continue;
                totN++;
                CheckBox cb = new CheckBox(this);
                cb.setText(sx.optString("title"));
                cb.setTextColor(INK); cb.setTextSize(14);
                cb.setChecked(sx.optBoolean("done"));
                if (cb.isChecked()) doneN++;
                cb.setTag(sx.optString("id"));
                existingSubs.add(cb);
                subBox.addView(cb);
            }
        }
        TextView prog = null;
        if (totN > 0) {
            prog = text(doneN + " / " + totN, 12, DIM, false);
            root.addView(prog);
            final TextView fp = prog;
            for (CheckBox cb : existingSubs)
                cb.setOnCheckedChangeListener((v, c) -> {
                    int d = 0; for (CheckBox x : existingSubs) if (x.isChecked()) d++;
                    fp.setText(d + " / " + existingSubs.size());
                });
        }
        TextView addSub = pill("+ Add subtask", false);
        addSub.setOnClickListener(v -> {
            EditText e = input("Subtask", "");
            newSubs.add(e);
            subBox.addView(e, rowLp());
            e.requestFocus();
        });
        root.addView(addSub, rowLp());

        TextView save = mkBtn(edit ? "Save" : "Add Task", true, v -> {
            String nm = name.getText().toString().trim();
            if (nm.isEmpty()) { name.setError("Task name required"); return; }
            try {
                if (edit) {
                    task.put("title", nm.length() > 100 ? nm.substring(0, 100) : nm);
                    task.put("description", desc.getText().toString().trim());
                    task.put("dueDate", tDate); task.put("dueTime", tTime);
                    task.put("priority", tPri);
                    JSONArray rem = new JSONArray(); for (int x : tRem) rem.put(x);
                    task.put("reminders", rem);
                    JSONObject rc = task.optJSONObject("recurrence");
                    if (rc == null) { rc = new JSONObject(); rc.put("interval", 1); rc.put("endDate", ""); task.put("recurrence", rc); }
                    rc.put("freq", tRecur);
                    JSONArray subs = task.optJSONArray("subtasks");
                    if (subs == null) { subs = new JSONArray(); task.put("subtasks", subs); }
                    for (CheckBox cb : existingSubs)
                        for (int i = 0; i < subs.length(); i++) {
                            JSONObject sx = subs.optJSONObject(i);
                            if (sx != null && String.valueOf(cb.getTag()).equals(sx.optString("id")))
                                sx.put("done", cb.isChecked());
                        }
                    for (EditText e : newSubs) {
                        String sv = e.getText().toString().trim();
                        if (sv.isEmpty()) continue;
                        JSONObject sx = new JSONObject();
                        sx.put("id", "s" + WidgetStore.rand(6));
                        sx.put("title", sv.length() > 120 ? sv.substring(0, 120) : sv);
                        sx.put("done", false);
                        subs.put(sx);
                    }
                    task.put("updatedAt", System.currentTimeMillis());
                    st.markDirty();
                } else {
                    List<String> subs = new ArrayList<>();
                    for (EditText e : newSubs) subs.add(e.getText().toString());
                    st.addTask(nm, desc.getText().toString().trim(), tDate, tTime, tPri, tRem, tRecur, subs);
                }
                if (st.commit()) { toast(edit ? "Task saved" : "Task added"); finish(); }
                else toast("Unable to save task");
            } catch (Exception e) { toast("Unable to save task"); }
        });
        TextView complete = null;
        if (edit) {
            boolean isDone = "completed".equals(task.optString("status"));
            complete = mkBtn(isDone ? "Reopen" : "Complete \u2713", false, v -> {
                String msg = st.toggleTask(task.optString("id"));
                if (st.commit()) { if (msg != null) toast(msg); finish(); }
                else toast("Unable to update task");
            });
        }
        root.addView(btnRow(mkBtn("Cancel", false, v -> finish()), complete == null ? save : complete));
        if (complete != null) root.addView(btnRow(save, null));
    }

    /* =============================================================
       EXPENSE popup (spec \u00A75/\u00A715/\u00A716)
       ============================================================= */

    void uiExpense(String preAcct, double preAmt, String preCat, String preNote) {
        title(st.currency() + " Add Expense", "Today: " + st.inr(st.todayExpenseTotal()));
        EditText amt = field("Amount", preAmt > 0 ? trimNum(preAmt) : "");
        amt.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        EditText note = field("Description (optional)", preNote);

        label("Category");
        List<String> cats = st.expenseCategories();
        final String[] cat = {preCat.isEmpty() ? (cats.isEmpty() ? "Other" : cats.get(0)) : preCat};
        root.addView(chipSelect(cats.toArray(new String[0]), cats.toArray(new String[0]), cat[0], v -> cat[0] = v, false));

        label("Account");
        List<JSONObject> accts = st.activeAccounts();
        final String[] acct = {preAcct == null ? "" : preAcct};
        if (accts.isEmpty()) {
            root.addView(text("No accounts set up yet \u2014 the expense will still be recorded.", 12, DIM, false));
        } else {
            if (acct[0].isEmpty()) acct[0] = accts.get(0).optString("id");
            String[] ids = new String[accts.size()], names = new String[accts.size()];
            for (int i = 0; i < accts.size(); i++) { ids[i] = accts.get(i).optString("id"); names[i] = accts.get(i).optString("name"); }
            root.addView(chipSelect(ids, names, acct[0], v -> acct[0] = v, false));
        }

        root.addView(btnRow(mkBtn("Cancel", false, v -> finish()),
                mkBtn("Save", true, v -> {
                    double a;
                    try { a = Double.parseDouble(amt.getText().toString().trim()); } catch (Exception e) { a = 0; }
                    if (a <= 0) { amt.setError("Enter an amount"); return; }
                    try {
                        st.addExpense(a, cat[0], note.getText().toString().trim(), acct[0]);
                        if (st.commit()) { toast(st.inr(a) + " saved"); finish(); }
                        else toast("Unable to save expense");
                    } catch (Exception e) { toast("Unable to save expense"); }
                })));
    }

    void uiPickAccount() {
        title(st.currency() + " Account", "Pick the account this widget shows");
        List<JSONObject> accts = st.activeAccounts();
        if (accts.isEmpty()) {
            root.addView(text("No accounts configured yet.\nAdd accounts in the app\u2019s Money section \u2014 the widget never invents account data.", 13, DIM, false));
            root.addView(btnRow(mkBtn("Close", false, v -> finish()), null));
            return;
        }
        for (JSONObject a : accts) {
            TextView r = listRow(a.optString("name") + "   \u00B7   " + st.inr(st.acctBalance(a.optString("id"))));
            r.setOnClickListener(v -> {
                WidgetHub.setPref(this, "acct_" + widgetId, a.optString("id"));
                WidgetHub.refreshAll(this);
                finish();
            });
            root.addView(r, rowLp());
        }
        root.addView(btnRow(mkBtn("Cancel", false, v -> finish()), null));
    }

    /* =============================================================
       HABIT popup \u2014 only creates habits (spec \u00A714)
       ============================================================= */

    void uiHabit() {
        title("\uD83C\uDF31 New Habit", "Habit widget adds habits only");
        EditText name = field("Habit name", "");
        label("Schedule");
        final String[] kind = {"daily"};
        root.addView(chipSelect(new String[]{"daily", "dow", "wquota"},
                new String[]{"Daily", "Weekdays", "X / week"}, "daily", v -> kind[0] = v, false));
        label("Times per week (for X / week)");
        EditText quota = field(null, "3");
        quota.setInputType(InputType.TYPE_CLASS_NUMBER);
        root.addView(btnRow(mkBtn("Cancel", false, v -> finish()),
                mkBtn("Create Habit", true, v -> {
                    String nm = name.getText().toString().trim();
                    if (nm.isEmpty()) { name.setError("Name required"); return; }
                    int q; try { q = Integer.parseInt(quota.getText().toString().trim()); } catch (Exception e) { q = 3; }
                    try {
                        st.addHabit(nm, "\uD83C\uDF31", kind[0], q);
                        if (st.commit()) { toast("Habit created"); finish(); }
                        else toast("Unable to save habit");
                    } catch (Exception e) { toast("Unable to save habit"); }
                })));
    }

    /* =============================================================
       SLEEP popup with automatic duration (spec \u00A723)
       ============================================================= */

    void uiSleep(String preBed, String preWake) {
        title("\uD83D\uDCA4 Log Sleep", "Duration is calculated automatically");
        final String[] bed = {preBed == null ? "" : preBed}, wake = {preWake == null ? "" : preWake};
        TextView bBtn = pill(bed[0].isEmpty() ? "\uD83D\uDD52 Pick sleep time" : WidgetStore.time12(bed[0]), false);
        TextView wBtn = pill(wake[0].isEmpty() ? "\uD83D\uDD52 Pick wake time" : WidgetStore.time12(wake[0]), false);
        TextView dur = text("\u2014", 26, ACC, true);
        Runnable upd = () -> dur.setText(!bed[0].isEmpty() && !wake[0].isEmpty()
                ? WidgetStore.durFmt(WidgetStore.sleepMins(bed[0], wake[0])) : "\u2014");
        bBtn.setOnClickListener(v -> new TimePickerDialog(this, (tp, h, m) -> {
            bed[0] = WidgetStore.pad(h) + ":" + WidgetStore.pad(m);
            bBtn.setText(WidgetStore.time12(bed[0])); upd.run();
        }, 23, 30, false).show());
        wBtn.setOnClickListener(v -> new TimePickerDialog(this, (tp, h, m) -> {
            wake[0] = WidgetStore.pad(h) + ":" + WidgetStore.pad(m);
            wBtn.setText(WidgetStore.time12(wake[0])); upd.run();
        }, 6, 45, false).show());
        label("Sleep time"); root.addView(bBtn, rowLp());
        label("Wake time"); root.addView(wBtn, rowLp());
        label("Duration"); root.addView(dur);
        upd.run();
        root.addView(btnRow(mkBtn("Cancel", false, v -> finish()),
                mkBtn("Save", true, v -> {
                    if (bed[0].isEmpty() || wake[0].isEmpty()) { toast("Pick both times"); return; }
                    try {
                        st.addSleep(bed[0], wake[0], "");
                        if (st.commit()) { toast("Sleep logged: " + WidgetStore.durFmt(WidgetStore.sleepMins(bed[0], wake[0]))); finish(); }
                        else toast("Unable to save sleep");
                    } catch (Exception e) { toast("Unable to save sleep"); }
                })));
    }

    /* =============================================================
       MOOD detail popup (spec \u00A720\u2013\u00A721)
       ============================================================= */

    void uiMood() {
        String t = WidgetStore.today();
        int cur = st.moodOf(t);
        title("\uD83D\uDE42 Mood", cur >= 0 ? "Logged: " + WidgetStore.MOOD_LABEL[cur] : "How are you?");
        final int[] sel = {cur};
        LinearLayout row = hRow();
        List<TextView> chips = new ArrayList<>();
        for (int i = 0; i < WidgetStore.MOOD_EMOJI.length; i++) {
            final int idx = i;
            TextView c = new TextView(this);
            c.setText(WidgetStore.MOOD_EMOJI[i]);
            c.setTextSize(24); c.setGravity(Gravity.CENTER);
            c.setPadding(dp(8), dp(8), dp(8), dp(8));
            c.setBackground(rounded(i == cur ? INNER : 0, 14, i == cur ? ACC : 0));
            c.setOnClickListener(v -> {
                sel[0] = idx;
                for (int k = 0; k < chips.size(); k++)
                    chips.get(k).setBackground(rounded(k == idx ? INNER : 0, 14, k == idx ? ACC : 0));
            });
            chips.add(c);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
            row.addView(c, lp);
        }
        root.addView(row);
        EditText note = field("Note (optional)", st.moodNote(t));
        root.addView(btnRow(mkBtn("Cancel", false, v -> finish()),
                mkBtn("Save", true, v -> {
                    if (sel[0] < 0) { toast("Pick a mood"); return; }
                    st.setMood(t, sel[0], note.getText().toString().trim());
                    if (st.commit()) { toast("Mood logged: " + WidgetStore.MOOD_LABEL[sel[0]]); finish(); }
                    else toast("Unable to save mood");
                })));
    }

    /* =============================================================
       WORKOUT: new plan + start/log (spec \u00A717\u2013\u00A719)
       ============================================================= */

    List<EditText> exInputs = new ArrayList<>();

    void uiNewWorkout(AiParser.Action prefill) {
        title("\uD83C\uDFCB New Workout", "Creates a real workout, not a placeholder");
        EditText name = field("Workout name", prefill != null ? prefill.planName : "");
        label("Exercises");
        LinearLayout box = new LinearLayout(this); box.setOrientation(LinearLayout.VERTICAL);
        root.addView(box);
        exInputs.clear();
        Runnable add = () -> {
            EditText e = input("Exercise " + (exInputs.size() + 1), "");
            exInputs.add(e); box.addView(e, rowLp());
        };
        if (prefill != null && !prefill.exercises.isEmpty())
            for (String ex : prefill.exercises) { add.run(); exInputs.get(exInputs.size() - 1).setText(ex); }
        else { add.run(); add.run(); }
        TextView more = pill("+ Add Exercise", false);
        more.setOnClickListener(v -> { add.run(); exInputs.get(exInputs.size() - 1).requestFocus(); });
        root.addView(more, rowLp());
        root.addView(btnRow(mkBtn("Cancel", false, v -> finish()),
                mkBtn("Create Workout", true, v -> {
                    String nm = name.getText().toString().trim();
                    if (nm.isEmpty()) { name.setError("Name required"); return; }
                    List<String> exs = new ArrayList<>();
                    for (EditText e : exInputs) {
                        String x = e.getText().toString().trim();
                        if (!x.isEmpty()) exs.add(x);
                    }
                    try {
                        st.addPlan(nm, exs);
                        if (st.commit()) { toast("Workout created: " + nm); finish(); }
                        else toast("Unable to create workout");
                    } catch (Exception e) { toast("Unable to create workout"); }
                })));
    }

    void uiStartWorkout() {
        JSONObject plan = null;
        String pid = s("planId");
        if (pid != null) {
            JSONArray ps = st.plans();
            for (int i = 0; i < ps.length(); i++) {
                JSONObject p = ps.optJSONObject(i);
                if (p != null && pid.equals(p.optString("id"))) { plan = p; break; }
            }
        }
        if (plan == null) plan = st.latestPlan();
        if (plan == null) { uiNewWorkout(null); return; }

        title("\uD83C\uDFCB " + plan.optString("name", "Workout"), "Enter values \u00B7 + adds a set");
        JSONArray ids = plan.optJSONArray("exIds");
        final List<Object[]> rows = new ArrayList<>(); // {exId, List<EditText>}
        if (ids != null) for (int i = 0; i < ids.length(); i++) {
            JSONObject ex = st.findExercise(ids.optString(i));
            if (ex == null) continue;
            String unit = ex.optString("unit", "");
            String mt = ex.optString("mtype", "reps");
            label(ex.optString("name") + "  \u00B7  " + (unit.isEmpty() ? mt : unit));
            LinearLayout setsRow = hRow();
            List<EditText> sets = new ArrayList<>();
            java.util.function.Consumer<Void> addSet = x -> {
                EditText e = new EditText(this);
                styleInput(e); e.setHint("0");
                e.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(64), ViewGroup.LayoutParams.WRAP_CONTENT);
                lp.rightMargin = dp(6);
                sets.add(e); setsRow.addView(e, lp);
            };
            addSet.accept(null);
            TextView plus = pill("+", false);
            plus.setOnClickListener(v -> addSet.accept(null));
            setsRow.addView(plus);
            root.addView(setsRow);
            rows.add(new Object[]{ex.optString("id"), sets});
        }
        if (rows.isEmpty()) root.addView(text("This workout has no exercises yet.", 13, DIM, false));
        root.addView(btnRow(mkBtn("Cancel", false, v -> finish()),
                mkBtn("Save Workout", true, v -> {
                    int saved = 0;
                    try {
                        for (Object[] r : rows) {
                            @SuppressWarnings("unchecked") List<EditText> sets = (List<EditText>) r[1];
                            List<Double> vals = new ArrayList<>();
                            for (EditText e : sets) {
                                String tv = e.getText().toString().trim();
                                if (tv.isEmpty()) continue;
                                try { double d = Double.parseDouble(tv); if (d > 0) vals.add(d); } catch (Exception ignored) {}
                            }
                            if (!vals.isEmpty()) { st.addWorkoutLog((String) r[0], vals); saved++; }
                        }
                        if (saved == 0) { toast("Enter at least one set"); return; }
                        if (st.commit()) { toast("Workout logged \u2713"); finish(); }
                        else toast("Unable to save workout");
                    } catch (Exception e) { toast("Unable to save workout"); }
                })));
    }

    /* =============================================================
       AI: voice \u2192 parse \u2192 confirm \u2192 save (spec \u00A76\u2013\u00A78)
       ============================================================= */

    EditText aiInput;

    void uiAiHome() {
        root.removeAllViews();
        title("\uD83C\uDF99 AI Quick Log", scopeHint());
        aiInput = field("Type or speak a command\u2026", "");
        aiInput.setSingleLine(false); aiInput.setMaxLines(3);
        TextView ex = text("\u201CI spent 500 on dinner\u201D\n\u201CMark workout completed\u201D\n\u201CI slept from 11:30 to 6:45\u201D", 12, DIM, false);
        root.addView(ex);
        root.addView(btnRow(mkBtn("\uD83C\uDF99 Speak", true, v -> startSpeech()),
                mkBtn("Go", false, v -> runAi(aiInput.getText().toString()))));
        root.addView(btnRow(mkBtn("Cancel", false, v -> finish()), null));
    }

    String scopeHint() {
        switch (aiScope) {
            case "money": return "Money commands \u00B7 e.g. \u201Cspent 450 on lunch from HDFC\u201D";
            case "task": return "Task commands \u00B7 e.g. \u201Cadd a task to call the bank tomorrow\u201D";
            case "habit": return "Habit commands \u00B7 e.g. \u201Ccompleted my reading\u201D";
            case "workout": return "Workout commands \u00B7 e.g. \u201Cbench press 65 kg for 8 reps\u201D";
            case "mood": return "Mood commands \u00B7 e.g. \u201CI\u2019m stressed because of work\u201D";
            case "sleep": return "Sleep commands \u00B7 e.g. \u201Cslept from 11:30 to 6:45\u201D";
            default: return "One command can hold several actions";
        }
    }

    void startSpeech() {
        if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_WIDGET_MIC_PERM);
            return;
        }
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-IN");
        i.putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak your command");
        try { startActivityForResult(i, REQ_WIDGET_SPEECH); }
        catch (Exception e) { toast("Speech input unavailable on this device"); }
    }

    @Override public void onRequestPermissionsResult(int req, String[] p, int[] g) {
        super.onRequestPermissionsResult(req, p, g);
        if (req == REQ_WIDGET_MIC_PERM) {
            if (g.length > 0 && g[0] == PackageManager.PERMISSION_GRANTED) startSpeech();
            else {
                toast("Microphone permission is required for voice logging.");
                root.removeAllViews();
                title("\uD83C\uDF99 Microphone needed", "Voice logging needs the microphone permission");
                root.addView(btnRow(mkBtn("Open Settings", true, v -> {
                            try {
                                startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                                        Uri.parse("package:" + getPackageName())));
                            } catch (Exception ignored) {}
                        }),
                        mkBtn("Type instead", false, v -> uiAiHome())));
            }
        }
    }

    @Override protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_WIDGET_SPEECH) {
            if (res == RESULT_OK && data != null) {
                ArrayList<String> r = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                String text = r != null && !r.isEmpty() ? r.get(0) : "";
                if (text.isEmpty()) { toast("Didn\u2019t catch that"); if (root.getChildCount() == 0) uiAiHome(); }
                else runAi(text);
            } else if (root.getChildCount() == 0 || aiInput == null) uiAiHome();
        }
    }

    void runAi(String text) {
        if (text == null || text.trim().isEmpty()) { toast("Say or type a command"); return; }
        AiParser.Result r = AiParser.parse(st, text, aiScope);
        if (r.answer != null) { uiAiAnswer(text, r.answer); return; }
        if (r.choices != null) { uiAiChoices(text, r); return; }
        if (r.error != null || r.actions.isEmpty()) {
            toast("AI could not understand the command.");
            uiAiHome();
            if (aiInput != null) aiInput.setText(text);
            return;
        }
        // Single clear completion \u2192 execute immediately (spec \u00A78).
        if (r.actions.size() == 1 && r.actions.get(0).immediate) {
            execAll(r.actions);
            return;
        }
        uiAiConfirm(text, r.actions);
    }

    void uiAiAnswer(String q, String answer) {
        root.removeAllViews();
        title("\uD83C\uDF99 AI", "\u201C" + q + "\u201D");
        TextView a = text(answer, 14, INK, false);
        a.setBackground(rounded(INNER, 14, 0));
        a.setPadding(dp(12), dp(12), dp(12), dp(12));
        root.addView(a, rowLp());
        root.addView(btnRow(mkBtn("\uD83C\uDF99 Ask again", false, v -> startSpeech()),
                mkBtn("Done", true, v -> finish())));
    }

    void uiAiChoices(String q, AiParser.Result r) {
        root.removeAllViews();
        title("\uD83C\uDF99 Which one?", "\u201C" + q + "\u201D matched several items");
        for (String[] c : r.choices) {
            TextView row = listRow((c[0].equals("habit") ? "\uD83C\uDF31 " : "\u2713 ") + c[2]);
            row.setOnClickListener(v -> {
                AiParser.Action a = new AiParser.Action();
                a.type = c[0].equals("habit") ? AiParser.T_HABIT_DONE : AiParser.T_TASK_DONE;
                a.targetId = c[1]; a.targetName = c[2];
                List<AiParser.Action> list = new ArrayList<>(); list.add(a);
                execAll(list);
            });
            root.addView(row, rowLp());
        }
        root.addView(btnRow(mkBtn("Cancel", false, v -> finish()), null));
    }

    void uiAiConfirm(String q, List<AiParser.Action> actions) {
        root.removeAllViews();
        title("\uD83C\uDF99 AI found " + actions.size() + (actions.size() == 1 ? " action" : " actions"),
                "\u201C" + q + "\u201D");
        List<Runnable> validators = new ArrayList<>();
        for (AiParser.Action a : actions) {
            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setBackground(rounded(INNER, 14, 0));
            card.setPadding(dp(12), dp(10), dp(12), dp(10));
            TextView ct = text(a.cardTitle(st), 15, INK, true);
            TextView cb = text(a.cardBody(st), 13, DIM, false);
            cb.setMaxLines(8);
            card.addView(ct); card.addView(cb);
            if (AiParser.T_EXPENSE.equals(a.type) && a.needsCategory) {
                // Ask for missing info instead of guessing (spec \u00A78: "Add 500" \u2192 What category?)
                card.addView(text("What category?", 12, ACC, true));
                List<String> cats = st.expenseCategories();
                HorizontalScrollView hs = new HorizontalScrollView(this);
                hs.setHorizontalScrollBarEnabled(false);
                LinearLayout chipsRow = hRow();
                List<TextView> chips = new ArrayList<>();
                for (String c : cats) {
                    TextView chip = pill(c, false);
                    chip.setOnClickListener(v -> {
                        a.category = c; a.needsCategory = false;
                        for (TextView x : chips) x.setBackground(rounded(0x26FFFFFF, 99, 0));
                        chip.setBackground(rounded(ACC, 99, 0));
                        chip.setTextColor(ACC_INK);
                        cb.setText(a.cardBody(st));
                    });
                    chips.add(chip);
                    LinearLayout.LayoutParams lp = chipLp();
                    chipsRow.addView(chip, lp);
                }
                hs.addView(chipsRow);
                card.addView(hs);
                validators.add(() -> { if (a.needsCategory) toast("Pick a category for " + st.inr(a.amount)); });
            }
            root.addView(card, rowLp());
        }
        root.addView(btnRow(mkBtn("Cancel", false, v -> finish()),
                mkBtn(actions.size() > 1 ? "Confirm All" : "Confirm", true, v -> {
                    for (AiParser.Action a : actions)
                        if (AiParser.T_EXPENSE.equals(a.type) && a.needsCategory) {
                            for (Runnable r : validators) r.run();
                            return;
                        }
                    execAll(actions);
                })));
    }

    void execAll(List<AiParser.Action> actions) {
        StringBuilder msg = new StringBuilder();
        try {
            for (AiParser.Action a : actions) {
                String m = AiParser.execute(st, a);
                if (msg.length() > 0) msg.append("\n");
                msg.append(m);
            }
            if (!st.commit()) { toast("Unable to save"); return; }
            toast(msg.toString());
            finish();
        } catch (Exception e) { toast("Unable to save"); }
    }

    /* =============================================================
       UI toolkit (programmatic, dark, matches the app)
       ============================================================= */

    int dp(int v) { return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics())); }

    GradientDrawable rounded(int fill, int radius, int stroke) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(fill);
        g.setCornerRadius(dp(radius));
        if (stroke != 0) g.setStroke(dp(1), stroke);
        return g;
    }

    void title(String t, String sub) {
        TextView a = text(t, 18, INK, true);
        root.addView(a);
        if (sub != null && !sub.isEmpty()) {
            TextView s = text(sub, 12, DIM, false);
            s.setPadding(0, dp(2), 0, dp(8));
            root.addView(s);
        } else root.addView(spacer(8));
    }

    void label(String t) {
        TextView l = text(t.toUpperCase(), 10, DIM, true);
        l.setLetterSpacing(0.08f);
        l.setPadding(0, dp(10), 0, dp(4));
        root.addView(l);
    }

    TextView text(String t, int size, int color, boolean bold) {
        TextView v = new TextView(this);
        v.setText(t); v.setTextSize(size); v.setTextColor(color);
        if (bold) v.setTypeface(Typeface.DEFAULT_BOLD);
        return v;
    }

    void styleInput(EditText e) {
        e.setTextColor(INK); e.setHintTextColor(0x66FFFFFF);
        e.setTextSize(15);
        e.setBackground(rounded(INNER, 12, 0));
        e.setPadding(dp(12), dp(10), dp(12), dp(10));
    }

    /** Creates a styled EditText; the caller decides where to add it. */
    EditText input(String hint, String value) {
        EditText e = new EditText(this);
        styleInput(e);
        if (hint != null) e.setHint(hint);
        if (value != null && !value.isEmpty()) e.setText(value);
        return e;
    }

    /** Creates + adds a styled EditText to the root column. */
    EditText field(String hint, String value) {
        EditText e = input(hint, value);
        root.addView(e, rowLp());
        return e;
    }

    LinearLayout.LayoutParams rowLp() {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(6);
        return lp;
    }

    LinearLayout.LayoutParams chipLp() {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.rightMargin = dp(6); lp.topMargin = dp(4);
        return lp;
    }

    LinearLayout hRow() {
        LinearLayout r = new LinearLayout(this);
        r.setOrientation(LinearLayout.HORIZONTAL);
        r.setGravity(Gravity.CENTER_VERTICAL);
        return r;
    }

    View spacer(int h) {
        View v = new View(this);
        v.setLayoutParams(new LinearLayout.LayoutParams(1, dp(h)));
        return v;
    }

    TextView pill(String t, boolean accent) {
        TextView v = text(t, 13, accent ? ACC_INK : INK, true);
        v.setBackground(rounded(accent ? ACC : 0x26FFFFFF, 99, 0));
        v.setPadding(dp(14), dp(8), dp(14), dp(8));
        v.setGravity(Gravity.CENTER);
        return v;
    }

    TextView listRow(String t) {
        TextView v = text(t, 15, INK, false);
        v.setBackground(rounded(INNER, 14, 0));
        v.setPadding(dp(14), dp(13), dp(14), dp(13));
        return v;
    }

    TextView mkBtn(String t, boolean accent, View.OnClickListener l) {
        TextView v = pill(t, accent);
        v.setTextSize(14);
        v.setPadding(dp(16), dp(11), dp(16), dp(11));
        v.setOnClickListener(l);
        return v;
    }

    LinearLayout btnRow(View a, View b) {
        LinearLayout r = hRow();
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
        lp.topMargin = dp(14);
        if (a != null) { lp.rightMargin = b != null ? dp(8) : 0; r.addView(a, lp); }
        if (b != null) {
            LinearLayout.LayoutParams lp2 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
            lp2.topMargin = dp(14);
            r.addView(b, lp2);
        }
        return r;
    }

    /** Single-select chip row; onPick receives the value key. */
    HorizontalScrollView chipSelect(String[] keys, String[] labels, String selected,
                                    java.util.function.Consumer<String> onPick, boolean redFirst) {
        HorizontalScrollView hs = new HorizontalScrollView(this);
        hs.setHorizontalScrollBarEnabled(false);
        LinearLayout row = hRow();
        List<TextView> chips = new ArrayList<>();
        for (int i = 0; i < keys.length; i++) {
            final String key = keys[i];
            final boolean red = redFirst && i == 0;
            TextView c = pill(labels[i], false);
            boolean sel = key.equals(selected);
            styleChip(c, sel, red);
            c.setOnClickListener(v -> {
                onPick.accept(key);
                for (int k = 0; k < chips.size(); k++)
                    styleChip(chips.get(k), keys[k].equals(key), redFirst && k == 0);
            });
            chips.add(c);
            row.addView(c, chipLp());
        }
        hs.addView(row);
        return hs;
    }

    void styleChip(TextView c, boolean sel, boolean red) {
        if (sel) {
            c.setBackground(rounded(red ? RED : ACC, 99, 0));
            c.setTextColor(red ? 0xFFFFFFFF : ACC_INK);
        } else {
            c.setBackground(rounded(0x26FFFFFF, 99, 0));
            c.setTextColor(INK);
        }
    }

    void toast(String m) {
        try { Toast.makeText(getApplicationContext(), m, Toast.LENGTH_SHORT).show(); } catch (Exception ignored) {}
    }

    @Override protected void onPause() {
        super.onPause();
        View f = getCurrentFocus();
        if (f != null) {
            InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
            if (imm != null) imm.hideSoftInputFromWindow(f.getWindowToken(), 0);
        }
    }

    static String trimNum(double d) {
        return d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d);
    }
}
