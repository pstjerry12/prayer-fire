package com.prayerfire.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.prayerfire.app.alarmengine.AlarmEnginePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AlarmEnginePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
