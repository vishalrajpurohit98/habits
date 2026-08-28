package com.actionables.personaltracker.app;

import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.util.List;

/**
 * Money widget (v2): balance of the selected account (tap to switch), today's
 * spend, one-tap add, and \u2014 on large sizes \u2014 recent transactions that
 * open directly in the native expense editor.
 */
public class MoneyWidget extends BaseWidget {

    static final int[] XB = {R.id.x1_box, R.id.x2_box, R.id.x3_box};
    static final int[] XI = {R.id.x1_ico, R.id.x2_ico, R.id.x3_ico};
    static final int[] XT = {R.id.x1_title, R.id.x2_title, R.id.x3_title};
    static final int[] XA = {R.id.x1_amt, R.id.x2_amt, R.id.x3_amt};
    static final int[] CAT = {R.id.cat1, R.id.cat2, R.id.cat3};

    @Override protected RemoteViews render(Context ctx, WidgetStore st, int id, int bucket) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_money);

        List<JSONObject> accts = st.activeAccounts();
        String acctId = WidgetHub.getPref(ctx, "acct_" + id, "");
        JSONObject acct = st.acctById(acctId);
        if (acct == null && !accts.isEmpty()) { acct = accts.get(0); acctId = acct.optString("id"); }

        v.setTextViewText(R.id.acct_name, acct == null ? "NO ACCOUNT" : acct.optString("name", "Account").toUpperCase());
        v.setTextViewText(R.id.bal, acct == null ? "\u2014" : st.inr(st.acctBalance(acctId)));
        v.setOnClickPendingIntent(R.id.acct_row, WidgetHub.popup(ctx, WidgetDialogActivity.A_PICK_ACCOUNT, id));
        v.setOnClickPendingIntent(R.id.bal, WidgetHub.popup(ctx, WidgetDialogActivity.A_PICK_ACCOUNT, id));

        double spent = st.todayExpenseTotal();
        v.setTextViewText(R.id.exp, spent > 0 ? "\u2212" + st.inr(spent) + " today" : "No spend today");
        v.setTextColor(R.id.exp, ctx.getColor(spent > 0 ? R.color.wg_red : R.color.wg_dim));
        v.setOnClickPendingIntent(R.id.exp, WidgetHub.popup(ctx, WidgetDialogActivity.A_ADD_EXPENSE, id, "acctId", acctId));
        v.setOnClickPendingIntent(R.id.add_btn, WidgetHub.popup(ctx, WidgetDialogActivity.A_ADD_EXPENSE, id, "acctId", acctId));

        boolean large = bucket == WidgetHub.LARGE;
        v.setViewVisibility(R.id.cats, View.GONE);
        v.setViewVisibility(R.id.txbox, large ? View.VISIBLE : View.GONE);
        if (large) {
            List<String> cats = st.topCategoriesToday(3);
            for (int i = 0; i < CAT.length; i++) v.setViewVisibility(CAT[i], View.GONE);
            List<JSONObject> tx = st.recentTx(3);
            for (int i = 0; i < XB.length; i++) {
                if (i < tx.size()) {
                    JSONObject x = tx.get(i);
                    boolean inc = "inc".equals(x.optString("kind"));
                    boolean xfer = "xfer".equals(x.optString("kind"));
                    String title = x.optString("payee", "");
                    if (title.isEmpty()) title = x.optString("cat", "");
                    if (title.isEmpty()) title = xfer ? "Transfer" : inc ? "Income" : "Expense";
                    v.setViewVisibility(XB[i], View.VISIBLE);
                    v.setTextViewText(XI[i], xfer ? "\u21C4" : inc ? "\uFF0B" : "\u2212");
                    v.setTextColor(XI[i], ctx.getColor(inc ? R.color.wg_green : xfer ? R.color.wg_dim : R.color.wg_red));
                    v.setTextViewText(XT[i], title);
                    v.setTextViewText(XA[i], st.inr(x.optDouble("amt", 0)));
                    v.setTextColor(XA[i], ctx.getColor(inc ? R.color.wg_green : xfer ? R.color.wg_dim : R.color.wg_red));
                    v.setOnClickPendingIntent(XB[i], WidgetHub.popup(ctx, WidgetDialogActivity.A_EDIT_EXPENSE, id, "txId", x.optString("id")));
                } else v.setViewVisibility(XB[i], View.GONE);
            }
        }
        return v;
    }
}
