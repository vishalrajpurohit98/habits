package com.actionables.personaltracker.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/** Native RemoteViews home-screen Quick Log widget. */
public class QuickLogWidgetProvider extends AppWidgetProvider {
    public static final String ACTION_SELECT = "com.actionables.personaltracker.widget.SELECT";
    public static final String ACTION_TOGGLE = "com.actionables.personaltracker.widget.TOGGLE";
    public static final String ACTION_ADD = "com.actionables.personaltracker.widget.ADD";
    public static final String ACTION_REFRESH = "com.actionables.personaltracker.widget.REFRESH";
    private static final String PREFS = "quick_log_widget";
    private static final String KEY_SELECTED = "selected";
    private static final String KEY_EXPANDED = "expanded";

    private static final String SLEEP = "sleep", HABIT = "habit", TASK = "task", MOOD = "mood", WORKOUT = "workout", EXPENSE = "expense";

    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) update(context, manager, id);
    }

    @Override public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent == null ? "" : intent.getAction();
        if (ACTION_SELECT.equals(action)) {
            String type = intent.getStringExtra("type");
            if (type == null) type = TASK;
            prefs(context).edit().putString(KEY_SELECTED, type).putBoolean(KEY_EXPANDED, false).apply();
            updateAll(context);
        } else if (ACTION_TOGGLE.equals(action)) {
            boolean expanded = prefs(context).getBoolean(KEY_EXPANDED, false);
            prefs(context).edit().putBoolean(KEY_EXPANDED, !expanded).apply();
            updateAll(context);
        } else if (ACTION_ADD.equals(action)) {
            openAppFor(context, intent.getStringExtra("type"));
        } else if (ACTION_REFRESH.equals(action)) {
            updateAll(context);
        }
    }

    private static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName name = new ComponentName(context, QuickLogWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(name);
        for (int id : ids) update(context, manager, id);
    }

    private static void update(Context c, AppWidgetManager manager, int id) {
        RemoteViews v = new RemoteViews(c.getPackageName(), com.actionables.personaltracker.app.R.layout.widget_quick_log);
        String selected = prefs(c).getString(KEY_SELECTED, TASK);
        boolean expanded = prefs(c).getBoolean(KEY_EXPANDED, false);
        v.setViewVisibility(R.id.widget_options, expanded ? android.view.View.VISIBLE : android.view.View.GONE);
        v.setTextViewText(R.id.widget_selector, label(selected) + "  ▾");
        String[] types = {SLEEP,HABIT,TASK,MOOD,WORKOUT,EXPENSE};
        int[] ids = {R.id.opt_sleep,R.id.opt_habit,R.id.opt_task,R.id.opt_mood,R.id.opt_workout,R.id.opt_expense};
        for (int i=0;i<types.length;i++) v.setOnClickPendingIntent(ids[i], broadcast(c,ACTION_SELECT,types[i],100+i));
        v.setOnClickPendingIntent(R.id.widget_selector, broadcast(c,ACTION_TOGGLE,"",10));
        v.setOnClickPendingIntent(R.id.widget_refresh, broadcast(c,ACTION_REFRESH,"",11));
        v.setOnClickPendingIntent(R.id.widget_add, activity(c,selected,20));
        Detail d = detail(c,selected);
        v.setTextViewText(R.id.widget_detail_title, d.title);
        v.setTextViewText(R.id.widget_detail_text, d.text);
        manager.updateAppWidget(id,v);
    }

    private static String label(String t) {
        if (SLEEP.equals(t)) return "💤 Sleep";
        if (HABIT.equals(t)) return "💪 Habit";
        if (MOOD.equals(t)) return "🙂 Mood";
        if (WORKOUT.equals(t)) return "🏋 Workout";
        if (EXPENSE.equals(t)) return "₹ Expense";
        return "✓ Task";
    }

    private static PendingIntent broadcast(Context c,String action,String type,int request) {
        Intent i=new Intent(c,QuickLogWidgetProvider.class).setAction(action).putExtra("type",type);
        return PendingIntent.getBroadcast(c,request,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    private static PendingIntent activity(Context c,String type,int request) {
        Intent i=new Intent(c,MainActivity.class).setAction("com.actionables.personaltracker.widget.OPEN")
                .putExtra("quick_add",type).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c,request,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    private static void openAppFor(Context c,String type){
        Intent i=new Intent(c,MainActivity.class).setAction("com.actionables.personaltracker.widget.OPEN")
                .putExtra("quick_add",type).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        c.startActivity(i);
    }

    private static Detail detail(Context c,String type) {
        String raw=c.getSharedPreferences("personal_tracker_native",Context.MODE_PRIVATE).getString("state","");
        if(raw==null||raw.length()==0) return new Detail("Today","Open the app once to load your latest data.");
        try {
            JSONObject s=new JSONObject(raw);
            String today=new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(new Date());
            if(SLEEP.equals(type)) return sleepDetail(s,today);
            if(HABIT.equals(type)) return habitDetail(s,today);
            if(MOOD.equals(type)) return moodDetail(s,today);
            if(WORKOUT.equals(type)) return workoutDetail(s,today);
            if(EXPENSE.equals(type)) return expenseDetail(s,today);
            return taskDetail(s,today);
        } catch(Exception e) { return new Detail("Today","Data is unavailable. Tap Add to open the app."); }
    }

    private static Detail sleepDetail(JSONObject s,String today)throws Exception{
        JSONArray a=s.optJSONArray("sleep");
        JSONObject latest=null;
        if(a!=null) for(int i=0;i<a.length();i++){JSONObject x=a.optJSONObject(i);if(x!=null&&today.equals(x.optString("d")))latest=x;}
        if(latest==null)return new Detail("Sleep","No sleep logged for today.");
        int mins=latest.optInt("mins",0); return new Detail("Sleep","Logged: "+(mins/60)+"h "+(mins%60)+"m · "+latest.optString("bed","—")+" → "+latest.optString("wake","—"));
    }
    private static Detail habitDetail(JSONObject s,String today)throws Exception{
        JSONArray a=s.optJSONArray("habits");int due=0,done=0;StringBuilder names=new StringBuilder();
        if(a!=null)for(int i=0;i<a.length();i++){JSONObject h=a.optJSONObject(i);if(h==null||h.optBoolean("arch",false))continue;JSONObject sched=h.optJSONObject("sched");String kind=sched==null?"daily":sched.optString("kind","daily");int dow=Calendar.getInstance().get(Calendar.DAY_OF_WEEK)-1;boolean isDue="daily".equals(kind)||"weekend".equals(kind)&& (dow==0||dow==6)||"dow".equals(kind)&&sched.optJSONArray("dows")!=null&&contains(sched.optJSONArray("dows"),dow);if(isDue){due++;JSONObject d=h.optJSONObject("done");boolean ok=d!=null&&d.optDouble(today,0)>=Math.max(1,h.optInt("target",1));if(ok)done++;else if(names.length()<45){if(names.length()>0)names.append(", ");names.append(h.optString("name","Habit"));}}}
        String msg="Today: "+done+" / "+due+" completed"+(due==0?" · nothing due":"");
        if(names.length()>0)msg+="\nDue: "+names;
        return new Detail("Habits",msg);
    }
    private static boolean contains(JSONArray a,int n){for(int i=0;i<a.length();i++)if(a.optInt(i,-99)==n)return true;return false;}
    private static Detail moodDetail(JSONObject s,String today)throws Exception{
        JSONObject m=s.optJSONObject("mood");int x=m==null?-1:m.optInt(today,-1);
        String[] e={"🤩 Excellent","😄 Happy","😌 Calm","😐 Neutral","😴 Tired","😢 Sad","😣 Stressed"};
        return new Detail("Mood",x>=0&&x<e.length?"Today's mood: "+e[x]:"No mood logged today.");
    }
    private static Detail workoutDetail(JSONObject s,String today)throws Exception{
        JSONArray a=s.optJSONArray("wlog");int count=0; if(a!=null)for(int i=0;i<a.length();i++){JSONObject x=a.optJSONObject(i);if(x!=null&&today.equals(x.optString("d")))count++;}
        return new Detail("Workout",count>0?"Logged today: "+count+" exercise log"+(count==1?"":"s"):"No workout logged today.");
    }
    private static Detail expenseDetail(JSONObject s,String today)throws Exception{
        JSONArray a=s.optJSONArray("tx");double spent=0;int count=0;if(a!=null)for(int i=0;i<a.length();i++){JSONObject x=a.optJSONObject(i);if(x!=null&&today.equals(x.optString("d"))&&"exp".equals(x.optString("kind","exp"))){spent+=x.optDouble("amt",0);count++;}}
        String amount=NumberFormat.getCurrencyInstance(new Locale("en","IN")).format(spent);return new Detail("Expense","Spent today: "+amount+" · "+count+" transaction"+(count==1?"":"s"));
    }
    private static Detail taskDetail(JSONObject s,String today)throws Exception{
        JSONArray a=s.optJSONArray("tasks");
        if(a==null) return new Detail("Tasks","Open Tasks to see your actionables. Tap Add to create one.");
        int open=0,overdue=0,done=0; String next="";
        for(int i=0;i<a.length();i++){
            JSONObject t=a.optJSONObject(i); if(t==null) continue;
            boolean isDone=t.optBoolean("done",false) || "completed".equalsIgnoreCase(t.optString("status",""));
            String d=t.optString("date","");
            if(isDone){done++;continue;}
            open++; if(d.length()==10 && d.compareTo(today)<0) overdue++;
            if(next.length()==0 && d.length()==10 && d.compareTo(today)>=0) next=t.optString("name","Task");
        }
        String msg=open+" open · "+overdue+" overdue";
        if(next.length()>0) msg += "\nNext: "+next;
        if(open==0) msg="No open tasks · "+done+" completed";
        return new Detail("Tasks",msg);
    }
    private static class Detail { final String title,text; Detail(String t,String x){title=t;text=x;} }
}
