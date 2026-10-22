package com.prayerfire.app;

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
    }
}
