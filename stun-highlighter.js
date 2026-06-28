const TAG = "stun-highlighter";

let apiRef = null;

const C = {
  reset: "\x1b[0m",
  white: "\x1b[38;2;255;255;255m",
  violetRed: "\x1b[38;2;208;32;144m",
  violetRedBg: "\x1b[48;2;208;32;144m",
  whiteBg: "\x1b[48;2;255;255;255m",
  gold: "\x1b[38;2;255;215;0m",
  cyan: "\x1b[38;2;0;255;255m",
};

function print(text) {
  apiRef.output.print(text);
}

function clean(text) {
  return String(text || "")
    .replace(/\x1b\[[0-9;]*m/g, "")
    .trim();
}

function printStunned(target) {
  const name = clean(target).toUpperCase();

  if (!name) {
    return;
  }

  print(
    "\n\n" +
      "\t\t\t" +
      C.white +
      C.violetRedBg +
      " OGLUSZYLES " +
      C.reset +
      C.violetRed +
      C.whiteBg +
      " " +
      name +
      " " +
      C.reset +
      "\n\n",
  );
}

function printRecovered(target) {
  const name = clean(target);

  if (!name) {
    return;
  }

  print(
    "\n" +
      "\t\t" +
      C.gold +
      name +
      C.reset +
      " " +
      C.cyan +
      "dochodzi do siebie" +
      C.reset +
      "\n\n",
  );
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
    version: "1.0.0",
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
