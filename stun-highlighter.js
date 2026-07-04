const TAG = "stun-highlighter";

let apiRef = null;

const ANSI = {
  reset: "\x1b[0m",
  white: "\x1b[38;2;255;255;255m",
  violetRed: "\x1b[38;2;208;32;144m",
  violetRedBg: "\x1b[48;2;208;32;144m",
  whiteBg: "\x1b[48;2;255;255;255m",
  gold: "\x1b[38;2;255;215;0m",
  cyan: "\x1b[38;2;0;255;255m",
};

const INDENT = "\t\t\t";

const STUN_PATTERN =
  /.* walisz (.+?) na odlew .* Nieprzyjemne chrzakniecie i metny wzrok przeciwnika swiadcza, ze dobrze wymierzony cios musial trafic w jakies wrazliwe miejsce\./i;

const RECOVERY_PATTERN = /^([a-zA-Z ]+) powoli dochodzi do siebie\.$/i;

function stripAnsi(text) {
  return String(text || "")
    .replace(/\x1b\[[0-9;]*m/g, "")
    .trim();
}

function printStun(target) {
  const name = stripAnsi(target).toUpperCase();

  if (!name) {
    return;
  }

  apiRef.output.print(
    `\n\n${INDENT}${ANSI.white}${ANSI.violetRedBg} OGLUSZYLES ${ANSI.reset}` +
      `${ANSI.violetRed}${ANSI.whiteBg} ${name} ${ANSI.reset}\n\n`,
  );
}

function printRecovery(target) {
  const name = stripAnsi(target);

  if (!name) {
    return;
  }

  apiRef.output.print(
    `\n\n${INDENT}${ANSI.gold}${name}${ANSI.reset} ` +
      `${ANSI.cyan}dochodzi do siebie${ANSI.reset}\n\n`,
  );
}

export async function init(api) {
  apiRef = api;

  api.triggers.register(
    STUN_PATTERN,
    (line, matches) => {
      printStun(matches[1]);
      return line;
    },
    TAG,
  );

  api.triggers.register(
    RECOVERY_PATTERN,
    (line, matches) => {
      printRecovery(matches[1]);
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
  if (apiRef?.triggers?.removeByTag) {
    apiRef.triggers.removeByTag(TAG);
  }

  apiRef = null;
}
