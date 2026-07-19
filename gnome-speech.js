const TAG = "gnome-speech";
const STORAGE_KEY = "gnome-speech:enabled";

let enabled = false;
let footerHandle = null;
let menuEntryHandle = null;

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

function toggle() {
  enabled = !enabled;
  saveEnabled(enabled);
  updateUI();
}

function updateUI() {
  const color = enabled ? "#7afa01" : "#666";
  const label = enabled ? "GNOME" : "gnome";

  if (footerHandle) {
    footerHandle.setContent(
      `<span style="color:${color};cursor:pointer">${label}</span>`,
    );
  }

  if (menuEntryHandle) {
    menuEntryHandle.setLabel(`Gnome Speech: ${enabled ? "ON" : "OFF"}`);
  }
}

export async function init(api) {
  enabled = readEnabled();

  footerHandle = api.ui.registerFooterComponent(
    "gnomeSpeech",
    '<span style="cursor:pointer">gnome</span>',
    "end",
  );
  footerHandle.element.addEventListener("click", toggle);

  menuEntryHandle = api.ui.addPopupMenuEntry("Gnome Speech: OFF", () => {
    toggle();
  });

  updateUI();

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
    api.output.print(
      `[${TAG}] /gnome on | /gnome off  (currently ${enabled ? "ON" : "OFF"})`,
    );
    return true;
  });

  api.aliases.register(/^\/gnome\s+on$/i, () => {
    if (!enabled) toggle();
    api.output.print(`[${TAG}] ON`);
    return true;
  });

  api.aliases.register(/^\/gnome\s+off$/i, () => {
    if (enabled) toggle();
    api.output.print(`[${TAG}] off`);
    return true;
  });

  return {
    name: "Gnome Speech",
    version: "1.0.5",
    author: "ctarx",
    description: "Converts spoken text to gnome-style CamelCase in output",
  };
}

export async function destroy() {}
