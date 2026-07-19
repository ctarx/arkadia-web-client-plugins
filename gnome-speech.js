const TAG = "gnome-speech";
const STORAGE_KEY = "gnome-speech:enabled";

const ANSI = {
  reset: "\x1b[0m",
  green: "\x1b[38;2;122;246;1m",
  red: "\x1b[38;2;249;97;70m",
};

let apiRef = null;
let hookId = null;
let aliasIds = [];
let settingsListener = null;
let characterListener = null;

let enabled = false;
let currentCharacter = "";
let currentLang = "potoczna";
let languageAdjective = "";
let languageAdjectives = new Set();

function getStorageKey() {
  return currentCharacter ? `${currentCharacter}:${STORAGE_KEY}` : "";
}

function readEnabled() {
  try {
    const key = getStorageKey();
    return key ? localStorage.getItem(key) === "true" : false;
  } catch {
    return false;
  }
}

function saveEnabled(value) {
  enabled = value;

  try {
    const key = getStorageKey();

    if (key) {
      localStorage.setItem(key, value ? "true" : "false");
    }
  } catch {
    /* localStorage may be unavailable in some browser modes. */
  }
}

function getStatusColor() {
  return enabled ? ANSI.green : ANSI.red;
}

function getStatusText() {
  return enabled ? "on" : "off";
}

function printHelp(api) {
  api.output.print(`[${TAG}] Usage: /gnome on | /gnome off`);
  api.output.print(
    `[${TAG}] Status: ${getStatusColor()}${getStatusText()}${ANSI.reset}`,
  );
}

function setEnabled(api, value) {
  saveEnabled(value);

  api.output.print(
    `[${TAG}] ${getStatusColor()}${getStatusText()}${ANSI.reset}`,
  );
}

function normalizeWord(word) {
  return String(word || "")
    .trim()
    .toLocaleLowerCase("pl-PL");
}

function capitalizeWord(word) {
  if (!word) {
    return "";
  }

  const first = word.slice(0, 1).toLocaleUpperCase("pl-PL");
  const rest = word.slice(1);

  return first + rest;
}

function camelCaseText(text) {
  const words = String(text).match(/[\p{L}\p{N}]+/gu) || [];
  return words.map(capitalizeWord).join("");
}

function transformSayText(text) {
  const trimmed = String(text || "").trim();

  if (!trimmed) {
    return "";
  }

  const match = trimmed.match(/^(\S+)\s+(.+)$/);

  if (!match) {
    return camelCaseText(trimmed);
  }

  const firstWord = match[1];
  const rest = match[2];

  if (languageAdjectives.has(normalizeWord(firstWord))) {
    return `${firstWord} ${camelCaseText(rest)}`;
  }

  return camelCaseText(trimmed);
}

function transformSpeechCommand(command) {
  if (!enabled || !command || typeof command !== "string") {
    return undefined;
  }

  const apostropheMatch = command.match(/^'(?!')(.+)$/);

  if (apostropheMatch) {
    const msg = apostropheMatch[1];

    if (!msg.trim()) {
      return undefined;
    }

    if (currentLang !== "potoczna" || languageAdjective.trim()) {
      return undefined;
    }

    return "'" + camelCaseText(msg);
  }

  const sayMatch = command.match(/^(ppowiedz|jppowiedz)\s+(.+)$/);

  if (sayMatch) {
    const verb = sayMatch[1];
    const rest = sayMatch[2];

    if (!rest.trim()) {
      return undefined;
    }

    return `${verb} ${transformSayText(rest)}`;
  }

  return undefined;
}

async function refreshLanguageSettings(api) {
  try {
    const settings = await api.settings.getCharacterSettings();

    currentLang = String(settings?.language || "potoczna");
    languageAdjective = String(settings?.languageAdjective || "").trim();

    const adjectives = new Set();

    if (languageAdjective) {
      adjectives.add(normalizeWord(languageAdjective));
    }

    for (const item of settings?.languageAliases || []) {
      const adj = String(item?.adjective || "").trim();

      if (adj) {
        adjectives.add(normalizeWord(adj));
      }
    }

    languageAdjectives = adjectives;
  } catch {
    currentLang = "potoczna";
    languageAdjective = "";
    languageAdjectives = new Set();
  }
}

export async function init(api) {
  apiRef = api;

  try {
    currentCharacter = String(
      api.gmcp.get()?.char?.info?.name ||
        localStorage.getItem("currentCharacter") ||
        "",
    );
  } catch {
    currentCharacter = "";
  }

  enabled = readEnabled();

  await refreshLanguageSettings(api);

  settingsListener = async () => {
    await refreshLanguageSettings(api);
  };

  api.events.on("settings", settingsListener);

  characterListener = async (info) => {
    const character = String(info?.name || "");

    if (!character || character === currentCharacter) {
      return;
    }

    currentCharacter = character;
    enabled = readEnabled();

    await refreshLanguageSettings(api);
  };

  api.events.on("gmcp.char.info", characterListener);

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
    name: "gnome-speech",
    version: "1.0.5",
    author: "ctarx",
    description: "Converts spoken text into gnome-style CamelCase.",
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

  if (characterListener) {
    apiRef.events.off("gmcp.char.info", characterListener);
    characterListener = null;
  }

  currentCharacter = "";
  enabled = false;
  apiRef = null;
}
