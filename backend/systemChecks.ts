// backend/systemChecks.ts
import { execSync } from 'child_process';

export interface DependencyStatus {
  name: 'playwright' | 'msedge' | 'java' | 'allure';
  display: string;
  installed: boolean;
  version?: string;
  latestVersion?: string;
}

/** Try a shell command; extract first semver if present */
function test(cmd: string): { ok: boolean; version?: string } {
  try {
    const out = execSync(cmd, { stdio: 'pipe' }).toString().trim();
    const firstLine = out.split('\n')[0];
    const match = firstLine.match(/\d+\.\d+\.\d+/);
    return { ok: true, version: match?.[0] ?? firstLine };
  } catch {
    return { ok: false };
  }
}

/** Query npm registry for the latest published version */
function npmLatest(pkg: string): string | undefined {
  try {
    return execSync(`npm view ${pkg} version`, { stdio: 'pipe' })
      .toString()
      .trim();
  } catch {
    return undefined;
  }
}

/** Read a globally‐installed package’s version via npm list -g */
function globalVersion(pkg: string): string | undefined {
  try {
    const raw = execSync(
      `npm list -g ${pkg} --depth=0 --json`,
      { stdio: 'pipe' }
    ).toString();
    const info = JSON.parse(raw);
    return info.dependencies?.[pkg]?.version;
  } catch {
    return undefined;
  }
}

export function runChecks(): DependencyStatus[] {
  const checks: DependencyStatus[] = [];

  // 1) Playwright CLI (global)
  const pwVersion = globalVersion('playwright');
  const pwLatest = npmLatest('playwright');
  checks.push({
    name: 'playwright',
    display: 'Playwright',
    installed: !!pwVersion,
    version: pwVersion,
    latestVersion: pwLatest,
  });

  // 2) MS Edge channel (Playwright)
  // Dry-run to see if the channel is available
  const me = test('npx playwright install msedge --dry-run');
  checks.push({
    name: 'msedge',
    display: 'MS Edge (Playwright)',
    installed: me.ok,
    version: me.ok ? 'installed' : undefined,
  });

  // 3) Java
  const java = test('java -version');
  checks.push({
    name: 'java',
    display: 'Java',
    installed: java.ok,
    version: java.ok ? java.version : undefined,
  });

  // 4) Allure-CLI (global)
  const allureVersion = globalVersion('allure-commandline');
  const allureLatest = npmLatest('allure-commandline');
  checks.push({
    name: 'allure',
    display: 'Allure',
    installed: !!allureVersion,
    version: allureVersion,
    latestVersion: allureLatest,
  });

  return checks;
}
