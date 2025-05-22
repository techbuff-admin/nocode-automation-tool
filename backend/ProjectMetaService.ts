// backend/ProjectMetaService.ts
import fs from 'fs/promises';
import path from 'path';
import { ProjectMeta, TestSuite } from '../shared/types';

export class ProjectMetaService {
  constructor(private projectDir: string) {}

  private get metaPath() {
    return path.join(this.projectDir, 'nca-config.json');
  }

 /** Load existing JSON or write & return a default one */
 async load(): Promise<ProjectMeta> {
  let meta: ProjectMeta;
  try {
    const raw = await fs.readFile(this.metaPath, 'utf8');
    const m = JSON.parse(raw) as ProjectMeta;
    meta = {
      name: path.basename(this.projectDir),
      env: m.env || { baseUrl: '', timeout: 5000 },
      pages: m.pages || [],
      suites: m.suites || [],
    };
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      // No config on disk → create default
      meta = {
        name: path.basename(this.projectDir),
        env: { baseUrl: '', timeout: 5000 },
        pages: [],
        suites: [],
      };
      await fs.writeFile(this.metaPath, JSON.stringify(meta, null, 2), 'utf8');
    } else {
      throw err;
    }
  }
  return meta;
}

async save(meta: ProjectMeta) {
  // Ensure pages & suites exist
  meta.pages  = Array.isArray(meta.pages)  ? meta.pages  : [];
  meta.suites = Array.isArray(meta.suites) ? meta.suites : [];


  // 1) Write the metadata JSON
  await fs.writeFile(this.metaPath, JSON.stringify(meta, null, 2), 'utf8');

  // 2) Regenerate your specs
  await this.generateAllSpecs(meta.suites, meta.env);
}

async generateAllSpecs(suites: any[], env: any) {
  if (!Array.isArray(suites)) return;

  // 1) Ensure the tests/ folder exists
  const testsDir = path.join(this.projectDir, 'tests');
  await fs.mkdir(testsDir, { recursive: true });

  for (const suite of suites) {
    // validate suite.file (or derive one)
    let filename: string;
    if (typeof suite.file === 'string' && suite.file.trim()) {
      // strip any leading folder so we don't accidentally nest tests/tests/…
      filename = path.basename(suite.file);
    } else {
      // fallback: slugify the suite name
      const base = String(suite.name || 'suite')
        .trim()
        .toLowerCase()
        .replace(/\W+/g, '_');
      filename = `${base}.spec.ts`;
    }

    const out  = this.renderSuite(suite);
    const dest = path.join(testsDir, filename);

    // write it out
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, out, 'utf-8');
    console.log(`[generateAllSpecs] wrote ${dest}`);
  }
}
  private renderSuite(suite: TestSuite): string {
    // simple template; you can use handlebars or EJS if you want
    let code = `
import { test, expect } from '@playwright/test';

test.describe('${suite.name}', () => {
`;
    for (const c of suite.cases) {
      code += `  test('${c.name}', async ({ page }) => {\n`;
      for (const a of c.actions) {
        switch (a.type) {
          case 'goto':
            code += `    await page.goto('${a.url}');\n`;
            break;
          case 'fill':
            code += `    await page.fill('${a.selector}', '${a.value}');\n`;
            break;
          case 'click':
            code += `    await page.click('${a.selector}');\n`;
            break;
          case 'wait':
            code += `    await page.waitForTimeout(${a.timeout});\n`;
            break;
        }
      }
      code += `  });\n`;
    }
    code += `});\n`;
    return code;
  }
}
