const PLUGIN_NAME = "Gnome Speech";
const VERSION = "1.0.0";
const STORAGE_KEY = "plugin:gnomeSpeech:enabled";

let apiRef = null;
let hookId = null;
let aliasIds = [];
let settingsListener = null;

let enabled = false;
let languageAdjective = "";

function readEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function saveEnabled(value) {
  enabled = value;

  try {
    localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
  } catch {
    // localStorage may be unavailable in some browser modes.
  }
}

function printHelp(api) {
  api.output.print(`[${PLUGIN_NAME}] Usage: /gnome on | /gnome off`);
  api.output.print(`[${PLUGIN_NAME}] Status: ${enabled ? "on" : "off"}`);
}

function setEnabled(api, value) {
  saveEnabled(value);
  api.output.print(`[${PLUGIN_NAME}] ${enabled ? "on" : "off"}`);
}

function toGnomeSpeech(text) {
  const words = String(text).match(/[\p{L}\p{N}]+/gu) || [];

  return words
    .map((word) => {
      const first = word.slice(0, 1).toLocaleUpperCase("pl-PL");
      const rest = word.slice(1);
      return first + rest;
    })
    .join("");
}

function transformSpeechCommand(command) {
  if (!enabled || !command || typeof command !== "string") {
    return undefined;
  }

  const apostropheMatch = command.match(/^'(?!')(.*)$/);

  if (apostropheMatch) {
    const msg = apostropheMatch[1] || "";

    if (!msg.trim()) {
      return undefined;
    }

    return "'" + toGnomeSpeech(msg);
  }

  const sayMatch = command.match(/^(ppowiedz|jppowiedz)\s+(.+)$/);

  if (sayMatch) {
    const verb = sayMatch[1];
    const rest = sayMatch[2];
    const adj = languageAdjective.trim();

    if (adj && rest.startsWith(adj + " ")) {
      const msg = rest.slice(adj.length + 1);
      return `${verb} ${adj} ${toGnomeSpeech(msg)}`;
    }

    return `${verb} ${toGnomeSpeech(rest)}`;
  }

  return undefined;
}

async function refreshLanguageSettings(api) {
  try {
    const settings = await api.settings.getCharacterSettings();
    languageAdjective = String(settings?.languageAdjective || "").trim();
  } catch {
    languageAdjective = "";
  }
}

export async function init(api) {
  apiRef = api;
  enabled = readEnabled();

  await refreshLanguageSettings(api);

  settingsListener = async () => {
    await refreshLanguageSettings(api);
  };

  api.events.on("settings", settingsListener);

  hookId = api.commandHooks.register((command) => {
    return transformSpeechCommand(command);
  }, 1000);

  aliasIds.push(
    api.aliases.register(/^\/gnome$/, () => {
      printHelp(api);
      return true;
    }),
  );

  aliasIds.push(
    api.aliases.register(/^\/gnome\s+on$/i, () => {
      setEnabled(api, true);
      return true;
    }),
  );

  aliasIds.push(
    api.aliases.register(/^\/gnome\s+off$/i, () => {
      setEnabled(api, false);
      return true;
    }),
  );

  return {
    name: PLUGIN_NAME,
    version: VERSION,
    author: "ctarx",
    description: "Adds gnome speech by converting spoken text into CamelCase.",
  };
}

export async function destroy() {
  if (!apiRef) {
    return;
  }

  if (hookId) {
    apiRef.commandHooks.unregister(hookId);
    hookId = null;
  }

  for (const id of aliasIds) {
    apiRef.aliases.remove(id);
  }

  aliasIds = [];

  if (settingsListener) {
    apiRef.events.off("settings", settingsListener);
    settingsListener = null;
  }

  apiRef = null;
}
