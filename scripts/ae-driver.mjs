import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const HOST = "localhost";
const PORT = 8862;
const PANEL_NAMESPACE = "com.ae-ai-chat.panel";

let client = null;
let Runtime = null;
let Page = null;

function attachError(error) {
  const detail = error instanceof Error ? error.message : String(error);
  return new Error(
    "Could not attach to the AE panel at http://" + HOST + ":" + PORT +
      ". Start After Effects, open the dev panel, and enable CEP debug mode. " + detail
  );
}

function requireConnection() {
  if (!client || !Runtime || !Page) {
    throw new Error("AE driver is not connected. Call connect() first.");
  }
}

function exceptionMessage(details) {
  return details?.exception?.description || details?.text || "Panel evaluation failed.";
}

export async function connect() {
  if (client) return;

  try {
    const { default: CDP } = await import("chrome-remote-interface");
    const targets = await CDP.List({ host: HOST, port: PORT });
    const pages = targets.filter((target) => target.type === "page");
    const target =
      pages.find((candidate) => candidate.url.includes("/main/index.html")) ||
      pages.find((candidate) => candidate.url.includes("index.html"));

    if (!target) {
      const urls = pages.map((candidate) => candidate.url).filter(Boolean);
      throw new Error(
        "No panel index.html target was found" +
          (urls.length > 0 ? ". Page targets: " + urls.join(", ") : ".")
      );
    }

    client = await CDP({ host: HOST, port: PORT, target: target.id });
    Runtime = client.Runtime;
    Page = client.Page;
    await Promise.all([Runtime.enable(), Page.enable()]);
  } catch (error) {
    await close();
    throw attachError(error);
  }
}

export async function close() {
  const activeClient = client;
  client = null;
  Runtime = null;
  Page = null;
  if (activeClient) await activeClient.close();
}

export async function evalPanel(jsExpr) {
  requireConnection();
  const expression =
    "Promise.resolve().then(function () { return (" + jsExpr + "); })";
  const response = await Runtime.evaluate({
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

  if (response.exceptionDetails) {
    throw new Error(exceptionMessage(response.exceptionDetails));
  }

  return response.result.value;
}

export async function evalES(jsx) {
  const expression = [
    "new Promise(function (resolve, reject) {",
    "  if (!window.__adobe_cep__ || !window.__adobe_cep__.evalScript) {",
    '    reject(new Error("CEP evalScript is unavailable in this panel."));',
    "    return;",
    "  }",
    "  window.__adobe_cep__.evalScript(" + JSON.stringify(jsx) + ", function (raw) {",
    '    if (raw === "EvalScript error.") {',
    '      reject(new Error("After Effects returned EvalScript error."));',
    "      return;",
    "    }",
    "    if (raw === undefined || raw === \"undefined\" || raw === \"\") {",
    "      resolve(undefined);",
    "      return;",
    "    }",
    "    try { resolve(JSON.parse(raw)); }",
    "    catch (error) { reject(new Error(\"AE returned invalid JSON: \" + raw)); }",
    "  });",
    "})",
  ].join("\n");

  return evalPanel(expression);
}

export async function runJsxFile(absPath) {
  const jsx =
    "JSON.stringify($[" + JSON.stringify(PANEL_NAMESPACE) + "].runScriptFile(" +
    JSON.stringify(resolve(absPath)) + "))";
  return evalES(jsx);
}

export async function screenshot(path) {
  requireConnection();
  const outputPath = resolve(path);
  const result = await Page.captureScreenshot({ format: "png" });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, Buffer.from(result.data, "base64"));
  return outputPath;
}

export async function ping() {
  return evalES('JSON.stringify({ version: app.version })');
}

export const endpoint = "http://" + HOST + ":" + PORT;
