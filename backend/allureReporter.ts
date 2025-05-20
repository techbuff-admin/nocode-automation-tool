import { spawnSync } from 'child_process';
import * as path from 'path';

export function generateAllureReport(resultsDir: string) {
  // Runs `allure generate` on the Playwright results
  spawnSync('npx', ['allure', 'generate', resultsDir, '--clean'], { stdio: 'inherit' });
  return path.join(resultsDir, 'allure-report');
}
