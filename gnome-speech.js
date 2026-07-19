const TAG = "gnome-speech";
const STORAGE_KEY = "gnome-speech:enabled";

let enabled = false;
let currentCharacter = "";

function getStorageKey() {
  return currentCharacter ? `${currentCharacter}:${STORAGE_KEY}` : STORAGE_KEY;
}

function readEnabled() {
  try {
    return localStorage.getItem(getStorageKey()) === "true";
  } catch {
    return false;
  }
}

function saveEnabled(value) {
  enabled = value;
  try {
    localStorage.setItem(getStorageKey(), value ? "true" : "false");
  } catch {}
}

function toCamelCase(text) {
  if (!text) return "";
  const str = String(text);
  const words = str.match(/[\p{L}\p{N}]+/gu) || [];
  if (!words.length) return str;
  const cameled = words
    .map((w) =>
      w.charAt(0).toLocaleUpperCase("pl-PL") +
      w.slice(1).toLocaleLowerCase("pl-PL"),
    )
    .join("");
  const trailing = str.match(/[^\p{L}\p{N}]+$/u);
  return cameled + (trailing ? trailing[0] : "");
}

export async function init(api) {
  try {
    currentCharacter = String(
      api.gmcp.get()?.char?.info?.name || "",
    );
  } catch {
    currentCharacter = "";
  }

  enabled = readEnabled();

  const green = api.colors.fromHex("#00ff00");
  const red = api.colors.fromHex("#ff0000");
  const tagColor = api.colors.fromHex("#cc7700");

  function onCharacter(info) {
    const name = String(info?.name || "");
    if (!name || name === currentCharacter) return;
    currentCharacter = name;
    enabled = readEnabled();
  }

  api.events.on("gmcp.char.info", onCharacter);

  function toggle() {
    enabled = !enabled;
    saveEnabled(enabled);
  }

  function printStatus() {
    const buf = new api.AnsiAwareBuffer(`[${TAG}] `, tagColor);
    buf.append(enabled ? "ON" : "OFF", enabled ? green : red);
    api.output.print(buf);
  }

  api.triggers.register(
    /^(Mowisz|Mowicie)(.*?: )(.*)$/,
    (line, matches) => {
      if (!enabled) return line;

      const prefixEnd = matches[1].length + matches[2].length;
      const original = matches[3];
      const converted = toCamelCase(original);

      if (converted === original) return line;

      const state = line.getStateAt(prefixEnd);
      line.replace([prefixEnd, line.text.length], converted, state);
      return line;
    },
    TAG,
  );

  api.aliases.register(/^\/gnome$/, () => {
    printStatus();
    return true;
  });

  api.aliases.register(/^\/gnome\s+on$/i, () => {
    if (!enabled) toggle();
    printStatus();
    return true;
  });

  api.aliases.register(/^\/gnome\s+off$/i, () => {
    if (enabled) toggle();
    printStatus();
    return true;
  });

  return {
    name: "Gnome Speech",
    version: "1.0.5",
    author: "ctarx",
    description: "Converts spoken text to gnome-style CamelCase in output",
  };
}

export async function destroy() {
  currentCharacter = "";
  enabled = false;
}
