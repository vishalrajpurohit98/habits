package com.actionables.personaltracker.app;

import android.appwidget.AppWidgetManager;
import android.content.*;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;
import org.json.*;
import java.text.*;
import java.util.*;

public final class WidgetData {
    static final String PREF="personal_tracker_native";
    static final String STATE="state";
    static final String ACTION="com.actionables.personaltracker.app.WIDGET_ACTION";
    static final String TYPE="widget_type";
    static final String CMD="widget_cmd";

    static JSONObject state(Context c){
        try{
            String s=c.getSharedPreferences(PREF,Context.MODE_PRIVATE).getString(STATE,"");
            if(s!=null && !s.isEmpty()) return new JSONObject(s);
        }catch(Exception ignored){}
        JSONObject o=new JSONObject();
        try{o.put("tasks",new JSONArray());o.put("habits",new JSONArray());o.put("tx",new JSONArray());
           o.put("accts",new JSONArray());o.put("wlog",new JSONArray());o.put("exs",new JSONArray());
           o.put("sleep",new JSONArray());o.put("mood",new JSONObject());o.put("hlog",new JSONObject());o.put("set",new JSONObject());}catch(Exception ignored){}
        return o;
    }
    static void save(Context c, JSONObject s){
        try{
            s.put("mtime",System.currentTimeMillis());
            c.getSharedPreferences(PREF,Context.MODE_PRIVATE).edit().putString(STATE,s.toString()).apply();
        }catch(Exception ignored){}
        Intent r=new Intent("com.actionables.personaltracker.app.REFRESH_WIDGETS");
        c.sendBroadcast(r);
    }
    static String today(){return new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(new Date());}
    static String money(double n){return String.format(Locale.US,"₹%,.0f",n);}
    static String timeNow(){return new SimpleDateFormat("HH:mm",Locale.US).format(new Date());}

