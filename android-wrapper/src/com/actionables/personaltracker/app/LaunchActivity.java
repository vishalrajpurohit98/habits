package com.actionables.personaltracker.app;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/**
 * Branded entry point for normal app-icon launches (spec v5 Part L/M).
 * Forwards to MainActivity immediately \u2014 the branding the user sees is the
 * theme's launch surface (and the Android 12+ system splash), not a delay.
 * Widgets and deep links target MainActivity directly and never pass through
 * here, so they get a plain black, animation-free start.
 */
public class LaunchActivity extends Activity {
    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        Intent i = new Intent(this, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(i);
        finish();
        overridePendingTransition(0, 0);
    }
}
