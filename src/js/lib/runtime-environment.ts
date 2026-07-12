import { fs } from "./cep/node";

export interface RuntimeEnvironment {
  extensionPath: string;
  realExtensionPath: string;
  isDevInstall: boolean;
  reason: string;
}

function normalizePath(value: string): string {
  // getSystemPath returns a file:// URL on macOS; fs needs a plain path.
  return decodeURI(value).replace(/^file:\/\//, "").replace(/\\/g, "/");
}

function getExtensionPath(): string {
  if (typeof window === "undefined" || typeof window.__adobe_cep__ === "undefined") {
    return "";
  }

  try {
    return normalizePath(String(window.__adobe_cep__.getSystemPath("extension") || ""));
  } catch (_) {
    return "";
  }
}

function getRealPath(extensionPath: string): string {
  if (!extensionPath || typeof fs.realpathSync !== "function") return "";

  try {
    return normalizePath(fs.realpathSync(extensionPath));
  } catch (_) {
    return "";
  }
}

function isSymlink(extensionPath: string): boolean {
  if (!extensionPath || typeof fs.lstatSync !== "function") return false;

  try {
    return fs.lstatSync(extensionPath).isSymbolicLink();
  } catch (_) {
    return false;
  }
}

function isRepoDistPath(pathValue: string): boolean {
  return /\/ae-ai-chat\/dist\/cep\/?$/.test(pathValue);
}

export function getRuntimeEnvironment(): RuntimeEnvironment {
  const extensionPath = getExtensionPath();
  const realExtensionPath = getRealPath(extensionPath);
  const loadedFromSymlink = isSymlink(extensionPath);
  const loadedFromRepoDist =
    isRepoDistPath(extensionPath) || isRepoDistPath(realExtensionPath);
  const isDevInstall = loadedFromSymlink || loadedFromRepoDist;

  let reason = "Loaded from packaged ZXP install";
  if (loadedFromSymlink) {
    reason = "Loaded from CEP symlink";
  } else if (loadedFromRepoDist) {
    reason = "Loaded from repo dist/cep";
  }

  return {
    extensionPath,
    realExtensionPath,
    isDevInstall,
    reason,
  };
}
