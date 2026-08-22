package com.personaltracker.app;

import android.app.*;
import android.content.*;
import android.os.*;
import org.json.*;
import java.text.SimpleDateFormat;
import java.util.*;

public class NativeAlarms {
 public static final String CHANNEL_ID="habit_reminders_v1";
 static final String PREF="scheduled_alarms_json";
 static final String ACTION="com.personaltracker.app.ACTION_REMINDER";
 static final int TEST_CODE=0x7F00AA11;

 static AlarmManager am(Context c){return (AlarmManager)c.getSystemService(Context.ALARM_SERVICE);}
 static PendingIntent pi(Context c,int code,JSONObject a){
   Intent i=new Intent(c,NotifReceiver.class).setAction(ACTION);
   try{
     i.putExtra("habit",a.optString("h",""));
     i.putExtra("name",a.optString("n","Reminder"));
     i.putExtra("emoji",a.optString("e","🔔"));
     i.putExtra("id",a.optString("c",String.valueOf(code)));
     i.putExtra("date",a.optString("d",""));
     i.putExtra("missed",a.optBoolean("m",false));
   }catch(Exception ignored){}
   return PendingIntent.getBroadcast(c,code,i,PendingIntent.FLAG_UPDATE_CURRENT|(Build.VERSION.SDK_INT>=23?PendingIntent.FLAG_IMMUTABLE:0));
 }
 static void cancelStored(Context c){
   String old=c.getSharedPreferences(PREF,0).getString("json","[]");
   try{JSONArray arr=new JSONArray(old); for(int i=0;i<arr.length();i++){JSONObject a=arr.getJSONObject(i);int code=a.optInt("c",0); if(code!=0)am(c).cancel(pi(c,code,a));}}catch(Exception ignored){}
 }
 public static void schedule(Context c,String json){
   cancelStored(c);
   if(json==null)json="[]";
   c.getSharedPreferences(PREF,0).edit().putString("json",json).apply();
   setJson(c,json);
 }
 static void setJson(Context c,String json){
   try{
     JSONArray arr=new JSONArray(json);
     for(int i=0;i<arr.length();i++){
       JSONObject a=arr.getJSONObject(i); long t=a.optLong("t",0); int code=a.optInt("c",0);
       if(code==0||t<=System.currentTimeMillis())continue;
       set(c,code,a,t);
     }
   }catch(Exception ignored){}
 }
 static void set(Context c,int code,JSONObject a,long t){
   PendingIntent p=pi(c,code,a); AlarmManager x=am(c);
   if(Build.VERSION.SDK_INT>=31 && x.canScheduleExactAlarms()) x.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,t,p);
   else if(Build.VERSION.SDK_INT>=23) x.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,t,p);
   else x.set(AlarmManager.RTC_WAKEUP,t,p);
 }
 public static void restore(Context c){
   // Prefer rebuilding from the latest saved app state so reminders survive reboot/update.
   refreshFromState(c);
   if(c.getSharedPreferences(PREF,0).getString("json","[]").equals("[]")) setJson(c,"[]");
 }
 public static void refreshFromState(Context c){
   String state=c.getSharedPreferences("personal_tracker_native",Context.MODE_PRIVATE).getString("state","");
   if(state==null||state.isEmpty()) return;
   try{
     JSONObject s=new JSONObject(state); JSONArray hs=s.optJSONArray("habits");
     if(hs==null){ schedule(c,"[]"); return; }
     JSONArray out=new JSONArray(); long now=System.currentTimeMillis(); Calendar base=Calendar.getInstance();
     for(int i=0;i<hs.length();i++){
       JSONObject h=hs.optJSONObject(i); if(h==null||h.optBoolean("arch",false))continue;
       JSONObject rem=h.optJSONObject("rem"); if(rem==null)continue;
       JSONArray times=rem.optJSONArray("times"); boolean missed=rem.optBoolean("missed",false);
       if((times==null||times.length()==0)&&!missed)continue;
       for(int day=0;day<21;day++){
         Calendar d=(Calendar)base.clone(); d.add(Calendar.DAY_OF_MONTH,day); String ds=fmt(d);
         if(!dueOn(s,h,d,ds))continue;
         if(times!=null) for(int j=0;j<times.length();j++) add(out,h,ds,times.optString(j),false,now);
         if(missed) add(out,h,ds,"21:30",true,now);
       }
     }
     schedule(c,out.toString());
   }catch(Exception ignored){}
 }
 static void add(JSONArray out,JSONObject h,String ds,String hm,boolean missed,long now){
   try{String[] p=hm.split(":"); if(p.length!=2)return; Calendar d=parse(ds); d.set(Calendar.HOUR_OF_DAY,Integer.parseInt(p[0])); d.set(Calendar.MINUTE,Integer.parseInt(p[1])); d.set(Calendar.SECOND,0); d.set(Calendar.MILLISECOND,0); long t=d.getTimeInMillis(); if(t<=now)return;
     JSONObject a=new JSONObject(); String id=h.optString("id",h.optString("name","habit")); a.put("c",hash(id+"|"+ds+"|"+hm)); a.put("t",t); a.put("h",id); a.put("n",h.optString("name","Reminder")); a.put("e",h.optString("emoji","🔔")); a.put("d",ds); a.put("m",missed); out.put(a);
   }catch(Exception ignored){}
 }
 static boolean dueOn(JSONObject state,JSONObject h,Calendar d,String ds){
   if(!h.optString("start","").isEmpty()&&ds.compareTo(h.optString("start"))<0)return false;
   if(!h.optString("end","").isEmpty()&&ds.compareTo(h.optString("end"))>0)return false;
   JSONObject set=state.optJSONObject("set"); if(set!=null){String vf=set.optString("vacFrom","");String vu=set.optString("vacUntil","");if(!vf.isEmpty()&&!vu.isEmpty()&&ds.compareTo(vf)>=0&&ds.compareTo(vu)<=0)return false;}
   JSONObject sch=h.optJSONObject("sched"); if(sch==null)return true; String k=sch.optString("kind","daily"); int dow=d.get(Calendar.DAY_OF_WEEK)-1, dom=d.get(Calendar.DAY_OF_MONTH);
   if("daily".equals(k))return true;
   if("weekend".equals(k))return dow==0||dow==6;
   if("odd".equals(k))return dom%2==1;
   if("even".equals(k))return dom%2==0;
   if("dow".equals(k)){JSONArray a=sch.optJSONArray("dows");if(a!=null)for(int i=0;i<a.length();i++)if(a.optInt(i,-1)==dow)return true;return false;}
   if("everyx".equals(k)){int x=Math.max(1,sch.optInt("x",1));String start=h.optString("start","");if(start.isEmpty())start=h.optString("created",ds);try{return daysBetween(parse(start),d)%x==0;}catch(Exception e){return false;}}
   if("wquota".equals(k)||"mquota".equals(k)){int q=Math.max(1,sch.optInt("quota",1));return quotaCount(h,d,"wquota".equals(k))<q || isDone(h,ds);}
   return true;
 }
 static int quotaCount(JSONObject h,Calendar d,boolean week){
   JSONObject done=h.optJSONObject("done"); if(done==null)return 0; Calendar from=(Calendar)d.clone(); if(week){int dow=from.get(Calendar.DAY_OF_WEEK);int delta=dow-Calendar.MONDAY;from.add(Calendar.DAY_OF_MONTH,-delta);} else from.set(Calendar.DAY_OF_MONTH,1); Calendar to=(Calendar)from.clone(); if(week)to.add(Calendar.DAY_OF_MONTH,6); else to.set(Calendar.DAY_OF_MONTH,from.getActualMaximum(Calendar.DAY_OF_MONTH)); int n=0; Calendar x=(Calendar)from.clone(); while(!x.after(to)){if(isDone(h,fmt(x)))n++;x.add(Calendar.DAY_OF_MONTH,1);} return n;
 }
 public static boolean isDone(JSONObject h,String ds){JSONObject done=h.optJSONObject("done"); if(done==null)return false; double v=done.optDouble(ds,0); double target=h.optDouble("target",1); String type=h.optString("type",""); if("count".equals(type)||"time".equals(type)||"money".equals(type))target=Math.max(1,target); else target=1; return v>=target;}
 static String fmt(Calendar d){return new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(d.getTime());}
 static Calendar parse(String s)throws Exception{Calendar c=Calendar.getInstance();Date x=new SimpleDateFormat("yyyy-MM-dd",Locale.US).parse(s);c.setTime(x);c.set(Calendar.HOUR_OF_DAY,0);c.set(Calendar.MINUTE,0);c.set(Calendar.SECOND,0);c.set(Calendar.MILLISECOND,0);return c;}
 static long daysBetween(Calendar a,Calendar b){return Math.round((b.getTimeInMillis()-a.getTimeInMillis())/86400000.0);}
 static int hash(String s){int h=0;for(int i=0;i<s.length();i++)h=((h<<5)-h)+s.charAt(i);return Math.abs(h==Integer.MIN_VALUE?0:h);}
 public static void test(Context c){JSONObject a=new JSONObject();try{a.put("h","test");a.put("n","Test reminder");a.put("e","🔔");a.put("c",TEST_CODE);a.put("d",fmt(Calendar.getInstance()));}catch(Exception ignored){}set(c,TEST_CODE,a,System.currentTimeMillis()+5000);}
}
