package com.actionables.personaltracker.app;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.util.List;

/**
 * MONEY widget (v4): today's expense total + one selected account balance.
 * Body tap \u2192 Money section in-app (with the account id when available).
 * Large + \u2192 the app's Add Expense screen, account preselected.
 * \u25BE \u2192 native account picker; the choice persists per widget.
 */
public class MoneyWidget extends BaseWidget {

    @Override protected RemoteViews render(Context ctx, WidgetStore st, int id, int bucket) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_money);

        List<JSONObject> accts = st.activeAccounts();
        String acctId = WidgetHub.getPref(ctx, "acct_" + id, "");
        JSONObject acct = st.acctById(acctId);
        if (acct == null && !accts.isEmpty()) { acct = accts.get(0); acctId = acct.optString("id"); }

        double spent = st.todayExpenseTotal();
        v.setTextViewText(R.id.exp, spent > 0 ? "\u2212" + st.inr(spent) : st.currency() + "0");
        v.setTextColor(R.id.exp, spent > 0 ? 0xFFFF6B5E : 0xFF9AA0AC);

        v.setTextViewText(R.id.bal, acct == null ? "\u2014" : st.inr(st.acctBalance(acctId)));
        String nm = acct == null ? null : acct.optString("name", "Account");
        v.setTextViewText(R.id.acct_line, nm == null ? "NO ACCOUNT SELECTED" : nm.toUpperCase());
        v.setTextViewText(R.id.acct_name, nm == null ? "Choose account" : nm);

        v.setOnClickPendingIntent(R.id.money_body,
                WidgetHub.openAppDeep(ctx, "tab", "pgExp", "acct", acctId == null ? "" : acctId));
        v.setOnClickPendingIntent(R.id.add_btn,
                WidgetHub.openAppDeep(ctx, "add", "exp", "acct", acctId == null ? "" : acctId));
        v.setOnClickPendingIntent(R.id.acct_row, WidgetHub.popup(ctx, WidgetDialogActivity.A_PICK_ACCOUNT, id));
        return v;
    }
}
