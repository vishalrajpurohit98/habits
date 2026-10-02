package com.actionables.personaltracker.app;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.biometrics.BiometricPrompt;
import android.os.Build;
import android.os.CancellationSignal;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Fingerprint unlock for the Vault. The Vault's key is derived from the app PIN, so the PIN itself is sealed with an
 * AES key that lives in the Android Keystore and can only be used right after a successful fingerprint check
 * (BiometricPrompt + CryptoObject). Enrolling a new fingerprint invalidates the key automatically.
 */
public class VaultBio {
    public interface Emit { void event(String type, String payload); }
    static final String ALIAS = "momentum_vault_bio", PREFS = "vault_bio";

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    static boolean available(Context c) {
        if (Build.VERSION.SDK_INT < 28) return false;
        if (Build.VERSION.SDK_INT >= 29) {
            android.hardware.biometrics.BiometricManager bm = c.getSystemService(android.hardware.biometrics.BiometricManager.class);
            return bm != null && bm.canAuthenticate() == android.hardware.biometrics.BiometricManager.BIOMETRIC_SUCCESS;
        }
        return c.getPackageManager().hasSystemFeature(PackageManager.FEATURE_FINGERPRINT);
    }
    static boolean enabled(Context c) { return prefs(c).contains("ct"); }

    static void disable(Context c) {
        prefs(c).edit().clear().apply();
        try { KeyStore ks = KeyStore.getInstance("AndroidKeyStore"); ks.load(null); ks.deleteEntry(ALIAS); } catch (Exception ignored) {}
    }

    private static SecretKey newKey() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore"); ks.load(null);
        if (ks.containsAlias(ALIAS)) ks.deleteEntry(ALIAS);
        KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        kg.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setUserAuthenticationRequired(true).setInvalidatedByBiometricEnrollment(true).build());
        return kg.generateKey();
    }
    private static SecretKey existingKey() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore"); ks.load(null);
        return ks.containsAlias(ALIAS) ? (SecretKey) ks.getKey(ALIAS, null) : null;
    }

    private interface Done { void ok(Cipher c); void fail(String why); }
    private static void prompt(Activity a, Cipher cipher, String title, String sub, final Done d) {
        BiometricPrompt bp = new BiometricPrompt.Builder(a).setTitle(title).setSubtitle(sub)
            .setNegativeButton("Use PIN", a.getMainExecutor(), (dlg, w) -> d.fail("cancel")).build();
        bp.authenticate(new BiometricPrompt.CryptoObject(cipher), new CancellationSignal(), a.getMainExecutor(),
            new BiometricPrompt.AuthenticationCallback() {
                @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult r) { d.ok(r.getCryptoObject().getCipher()); }
                @Override public void onAuthenticationError(int code, CharSequence msg) {
                    boolean cancel = code == BiometricPrompt.BIOMETRIC_ERROR_USER_CANCELED || code == BiometricPrompt.BIOMETRIC_ERROR_CANCELED;
                    d.fail(cancel ? "cancel" : String.valueOf(msg));
                }
            });
    }

    /** Seal the PIN after one fingerprint check. */
    static void enroll(final Activity a, final String pin, final Emit emit) {
        if (!available(a)) { emit.event("error", "Fingerprint unlock isn't available on this phone"); return; }
        try {
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.ENCRYPT_MODE, newKey());
            prompt(a, c, "Unlock the Vault with your fingerprint", "Confirm to turn it on", new Done() {
                public void ok(Cipher ci) {
                    try {
                        byte[] ct = ci.doFinal(pin.getBytes(StandardCharsets.UTF_8));
                        prefs(a).edit().putString("ct", Base64.encodeToString(ct, Base64.NO_WRAP)).putString("iv", Base64.encodeToString(ci.getIV(), Base64.NO_WRAP)).apply();
                        emit.event("enrolled", "");
                    } catch (Exception e) { disable(a); emit.event("error", "Couldn't turn on fingerprint unlock"); }
                }
                public void fail(String why) { disable(a); emit.event("cancel".equals(why) ? "cancel" : "error", why); }
            });
        } catch (Exception e) { disable(a); emit.event("error", "Couldn't turn on fingerprint unlock"); }
    }

    /** Unseal the PIN after a fingerprint check. */
    static void unlock(final Activity a, final Emit emit) {
        try {
            String ct = prefs(a).getString("ct", null), iv = prefs(a).getString("iv", null);
            SecretKey k = existingKey();
            if (ct == null || iv == null || k == null) { disable(a); emit.event("off", ""); return; }
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            try { c.init(Cipher.DECRYPT_MODE, k, new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP))); }
            catch (KeyPermanentlyInvalidatedException e) { disable(a); emit.event("invalidated", ""); return; }
            final byte[] data = Base64.decode(ct, Base64.NO_WRAP);
            prompt(a, c, "Unlock the Vault", "Use your fingerprint", new Done() {
                public void ok(Cipher ci) {
                    try { emit.event("pin", new String(ci.doFinal(data), StandardCharsets.UTF_8)); }
                    catch (Exception e) { emit.event("error", "Couldn't unlock with fingerprint"); }
                }
                public void fail(String why) { emit.event("cancel".equals(why) ? "cancel" : "error", why); }
            });
        } catch (Exception e) { emit.event("error", "Couldn't unlock with fingerprint"); }
    }
}