    static void populate(Context c, RemoteViews v, String type, int id){
        JSONObject s=state(c);
        v.setTextViewText(com.actionables.personaltracker.app.R.id.w_title, title(type));
        v.setOnClickPendingIntent(com.actionables.personaltracker.app.R.id.w_mic, pi(c,"ai",type,id));
        if(type.equals(QuickLogWidgetProvider.TYPE_QUICK)) quick(c,v,s,id);
        else if(type.equals(QuickLogWidgetProvider.TYPE_TASK)) tasks(c,v,s,id);
        else if(type.equals(QuickLogWidgetProvider.TYPE_HABIT)) habits(c,v,s,id);
        else if(type.equals(QuickLogWidgetProvider.TYPE_MONEY)) money(c,v,s,id);
        else if(type.equals(QuickLogWidgetProvider.TYPE_WORKOUT)) workout(c,v,s,id);
        else if(type.equals(QuickLogWidgetProvider.TYPE_MOOD)) mood(c,v,s,id);
        else sleep(c,v,s,id);
    }
    static String title(String t){
        if(t.equals("quick"))return "⚡ Quick Log";
        if(t.equals("task"))return "✓ Today's Actionables";
        if(t.equals("habit"))return "🌱 Habit Progress";
        if(t.equals("money"))return "₹ Money";
        if(t.equals("workout"))return "🏋 Workout";
        if(t.equals("mood"))return "🙂 Mood";
        return "💤 Sleep";
    }
    static PendingIntent pi(Context c,String cmd,String type,int id){
        Intent i=new Intent(c,WidgetActionActivity.class).setAction(ACTION);
        i.putExtra(CMD,cmd);i.putExtra(TYPE,type);i.putExtra("appWidgetId",id);
        return PendingIntent.getActivity(c,(id*31+cmd.hashCode()+type.hashCode())&0x7fffffff,i,
                PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    static void commonAdd(Context c,RemoteViews v,String type,int id,String cmd){
        v.setOnClickPendingIntent(com.actionables.personaltracker.app.R.id.w_action1,pi(c,cmd,type,id));
        v.setOnClickPendingIntent(com.actionables.personaltracker.app.R.id.w_action2,pi(c,"detail",type,id));
    }
    static void quick(Context c,RemoteViews v,JSONObject s,int id){
        v.setTextViewText(R.id.w_main,"Select an activity to log");
        v.setTextViewText(R.id.w_secondary,"Sleep · Habit · Task · Mood · Workout · Expense");
        v.setTextViewText(R.id.w_action1,"▾ Select");
        v.setTextViewText(R.id.w_action2,"🎙 AI");
        v.setOnClickPendingIntent(R.id.w_action1,pi(c,"select","quick",id));
        v.setOnClickPendingIntent(R.id.w_action2,pi(c,"ai","quick",id));
    }
    static void tasks(Context c,RemoteViews v,JSONObject s,int id){
        try{
            JSONArray a=s.optJSONArray("tasks"); int overdue=0,today=0,open=0; String first="";
            String ts=today(); long now=System.currentTimeMillis();
            for(int i=0;i<a.length();i++){JSONObject x=a.optJSONObject(i);if(x==null)continue;
                String st=x.optString("status","open");if("completed".equals(st))continue;open++;
                String d=x.optString("dueDate","");
                boolean ov=d.compareTo(ts)<0 && !d.isEmpty(); if(ov)overdue++; if(ts.equals(d))today++;
                if(first.isEmpty()) first=(ov?"🔴 ":"☐ ")+x.optString("title","Task");
            }
            v.setTextViewText(R.id.w_main,overdue+" overdue · "+today+" due today");
            v.setTextViewText(R.id.w_secondary,first.isEmpty()?"No open tasks":first);
        }catch(Exception ignored){}
        v.setTextViewText(R.id.w_action1,"＋ Add Task");v.setTextViewText(R.id.w_action2,"View");
        commonAdd(c,v,"task",id,"add_task");
    }
    static boolean dueHabitToday(JSONObject h,JSONObject s){
        String d=today(); if(h.optBoolean("arch",false))return false;
        String start=h.optString("start",""); if(!start.isEmpty()&&d.compareTo(start)<0)return false;
        JSONObject sc=h.optJSONObject("sched"); if(sc==null)return true; String k=sc.optString("kind","daily");
        Calendar cal=Calendar.getInstance(); int dow=cal.get(Calendar.DAY_OF_WEEK)-1,dom=cal.get(Calendar.DAY_OF_MONTH);
        if("daily".equals(k))return true;
        if("weekend".equals(k))return dow==0||dow==6;
        if("odd".equals(k))return dom%2==1;
        if("even".equals(k))return dom%2==0;
        if("dow".equals(k)){JSONArray ds=sc.optJSONArray("dows");for(int i=0;ds!=null&&i<ds.length();i++)if(ds.optInt(i,-1)==dow)return true;return false;}
        if("wquota".equals(k)||"mquota".equals(k)){
            int q=Math.max(1,sc.optInt("quota",1)),done=0;JSONObject dn=h.optJSONObject("done");
            Calendar x=(Calendar)cal.clone(); if("wquota".equals(k)){int off=(x.get(Calendar.DAY_OF_WEEK)+5)%7;x.add(Calendar.DATE,-off);}else{x.set(Calendar.DAY_OF_MONTH,1);}
            Calendar end=(Calendar)cal.clone();
            while(!x.after(end)){String key=new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(x.getTime());if(!key.equals(d)&&dn!=null&&dn.optDouble(key,0)>=Math.max(1,h.optDouble("target",1)))done++;x.add(Calendar.DATE,1);}
            return done<q;
        }
        return true;
    }
    static void habits(Context c,RemoteViews v,JSONObject s,int id){
        try{
            JSONArray a=s.optJSONArray("habits");int due=0,done=0;String first="";
            String ts=today();
            for(int i=0;a!=null&&i<a.length();i++){JSONObject h=a.optJSONObject(i);if(h==null||!dueHabitToday(h,s))continue;due++;
                JSONObject dn=h.optJSONObject("done");boolean dnToday=dn!=null&&dn.optDouble(ts,0)>=Math.max(1,h.optDouble("target",1));
                if(dnToday)done++; else if(first.isEmpty())first="☐ "+h.optString("name","Habit");
            }
            v.setTextViewText(R.id.w_main,done+" / "+due+" completed today");
            v.setTextViewText(R.id.w_secondary,first.isEmpty()?(due==0?"No habits due today":"All due habits complete"):first);
        }catch(Exception ignored){}
        v.setTextViewText(R.id.w_action1,"✓ Check-in");v.setTextViewText(R.id.w_action2,"View");
        commonAdd(c,v,"habit",id,"check_habit");
    }
    static void money(Context c,RemoteViews v,JSONObject s,int id){
        try{
            JSONArray ac=s.optJSONArray("accts"); String selected=c.getSharedPreferences(PREF,0).getString("widget_account","");
            JSONObject account=null;
            for(int i=0;ac!=null&&i<ac.length();i++){JSONObject a=ac.optJSONObject(i);if(a==null)continue;if(selected.equals(a.optString("id")))account=a;}
            if(account==null&&ac!=null&&ac.length()>0)account=ac.optJSONObject(0);
            double bal=0,exp=0; String aid=account==null?"":account.optString("id");
            if(account!=null)bal=account.optDouble("open",0);
            JSONArray tx=s.optJSONArray("tx");String ts=today();
            for(int i=0;tx!=null&&i<tx.length();i++){JSONObject x=tx.optJSONObject(i);if(x==null)continue;double amt=x.optDouble("amt",0);String k=x.optString("kind","exp");
                if("exp".equals(k)&&aid.equals(x.optString("acct")))bal-=amt;
                else if("inc".equals(k)&&aid.equals(x.optString("acct")))bal+=amt;
                else if("xfer".equals(k)){if(aid.equals(x.optString("acct")))bal-=amt;if(aid.equals(x.optString("to")))bal+=amt;}
                if("exp".equals(k)&&ts.equals(x.optString("d")))exp+=amt;
            }
            v.setTextViewText(R.id.w_main,(account==null?"No account":account.optString("name","Account"))+"  "+money(bal));
            v.setTextViewText(R.id.w_secondary,"Expense today  "+money(exp));
        }catch(Exception ignored){}
        v.setTextViewText(R.id.w_action1,"＋ Expense");v.setTextViewText(R.id.w_action2,"Account");
        commonAdd(c,v,"money",id,"add_expense");
    }
    static void workout(Context c,RemoteViews v,JSONObject s,int id){
        try{
            JSONArray w=s.optJSONArray("wlog");int sessions=0;String last="";
            String ts=today();
            for(int i=0;w!=null&&i<w.length();i++){JSONObject x=w.optJSONObject(i);if(x==null)continue;if(ts.equals(x.optString("d"))){sessions++;last=x.optString("exId","Workout");}}
            v.setTextViewText(R.id.w_main,sessions==0?"No workout logged today":"Today: "+sessions+" exercise log(s)");
            v.setTextViewText(R.id.w_secondary,sessions==0?"Start a workout or create a new one":last);
        }catch(Exception ignored){}
        v.setTextViewText(R.id.w_action1,"＋ New Workout");v.setTextViewText(R.id.w_action2,"Quick Log");
        commonAdd(c,v,"workout",id,"new_workout");
    }
    static void mood(Context c,RemoteViews v,JSONObject s,int id){
        try{
            JSONObject m=s.optJSONObject("mood");String ts=today();int val=m==null?-1:m.optInt(ts,-1);
            String[] em={"🤩","😄","😌","😐","😴","😢","😣"};
            v.setTextViewText(R.id.w_main,val>=0&&val<em.length?"Today  "+em[val]:"Mood not logged today");
        }catch(Exception ignored){}
        v.setTextViewText(R.id.w_secondary,"Tap an emoji or use AI to describe how you feel");
        v.setTextViewText(R.id.w_action1,"＋ Log Mood");v.setTextViewText(R.id.w_action2,"Details");
        commonAdd(c,v,"mood",id,"add_mood");
    }
    static void sleep(Context c,RemoteViews v,JSONObject s,int id){
        try{
            JSONArray a=s.optJSONArray("sleep");JSONObject last=null;String ts=today();
            for(int i=0;a!=null&&i<a.length();i++){JSONObject x=a.optJSONObject(i);if(x!=null&&!x.optString("d","").isEmpty()&&(last==null||x.optString("d").compareTo(last.optString("d"))>0))last=x;}
            if(last!=null){int mins=last.optInt("mins",0);v.setTextViewText(R.id.w_main,"Last night  "+(mins/60)+"h "+(mins%60)+"m");v.setTextViewText(R.id.w_secondary,last.optString("bed","")+" → "+last.optString("wake",""));}
            else {v.setTextViewText(R.id.w_main,"No sleep logged");v.setTextViewText(R.id.w_secondary,"Log last night's sleep");}
        }catch(Exception ignored){}
        v.setTextViewText(R.id.w_action1,"＋ Log Sleep");v.setTextViewText(R.id.w_action2,"Details");
        commonAdd(c,v,"sleep",id,"add_sleep");
    }
}
