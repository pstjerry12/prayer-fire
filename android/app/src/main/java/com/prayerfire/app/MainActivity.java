package com.prayerfire.app;

import android.content.res.Configuration;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.prayerfire.app.alarmengine.AlarmEnginePlugin;
import com.prayerfire.app.speech.SpeechEnginePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AlarmEnginePlugin.class);
        registerPlugin(SpeechEnginePlugin.class);
        super.onCreate(savedInstanceState);
        // The web view starts out white. Paint it the start-up colour (ivory by day, midnight navy at night) so the
        // moment between the system splash and the app's boot animation is the same plain colour, not a white flash.
        try {
            boolean night = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
            getBridge().getWebView().setBackgroundColor(night ? 0xFF0E1628 : 0xFFFAF7F2);
        } catch (Exception ignored) {
            // the web view is not ready yet: the theme's window background (same colour) still shows
        }
    }
}
