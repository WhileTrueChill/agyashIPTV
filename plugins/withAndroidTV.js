const { withAndroidManifest } = require("@expo/config-plugins");

function withAndroidTV(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;

    const features = manifest["uses-feature"] || [];
    const ensureFeature = (name) => {
      if (!features.some((item) => item.$?.["android:name"] === name)) {
        features.push({ $: { "android:name": name, "android:required": "false" } });
      }
    };
    ensureFeature("android.software.leanback");
    ensureFeature("android.hardware.touchscreen");
    manifest["uses-feature"] = features;

    const application = manifest.application?.[0];
    const activities = application?.activity || [];
    const mainActivity = activities.find((activity) =>
      String(activity.$?.["android:name"] || "").includes("MainActivity")
    );
    if (mainActivity) {
      const filters = mainActivity["intent-filter"] || [];
      let launcherFilter = filters.find((filter) =>
        (filter.action || []).some((action) => action.$?.["android:name"] === "android.intent.action.MAIN")
      );
      if (!launcherFilter) {
        launcherFilter = { action: [], category: [] };
        filters.push(launcherFilter);
      }
      const categories = launcherFilter.category || [];
      for (const category of ["android.intent.category.LEANBACK_LAUNCHER", "android.intent.category.LAUNCHER"]) {
        if (!categories.some((item) => item.$?.["android:name"] === category)) {
          categories.push({ $: { "android:name": category } });
        }
      }
      launcherFilter.category = categories;
      mainActivity["intent-filter"] = filters;
    }

    return mod;
  });
}

module.exports = withAndroidTV;
