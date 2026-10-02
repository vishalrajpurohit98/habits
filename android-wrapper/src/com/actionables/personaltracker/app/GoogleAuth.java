package com.actionables.personaltracker.app;

import android.app.Activity;
import android.os.CancellationSignal;
import androidx.core.content.ContextCompat;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

/**
 * "Continue with Google" for Cloud sync. Google blocks its sign-in page inside WebViews, so the account picker runs
 * natively (Credential Manager) and only the resulting Google ID token is handed to the web layer, which signs in to
 * Firebase with it. The token's audience is the project's Web client ID (serverClientId).
 */
public class GoogleAuth {
    public interface Done { void result(String idToken, String email, String error); }

    static void signIn(final Activity a, String webClientId, final Done done) {
        if (webClientId == null || webClientId.trim().isEmpty()) { done.result(null, null, "Google sign-in is not configured"); return; }
        GetSignInWithGoogleOption opt = new GetSignInWithGoogleOption.Builder(webClientId.trim()).build();
        GetCredentialRequest req = new GetCredentialRequest.Builder().addCredentialOption(opt).build();
        CredentialManager.create(a).getCredentialAsync(a, req, new CancellationSignal(), ContextCompat.getMainExecutor(a),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override public void onResult(GetCredentialResponse r) {
                    Credential c = r.getCredential();
                    if (c instanceof CustomCredential && GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(c.getType())) {
                        try {
                            GoogleIdTokenCredential g = GoogleIdTokenCredential.createFrom(((CustomCredential) c).getData());
                            done.result(g.getIdToken(), g.getId(), null);
                        } catch (Exception e) { done.result(null, null, "Couldn't read the Google account"); }
                    } else done.result(null, null, "Unsupported sign-in type");
                }
                @Override public void onError(GetCredentialException e) {
                    if (e instanceof GetCredentialCancellationException) { done.result(null, null, null); return; }   // user closed the sheet
                    if (e instanceof NoCredentialException) { done.result(null, null, "No Google account on this phone. Add one in Android Settings > Accounts."); return; }
                    String m = String.valueOf(e.getMessage());
                    done.result(null, null, (m.contains("10") || m.contains("DEVELOPER")) ? "Google sign-in isn't configured for this app build (check the OAuth clients and SHA-1)" : ("Google sign-in failed: " + m));
                }
            });
    }
}
