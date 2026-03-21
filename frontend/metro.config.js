const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Force axios to use its browser build instead of Node.js build
// This avoids issues with Node.js built-in modules (crypto, url, http, etc.)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "axios") {
    return context.resolveRequest(context, "axios/dist/browser/axios.cjs", platform);
  }

  // Modules natifs non disponibles sur web — retourne un module vide
  const nativeOnlyModules = [
    "react-native-google-mobile-ads",
  ];
  if (platform === "web" && nativeOnlyModules.some((m) => moduleName === m || moduleName.startsWith(m + "/"))) {
    return { type: "empty" };
  }

  // Catch any remaining Node.js built-in modules
  const nodeBuiltins = [
    "crypto", "http", "https", "net", "tls", "stream",
    "zlib", "dns", "url", "fs", "path", "os", "assert",
    "util", "querystring", "child_process", "events"
  ];
  if (nodeBuiltins.includes(moduleName)) {
    return { type: "empty" };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
