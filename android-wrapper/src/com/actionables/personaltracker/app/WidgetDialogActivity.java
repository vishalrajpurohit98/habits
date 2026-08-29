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

    public static final String A_EDIT_HABIT = "EDIT_HABIT";
    public static final String A_EDIT_EXPENSE = "EDIT_EXPENSE";
    public static final String A_ADD_TASK = "ADD_TASK";
    public static final String A_TASK_DETAIL = "TASK_DETAIL";
    public static final String A_ADD_EXPENSE = "ADD_EXPENSE";
    public static final String A_PICK_ACCOUNT = "PICK_ACCOUNT";
    public static final String A_ADD_HABIT = "ADD_HABIT";
    public static final String A_LOG_SLEEP = "LOG_SLEEP";
    public static final String A_MOOD_DETAIL = "MOOD_DETAIL";
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
            case A_ADD_TASK: uiTask(null); break;
            case A_TASK_DETAIL: uiTask(st.findTask(s("taskId"))); break;
            case A_ADD_EXPENSE: uiExpense(s("acctId"), 0, "", ""); break;
            case A_EDIT_EXPENSE: uiTxEdit(s("txId")); break;
            case A_EDIT_HABIT: uiHabitEdit(s("habitId")); break;
            case A_PICK_ACCOUNT: uiPickAccount(); break;
            case A_ADD_HABIT: uiHabit(); break;
            case A_LOG_SLEEP: {
                org.json.JSONObject cur = st.sleepOn(WidgetStore.today());
                uiSleep(cur == null ? "" : cur.optString("bed"), cur == null ? "" : cur.optString("wake"));
                break;
            }
            case A_MOOD_DETAIL: uiMood(); break;
            case A_AI:
                aiScope = s("scope") == null ? "all" : s("scope");
                uiAiInput("", null);
                if ("1".equals(s("voice"))) startSpeech();
                break;
            default: finish();
        }
    }

    String s(String k) { return getIntent().getStringExtra(k); }

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

    /* =============================================================
       EDIT HABIT (v2): tap a habit name on the widget to edit it here
       ============================================================= */

    void uiHabitEdit(String hid) {
        org.json.JSONObject h = null;
        org.json.JSONArray hs = st.state.optJSONArray("habits");
        if (hs != null && hid != null) for (int i = 0; i < hs.length(); i++) {
            org.json.JSONObject x = hs.optJSONObject(i);
            if (x != null && hid.equals(x.optString("id"))) { h = x; break; }
        }
        if (h == null) { toast("Habit not found"); finish(); return; }
        final org.json.JSONObject hh = h;

        int stk = st.streak(hh);
        title("\uD83C\uDF31 Edit Habit", stk > 0 ? "\uD83D\uDD25 " + stk + "-day streak" : "Changes apply everywhere");
        EditText name = field("Habit name", hh.optString("name", ""));

        label("Schedule");
        org.json.JSONObject sc = hh.optJSONObject("sched");
        String cur = sc == null ? "daily" : sc.optString("kind", "daily");
        if (!cur.matches("daily|dow|wquota")) cur = "daily";
        final String[] kind = {cur};
        root.addView(chipSelect(new String[]{"daily", "dow", "wquota"},
                new String[]{"Daily", "Weekdays", "X / week"}, cur, v -> kind[0] = v, false));
        label("Times per week (for X / week)");
        EditText quota = field(null, String.valueOf(sc == null ? 3 : Math.max(1, sc.optInt("quota", 3))));
        quota.setInputType(InputType.TYPE_CLASS_NUMBER);

        root.addView(btnRow(mkBtn("Archive", false, v -> {
                    try {
                        hh.put("arch", true);
                        hh.put("archAt", WidgetStore.today());
                        st.markDirty();
                        if (st.commit()) { toast("Archived \u00B7 restore from the app"); finish(); }
                        else toast("Unable to save");
                    } catch (Exception e) { toast("Unable to save"); }
                }),
                mkBtn("Save", true, v -> {
                    String nm = name.getText().toString().trim();
                    if (nm.isEmpty()) { name.setError("Enter a name"); return; }
                    int q = 3;
                    try { q = Math.max(1, Integer.parseInt(quota.getText().toString().trim())); } catch (Exception ignored) {}
                    try {
                        hh.put("name", nm.length() > 40 ? nm.substring(0, 40) : nm);
                        org.json.JSONObject ns = hh.optJSONObject("sched");
                        if (ns == null) { ns = new org.json.JSONObject(); hh.put("sched", ns); }
                        ns.put("kind", kind[0]);
                        if ("dow".equals(kind[0])) {
                            org.json.JSONArray dows = new org.json.JSONArray();
                            for (int i = 1; i <= 5; i++) dows.put(i);
                            ns.put("dows", dows);
                        }
                        if ("wquota".equals(kind[0])) ns.put("quota", q);
                        st.markDirty();
                        if (st.commit()) { toast("\u201C" + nm + "\u201D updated"); finish(); }
                        else toast("Unable to save");
                    } catch (Exception e) { toast("Unable to save"); }
                })));
        TextView c = text("Cancel", 13, DIM, true);
        c.setGravity(Gravity.CENTER);
        c.setPadding(0, dp(12), 0, dp(2));
        c.setOnClickListener(v -> finish());
        root.addView(c, rowLp());
    }

    /* =============================================================
       EDIT TRANSACTION (v2): tap a recent transaction on the money
       widget to fix or remove it without opening the app
       ============================================================= */

    void uiTxEdit(String txId) {
        final org.json.JSONObject tx = st.findTx(txId);
        if (tx == null) { toast("Transaction not found"); finish(); return; }
        boolean inc = "inc".equals(tx.optString("kind"));

        title(st.currency() + " Edit " + (inc ? "Income" : "Expense"), WidgetStore.niceDate(tx.optString("d", WidgetStore.today())));
        EditText amt = field("Amount", trimNum(tx.optDouble("amt", 0)));
        amt.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        EditText note = field("Description (optional)", tx.optString("note", ""));

        label("Category");
        List<String> cats = inc ? st.incomeCategories() : st.expenseCategories();
        if (cats.isEmpty()) cats = new ArrayList<>(java.util.Collections.singletonList("Other"));
        String curCat = tx.optString("cat", "Other");
        if (!cats.contains(curCat)) cats.add(0, curCat);
        final String[] cat = {curCat};
        root.addView(chipSelect(cats.toArray(new String[0]), cats.toArray(new String[0]), cat[0], v -> cat[0] = v, false));

        label("Account");
        List<org.json.JSONObject> accts = st.activeAccounts();
        final String[] acct = {tx.optString("acct", "")};
        if (!accts.isEmpty()) {
            String[] ids = new String[accts.size()], names = new String[accts.size()];
            for (int i = 0; i < accts.size(); i++) { ids[i] = accts.get(i).optString("id"); names[i] = accts.get(i).optString("name"); }
            if (acct[0].isEmpty()) acct[0] = ids[0];
            root.addView(chipSelect(ids, names, acct[0], v -> acct[0] = v, false));
        }

        final boolean[] armed = {false};
        final TextView del = mkBtn("Delete", false, null);
        del.setTextColor(RED);
        del.setOnClickListener(v -> {
            if (!armed[0]) { armed[0] = true; del.setText("Tap again to delete"); return; }
            try {
                st.deleteTx(tx.optString("id"));
                if (st.commit()) { toast("Deleted \u00B7 " + st.inr(tx.optDouble("amt", 0))); finish(); }
                else toast("Unable to save");
            } catch (Exception e) { toast("Unable to save"); }
        });
        root.addView(btnRow(del, mkBtn("Save", true, v -> {
            double a2;
            try { a2 = Double.parseDouble(amt.getText().toString().trim()); } catch (Exception e) { a2 = 0; }
            if (a2 <= 0) { amt.setError("Enter an amount"); return; }
            try {
                tx.put("amt", a2);
                tx.put("cat", cat[0]);
                tx.put("note", note.getText().toString().trim());
                if (!acct[0].isEmpty()) tx.put("acct", acct[0]);
                st.markDirty();
                if (st.commit()) { toast("Updated \u00B7 " + st.inr(a2)); finish(); }
                else toast("Unable to save");
            } catch (Exception e) { toast("Unable to save"); }
        })));
        TextView c = text("Cancel", 13, DIM, true);
        c.setGravity(Gravity.CENTER);
        c.setPadding(0, dp(12), 0, dp(2));
        c.setOnClickListener(v -> finish());
        root.addView(c, rowLp());
    }

    EditText aiInput;
    volatile boolean aiBusy = false;

    /* =============================================================
       AI (v2): speech is transcribed into an editable field; Done
       routes the text to the app's own AI (same provider, model,
       key, prompt and data context, mirrored via Bridge.setAiConfig).
       Falls back to the offline parser when no key / no network.
       ============================================================= */

    void uiAiInput(String prefill, String note) {
        aiBusy = false;
        root.removeAllViews();
        boolean cloud = NativeAi.hasKey(this);
        title("\uD83C\uDF99 AI", cloud ? "Log, update, or ask anything" : "Quick logging \u00B7 offline");
        if (note != null && !note.isEmpty()) {
            TextView n = text(note, 12, DIM, false);
            n.setBackground(rounded(INNER, 12, 0));
            n.setPadding(dp(11), dp(9), dp(11), dp(9));
            root.addView(n, rowLp());
        }
        aiInput = field(cloud ? "\u201Ccoffee 40\u201D \u00B7 \u201Cmove gym task to Friday\u201D \u00B7 \u201Chow did I sleep this week?\u201D"
                : "\u201Ccoffee 40\u201D \u00B7 \u201Cmark reading done\u201D \u00B7 \u201Cslept 11:30 to 6:45\u201D", prefill == null ? "" : prefill);
        aiInput.setSingleLine(false);
        aiInput.setMinLines(2);
        aiInput.setMaxLines(5);
        root.addView(btnRow(mkBtn("\uD83C\uDF99 Speak", false, v -> startSpeech()),
                mkBtn("Done", true, v -> processAi(aiInput.getText().toString().trim()))));
        TextView c = text("Cancel", 13, DIM, true);
        c.setGravity(Gravity.CENTER);
        c.setPadding(0, dp(12), 0, dp(2));
        c.setOnClickListener(v -> finish());
        root.addView(c, rowLp());
    }

    void processAi(String text) {
        if (text == null || text.trim().isEmpty()) { toast("Say or type something first"); return; }
        if (aiBusy) return;
        if (NativeAi.hasKey(this)) cloudAi(text.trim());
        else offlineAi(text.trim(), null);
    }

    void uiAiThinking(String q) {
        root.removeAllViews();
        title("\uD83C\uDF99 AI", "\u201C" + q + "\u201D");
        TextView t = text("Thinking\u2026", 14, DIM, false);
        t.setBackground(rounded(INNER, 14, 0));
        t.setPadding(dp(12), dp(14), dp(12), dp(14));
        root.addView(t, rowLp());
        root.addView(btnRow(mkBtn("Cancel", false, v -> { aiBusy = false; uiAiInput(q, null); }), null));
    }

    void cloudAi(final String q) {
        aiBusy = true;
        uiAiThinking(q);
        final NativeAi.Cfg cfg = NativeAi.cfg(this);
        new Thread(() -> {
            try {
                String raw = NativeAi.call(cfg, NativeAi.prompt(st, q), 500);
                final NativeAi.Parsed parsed = NativeAi.parse(raw);
                runOnUiThread(() -> { if (!isFinishing() && aiBusy) { aiBusy = false; routeCloud(q, parsed); } });
            } catch (Exception e) {
                final String err = e.getMessage() == null ? "network error" : e.getMessage();
                runOnUiThread(() -> { if (!isFinishing() && aiBusy) { aiBusy = false; offlineAi(q, err); } });
            }
        }).start();
    }

    void routeCloud(String q, NativeAi.Parsed p) {
        if (p.action == null) { uiAiAnswer(q, p.freeform == null ? "No response" : p.freeform); return; }
        org.json.JSONObject r = p.action;
        String a = r.optString("action", "");
        boolean instant = a.equals("complete_task") || a.equals("reopen_task")
                || a.equals("complete_habit") || a.equals("uncomplete_habit");
        boolean readonly = a.equals("query") || a.equals("clarify");
        boolean delete = a.startsWith("delete_");
        if (readonly || instant || delete) {
            NativeAi.Res res = NativeAi.execute(st, r, false);
            switch (res.kind) {
                case NativeAi.R_QUERY: uiAiAnswer(q, res.msg); return;
                case NativeAi.R_CLARIFY: uiAiInput(q, res.msg); return;
                case NativeAi.R_CONFIRM: uiCloudConfirm(q, res.msg, "", true, res.pending); return;
                case NativeAi.R_OK: commitToast(res); return;
                default: uiAiInput(q, res.msg); return;
            }
        }
        // create / update / setting: preview first, apply only on Confirm
        uiCloudConfirm(q, r.optString("message", "Apply this change?"), NativeAi.preview(st, r), false, r);
    }

    void uiCloudConfirm(String q, String head, String body, boolean danger, final org.json.JSONObject pending) {
        root.removeAllViews();
        title("\uD83C\uDF99 Confirm", "\u201C" + q + "\u201D");
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackground(rounded(INNER, 14, 0));
        card.setPadding(dp(12), dp(11), dp(12), dp(11));
        TextView h = text(head, 14, danger ? RED : INK, true);
        h.setMaxLines(4);
        card.addView(h);
        if (body != null && !body.isEmpty()) {
            TextView b2 = text(body, 12, DIM, false);
            b2.setMaxLines(6);
            b2.setPadding(0, dp(5), 0, 0);
            card.addView(b2);
        }
        root.addView(card, rowLp());
        root.addView(btnRow(mkBtn("Cancel", false, v -> uiAiInput(q, null)),
                mkBtn(danger ? "Delete" : "Confirm", true, v -> {
                    NativeAi.Res res = NativeAi.execute(st, pending, true);
                    if (res.kind == NativeAi.R_OK) commitToast(res);
                    else if (res.kind == NativeAi.R_CONFIRM) uiCloudConfirm(q, res.msg, "", true, res.pending);
                    else uiAiInput(q, res.msg);
                })));
    }

    void commitToast(NativeAi.Res res) {
        if (st.commit()) {
            toast(res.msg + (res.detail == null || res.detail.isEmpty() ? "" : " \u00B7 " + res.detail));
            finish();
        } else toast("Unable to save");
    }

    /** Offline fallback: deterministic parser. cloudErr != null means the cloud call failed. */
    void offlineAi(String text, String cloudErr) {
        AiParser.Result r = AiParser.parse(st, text, aiScope);
        if (r.answer != null) { uiAiAnswer(text, r.answer); return; }
        if (r.choices != null) { uiAiChoices(text, r); return; }
        if (r.error != null || r.actions.isEmpty()) {
            String note = cloudErr != null
                    ? "Couldn\u2019t reach your AI (" + cloudErr + "). Check the connection and try again \u2014 simple commands still work offline."
                    : "I couldn\u2019t parse that offline. For general questions and smarter commands, add an AI key in the app: Settings \u2192 AI.";
            uiAiInput(text, note);
            return;
        }
        if (r.actions.size() == 1 && r.actions.get(0).immediate) { execAll(r.actions); return; }
        uiAiConfirm(text, r.actions);
    }

    void startSpeech() {
        if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_WIDGET_MIC_PERM);
            return;
        }
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-IN");
        i.putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak \u2014 I\u2019ll transcribe it");
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
                        mkBtn("Type instead", false, v -> uiAiInput("", null))));
            }
        }
    }

    @Override protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_WIDGET_SPEECH) {
            if (res == RESULT_OK && data != null) {
                ArrayList<String> r = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                String text = r != null && !r.isEmpty() ? r.get(0) : "";
                if (text.isEmpty()) { toast("Didn\u2019t catch that"); uiAiInput(aiInput == null ? "" : aiInput.getText().toString(), null); }
                else uiAiInput(text, null);
            } else if (A_AI.equals(action) && root.getChildCount() == 0) uiAiInput("", null);
        }
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
