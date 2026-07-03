import { https } from "./cep/node";

const RELEASE_API_URL =
  "https://api.github.com/repos/boo13/ae-ai-chat/releases/latest";
const CACHE_KEY = "ae-ai-chat.latest-release";
const DISMISSED_VERSION_KEY = "ae-ai-chat.dismissed-update-version";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5000;
const MAX_RESPONSE_BYTES = 1024 * 1024;

interface GitHubReleaseAsset {
  name?: unknown;
  browser_download_url?: unknown;
}

interface GitHubReleaseResponse {
  tag_name?: unknown;
  html_url?: unknown;
  assets?: unknown;
}

interface ReleaseInfo {
  tagName: string;
  releaseUrl: string;
  downloadUrl: string;
}

interface CachedRelease {
  checkedAt: number;
  release: ReleaseInfo;
}

export interface AvailableUpdate {
  version: string;
  releaseUrl: string;
  downloadUrl: string;
}

interface ParsedVersion {
  numbers: number[];
  prerelease: string | null;
}

function parseVersion(value: string): ParsedVersion | null {
  const normalized = value.trim().replace(/^v/i, "").split("+", 1)[0];
  const prereleaseStart = normalized.indexOf("-");
  const numberPart =
    prereleaseStart === -1 ? normalized : normalized.slice(0, prereleaseStart);
  const prerelease =
    prereleaseStart === -1 ? null : normalized.slice(prereleaseStart + 1);
  const numberParts = numberPart.split(".");

  if (
    numberParts.length === 0 ||
    numberParts.some((part) => !/^\d+$/.test(part)) ||
    prerelease === ""
  ) {
    return null;
  }

  return {
    numbers: numberParts.map(Number),
    prerelease,
  };
}

function comparePrerelease(left: string | null, right: string | null): number {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;

  const leftParts = left.split(".");
  const rightParts = right.split(".");
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index];
    const rightPart = rightParts[index];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;

    const leftNumeric = /^\d+$/.test(leftPart);
    const rightNumeric = /^\d+$/.test(rightPart);
    if (leftNumeric && rightNumeric) {
      const leftNumber = Number(leftPart);
      const rightNumber = Number(rightPart);
      if (leftNumber !== rightNumber) {
        return leftNumber > rightNumber ? 1 : -1;
      }
      continue;
    }

    if (leftNumeric !== rightNumeric) {
      return leftNumeric ? -1 : 1;
    }

    if (leftPart !== rightPart) {
      return leftPart > rightPart ? 1 : -1;
    }
  }

  return 0;
}

export function compareVersions(left: string, right: string): number {
  const leftVersion = parseVersion(left);
  const rightVersion = parseVersion(right);
  if (!leftVersion || !rightVersion) return 0;

  const length = Math.max(
    leftVersion.numbers.length,
    rightVersion.numbers.length
  );
  for (let index = 0; index < length; index += 1) {
    const leftNumber = leftVersion.numbers[index] || 0;
    const rightNumber = rightVersion.numbers[index] || 0;
    if (leftNumber !== rightNumber) {
      return leftNumber > rightNumber ? 1 : -1;
    }
  }

  return comparePrerelease(leftVersion.prerelease, rightVersion.prerelease);
}

function readCachedRelease(): ReleaseInfo | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedRelease;
    if (
      typeof cached.checkedAt !== "number" ||
      Date.now() - cached.checkedAt >= CACHE_TTL_MS ||
      !cached.release
    ) {
      return null;
    }

    return cached.release;
  } catch {
    return null;
  }
}

function cacheRelease(release: ReleaseInfo) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ checkedAt: Date.now(), release } satisfies CachedRelease)
    );
  } catch {}
}

function getDismissedVersion(): string | null {
  try {
    return localStorage.getItem(DISMISSED_VERSION_KEY);
  } catch {
    return null;
  }
}

export function dismissUpdate(version: string) {
  try {
    localStorage.setItem(DISMISSED_VERSION_KEY, version);
  } catch {}
}

function requestWithFetch(): Promise<GitHubReleaseResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  return fetch(RELEASE_API_URL, {
    headers: {
      Accept: "application/vnd.github+json",
    },
    signal: controller.signal,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`GitHub release request failed (${response.status})`);
      }
      return response.json() as Promise<GitHubReleaseResponse>;
    })
    .finally(() => clearTimeout(timeout));
}

function requestWithNode(currentVersion: string): Promise<GitHubReleaseResponse> {
  return new Promise((resolve, reject) => {
    const request = https.get(
      RELEASE_API_URL,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": `AE-AI-Chat/${currentVersion}`,
        },
      },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(
            new Error(
              `GitHub release request failed (${response.statusCode || "unknown"})`
            )
          );
          return;
        }

        response.setEncoding("utf8");
        let body = "";

        response.on("data", (chunk: string) => {
          body += chunk;
          if (body.length > MAX_RESPONSE_BYTES) {
            request.destroy(new Error("GitHub release response was too large"));
          }
        });
        response.on("end", () => {
          try {
            resolve(JSON.parse(body) as GitHubReleaseResponse);
          } catch {
            reject(new Error("GitHub release response was invalid"));
          }
        });
      }
    );

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error("GitHub release request timed out"));
    });
    request.on("error", reject);
  });
}

async function requestLatestRelease(
  currentVersion: string
): Promise<GitHubReleaseResponse> {
  if (typeof window.cep !== "undefined") {
    return requestWithNode(currentVersion);
  }
  return requestWithFetch();
}

function normalizeRelease(release: GitHubReleaseResponse): ReleaseInfo | null {
  if (
    typeof release.tag_name !== "string" ||
    typeof release.html_url !== "string"
  ) {
    return null;
  }

  const assets = Array.isArray(release.assets)
    ? (release.assets as GitHubReleaseAsset[])
    : [];
  const zxpAsset = assets.find(
    (asset) =>
      typeof asset.name === "string" &&
      asset.name.toLowerCase().endsWith(".zxp") &&
      typeof asset.browser_download_url === "string"
  );

  return {
    tagName: release.tag_name,
    releaseUrl: release.html_url,
    downloadUrl:
      typeof zxpAsset?.browser_download_url === "string"
        ? zxpAsset.browser_download_url
        : release.html_url,
  };
}

function toAvailableUpdate(
  release: ReleaseInfo,
  currentVersion: string
): AvailableUpdate | null {
  const version = release.tagName.replace(/^v/i, "");
  if (
    compareVersions(version, currentVersion) <= 0 ||
    getDismissedVersion() === version
  ) {
    return null;
  }

  return {
    version,
    releaseUrl: release.releaseUrl,
    downloadUrl: release.downloadUrl,
  };
}

export async function checkForUpdate(
  currentVersion: string
): Promise<AvailableUpdate | null> {
  const cachedRelease = readCachedRelease();
  if (cachedRelease) {
    return toAvailableUpdate(cachedRelease, currentVersion);
  }

  try {
    const response = await requestLatestRelease(currentVersion);
    const release = normalizeRelease(response);
    if (!release) return null;
    cacheRelease(release);
    return toAvailableUpdate(release, currentVersion);
  } catch {
    return null;
  }
}
