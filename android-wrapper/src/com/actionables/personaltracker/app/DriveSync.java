package com.actionables.personaltracker.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Base64;
import com.google.android.gms.auth.api.identity.AuthorizationClient;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.Scope;
import com.google.android.gms.tasks.Tasks;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Journal photo sync to the user's own Google Drive.
 * Uses ONLY the drive.appdata scope: a hidden, app-private folder in the user's Drive. The app cannot see or touch
 * any other file in their Drive, and nothing is stored on our servers.
 */
public class DriveSync {
    static final int REQ_DRIVE = 409;
    static final String SCOPE = "https://www.googleapis.com/auth/drive.appdata";
    static final String PREFS = "drive_sync";
    private static final ExecutorService EX = Executors.newSingleThreadExecutor();
    private static volatile String token;

    public interface Emit { void event(String type, String a, String b); }

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }
    static boolean isOn(Context c) { return prefs(c).getBoolean("on", false); }

    static AuthorizationRequest request() { return request(null); }
    /** With an email, Drive uses that same Google account (the one used for Continue with Google). */
    static AuthorizationRequest request(String email) {
        AuthorizationRequest.Builder b = AuthorizationRequest.builder().setRequestedScopes(Collections.singletonList(new Scope(SCOPE)));
        if (email != null && email.contains("@")) b.setAccount(new android.accounts.Account(email, "com.google"));
        return b.build();
    }

    /** Interactive connect: shows Google's account picker / consent screen when needed. */
    static void connect(final Activity a, final Emit emit) { connect(a, null, emit); }
    static void connect(final Activity a, final String email, final Emit emit) {
        if (email != null && email.contains("@")) prefs(a).edit().putString("email", email).apply();
        AuthorizationClient client = Identity.getAuthorizationClient(a);
        client.authorize(request(email))
            .addOnSuccessListener(res -> {
                if (res.hasResolution() && res.getPendingIntent() != null) {
                    try { a.startIntentSenderForResult(res.getPendingIntent().getIntentSender(), REQ_DRIVE, null, 0, 0, 0, null); }
                    catch (Exception e) { emit.event("error", "Couldn't open Google sign-in", ""); }
                } else { token = res.getAccessToken(); prefs(a).edit().putBoolean("on", true).apply(); emit.event("connected", "", ""); }
            })
            .addOnFailureListener(e -> emit.event("error", friendly(e), ""));
    }

    /** Result of the consent screen started by connect(). */
    static void onActivityResult(Activity a, Intent data, Emit emit) {
        try {
            AuthorizationResult r = Identity.getAuthorizationClient(a).getAuthorizationResultFromIntent(data);
            token = r.getAccessToken();
            if (token != null) { prefs(a).edit().putBoolean("on", true).apply(); emit.event("connected", "", ""); }
            else emit.event("error", "Google Drive access was not granted", "");
        } catch (Exception e) { emit.event("error", "Google Drive access was not granted", ""); }
    }

    static void disconnect(Context c) { token = null; prefs(c).edit().putBoolean("on", false).apply(); }

    /** Background thread only: a valid access token, refreshed silently; null if the user must consent again. */
    private static String ensureToken(Activity a, boolean forceRefresh) throws Exception {
        if (token != null && !forceRefresh) return token;
        AuthorizationResult r = Tasks.await(Identity.getAuthorizationClient(a).authorize(request(prefs(a).getString("email", null))), 30, TimeUnit.SECONDS);
        if (r.hasResolution()) return null;
        token = r.getAccessToken();
        return token;
    }

    static void list(final Activity a, final Emit emit) {
        EX.execute(() -> {
            try {
                JSONArray all = new JSONArray(); String page = null;
                do {
                    String u = "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&pageSize=1000&fields=nextPageToken,files(id,name,size)"
                        + (page != null ? "&pageToken=" + java.net.URLEncoder.encode(page, "UTF-8") : "");
                    JSONObject o = new JSONObject(new String(http(a, "GET", u, null, null), StandardCharsets.UTF_8));
                    JSONArray f = o.optJSONArray("files"); if (f != null) for (int i = 0; i < f.length(); i++) all.put(f.getJSONObject(i));
                    page = o.optString("nextPageToken", null); if (page != null && page.isEmpty()) page = null;
                } while (page != null);
                emit.event("list", all.toString(), "");
            } catch (NeedConsent nc) { emit.event("consent", "", ""); }
            catch (Exception e) { emit.event("error", friendly(e), ""); }
        });
    }

    /** Account storage (used / limit) for the Cloud sync screen; drive.appdata allows about.get. */
    static void quota(final Activity a, final Emit emit) {
        EX.execute(() -> {
            try {
                JSONObject o = new JSONObject(new String(http(a, "GET", "https://www.googleapis.com/drive/v3/about?fields=storageQuota", null, null), StandardCharsets.UTF_8));
                JSONObject q = o.optJSONObject("storageQuota");
                emit.event("quota", q != null ? q.toString() : "{}", "");
            } catch (NeedConsent nc) { emit.event("consent", "", ""); }
            catch (Exception e) { emit.event("quotaFailed", friendly(e), ""); }
        });
    }

    static void upload(final Activity a, final String name, final String b64, final Emit emit) {
        EX.execute(() -> {
            try {
                byte[] img = Base64.decode(b64, Base64.DEFAULT);
                String boundary = "mmtm" + System.nanoTime();
                String meta = new JSONObject().put("name", name).put("parents", new JSONArray().put("appDataFolder")).toString();
                ByteArrayOutputStream body = new ByteArrayOutputStream();
                body.write(("--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + meta + "\r\n--" + boundary + "\r\nContent-Type: image/jpeg\r\n\r\n").getBytes(StandardCharsets.UTF_8));
                body.write(img);
                body.write(("\r\n--" + boundary + "--").getBytes(StandardCharsets.UTF_8));
                http(a, "POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", body.toByteArray(), "multipart/related; boundary=" + boundary);
                emit.event("uploaded", name, "");
            } catch (NeedConsent nc) { emit.event("consent", "", ""); }
            catch (Exception e) { emit.event("uploadFailed", name, friendly(e)); }
        });
    }

    static void download(final Activity a, final String name, final String fileId, final Emit emit) {
        EX.execute(() -> {
            try {
                byte[] img = http(a, "GET", "https://www.googleapis.com/drive/v3/files/" + fileId + "?alt=media", null, null);
                emit.event("downloaded", name, Base64.encodeToString(img, Base64.NO_WRAP));
            } catch (NeedConsent nc) { emit.event("consent", "", ""); }
            catch (Exception e) { emit.event("downloadFailed", name, friendly(e)); }
        });
    }

    static class NeedConsent extends Exception {}

    /** HTTPS call with the bearer token; on 401 the token is refreshed silently and the call retried once. */
    private static byte[] http(Activity a, String method, String url, byte[] body, String type) throws Exception {
        for (int attempt = 0; attempt < 2; attempt++) {
            String t = ensureToken(a, attempt > 0);
            if (t == null) throw new NeedConsent();
            HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
            c.setRequestMethod(method); c.setConnectTimeout(20000); c.setReadTimeout(60000);
            c.setRequestProperty("Authorization", "Bearer " + t);
            if (body != null) { c.setDoOutput(true); c.setRequestProperty("Content-Type", type); c.setFixedLengthStreamingMode(body.length); try (OutputStream os = c.getOutputStream()) { os.write(body); } }
            int code = c.getResponseCode();
            if (code == 401 && attempt == 0) { token = null; c.disconnect(); continue; }
            InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
            ByteArrayOutputStream out = new ByteArrayOutputStream(); byte[] buf = new byte[16384]; int n;
            if (in != null) { while ((n = in.read(buf)) > 0) out.write(buf, 0, n); in.close(); }
            c.disconnect();
            if (code >= 400) throw new Exception("Drive error " + code);
            return out.toByteArray();
        }
        throw new NeedConsent();
    }

    static String friendly(Exception e) {
        String m = e == null ? "" : String.valueOf(e.getMessage());
        if (m.contains("Unable to resolve host") || m.contains("timeout") || m.contains("failed to connect")) return "No internet connection";
        if (m.contains("DEVELOPER_ERROR") || m.contains("10:")) return "Google sign-in isn't configured for this app build (check the OAuth client / SHA-1)";
        return m.length() > 120 ? m.substring(0, 120) : (m.isEmpty() ? "Google Drive error" : m);
    }
}
