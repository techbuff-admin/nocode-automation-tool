// backend/playwrightProject.ts
import fs from 'fs';
import path from 'path';

export function createProject({ baseDir }: { baseDir: string }) {
  // ← either use baseDir directly…
  const projectPath = baseDir;
  // …or if you really want a subfolder, do:
  // const projectPath = path.join(baseDir, 'playwright-project');

  // ensure the directory exists
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }

  const pkg = {
    name: path.basename(projectPath),
    version: "1.0.0",
    scripts: {
      test: "npx playwright test"
    },
    devDependencies: {
      "playwright": "^1.52.0",
      "@playwright/test": "^1.52.0",   // ← required for the test runner
      "allure-commandline": "^2.34.0",
      "allure-playwright": "^2.13.0"   // ← prevents “Cannot find module 'allure-playwright'”
    }
  };

  fs.writeFileSync(
    path.join(projectPath, 'package.json'),
    JSON.stringify(pkg, null, 2),
    'utf8'
  );

  // (Optional) write a minimal Playwright config so it never tries to use any other reporters:
  fs.writeFileSync(
    path.join(projectPath, 'playwright.config.ts'),
    `import { defineConfig } from '@playwright/test';
export default defineConfig({
  reporter: [['list']],
});\n`,
    'utf8'
  );

  // (Optional) write an example test
  const testsDir = path.join(projectPath, 'tests');
  if (!fs.existsSync(testsDir)) fs.mkdirSync(testsDir);
  fs.writeFileSync(
    path.join(testsDir, 'example.spec.ts'),
    `import { test } from '@playwright/test';
test('example', async ({ page }) => {
  await page.goto('https://example.com');
});\n`,
    'utf8'
  );

  return projectPath;
}
