package com.actionables.personaltracker.app;

import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

/**
 * The one AI widget. Tapping it starts voice capture in a translucent popup:
 * speech is transcribed, editable, and on Done routed to the same AI the app
 * uses (same provider, model, key, prompt and data context) \u2014 which can
 * log, update, delete, answer questions, or ask for confirmation. The small
 * keyboard glyph opens the same popup for typing instead.
 */
public class AiWidget extends BaseWidget {

    @Override protected RemoteViews render(Context ctx, WidgetStore st, int id, int bucket) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_ai);
        v.setOnClickPendingIntent(R.id.ai_root, WidgetHub.popup(ctx, WidgetDialogActivity.A_AI, id, "voice", "1"));
        v.setOnClickPendingIntent(R.id.ai_mic, WidgetHub.popup(ctx, WidgetDialogActivity.A_AI, id, "voice", "1"));
        v.setOnClickPendingIntent(R.id.ai_kb, WidgetHub.popup(ctx, WidgetDialogActivity.A_AI, id, "voice", "0"));
        v.setViewVisibility(R.id.ai_hint, WidgetHub.rows(ctx, id) >= 2 ? View.VISIBLE : View.GONE);
        return v;
    }
}
