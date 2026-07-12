import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import ts from "typescript";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(join(tmpdir(), "ae-ai-chat-tests-"));
const sourceFiles = [
  "src/js/lib/expression-rewriter.ts",
  "src/js/lib/security.ts",
  "src/js/lib/update-check.ts",
  "src/js/lib/utils/html-entities.ts",
  "src/js/lib/cep/node.ts",
  "src/js/lib/knowledge/effects.ts",
  "src/js/lib/knowledge/expressions.ts",
  "src/js/lib/knowledge/validator.ts",
  "src/js/lib/knowledge/validator-utils.ts",
  "src/js/lib/knowledge/types.ts",
  "src/js/lib/knowledge/data/effect-index.ts",
  "src/js/lib/knowledge/data/effects-detail.ts",
  "src/js/lib/knowledge/data/expressions.ts",
  "src/js/lib/knowledge/data/property-matchnames.ts",
  "src/shared/run-diff.ts",
];
const testFiles = readdirSync(join(repoRoot, "tests"))
  .filter((file) => file.endsWith(".test.ts"))
  .map((file) => join("tests", file));

try {
  for (const sourcePath of sourceFiles.concat(testFiles)) {
    const inputPath = join(repoRoot, sourcePath);
    const outputPath = join(tempRoot, sourcePath.replace(/\.ts$/, ".js"));
    const result = ts.transpileModule(readFileSync(inputPath, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
      fileName: inputPath,
      reportDiagnostics: true,
    });
    const errors = (result.diagnostics || []).filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
    );

    if (errors.length > 0) {
      for (const error of errors) {
        console.error(ts.flattenDiagnosticMessageText(error.messageText, "\n"));
      }
      process.exitCode = 1;
      break;
    }

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, result.outputText, "utf8");
  }

  if (!process.exitCode) {
    const compiledTests = testFiles.map((file) =>
      join(tempRoot, file.replace(/\.ts$/, ".js"))
    );
    const result = spawnSync(process.execPath, ["--test", ...compiledTests], {
      cwd: repoRoot,
      stdio: "inherit",
    });
    process.exitCode = result.status ?? 1;
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
