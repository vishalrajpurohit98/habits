package com.actionables.personaltracker.app;

import android.app.*;
import android.content.*;
import android.os.Build;
import android.graphics.Color;
import android.net.Uri;

public class NotifReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent in) {
        String habit=in.getStringExtra("habit");
        String task=in.getStringExtra("task");
        String name=in.getStringExtra("name");
        String emoji=in.getStringExtra("emoji");
        String id=in.getStringExtra("id");
        String body=in.getStringExtra("body");
        Intent open=new Intent(c,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if(habit!=null)open.putExtra("habit",habit);
        if(task!=null && !task.isEmpty())open.putExtra("task",task);
        PendingIntent pi=PendingIntent.getActivity(c,Math.abs((id==null?"n":id).hashCode()),open,
                PendingIntent.FLAG_UPDATE_CURRENT|(Build.VERSION.SDK_INT>=23?PendingIntent.FLAG_IMMUTABLE:0));
        Notification.Builder b=Build.VERSION.SDK_INT>=26
                ?new Notification.Builder(c,NativeAlarms.CHANNEL_ID)
                :new Notification.Builder(c);
        b.setSmallIcon(com.actionables.personaltracker.app.R.drawable.app_icon)
         .setContentTitle((emoji==null?"🔔":emoji)+" "+(name==null?"Reminder":name))
         .setContentText(body==null?"Time for your reminder.":body)
         .setAutoCancel(true).setContentIntent(pi).setCategory(Notification.CATEGORY_REMINDER)
         .setColor(Color.rgb(255,174,31));
        int nid=Math.abs((id==null?String.valueOf(System.currentTimeMillis()):id).hashCode());
        /* actionable reminders: log the habit / task or snooze without opening the app */
        if((habit!=null&&!habit.isEmpty())||(task!=null&&!task.isEmpty())){
            int fl=PendingIntent.FLAG_UPDATE_CURRENT|(Build.VERSION.SDK_INT>=23?PendingIntent.FLAG_IMMUTABLE:0);
            Intent d=new Intent(c,NotifActionReceiver.class).setAction(NotifActionReceiver.DONE); d.putExtras(in); d.putExtra("nid",nid);
            Intent z=new Intent(c,NotifActionReceiver.class).setAction(NotifActionReceiver.SNOOZE); z.putExtras(in); z.putExtra("nid",nid);
            PendingIntent pd=PendingIntent.getBroadcast(c,nid*31+1,d,fl), pz=PendingIntent.getBroadcast(c,nid*31+2,z,fl);
            if(Build.VERSION.SDK_INT>=23){
                android.graphics.drawable.Icon ic=android.graphics.drawable.Icon.createWithResource(c,com.actionables.personaltracker.app.R.drawable.app_icon);
                b.addAction(new Notification.Action.Builder(ic,"Done",pd).build());
                b.addAction(new Notification.Action.Builder(ic,"Snooze 1h",pz).build());
            } else {
                b.addAction(new Notification.Action.Builder(0,"Done",pd).build());
                b.addAction(new Notification.Action.Builder(0,"Snooze 1h",pz).build());
            }
        }
        ((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).notify(nid,b.build());
    }
}
