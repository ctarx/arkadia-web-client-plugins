const TAG = "stun-highlighter";
let apiRef = null;

const HEX = {
  white: "#ffffff",
  violetRed: "#d02090",
  gold: "#ffd700",
  cyan: "#00ffff",
};

function print(content) {
  apiRef.output.print(content);
}

function clean(text) {
  return String(text || "")
    .replace(/\x1b\[[0-9;]*m/g, "")
    .trim();
}

function withBackground(foregroundState, bgHex) {
  return {
    ...foregroundState,
    background: { space: "hex", color: bgHex },
  };
}

function printStunned(target) {
  const name = clean(target).toUpperCase();
  if (!name) return;

  const labelStyle = withBackground(
    apiRef.colors.fromHex(HEX.white),
    HEX.violetRed,
  );
  const nameStyle = withBackground(
    apiRef.colors.fromHex(HEX.violetRed),
    HEX.white,
  );

  const buffer = new apiRef.AnsiAwareBuffer(
    "\n\n\t\t\t OGLUSZYLES ",
    labelStyle,
  );
  buffer.append(` ${name} `, nameStyle);
  buffer.append("\n\n");

  print(buffer);
}

function printRecovered(target) {
  const name = clean(target);
  if (!name) return;

  const buffer = new apiRef.AnsiAwareBuffer(
    "\n\t\t" + name,
    apiRef.colors.fromHex(HEX.gold),
  );
  buffer.append(" dochodzi do siebie", apiRef.colors.fromHex(HEX.cyan));
  buffer.append("\n\n");

  print(buffer);
}

export async function init(api) {
  apiRef = api;

  api.triggers.register(
    /.* walisz (.*) na odlew .* Nieprzyjemne chrzakniecie i metny wzrok przeciwnika swiadcza, ze dobrze wymierzony cios musial trafic w jakies wrazliwe miejsce\./i,
    (line, matches) => {
      printStunned(matches[1]);
      return line;
    },
    TAG,
  );

  api.triggers.register(
    /^([a-zA-Z ]+) powoli dochodzi do siebie\.$/i,
    (line, matches) => {
      printRecovered(matches[1]);
      return null;
    },
    TAG,
  );

  return {
    name: "stun-highlighter",
    version: "1.0.1",
    author: "ctarx",
    description: "Highlights stun and stun recovery messages.",
  };
}

export async function destroy() {
  if (
    apiRef &&
    apiRef.triggers &&
    typeof apiRef.triggers.removeByTag === "function"
  ) {
    apiRef.triggers.removeByTag(TAG);
  }
  apiRef = null;
}
