package com.camborio.reservas.privada;

import android.content.Context;
import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppBadge")
public class AppBadgePlugin extends Plugin {
    @PluginMethod
    public void setCount(PluginCall call) {
        int count = call.getInt("count", 0);
        Context context = getContext();
        Intent intent = new Intent("android.intent.action.BADGE_COUNT_UPDATE");
        intent.putExtra("badge_count", Math.max(0, count));
        intent.putExtra("badge_count_package_name", context.getPackageName());
        intent.putExtra("badge_count_class_name", getMainActivityClassName());
        try { context.sendBroadcast(intent); } catch (Exception ignored) {}
        JSObject ret = new JSObject();
        ret.put("count", Math.max(0, count));
        call.resolve(ret);
    }
    private String getMainActivityClassName() {
        try {
            return getContext().getPackageManager().getLaunchIntentForPackage(getContext().getPackageName()).getComponent().getClassName();
        } catch (Exception e) {
            return getContext().getPackageName() + ".MainActivity";
        }
    }
}
