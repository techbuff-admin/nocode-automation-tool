import fs from 'fs';
import path from 'path';

export function createProject({ baseDir }: { baseDir: string }) {
  const projectPath = path.join(baseDir, 'playwright-project');
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
    // Initialize a basic Playwright setup
    fs.writeFileSync(
      path.join(projectPath, 'package.json'),
      JSON.stringify({ name: 'pw', dependencies: { playwright: '^1.40.0' } }, null, 2)
    );
    fs.writeFileSync(
      path.join(projectPath, 'tests.example.ts'),
      `import { test } from '@playwright/test';\n\ntest('example', async ({ page }) => {\n  await page.goto('https://example.com');\n});\n`
    );
  }
  return projectPath;
}
