package com.actionables.personaltracker.app;

import android.app.*;
import android.os.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.speech.RecognizerIntent;
import android.text.InputType;
import android.view.*;
import android.widget.*;
import org.json.*;
import java.text.*;
import java.util.*;
import java.util.regex.*;

public class WidgetActionActivity extends Activity {
    static final int REQ_VOICE=7801;
    String type,cmd; int widgetId=-1;

    @Override public void onCreate(Bundle b){
        super.onCreate(b);
        type=getIntent().getStringExtra(WidgetData.TYPE);
        cmd=getIntent().getStringExtra(WidgetData.CMD);
        widgetId=getIntent().getIntExtra("appWidgetId",-1);
        if(type==null)type="quick"; if(cmd==null)cmd="detail";
        if("ai".equals(cmd)){startVoice();return;}
        if("select".equals(cmd)){selectActivity();return;}
        if("detail".equals(cmd)){showDetail();return;}
        if("add_task".equals(cmd)){taskDialog();return;}
        if("add_expense".equals(cmd)){expenseDialog();return;}
        if("check_habit".equals(cmd)){habitDialog();return;}
        if("add_mood".equals(cmd)){moodDialog();return;}
        if("new_workout".equals(cmd)){workoutDialog();return;}
        if("add_sleep".equals(cmd)){sleepDialog();return;}
        if("quick_workout".equals(cmd)){workoutLogDialog();return;}
        finish();
    }
    void styleDialog(Dialog d){Window w=d.getWindow();if(w!=null){w.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));w.setDimAmount(.28f);}}
    void selectActivity(){
        final String[] items={"💤 Sleep","🌱 Habit","✓ Task","🙂 Mood","🏋 Workout","₹ Expense","🎙 Ask AI"};
        new AlertDialog.Builder(this).setTitle("Quick Log").setItems(items,(d,which)->{
            String[] cmds={"add_sleep","check_habit","add_task","add_mood","new_workout","add_expense","ai"};
            Intent i=new Intent(this,WidgetActionActivity.class).setAction(WidgetData.ACTION);
            i.putExtra(WidgetData.CMD,cmds[which]);i.putExtra(WidgetData.TYPE,type);i.putExtra("appWidgetId",widgetId);
            startActivity(i);finish();
        }).setNegativeButton("Cancel",(d,w)->finish()).show();
    }
    EditText field(String hint,int input){
        EditText e=new EditText(this);e.setHint(hint);e.setInputType(input);e.setSingleLine(false);e.setPadding(18,8,18,8);return e;
    }
    void taskDialog(){
        LinearLayout l=box();EditText title=field("Task name",InputType.TYPE_CLASS_TEXT);
        EditText desc=field("Description (optional)",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        EditText due=field("Due date YYYY-MM-DD (optional)",InputType.TYPE_CLASS_DATETIME);
        EditText pri=field("Priority: high / medium / low",InputType.TYPE_CLASS_TEXT);
        l.addView(title);l.addView(desc);l.addView(due);l.addView(pri);
        AlertDialog d=new AlertDialog.Builder(this).setTitle("＋ Add Task").setView(l).setNegativeButton("Cancel",(x,w)->finish()).setPositiveButton("Add",null).create();
        d.setOnShowListener(x->d.getButton(-1).setOnClickListener(v->{String t=title.getText().toString().trim();if(t.isEmpty()){title.setError("Enter task name");return;}
            JSONObject s=WidgetData.state(this);JSONArray a=s.optJSONArray("tasks");if(a==null){a=new JSONArray();try{s.put("tasks",a);}catch(Exception ignored){}}
            JSONObject o=new JSONObject();try{o.put("id","wt"+System.currentTimeMillis());o.put("title",t);o.put("description",desc.getText().toString().trim());o.put("dueDate",due.getText().toString().trim());o.put("dueTime","");o.put("priority",normPri(pri.getText().toString()));o.put("status","open");o.put("reminders",new JSONArray());o.put("recurrence",new JSONObject().put("freq","none"));o.put("subtasks",new JSONArray());o.put("createdAt",System.currentTimeMillis());o.put("updatedAt",System.currentTimeMillis());a.put(o);WidgetData.save(this,s);Toast.makeText(this,"Task added",Toast.LENGTH_SHORT).show();d.dismiss();finish();}catch(Exception e){title.setError("Could not save");}});
        d.show();
    }
    String normPri(String p){p=p.toLowerCase(Locale.US);return p.contains("high")?"high":p.contains("low")?"low":"medium";}
    void expenseDialog(){
        JSONObject s=WidgetData.state(this);JSONArray ac=s.optJSONArray("accts");String[] names=new String[ac==null?0:ac.length()];String[] ids=new String[names.length];
        for(int i=0;i<names.length;i++){JSONObject a=ac.optJSONObject(i);names[i]=a==null?"Account":a.optString("name","Account");ids[i]=a==null?"":a.optString("id");}
        LinearLayout l=box();EditText amount=field("Amount",InputType.TYPE_CLASS_NUMBER|InputType.TYPE_NUMBER_FLAG_DECIMAL);EditText cat=field("Category",InputType.TYPE_CLASS_TEXT);EditText note=field("Note / payee",InputType.TYPE_CLASS_TEXT);
        Spinner sp=new Spinner(this);sp.setAdapter(new ArrayAdapter<String>(this,android.R.layout.simple_spinner_dropdown_item,names.length==0?new String[]{"No account configured"}:names));
        l.addView(amount);l.addView(cat);l.addView(note);l.addView(sp);
        AlertDialog d=new AlertDialog.Builder(this).setTitle("＋ Add Expense").setView(l).setNegativeButton("Cancel",(x,w)->finish()).setPositiveButton("Save",null).create();
        d.setOnShowListener(x->d.getButton(-1).setOnClickListener(v->{double am=parseD(amount.getText().toString());if(am<=0){amount.setError("Enter amount");return;}try{
            JSONArray tx=s.optJSONArray("tx");if(tx==null){tx=new JSONArray();s.put("tx",tx);}JSONObject o=new JSONObject();o.put("id","wt"+System.currentTimeMillis());o.put("d",WidgetData.today());o.put("kind","exp");o.put("amt",am);o.put("acct",ids.length>0?ids[sp.getSelectedItemPosition()]:"");o.put("cat",cat.getText().toString().trim().isEmpty()?"Other":cat.getText().toString().trim());o.put("note",note.getText().toString().trim());tx.put(o);WidgetData.save(this,s);Toast.makeText(this,"Expense saved",Toast.LENGTH_SHORT).show();d.dismiss();finish();
        }catch(Exception e){Toast.makeText(this,"Could not save expense",Toast.LENGTH_SHORT).show();}});
        d.show();
    }
    double parseD(String s){try{return Double.parseDouble(s.replace(",","").replace("₹","").trim());}catch(Exception e){return 0;}}
    void habitDialog(){
        JSONObject s=WidgetData.state(this);JSONArray a=s.optJSONArray("habits");ArrayList<String> names=new ArrayList<>();ArrayList<Integer> idx=new ArrayList<>();
        for(int i=0;a!=null&&i<a.length();i++){JSONObject h=a.optJSONObject(i);if(h!=null&&WidgetData.dueHabitToday(h,s)){names.add(h.optString("name","Habit"));idx.add(i);}}
        if(names.isEmpty()){new AlertDialog.Builder(this).setTitle("Habit").setMessage("No habit is due today.").setPositiveButton("OK",(d,w)->finish()).show();return;}
        String[] n=names.toArray(new String[0]);
        new AlertDialog.Builder(this).setTitle("✓ Check-in").setSingleChoiceItems(n,0,null).setNegativeButton("Cancel",(d,w)->finish()).setPositiveButton("Complete",null).create();
        AlertDialog d=new AlertDialog.Builder(this).setTitle("✓ Check-in").setSingleChoiceItems(n,0,null).setNegativeButton("Cancel",(x,w)->finish()).setPositiveButton("Complete",null).create();
        d.setOnShowListener(x->d.getButton(-1).setOnClickListener(v->{try{
            int pos=d.getListView().getCheckedItemPosition();JSONObject h=a.optJSONObject(idx.get(Math.max(0,pos)));if(h==null)return;String day=WidgetData.today();JSONObject done=h.optJSONObject("done");if(done==null){done=new JSONObject();h.put("done",done);}done.put(day,Math.max(1,h.optDouble("target",1)));WidgetData.save(this,s);Toast.makeText(this,"Habit completed",Toast.LENGTH_SHORT).show();d.dismiss();finish();
        }catch(Exception e){}}));d.show();
    }
    void moodDialog(){
        String[] m={"🤩 Excellent","😄 Happy","😌 Calm","😐 Neutral","😴 Tired","😢 Sad","😣 Stressed"};
        AlertDialog d=new AlertDialog.Builder(this).setTitle("🙂 Log Mood").setItems(m,(x,which)->{try{JSONObject s=WidgetData.state(this);JSONObject mo=s.optJSONObject("mood");if(mo==null){mo=new JSONObject();s.put("mood",mo);}mo.put(WidgetData.today(),which);WidgetData.save(this,s);Toast.makeText(this,"Mood saved",Toast.LENGTH_SHORT).show();}catch(Exception ignored){}finish();}).setNegativeButton("Cancel",(x,w)->finish()).create();d.show();
    }
    void sleepDialog(){
        LinearLayout l=box();EditText bed=field("Sleep time HH:MM",InputType.TYPE_CLASS_DATETIME);EditText wake=field("Wake time HH:MM",InputType.TYPE_CLASS_DATETIME);l.addView(bed);l.addView(wake);
        AlertDialog d=new AlertDialog.Builder(this).setTitle("💤 Log Sleep").setView(l).setNegativeButton("Cancel",(x,w)->finish()).setPositiveButton("Save",null).create();
        d.setOnShowListener(x->d.getButton(-1).setOnClickListener(v->{int mins=sleepMins(bed.getText().toString().trim(),wake.getText().toString().trim());if(mins<=0){wake.setError("Use HH:MM");return;}try{JSONObject s=WidgetData.state(this);JSONArray a=s.optJSONArray("sleep");if(a==null){a=new JSONArray();s.put("sleep",a);}JSONObject o=new JSONObject();o.put("d",WidgetData.today());o.put("bed",bed.getText().toString().trim());o.put("wake",wake.getText().toString().trim());o.put("mins",mins);o.put("note","");a.put(o);WidgetData.save(this,s);d.dismiss();finish();}catch(Exception ignored){}}));d.show();
    }
    int hm(String s){try{String[] p=s.split(":");int h=Integer.parseInt(p[0]),m=Integer.parseInt(p[1]);if(h<0||h>23||m<0||m>59)return -1;return h*60+m;}catch(Exception e){return -1;}}
    int sleepMins(String b,String w){int x=hm(b),y=hm(w);if(x<0||y<0)return -1;int z=y-x;if(z<=0)z+=1440;return z;}
    void workoutDialog(){
        LinearLayout l=box();EditText name=field("Workout name",InputType.TYPE_CLASS_TEXT);EditText exercises=field("Exercises (one per line)",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_MULTI_LINE);l.addView(name);l.addView(exercises);
        AlertDialog d=new AlertDialog.Builder(this).setTitle("🏋 New Workout").setView(l).setNegativeButton("Cancel",(x,w)->finish()).setPositiveButton("Create",null).create();
        d.setOnShowListener(x->d.getButton(-1).setOnClickListener(v->{String n=name.getText().toString().trim();if(n.isEmpty()){name.setError("Enter workout name");return;}try{JSONObject s=WidgetData.state(this);JSONArray a=s.optJSONArray("workoutPlans");if(a==null){a=new JSONArray();s.put("workoutPlans",a);}JSONObject o=new JSONObject();o.put("id","wp"+System.currentTimeMillis());o.put("name",n);o.put("exercises",new JSONArray(Arrays.asList(exercises.getText().toString().split("\\n"))));o.put("created",System.currentTimeMillis());a.put(o);WidgetData.save(this,s);Toast.makeText(this,"Workout created",Toast.LENGTH_SHORT).show();d.dismiss();finish();}catch(Exception e){}}));d.show();
    }
    void workoutLogDialog(){
        LinearLayout l=box();EditText ex=field("Exercise",InputType.TYPE_CLASS_TEXT);EditText weight=field("Weight",InputType.TYPE_CLASS_NUMBER|InputType.TYPE_NUMBER_FLAG_DECIMAL);EditText reps=field("Reps",InputType.TYPE_CLASS_NUMBER);l.addView(ex);l.addView(weight);l.addView(reps);
        AlertDialog d=new AlertDialog.Builder(this).setTitle("🏋 Quick Workout").setView(l).setNegativeButton("Cancel",(x,w)->finish()).setPositiveButton("Save",null).create();
        d.setOnShowListener(x->d.getButton(-1).setOnClickListener(v->{try{JSONObject s=WidgetData.state(this);JSONArray exs=s.optJSONArray("exs");String name=ex.getText().toString().trim();if(name.isEmpty()){ex.setError("Exercise");return;}String eid="we_"+name.toLowerCase(Locale.US).replaceAll("[^a-z0-9]+","_");JSONObject found=null;for(int i=0;exs!=null&&i<exs.length();i++){JSONObject q=exs.optJSONObject(i);if(q!=null&&name.equalsIgnoreCase(q.optString("name")))found=q;}if(found==null){if(exs==null){exs=new JSONArray();s.put("exs",exs);}found=new JSONObject();found.put("id",eid);found.put("name",name);found.put("mtype","reps");found.put("unit","reps");exs.put(found);}JSONArray wlog=s.optJSONArray("wlog");if(wlog==null){wlog=new JSONArray();s.put("wlog",wlog);}JSONObject row=new JSONObject();row.put("id","w"+System.currentTimeMillis());row.put("exId",found.optString("id"));row.put("d",WidgetData.today());JSONArray sets=new JSONArray();sets.put(parseD(weight.getText().toString())+" x "+parseD(reps.getText().toString()));row.put("sets",sets);row.put("created",System.currentTimeMillis());wlog.put(row);WidgetData.save(this,s);d.dismiss();finish();}catch(Exception e){Toast.makeText(this,"Could not save workout",Toast.LENGTH_SHORT).show();}}));d.show();
    }
    void showDetail(){
        JSONObject s=WidgetData.state(this);String msg="";
        if("money".equals(type))msg="Select an account in the widget to see its balance.";
        else if("task".equals(type))msg="Tap a task in the app for full details.";
        else if("habit".equals(type))msg="Only today's applicable habits are shown.";
        else if("workout".equals(type))msg="Use Quick Log for a set or New Workout to create a routine.";
        else if("mood".equals(type))msg="Today's mood can be changed from this widget.";
        else if("sleep".equals(type))msg="Sleep duration is calculated from bed and wake time.";
        else msg="Choose an activity to log.";
        new AlertDialog.Builder(this).setTitle("Quick Log").setMessage(msg).setPositiveButton("OK",(d,w)->finish()).show();
    }
    LinearLayout box(){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);l.setPadding(18,4,18,2);return l;}
    void startVoice(){
        if(Build.VERSION.SDK_INT>=23&&checkSelfPermission("android.permission.RECORD_AUDIO")!=PackageManager.PERMISSION_GRANTED){requestPermissions(new String[]{"android.permission.RECORD_AUDIO"},REQ_VOICE);return;}
        try{Intent i=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);i.putExtra(RecognizerIntent.EXTRA_LANGUAGE,"en-IN");i.putExtra(RecognizerIntent.EXTRA_PROMPT,"Say what you want to log");startActivityForResult(i,REQ_VOICE);}
        catch(Exception e){Toast.makeText(this,"Voice input unavailable",Toast.LENGTH_SHORT).show();finish();}
    }
    @Override protected void onActivityResult(int req,int result,Intent data){
        super.onActivityResult(req,result,data);
        if(req==REQ_VOICE){
            if(result==RESULT_OK&&data!=null){ArrayList<String> r=data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);String text=r!=null&&!r.isEmpty()?r.get(0):"";parseVoice(text);}
            else finish();
        }
    }
    void parseVoice(String text){
        String t=text.toLowerCase(Locale.US).trim();
        try{
            if(t.contains("spend")||t.contains("spent")||t.contains("expense")||t.matches(".*\\b\\d+[.,]?\\d*\\b.*(food|lunch|dinner|travel|uber|shopping).*")) {aiExpense(text);return;}
            if(t.contains("task")||t.contains("todo")||t.contains("to do")||t.contains("remind me to")) {aiTask(text);return;}
            if(t.contains("slept")||t.contains("sleep")||t.contains("woke")) {aiSleep(text);return;}
            if(t.contains("mood")||t.contains("happy")||t.contains("sad")||t.contains("stressed")||t.contains("tired")||t.contains("calm")) {aiMood(text);return;}
            if(t.contains("workout")||t.contains("worked out")||t.contains("bench")||t.contains("squat")||t.contains("reps")||t.contains("kilos")) {aiWorkout(text);return;}
            if(t.contains("habit")||t.contains("completed")||t.contains("did my")) {aiHabit(text);return;}
            new AlertDialog.Builder(this).setTitle("AI").setMessage("I couldn't identify the activity.\n\n"+text).setPositiveButton("OK",(d,w)->finish()).show();
        }catch(Exception e){Toast.makeText(this,"Could not understand command",Toast.LENGTH_SHORT).show();finish();}
    }
    void confirm(String title,String msg,Runnable save){
        new AlertDialog.Builder(this).setTitle(title).setMessage(msg).setNegativeButton("Cancel",(d,w)->finish()).setPositiveButton("Confirm",(d,w)->{save.run();finish();}).show();
    }
    String number(String t){Matcher m=Pattern.compile("(\\d+(?:[.,]\\d+)?)").matcher(t);return m.find()?m.group(1):"";}
    void aiExpense(String text){String n=number(text);if(n.isEmpty()){expenseDialog();return;}String cat=text.toLowerCase(Locale.US).contains("lunch")||text.toLowerCase(Locale.US).contains("dinner")||text.toLowerCase(Locale.US).contains("food")?"Food":text.toLowerCase(Locale.US).contains("uber")||text.toLowerCase(Locale.US).contains("travel")?"Transport":text.toLowerCase(Locale.US).contains("amazon")||text.toLowerCase(Locale.US).contains("shopping")?"Shopping":"Other";confirm("AI Expense","₹"+n+" · "+cat+"\n"+text,()->saveAiExpense(parseD(n),cat,text));}
    void saveAiExpense(double amt,String cat,String note){try{JSONObject s=WidgetData.state(this);JSONArray a=s.optJSONArray("tx");if(a==null){a=new JSONArray();s.put("tx",a);}JSONObject o=new JSONObject();o.put("id","ai"+System.currentTimeMillis());o.put("d",WidgetData.today());o.put("kind","exp");o.put("amt",amt);o.put("cat",cat);o.put("note",note);o.put("acct",getSelectedAccount(s));a.put(o);WidgetData.save(this,s);}catch(Exception ignored){}}
    String getSelectedAccount(JSONObject s){String sel=getSharedPreferences(WidgetData.PREF,0).getString("widget_account","");if(!sel.isEmpty())return sel;JSONArray a=s.optJSONArray("accts");return a!=null&&a.length()>0?a.optJSONObject(0).optString("id",""):"";}
    void aiTask(String text){String title=text.replaceFirst("(?i)^(add\\s+)?(a\\s+)?(task|todo|to do)\\s*[:\\-]?\\s*","").replaceFirst("(?i)^remind me to\\s*","").trim();if(title.isEmpty())title=text;confirm("AI Task","Task:\n"+title+"\n\n"+text,()->saveAiTask(title));}
    void saveAiTask(String title){try{JSONObject s=WidgetData.state(this);JSONArray a=s.optJSONArray("tasks");if(a==null){a=new JSONArray();s.put("tasks",a);}JSONObject o=new JSONObject();o.put("id","ai"+System.currentTimeMillis());o.put("title",title);o.put("description","");o.put("status","open");o.put("priority","medium");o.put("dueDate","");o.put("subtasks",new JSONArray());o.put("reminders",new JSONArray());o.put("recurrence",new JSONObject().put("freq","none"));o.put("createdAt",System.currentTimeMillis());o.put("updatedAt",System.currentTimeMillis());a.put(o);WidgetData.save(this,s);}catch(Exception ignored){}}
    void aiSleep(String text){Matcher m=Pattern.compile("(\\d{1,2}(?::\\d{2})?)\\s*(am|pm)?[^\\d]+(\\d{1,2}(?::\\d{2})?)\\s*(am|pm)?",Pattern.CASE_INSENSITIVE).matcher(text);if(!m.find()){sleepDialog();return;}String b=normTime(m.group(1),m.group(2)),w=normTime(m.group(3),m.group(4));int mins=sleepMins(b,w);if(mins<=0){sleepDialog();return;}confirm("AI Sleep",b+" → "+w+" ("+(mins/60)+"h "+(mins%60)+"m)",()->saveSleep(b,w,mins));}
    String normTime(String x,String ap){String[] p=x.split(":");int h=Integer.parseInt(p[0]),mi=p.length>1?Integer.parseInt(p[1]):0;if(ap!=null){if(h==12)h=0;if(ap.equalsIgnoreCase("pm"))h+=12;}return String.format(Locale.US,"%02d:%02d",h,mi);}
    void saveSleep(String b,String w,int mins){try{JSONObject s=WidgetData.state(this);JSONArray a=s.optJSONArray("sleep");if(a==null){a=new JSONArray();s.put("sleep",a);}JSONObject o=new JSONObject();o.put("d",WidgetData.today());o.put("bed",b);o.put("wake",w);o.put("mins",mins);a.put(o);WidgetData.save(this,s);}catch(Exception ignored){}}
    void aiMood(String text){int idx=text.toLowerCase(Locale.US).contains("stressed")?6:text.toLowerCase(Locale.US).contains("sad")?5:text.toLowerCase(Locale.US).contains("tired")?4:text.toLowerCase(Locale.US).contains("calm")?2:text.toLowerCase(Locale.US).contains("happy")||text.toLowerCase(Locale.US).contains("good")?1:3;confirm("AI Mood",new String[]{"Excellent","Happy","Calm","Neutral","Tired","Sad","Stressed"}[idx]+"\n"+text,()->{try{JSONObject s=WidgetData.state(this);JSONObject m=s.optJSONObject("mood");if(m==null){m=new JSONObject();s.put("mood",m);}m.put(WidgetData.today(),idx);WidgetData.save(this,s);}catch(Exception ignored){}});}
    void aiHabit(String text){confirm("AI Habit","Complete the matching habit for today?\n"+text,()->{try{JSONObject s=WidgetData.state(this);JSONArray a=s.optJSONArray("habits");String day=WidgetData.today();for(int i=0;a!=null&&i<a.length();i++){JSONObject h=a.optJSONObject(i);if(h!=null&&WidgetData.dueHabitToday(h,s)&&text.toLowerCase(Locale.US).contains(h.optString("name","").toLowerCase(Locale.US))){JSONObject dn=h.optJSONObject("done");if(dn==null){dn=new JSONObject();h.put("done",dn);}dn.put(day,Math.max(1,h.optDouble("target",1)));break;}}WidgetData.save(this,s);}catch(Exception ignored){}});}
    void aiWorkout(String text){Matcher m=Pattern.compile("(.+?)\\s+(\\d+(?:\\.\\d+)?)\\s*(?:kg|kilos|kgs)?\\s*(?:for|x)\\s*(\\d+)\\s*(?:reps|rep)",Pattern.CASE_INSENSITIVE).matcher(text);if(m.find()){confirm("AI Workout",m.group(1).trim()+"\n"+m.group(2)+" kg × "+m.group(3)+" reps",()->saveWorkout(m.group(1).trim(),m.group(2),m.group(3)));}else{confirm("AI Workout","Log workout:\n"+text,()->saveWorkout(text,"",""));}}
    void saveWorkout(String name,String weight,String reps){try{JSONObject s=WidgetData.state(this);JSONArray exs=s.optJSONArray("exs");if(exs==null){exs=new JSONArray();s.put("exs",exs);}String id="we_"+name.toLowerCase(Locale.US).replaceAll("[^a-z0-9]+","_");JSONObject ex=new JSONObject();ex.put("id",id);ex.put("name",name);ex.put("mtype","reps");ex.put("unit","reps");exs.put(ex);JSONArray w=s.optJSONArray("wlog");if(w==null){w=new JSONArray();s.put("wlog",w);}JSONObject row=new JSONObject();row.put("id","ai"+System.currentTimeMillis());row.put("exId",id);row.put("d",WidgetData.today());JSONArray sets=new JSONArray();sets.put(weight+" x "+reps);row.put("sets",sets);w.put(row);WidgetData.save(this,s);}catch(Exception ignored){}}
}
