import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { name, version } from "../package.json";

const __dirname = dirname(fileURLToPath(import.meta.url));

(() => {
  // 更新 Cargo.toml 和 Cargo.lock
  const tomlPath = resolve(__dirname, "..", "src-tauri", "Cargo.toml");
  const lockPath = resolve(__dirname, "..", "Cargo.lock");

  for (const path of [tomlPath, lockPath]) {
    let content = readFileSync(path, "utf-8");

    const regexp = new RegExp(
      `(name\\s*=\\s*"${name}"\\s*version\\s*=\\s*)"(\\d+\\.\\d+\\.\\d+(-\\w+\\.\\d+)?)"`,
    );

    content = content.replace(regexp, `$1"${version}"`);

    writeFileSync(path, content);
  }

  // 更新 frontend/package.json
  const frontendPackagePath = resolve(
    __dirname,
    "..",
    "frontend",
    "package.json",
  );
  const frontendPackage = JSON.parse(
    readFileSync(frontendPackagePath, "utf-8"),
  );

  frontendPackage.version = version;

  writeFileSync(
    frontendPackagePath,
    `${JSON.stringify(frontendPackage, null, 2)}\n`,
  );

  // console.log(`✓ 版本已更新至 ${version}`);
  // console.log(`  - src-tauri/Cargo.toml`);
  // console.log(`  - Cargo.lock`);
  // console.log(`  - frontend/package.json`);
})();
