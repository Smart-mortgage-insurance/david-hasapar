package com.davidhasapar.manager;

import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * אפליקציית ניהול לדוד הספר.
 * חלון WebView יחיד שנפתח ישר לפאנל הניהול באתר. אין דפדפן, אין שורת כתובת.
 */
public class MainActivity extends Activity {

    // הכתובת הנייטרלית של דף הניהול (ללא הקשר משכנתאות)
    private static final String ADMIN_URL = "https://mispara-david.github.io/admin.html";

    private WebView web;

    @Override
    @SuppressWarnings("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // חשוב: מאפשר "התחברות שנשמרת" (localStorage)
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        web.setWebViewClient(new WebViewClient());   // קישורים נשארים בתוך האפליקציה
        web.setWebChromeClient(new WebChromeClient());
        web.setBackgroundColor(0xFF0F1720);          // רקע כהה תואם לאתר

        setContentView(web);

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl(ADMIN_URL);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    /** כפתור "אחורי" מנווט אחורה ב-WebView במקום לסגור את האפליקציה */
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && web != null && web.canGoBack()) {
            web.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
