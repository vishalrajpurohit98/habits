package com.personaltracker.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.*;

public class MomentumWidgetProvider extends AppWidgetProvider {
    static final String PREFS = "personal_tracker_native";
    static final String STATE = "state";
    static final String ACTION_WIDGET = "com.personaltracker.app.WIDGET";
    static final String EXTRA_ACTION = "widgetAction";
    static final String EXTRA_HABIT = "habitId";

    @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids){ for(int id:ids) update(c,m,id); }
    @Override public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle o){ update(c,m,id); }

    public static void pushUpdate(Context c){
        try{
            AppWidgetManager m=AppWidgetManager.getInstance(c);
            int[] ids=m.getAppWidgetIds(new ComponentName(c,MomentumWidgetProvider.class));
            for(int id:ids) update(c,m,id);
        }catch(Exception ignored){}
    }

    static RemoteViews baseViews(Context c, int id, AppWidgetManager m){
        Bundle o=m.getAppWidgetOptions(id);
        int w=o!=null?o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,110):110;
        int h=o!=null?o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,60):60;
        if(w>=250 && h>=150) return new RemoteViews(c.getPackageName(), R.layout.widget_momentum_large);
        if(w>=180 || h>=110) return new RemoteViews(c.getPackageName(), R.layout.widget_momentum_medium);
        return new RemoteViews(c.getPackageName(), R.layout.widget_momentum_small);
    }

    static void update(Context c, AppWidgetManager m, int id){
        RemoteViews v=baseViews(c,id,m);
        JSONObject s=readState(c);
        int due=dueCount(s), done=doneCount(s), pct=due==0?0:Math.round(done*100f/due);
        v.setTextViewText(R.id.wMomentum,pct+"%");
        v.setProgressBar(R.id.wProgress,100,pct,false);
        v.setTextViewText(R.id.wSub,done+" / "+due+" completed");
        Bundle o=m.getAppWidgetOptions(id);
        int w=o!=null?o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,110):110;
        int h=o!=null?o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,60):60;
        if(w>=180 || h>=110) bindHabits(c,v,s);
        if(w>=180 || h>=110) bind(c,v,R.id.wExpense,"expense","");
        if(w>=180 || h>=110) bind(c,v,R.id.wMood,"mood","");
        if(w>=250 && h>=150) { bind(c,v,R.id.wReceipt,"receipt",""); bind(c,v,R.id.wMoodRemark,"moodRemark",""); bind(c,v,R.id.wReminder,"reminder",""); }
        m.updateAppWidget(id,v);
    }

    static void bindHabits(Context c, RemoteViews v, JSONObject s){
        JSONArray hs=s.optJSONArray("habits");
        String td=new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(new Date());
        int[] ids={R.id.wHabit1,R.id.wHabit2,R.id.wHabit3,R.id.wHabit4};
        int pos=0;
        if(hs!=null){
            for(int i=0;i<hs.length() && pos<ids.length();i++){
                JSONObject h=hs.optJSONObject(i); if(h==null||h.optBoolean("arch",false))continue;
                String name=h.optString("name","Habit"); boolean done=done(h.optJSONObject("done"),td);
                v.setTextViewText(ids[pos],(done?"✓ ":"○ ")+name+(h.has("weeklyTarget")?" · "+weeklyProgress(h,hs,td):""));
                bind(c,v,ids[pos],"habitCheck",h.optString("id",""));
                pos++;
            }
        }
        while(pos<ids.length){ try{v.setViewVisibility(ids[pos],android.view.View.GONE);}catch(Exception ignored){} pos++; }
    }
    static int weeklyProgress(JSONObject h, JSONArray hs, String td){ int target=h.optInt("weeklyTarget",0); if(target<=0)return 0; Calendar cal=Calendar.getInstance(); int dow=cal.get(Calendar.DAY_OF_WEEK); cal.add(Calendar.DAY_OF_MONTH,Calendar.MONDAY-dow+(dow==1? -6:0)); String start=new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(cal.getTime()); int n=0; JSONObject d=h.optJSONObject("done"); for(int i=0;i<7;i++){ Calendar x=(Calendar)cal.clone(); x.add(Calendar.DAY_OF_MONTH,i); String ds=new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(x.getTime()); if(done(d,ds))n++; } return n; }
    static void bind(Context c, RemoteViews v, int viewId, String action, String habitId){
        try{
            Intent i=new Intent(c,MainActivity.class); i.setAction(ACTION_WIDGET); i.putExtra(EXTRA_ACTION,action); if(habitId!=null&&!habitId.isEmpty())i.putExtra(EXTRA_HABIT,habitId);
            int req=(action+":"+habitId+":"+viewId).hashCode();
            PendingIntent p=PendingIntent.getActivity(c,req,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            v.setOnClickPendingIntent(viewId,p);
        }catch(Exception ignored){}
    }
    static JSONObject readState(Context c){ try{String s=c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString(STATE,"");return s==null||s.isEmpty()?new JSONObject():new JSONObject(s);}catch(Exception e){return new JSONObject();} }
    static boolean done(JSONObject o,String k){return o!=null&&o.optDouble(k,0)>0;}
    static int dueCount(JSONObject s){int n=0;JSONArray hs=s.optJSONArray("habits");if(hs==null)return 0;for(int i=0;i<hs.length();i++){JSONObject h=hs.optJSONObject(i);if(h!=null&&!h.optBoolean("arch",false))n++;}return n;}
    static int doneCount(JSONObject s){int n=0;String td=new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(new Date());JSONArray hs=s.optJSONArray("habits");if(hs==null)return 0;for(int i=0;i<hs.length();i++){JSONObject h=hs.optJSONObject(i);if(h!=null&&!h.optBoolean("arch",false)&&done(h.optJSONObject("done"),td))n++;}return n;}
}
