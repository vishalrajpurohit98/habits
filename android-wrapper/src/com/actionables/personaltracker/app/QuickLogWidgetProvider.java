package com.actionables.personaltracker.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class QuickLogWidgetProvider extends AppWidgetProvider {
    public static final String EXTRA_TYPE = "widget_type";
    public static final String TYPE_QUICK = "quick";
    public static final String TYPE_TASK = "task";
    public static final String TYPE_HABIT = "habit";
    public static final String TYPE_MONEY = "money";
    public static final String TYPE_WORKOUT = "workout";
    public static final String TYPE_MOOD = "mood";
    public static final String TYPE_SLEEP = "sleep";

    public static String type(){ return TYPE_QUICK; }

    @Override public void onUpdate(Context c, AppWidgetManager mgr, int[] ids) {
        for(int id:ids) update(c,mgr,id);
    }
    @Override public void onEnabled(Context c){ updateAll(c); }
    @Override public void onReceive(Context c, Intent i) {
        super.onReceive(c,i);
        if(Intent.ACTION_TIME_CHANGED.equals(i.getAction()) ||
           Intent.ACTION_TIMEZONE_CHANGED.equals(i.getAction()) ||
           Intent.ACTION_DATE_CHANGED.equals(i.getAction()) ||
           "com.actionables.personaltracker.app.REFRESH_WIDGETS".equals(i.getAction())) updateAll(c);
    }
    public static void updateAll(Context c){
        AppWidgetManager mgr=AppWidgetManager.getInstance(c);
        for(Class<? extends AppWidgetProvider> cl : new Class[]{
                QuickLogWidgetProvider.class, TaskWidgetProvider.class, HabitWidgetProvider.class,
                MoneyWidgetProvider.class, WorkoutWidgetProvider.class, MoodWidgetProvider.class, SleepWidgetProvider.class}) {
            int[] ids=mgr.getAppWidgetIds(new android.content.ComponentName(c,cl));
            for(int id:ids){
                try{
                    QuickLogWidgetProvider p=cl.getDeclaredConstructor().newInstance();
                    p.update(c,mgr,id);
                }catch(Exception ignored){}
            }
        }
    }
    protected void update(Context c, AppWidgetManager mgr, int id) {
        String t = (this instanceof TaskWidgetProvider)?TYPE_TASK:(this instanceof HabitWidgetProvider)?TYPE_HABIT:(this instanceof MoneyWidgetProvider)?TYPE_MONEY:(this instanceof WorkoutWidgetProvider)?TYPE_WORKOUT:(this instanceof MoodWidgetProvider)?TYPE_MOOD:(this instanceof SleepWidgetProvider)?TYPE_SLEEP:TYPE_QUICK;
        int layout = t.equals(TYPE_TASK)?com.actionables.personaltracker.app.R.layout.widget_tasks:
                     t.equals(TYPE_HABIT)?com.actionables.personaltracker.app.R.layout.widget_habits:
                     t.equals(TYPE_MONEY)?com.actionables.personaltracker.app.R.layout.widget_money:
                     t.equals(TYPE_WORKOUT)?com.actionables.personaltracker.app.R.layout.widget_workout:
                     t.equals(TYPE_MOOD)?com.actionables.personaltracker.app.R.layout.widget_mood:
                     t.equals(TYPE_SLEEP)?com.actionables.personaltracker.app.R.layout.widget_sleep:
                     com.actionables.personaltracker.app.R.layout.widget_quick_log;
        RemoteViews v=new RemoteViews(c.getPackageName(),layout);
        WidgetData.populate(c,v,t,id);
        mgr.updateAppWidget(id,v);
    }
}
