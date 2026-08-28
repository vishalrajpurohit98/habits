package com.actionables.personaltracker.app;

import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.util.List;

/**
 * \u20B9 Money Snapshot (spec \u00A715): expense total + balance of ONE selected
 * account. Accounts come from the existing Money module \u2014 nothing is faked.
 */
public class MoneyWidget extends BaseWidget {

    /** Currently selected account for this widget instance (validated against real accounts). */
    static JSONObject selectedAccount(Context ctx, WidgetStore st, int widgetId) {
        List<JSONObject> as = st.activeAccounts();
        if (as.isEmpty()) return null;
        String want = WidgetHub.getPref(ctx, "acct_" + widgetId, "");
        for (JSONObject a : as) if (a.optString("id").equals(want)) return a;
        return as.get(0);
    }

    @Override protected RemoteViews render(Context ctx, WidgetStore st, int id, int bucket) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_money);
        v.setOnClickPendingIntent(R.id.mic, WidgetHub.popup(ctx, WidgetDialogActivity.A_AI, id, "scope", "money", "voice", "1"));

        JSONObject a = selectedAccount(ctx, st, id);
        if (a == null) {
            v.setTextViewText(R.id.acct_name, "No accounts yet");
            v.setTextViewText(R.id.bal, "\u2014");
            v.setTextViewText(R.id.exp, st.inr(st.todayExpenseTotal()));
            v.setViewVisibility(R.id.cats, View.GONE);
            v.setViewVisibility(R.id.btn_row, View.GONE);
            v.setOnClickPendingIntent(R.id.acct_row, WidgetHub.popup(ctx, WidgetDialogActivity.A_PICK_ACCOUNT, id));
            return v;
        }
        String acctId = a.optString("id");
        v.setTextViewText(R.id.acct_name, a.optString("name", "Account"));
        v.setOnClickPendingIntent(R.id.acct_row, WidgetHub.popup(ctx, WidgetDialogActivity.A_PICK_ACCOUNT, id));
        v.setTextViewText(R.id.bal, st.inr(st.acctBalance(acctId)));
        v.setTextViewText(R.id.exp, st.inr(st.todayExpenseTotal()));
        v.setOnClickPendingIntent(R.id.add_btn,
                WidgetHub.popup(ctx, WidgetDialogActivity.A_ADD_EXPENSE, id, "acctId", acctId));

        boolean small = bucket == WidgetHub.SMALL;
        v.setViewVisibility(R.id.bal_label, small ? View.GONE : View.VISIBLE);
        v.setViewVisibility(R.id.btn_row, small ? View.GONE : View.VISIBLE);

        // LARGE adds today's top categories (spec \u00A725).
        if (bucket == WidgetHub.LARGE) {
            List<String[]> cats = st.todayTopCats(3);
            int[] ids = {R.id.cat1, R.id.cat2, R.id.cat3};
            v.setViewVisibility(R.id.cats, cats.isEmpty() ? View.GONE : View.VISIBLE);
            for (int i = 0; i < ids.length; i++) {
                if (i < cats.size()) {
                    v.setViewVisibility(ids[i], View.VISIBLE);
                    v.setTextViewText(ids[i], cats.get(i)[0] + "  " + cats.get(i)[1]);
                } else v.setViewVisibility(ids[i], View.GONE);
            }
        } else v.setViewVisibility(R.id.cats, View.GONE);
        return v;
    }
}
