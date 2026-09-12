package com.actionables.personaltracker.app;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.provider.MediaStore;
import android.provider.Settings;
import android.speech.RecognizerIntent;
import android.text.TextUtils;
import android.view.*;
import android.webkit.*;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import android.util.Base64;

public class MainActivity extends Activity {
    static final int MIN_SDK = 29;
    static final int REQ_NOTIF = 401;
    static final int REQ_EXACT = 402;
    static final int REQ_IMPORT = 403;
    static final int REQ_PHOTO = 404;
    static final int REQ_CAMERA = 406;
    static final int REQ_SPEECH = 407;
    static final int REQ_MIC_PERM = 408;

    static final String APP_HOST = "personal-tracker.local";
    WebView web;
    SharedPreferences prefs;
    String pendingImportCallback = "importNative";
    String pendingImportMode = "backup";
    String pendingPhotoDir = "photos";
    Uri pendingCameraUri = null;
    boolean pendingCameraPermission = false;
    String pendingSpeechId = null;
    String pendingSpeechPrompt = "";

    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        prefs = getSharedPreferences("personal_tracker_native", MODE_PRIVATE);
        createNotificationChannel();
        configureWindow();
        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK); // startup flash fix: WebView surface is white until first paint
        configureWebView(web);
        setContentView(web);
        web.addJavascriptInterface(new Bridge(), "Bridge");
        web.loadUrl("https://"+APP_HOST+"/index.html");
    }

    void configureWindow() {
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        if (Build.VERSION.SDK_INT >= 29) {
            getWindow().setStatusBarContrastEnforced(false);
            getWindow().setNavigationBarContrastEnforced(false);
        }
    }

    void configureWebView(WebView w) {
        WebSettings s = w.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= 26) s.setSafeBrowsingEnabled(true);
        w.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u=request.getUrl();
                if (APP_HOST.equalsIgnoreCase(u.getHost())) {
                    String path=u.getPath();
                    if (path==null || path.equals("/") || path.isEmpty()) path="/index.html";
                    if (path.startsWith("/")) path=path.substring(1);
                    if (path.contains("..")) return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",null,null);
                    try {
                        InputStream in=getAssets().open("web/"+path);
                        String mime;
                        String lower=path.toLowerCase(Locale.US);
                        if(lower.endsWith(".html")) mime="text/html";
                        else if(lower.endsWith(".js")) mime="application/javascript";
                        else if(lower.endsWith(".css")) mime="text/css";
                        else if(lower.endsWith(".json")||lower.endsWith(".map")) mime="application/json";
                        else if(lower.endsWith(".png")) mime="image/png";
                        else if(lower.endsWith(".jpg")||lower.endsWith(".jpeg")) mime="image/jpeg";
                        else if(lower.endsWith(".svg")) mime="image/svg+xml";
                        else if(lower.endsWith(".ttf")) mime="font/ttf";
                        else mime="application/octet-stream";
                        Map<String,String> headers=new HashMap<>();
                        headers.put("Cache-Control","no-cache");
                        return new WebResourceResponse(mime,"UTF-8",200,"OK",headers,in);
                    } catch(Exception e) {
                        return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",null,null);
                    }
                }
                return super.shouldInterceptRequest(view,request);
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u=request.getUrl();
                String scheme=u.getScheme();
                if ("mailto".equalsIgnoreCase(scheme) || "tel".equalsIgnoreCase(scheme) || "geo".equalsIgnoreCase(scheme)) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW,u)); return true; } catch(Exception ignored) {}
                }
                return false;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) toast("Page could not be loaded");
            }
        });
        w.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage m) {
                return true;
            }
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                // The app's own import path uses Bridge.pickImport(). This also supports ordinary <input type=file>.
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false);
                fileChooserCallback = cb;
                try { startActivityForResult(i, REQ_IMPORT); } catch (Exception e) { fileChooserCallback = null; return false; }
                return true;
            }
        });
        w.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            try {
                DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
                r.setMimeType(mimeType);
                r.addRequestHeader("User-Agent", userAgent);
                r.setTitle(URLUtil.guessFileName(url, contentDisposition, mimeType));
                r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                if (Build.VERSION.SDK_INT >= 29) {
                    r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,
                            URLUtil.guessFileName(url, contentDisposition, mimeType));
                }
                ((DownloadManager)getSystemService(DOWNLOAD_SERVICE)).enqueue(r);
            } catch (Exception e) { toast("Download failed"); }
        });
    }

    ValueCallback<Uri[]> fileChooserCallback;

    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent); setIntent(intent); }

    @Override public void onResume() {
        super.onResume();
        if (web != null) {
            web.postDelayed(() -> web.evaluateJavascript("window.onNativeResume&&window.onNativeResume()", null), 200);
        }
        NativeAlarms.restore(this);
    }

    @Override public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel c = new NotificationChannel(
                    NativeAlarms.CHANNEL_ID, "Habit reminders", NotificationManager.IMPORTANCE_HIGH);
            c.setDescription("Scheduled habit and journal reminders");
            c.enableVibration(true);
            c.setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI,
                    new android.media.AudioAttributes.Builder()
                            .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
                            .build());
            ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(c);
        }
    }

    void requestNotifications() {
        if (Build.VERSION.SDK_INT >= 33 &&
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF);
        } else toast("Notifications are enabled");
    }

    void requestExact() {
        if (Build.VERSION.SDK_INT >= 31) {
            AlarmManager am = (AlarmManager)getSystemService(ALARM_SERVICE);
            if (!am.canScheduleExactAlarms()) {
                try {
                    startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                            Uri.parse("package:"+getPackageName())));
                    return;
                } catch (Exception ignored) {}
            }
        }
        toast("Exact timing is available");
    }

    void pickDate(int y, int m, int d) {
        DatePickerDialog dlg = new DatePickerDialog(this, (v, yy, mm, dd) ->
                js("window.dateResult&&window.dateResult('"+String.format(Locale.US,"%04d-%02d-%02d",yy,mm+1,dd)+"')"),
                y,m,d);
        dlg.show();
    }

    void pickTime(int h, int m) {
        TimePickerDialog dlg = new TimePickerDialog(this, (v, hh, mm) ->
                js("window.timeResult&&window.timeResult('"+String.format(Locale.US,"%02d:%02d",hh,mm)+"')"),
                h,m,true);
        dlg.show();
    }

    void js(String code) { if (web != null) web.post(() -> web.evaluateJavascript(code, null)); }

    void importFile() { importFile("backup"); }

    void importFile(String mode) {
        pendingImportMode = (mode == null || mode.length() == 0) ? "backup" : mode;
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType("*/*");
        i.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                "text/csv",
                "text/comma-separated-values",
                "application/csv",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/json"
        });
        i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false);
        try { startActivityForResult(i, REQ_IMPORT); } catch (Exception e) { toast("File picker unavailable"); }
    }

    String displayName(Uri uri) {
        try {
            android.database.Cursor c = getContentResolver().query(uri, null, null, null, null);
            if (c != null) {
                int ix = c.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);
                if (ix >= 0 && c.moveToFirst()) {
                    String n = c.getString(ix);
                    c.close();
                    if (n != null && !n.isEmpty()) return n;
                }
                c.close();
            }
        } catch (Exception ignored) {}
        String p = uri == null ? null : uri.getLastPathSegment();
        return (p == null || p.isEmpty()) ? "import.csv" : p;
    }

    void pickPhoto() {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("image/*");
        try { startActivityForResult(i, REQ_PHOTO); } catch (Exception e) { toast("Photo picker unavailable"); }
    }

    void capturePhoto() {
        if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            pendingCameraPermission = true;
            requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA);
            return;
        }
        launchCamera();
    }

    void launchCamera() {
        try {
            String name = "receipt_" + System.currentTimeMillis() + ".jpg";
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, name);
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
            if (Build.VERSION.SDK_INT >= 29) values.put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/PersonalTracker");
            pendingCameraUri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
            if (pendingCameraUri == null) { toast("Could not prepare camera"); return; }

            Intent i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            i.putExtra(MediaStore.EXTRA_OUTPUT, pendingCameraUri);
            i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            if (i.resolveActivity(getPackageManager()) == null) { toast("Camera unavailable"); return; }
            startActivityForResult(i, REQ_CAMERA);
        } catch (Exception e) {
            pendingCameraUri = null;
            toast("Could not open camera");
        }
    }

    @Override public void onRequestPermissionsResult(int req, String[] permissions, int[] grants) {
        super.onRequestPermissionsResult(req, permissions, grants);
        if (req == REQ_CAMERA) {
            boolean ok = grants.length > 0 && grants[0] == PackageManager.PERMISSION_GRANTED;
            pendingCameraPermission = false;
            if (ok) launchCamera(); else toast("Camera permission denied");
        } else if (req == REQ_MIC_PERM) {
            boolean ok = grants.length > 0 && grants[0] == PackageManager.PERMISSION_GRANTED;
            if (ok) launchSpeech();
            else {
                String id = pendingSpeechId; pendingSpeechId = null;
                if (id != null) js("window._speechResult&&window._speechResult(" + JSONObject.quote(id) + ",'', " + JSONObject.quote("permission-denied") + ")");
                toast("Microphone permission denied");
            }
        }
    }

    void startSpeech(String id, String promptText) {
        pendingSpeechId = id;
        pendingSpeechPrompt = promptText != null ? promptText : "";
        if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC_PERM);
            return;
        }
        launchSpeech();
    }

    static final int PINNED_NOTIF_ID = 0x51CB;
    static final String PIN_CHANNEL = "pinned_tasks_v1";
    void showPinnedTasksNotif(String json){
        try{
            if(Build.VERSION.SDK_INT>=33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED){ return; }
            org.json.JSONArray arr = new org.json.JSONArray(json);
            if(arr.length()==0){ hidePinnedTasksNotif(); return; }
            NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
            if(Build.VERSION.SDK_INT>=26){
                NotificationChannel ch=new NotificationChannel(PIN_CHANNEL, "Pinned tasks", NotificationManager.IMPORTANCE_LOW);
                ch.setShowBadge(false); nm.createNotificationChannel(ch);
            }
            StringBuilder big=new StringBuilder();
            for(int i=0;i<arr.length();i++){ org.json.JSONObject o=arr.optJSONObject(i); if(o==null)continue; if(i>0)big.append("\n"); big.append("\u2022 ").append(o.optString("title","")); String due=o.optString("due",""); if(due.length()>0) big.append("  \u00b7 ").append(due); }
            Intent ti=new Intent(this, MainActivity.class); ti.putExtra("tab","pgTasks"); ti.putExtra("fromWidget","1");
            ti.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags=PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT>=23?PendingIntent.FLAG_IMMUTABLE:0);
            PendingIntent pi=PendingIntent.getActivity(this, 0x51CC, ti, flags);
            Notification.Builder bld=(Build.VERSION.SDK_INT>=26)?new Notification.Builder(this,PIN_CHANNEL):new Notification.Builder(this);
            bld.setSmallIcon(getApplicationInfo().icon)
               .setContentTitle("\uD83D\uDCCC Pinned tasks ("+arr.length()+")")
               .setContentText(arr.optJSONObject(0)!=null?arr.optJSONObject(0).optString("title",""):"")
               .setStyle(new Notification.BigTextStyle().bigText(big.toString()))
               .setOngoing(true).setContentIntent(pi).setPriority(Notification.PRIORITY_LOW)
               .setVisibility(Notification.VISIBILITY_PUBLIC);
            nm.notify(PINNED_NOTIF_ID, bld.build());
        }catch(Exception e){}
    }
    void hidePinnedTasksNotif(){ try{ ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).cancel(PINNED_NOTIF_ID); }catch(Exception e){} }

    static final int QUICK_ADD_NOTIF_ID = 0x51CA;
    static final String QUICK_CHANNEL = "quick_add_v1";
    PendingIntent quickPI(String key){ return quickPI(key, "1"); }
    PendingIntent quickPI(String key, String val){
        Intent i = new Intent(this, MainActivity.class);
        i.putExtra(key, val); i.putExtra("fromWidget","1");
        i.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT>=23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        return PendingIntent.getActivity(this, (key+val).hashCode()&0xffff, i, flags);
    }
    void showQuickAddNotif(){
        try{
            if(Build.VERSION.SDK_INT>=33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED){ requestNotifications(); return; }
            NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
            if(Build.VERSION.SDK_INT>=26){
                NotificationChannel ch=new NotificationChannel(QUICK_CHANNEL, "Quick add", NotificationManager.IMPORTANCE_LOW);
                ch.setDescription("A pinned shortcut to log things quickly");
                ch.setShowBadge(false);
                nm.createNotificationChannel(ch);
            }
            Notification.Builder bld = (Build.VERSION.SDK_INT>=26) ? new Notification.Builder(this, QUICK_CHANNEL) : new Notification.Builder(this);
            bld.setSmallIcon(getApplicationInfo().icon)
               .setContentTitle("InnerOs")
               .setContentText("Quick add \u2014 tap here to open Today")
               .setOngoing(true)
               .setContentIntent(quickPI("tab","pgToday"))
               .setPriority(Notification.PRIORITY_LOW)
               .setVisibility(Notification.VISIBILITY_PUBLIC);
            /* Exactly 3 actions (Android reliably shows 3) */
            bld.addAction(0, "Add Task", quickPI("addTask"));
            bld.addAction(0, "Journal Entry", quickPI("addJournal"));
            bld.addAction(0, "Expense", quickPI("add"));
            nm.notify(QUICK_ADD_NOTIF_ID, bld.build());
        }catch(Exception e){ toast("Could not show quick-add notification"); }
    }
    void hideQuickAddNotif(){
        try{ ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).cancel(QUICK_ADD_NOTIF_ID); }catch(Exception e){}
    }

    @android.annotation.TargetApi(19)
    void printHtmlToPdf(String name, String html){
        try{
            final android.webkit.WebView wv = new android.webkit.WebView(this);
            wv.setWebViewClient(new android.webkit.WebViewClient(){
                public void onPageFinished(android.webkit.WebView view, String url){
                    try{
                        android.print.PrintManager pm = (android.print.PrintManager)getSystemService(PRINT_SERVICE);
                        String jobName = (name!=null?name:"InnerOs") + " document";
                        android.print.PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(jobName);
                        pm.print(jobName, adapter, new android.print.PrintAttributes.Builder().build());
                    }catch(Exception e){ toast("Could not open print dialog"); }
                }
            });
            wv.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
        }catch(Exception e){ toast("PDF export failed"); }
    }

    @android.annotation.TargetApi(28)
    void showBiometricPrompt(){
        try{
            if(Build.VERSION.SDK_INT < 28){ js("window.bioResult&&window.bioResult(false)"); return; }
            android.hardware.biometrics.BiometricPrompt bp = new android.hardware.biometrics.BiometricPrompt.Builder(this)
                .setTitle("Unlock Personal Tracker")
                .setSubtitle("Use your fingerprint or face to unlock")
                .setNegativeButton("Use PIN", getMainExecutor(), new android.content.DialogInterface.OnClickListener(){
                    public void onClick(android.content.DialogInterface d, int w){ js("window.bioResult&&window.bioResult(false)"); }
                })
                .build();
            bp.authenticate(new android.os.CancellationSignal(), getMainExecutor(),
                new android.hardware.biometrics.BiometricPrompt.AuthenticationCallback(){
                    @Override public void onAuthenticationSucceeded(android.hardware.biometrics.BiometricPrompt.AuthenticationResult r){ js("window.bioResult&&window.bioResult(true)"); }
                    @Override public void onAuthenticationError(int code, CharSequence msg){ js("window.bioResult&&window.bioResult(false)"); }
                    // onAuthenticationFailed = a single bad read; prompt stays open, do nothing.
                });
        }catch(Exception e){ js("window.bioResult&&window.bioResult(false)"); }
    }

    void launchSpeech() {
        try {
            Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault());
            i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            // Wait ~2.5s of silence before finalizing, per requirement.
            i.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 2500L);
            i.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 2500L);
            i.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 1500L);
            if (pendingSpeechPrompt != null && pendingSpeechPrompt.length() > 0) i.putExtra(RecognizerIntent.EXTRA_PROMPT, pendingSpeechPrompt);
            if (i.resolveActivity(getPackageManager()) == null) {
                String id = pendingSpeechId; pendingSpeechId = null;
                if (id != null) js("window._speechResult&&window._speechResult(" + JSONObject.quote(id) + ",'', " + JSONObject.quote("unavailable") + ")");
                return;
            }
            startActivityForResult(i, REQ_SPEECH);
        } catch (Exception e) {
            String id = pendingSpeechId; pendingSpeechId = null;
            if (id != null) js("window._speechResult&&window._speechResult(" + JSONObject.quote(id) + ",'', " + JSONObject.quote("error") + ")");
        }
    }

    @Override protected void onActivityResult(int req, int result, Intent data) {
        super.onActivityResult(req,result,data);
        if (req == REQ_IMPORT) {
            if (fileChooserCallback != null) {
                Uri[] uris = (result == RESULT_OK && data != null && data.getData()!=null) ? new Uri[]{data.getData()} : null;
                fileChooserCallback.onReceiveValue(uris); fileChooserCallback=null;
            } else if (result == RESULT_OK && data != null && data.getData()!=null) {
                try {
                    Uri uri = data.getData();
                    byte[] bytes = readAll(getContentResolver().openInputStream(uri));
                    String b64 = Base64.encodeToString(bytes, Base64.NO_WRAP);
                    String name = displayName(uri);
                    if ("backup".equals(pendingImportMode)) {
                        js("window.importNative&&window.importNative('"+b64+"')");
                    } else {
                        js("window.featureImportNative&&window.featureImportNative('"+b64+"',"+JSONObject.quote(name)+")");
                    }
                } catch(Exception e){ toast("Could not read file"); }
                pendingImportMode = "backup";
            }
        } else if (req == REQ_CAMERA) {
            if (result == RESULT_OK && pendingCameraUri != null) {
                try {
                    String name = "photo_"+System.currentTimeMillis()+".jpg";
                    File dir = new File(getFilesDir(), pendingPhotoDir); if(!dir.exists()) dir.mkdirs();
                    File f = new File(dir,name);
                    try(InputStream in=getContentResolver().openInputStream(pendingCameraUri);
                        OutputStream out=new FileOutputStream(f)) {
                        byte[] buf=new byte[8192]; int n; while((n=in.read(buf))>0) out.write(buf,0,n);
                    }
                    js("window.photoResult&&window.photoResult('"+name+"')");
                } catch(Exception e){ toast("Could not save camera photo"); }
            } else if (pendingCameraUri != null) {
                try { getContentResolver().delete(pendingCameraUri,null,null); } catch(Exception ignored) {}
            }
            pendingCameraUri=null;
        } else if (req == REQ_PHOTO && result == RESULT_OK && data != null && data.getData()!=null) {
            try {
                String name = "photo_"+System.currentTimeMillis()+".jpg";
                File dir = new File(getFilesDir(), pendingPhotoDir); if(!dir.exists()) dir.mkdirs();
                File f = new File(dir,name);
                try(InputStream in=getContentResolver().openInputStream(data.getData());
                    OutputStream out=new FileOutputStream(f)) {
                    byte[] buf=new byte[8192]; int n; while((n=in.read(buf))>0) out.write(buf,0,n);
                }
                js("window.photoResult&&window.photoResult('"+name+"')");
            } catch(Exception e){ toast("Could not save photo"); }
        }
     else if (req == REQ_SPEECH) {
            String current = pendingSpeechId;
            pendingSpeechId=null;
            if (current != null) {
                if (result == RESULT_OK && data != null) {
                    ArrayList<String> r = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                    String text = r != null && !r.isEmpty() ? r.get(0) : "";
                    js("window._speechResult&&window._speechResult("+JSONObject.quote(current)+","+JSONObject.quote(text)+",null)");
                } else {
                    js("window._speechResult&&window._speechResult("+JSONObject.quote(current)+",'',"+JSONObject.quote("cancelled")+")");
                }
            }
        }}

    static byte[] readAll(InputStream in) throws IOException {
        if(in==null) return new byte[0]; ByteArrayOutputStream b=new ByteArrayOutputStream();
        byte[] x=new byte[8192]; int n; while((n=in.read(x))>0)b.write(x,0,n); in.close(); return b.toByteArray();
    }

    String saveFile(String name, String mime, String b64) throws Exception {
        byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
        if (Build.VERSION.SDK_INT >= 29) {
            ContentValues v=new ContentValues();
            v.put(MediaStore.Downloads.DISPLAY_NAME,name);
            v.put(MediaStore.Downloads.MIME_TYPE,mime);
            v.put(MediaStore.Downloads.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS);
            v.put(MediaStore.Downloads.IS_PENDING,1);
            Uri u=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,v);
            if(u==null) throw new IOException("MediaStore insert failed");
            try(OutputStream out=getContentResolver().openOutputStream(u)){
                if(out==null) throw new IOException("Could not open Downloads output stream");
                out.write(bytes);
            }
            v.clear(); v.put(MediaStore.Downloads.IS_PENDING,0); getContentResolver().update(u,v,null,null);
            toast("Saved to Downloads/"+name);
            return "Downloads/"+name;
        } else {
            File dir=Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if(!dir.exists() && !dir.mkdirs()) throw new IOException("Could not create Downloads directory");
            File f=new File(dir,name);
            try(FileOutputStream out=new FileOutputStream(f)){out.write(bytes);}
            toast("Saved to "+f.getAbsolutePath());
            return f.getAbsolutePath();
        }
    }

    Uri shareTemp(String name,String mime,String b64)throws Exception{
        File dir=new File(getCacheDir(),"share"); if(!dir.exists())dir.mkdirs();
        File f=new File(dir,name); try(FileOutputStream out=new FileOutputStream(f)){out.write(Base64.decode(b64,Base64.DEFAULT));}
        return androidxFileProviderUri(f);
    }

    // Avoid AndroidX: provider is declared as a native FileProvider implementation in this project.
    Uri androidxFileProviderUri(File f) throws Exception {
        return NativeFileProvider.getUriForFile(this, getPackageName()+".fileprovider", f);
    }

    void shareFile(String name,String mime,String b64)throws Exception{
        Uri u=shareTemp(name,mime,b64);
        Intent i=new Intent(Intent.ACTION_SEND); i.setType(mime); i.putExtra(Intent.EXTRA_STREAM,u);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION); startActivity(Intent.createChooser(i,"Share file"));
    }

    void toast(String s){ runOnUiThread(()->Toast.makeText(this,s,Toast.LENGTH_SHORT).show()); }

    public class Bridge {
        @JavascriptInterface public String getState(){return prefs.getString("state","");}
        @JavascriptInterface public void saveState(String s){if(s!=null){prefs.edit().putString("state",s).apply();WidgetHub.refreshAllDebounced(MainActivity.this);}}
        @JavascriptInterface public void setAiConfig(String s){if(s!=null)prefs.edit().putString("ai_cfg",s).apply();}
        @JavascriptInterface public void setAlarms(String json){NativeAlarms.schedule(MainActivity.this,json);}
        @JavascriptInterface public boolean notifGranted(){return Build.VERSION.SDK_INT<33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED;}
        @JavascriptInterface public boolean canExact(){if(Build.VERSION.SDK_INT<31)return true;return ((AlarmManager)getSystemService(ALARM_SERVICE)).canScheduleExactAlarms();}
        @JavascriptInterface public void reqNotif(){requestNotifications();}
        @JavascriptInterface public void reqExact(){requestExact();}
        @JavascriptInterface public void openChannelSettings(){try{Intent i=new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS);i.putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName());i.putExtra(Settings.EXTRA_CHANNEL_ID,NativeAlarms.CHANNEL_ID);startActivity(i);}catch(Exception e){}}
        @JavascriptInterface public void setBars(String color, boolean light){try{getWindow().setStatusBarColor(Color.parseColor(color));getWindow().setNavigationBarColor(Color.parseColor(color));if(Build.VERSION.SDK_INT>=23){int f=getWindow().getDecorView().getSystemUiVisibility();if(light)f|=View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;else f&=~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;getWindow().getDecorView().setSystemUiVisibility(f);}}catch(Exception ignored){}}
        @JavascriptInterface public String appVer(){return "1.1.6";}
        @JavascriptInterface public void toast(String s){MainActivity.this.toast(s);}
        @JavascriptInterface public void testReminder(){NativeAlarms.test(MainActivity.this);}
        @JavascriptInterface public String fsCheck(){return "{\"need\":false}";}
        @JavascriptInterface public void fsOpen(){}
        @JavascriptInterface public String autoBackup(String name,String state){try{saveFile(name,"application/json",Base64.encodeToString(state.getBytes(StandardCharsets.UTF_8),Base64.NO_WRAP));return "Downloads/"+name;}catch(Exception e){return "";}}
        /** Widget quick-action session finished: reflect the save on the widgets,
            then return the user to the home screen (never before the save). */
        @JavascriptInterface public void widgetDone(){
            runOnUiThread(() -> {
                try { WidgetHub.refreshAll(MainActivity.this); } catch (Exception ignored) { }
                try { finishAndRemoveTask(); } catch (Exception ignored) { }
            });
        }

        @JavascriptInterface public String getLaunchAction(){Intent i=getIntent();JSONObject o=new JSONObject();try{if(i!=null){String[] keys={"habit","task","tab","add","acct","addTask","addHabit","workout","fromWidget","addJournal","addMood","addSleep","viewHabits","viewTasks"};for(String k:keys){String v=i.getStringExtra(k);if(v!=null){o.put(k,v);i.removeExtra(k);}}}}catch(Exception ignored){}return o.toString();}
        @JavascriptInterface public boolean bioAvail(){
            try{
                if(Build.VERSION.SDK_INT < 29) return false;
                android.hardware.biometrics.BiometricManager bm=(android.hardware.biometrics.BiometricManager)getSystemService(BIOMETRIC_SERVICE);
                return bm!=null && bm.canAuthenticate()==android.hardware.biometrics.BiometricManager.BIOMETRIC_SUCCESS;
            }catch(Exception e){ return false; }
        }
        @JavascriptInterface public void showQuickAdd(){ MainActivity.this.runOnUiThread(new Runnable(){ public void run(){ MainActivity.this.showQuickAddNotif(); } }); }
        @JavascriptInterface public void showPinnedTasks(final String json){ MainActivity.this.runOnUiThread(new Runnable(){ public void run(){ MainActivity.this.showPinnedTasksNotif(json); } }); }
        @JavascriptInterface public void hidePinnedTasks(){ MainActivity.this.runOnUiThread(new Runnable(){ public void run(){ MainActivity.this.hidePinnedTasksNotif(); } }); }
        @JavascriptInterface public void hideQuickAdd(){ MainActivity.this.runOnUiThread(new Runnable(){ public void run(){ MainActivity.this.hideQuickAddNotif(); } }); }
        @JavascriptInterface public void bio(){
            MainActivity.this.runOnUiThread(new Runnable(){ public void run(){ MainActivity.this.showBiometricPrompt(); } });
        }
        @JavascriptInterface public void pickDate(int y,int m,int d){MainActivity.this.pickDate(y,m,d);}
        @JavascriptInterface public void pickTime(int h,int m){MainActivity.this.pickTime(h,m);}
        @JavascriptInterface public void pickImport(){MainActivity.this.importFile("backup");}
        @JavascriptInterface public void pickImport(String mode){MainActivity.this.importFile(mode);}
        @JavascriptInterface public void pickPhoto(){MainActivity.this.pickPhoto();}
        @JavascriptInterface public void capturePhoto(){MainActivity.this.capturePhoto();}
        @JavascriptInterface public boolean speechAvailable(){try{return new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).resolveActivity(getPackageManager())!=null;}catch(Exception e){return false;}}
        @JavascriptInterface public void startSpeech(String id){MainActivity.this.runOnUiThread(()->MainActivity.this.startSpeech(id,""));}
        @JavascriptInterface public void startSpeech(String id,String promptText){MainActivity.this.runOnUiThread(()->MainActivity.this.startSpeech(id,promptText));}
        @JavascriptInterface public String readPhoto(String name){try{File f=new File(new File(getFilesDir(),pendingPhotoDir),name);if(!f.exists())return "";return Base64.encodeToString(readAll(new FileInputStream(f)),Base64.NO_WRAP);}catch(Exception e){return "";}}
        @JavascriptInterface public void deletePhoto(String name){try{new File(new File(getFilesDir(),pendingPhotoDir),name).delete();}catch(Exception ignored){}}
        @JavascriptInterface public String saveFile(String name,String mime,String b64)throws Exception{return MainActivity.this.saveFile(name,mime,b64);}
        @JavascriptInterface public boolean printHtmlToPdf(final String name, final String html){
            try{ MainActivity.this.runOnUiThread(new Runnable(){ public void run(){ MainActivity.this.printHtmlToPdf(name, html); } }); return true; }
            catch(Exception e){ return false; }
        }
        @JavascriptInterface public void shareFile(String name,String mime,String b64)throws Exception{MainActivity.this.shareFile(name,mime,b64);}
    }
}
