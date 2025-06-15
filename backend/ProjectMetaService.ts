// backend/ProjectMetaService.ts
import fs from 'fs/promises';
import path from 'path';
import { PageObject, ProjectMeta, TestSuite, Action } from '../shared/types';

function slugify(name: string) {
  return name.trim().toLowerCase().replace(/\W+/g, '_') || 'page';
}
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
      // ← new: grab integrations if present
      const integrations = m.integrations || {};
      // Convert pages object→array if needed
      const pagesArray: PageObject[] = Array.isArray(m.pages)
        ? m.pages
        : Object.entries(m.pages || {}).map(([name, selectors]) => ({
            name,
            selectors: selectors as Record<string, string>,
          }));
      meta = {
        name: path.basename(this.projectDir),
        env: m.env || { baseUrl: '', timeout: 5000 },
        pages: pagesArray,
        suites: m.suites || [],
        integrations:integrations  
      };
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        meta = {
          name: path.basename(this.projectDir),
          env: { baseUrl: '', timeout: 5000 },
          pages: [],
          suites: [],
          integrations: {},    
        };
        await fs.writeFile(this.metaPath, JSON.stringify(meta, null, 2), 'utf8');
      } else {
        throw err;
      }
    }
    return meta;
  }

  async save(meta: ProjectMeta) {
    // 1) Load old meta
    let oldMeta: ProjectMeta = {
      name: '',
      env: { baseUrl: '', timeout: 0 },
      pages: [],
      suites: [],
    };
    try {
      const raw = await fs.readFile(this.metaPath, 'utf8');
      oldMeta = JSON.parse(raw);
    } catch {
      /* ignore missing */
    }

    // 2) Write new JSON
    await fs.writeFile(this.metaPath, JSON.stringify(meta, null, 2), 'utf8');

    // 3) Delete stale suite files
    {
      const oldFiles = oldMeta.suites
        .map((s) => s.file)
        .filter((f): f is string => typeof f === 'string');
      const newFiles = meta.suites
        .map((s) => s.file)
        .filter((f): f is string => typeof f === 'string');
      const removed = oldFiles.filter((f) => !newFiles.includes(f));
      for (const file of removed) {
        const full = path.join(this.projectDir, file);
        await fs.rm(full, { force: true });
        console.log(`[ProjectMetaService] deleted stale suite file ${full}`);
      }
    }

    // 4) Page‐object patching (rename/delete/add)…
    const outDir = path.join(this.projectDir, 'page-objects');
    await fs.mkdir(outDir, { recursive: true });

    const oldNames = oldMeta.pages.map((p) => p.name);
    const newNames = meta.pages.map((p) => p.name);
    const removed = oldNames.filter((n) => !newNames.includes(n));
    const added = newNames.filter((n) => !oldNames.includes(n));
    const isSimpleRename =
      removed.length === 1 &&
      added.length === 1 &&
      oldMeta.pages.length === meta.pages.length;

    if (!isSimpleRename && removed.length) {
      for (const name of removed) {
        const stale = path.join(outDir, `${slugify(name)}.ts`);
        await fs.rm(stale, { force: true });
      }
    }

    if (isSimpleRename) {
      const [oldName] = removed;
      const [newName] = added;
      const oldFile = path.join(outDir, `${slugify(oldName)}.ts`);
      const newFile = path.join(outDir, `${slugify(newName)}.ts`);
      try {
        await fs.rename(oldFile, newFile);
      } catch {
        console.warn(
          `[ProjectMetaService] rename failed, will regenerate pages`
        );
      }
      const renamedPage = meta.pages.find((p) => p.name === newName)!;
      await fs.writeFile(newFile, this.renderPageObject(renamedPage), 'utf8');
      for (const page of meta.pages) {
        const dest = path.join(outDir, `${slugify(page.name)}.ts`);
        await fs.writeFile(dest, this.renderPageObject(page), 'utf8');
      }
    }

    // patch individual locator changes…
    for (const page of meta.pages) {
      const slug = slugify(page.name);
      const file = path.join(outDir, `${slug}.ts`);
      let content: string;
      try {
        content = await fs.readFile(file, 'utf8');
      } catch {
        await fs.writeFile(file, this.renderPageObject(page), 'utf8');
        continue;
      }
      const oldPage = oldMeta.pages.find((p) => p.name === page.name);
      const oldSel = oldPage?.selectors || {};
      const newSel = page.selectors || {};

      // removed
      for (const key of Object.keys(oldSel).filter((k) => !(k in newSel))) {
        const re = new RegExp(`\\s*${key}\\(page\\) \\{[^}]*\\}\\n?`, 'g');
        content = content.replace(re, '');
      }
      // updated
      for (const key of Object.keys(newSel).filter((k) => k in oldSel)) {
        const oldVal = oldSel[key];
        const newVal = newSel[key];
        if (oldVal !== newVal) {
          const esc = escapeRegExp(oldVal);
          const re = new RegExp(
            `${key}\\(page\\) \\{\\s*return page\\.locator\\('${esc}'\\);`
          );
          content = content.replace(
            re,
            `${key}(page) { return page.locator('${newVal}');`
          );
        }
      }
      // added
      const addedKeys = Object.keys(newSel).filter((k) => !(k in oldSel));
      if (addedKeys.length) {
        const snippet =
          addedKeys
            .map(
              (key) =>
                `  ${key}(page) { return page.locator('${newSel[key]}'); }`
            )
            .join('\n') + '\n';
        content = content.replace(/}\s*$/, snippet + '}');
      }
      await fs.writeFile(file, content, 'utf8');
    }

    // 5) Ensure arrays
    meta.pages = Array.isArray(meta.pages) ? meta.pages : [];
    meta.suites = Array.isArray(meta.suites) ? meta.suites : [];

    // 6) Final JSON + specs regen
    await fs.writeFile(this.metaPath, JSON.stringify(meta, null, 2), 'utf8');
    await this.generateAllSpecs(meta.suites);
    await this.generatePageObjects(meta.pages);
  }

  /** Regenerate all *.spec.ts under /tests */
  private async generateAllSpecs(suites: TestSuite[]) {
    const testsDir = path.join(this.projectDir, 'tests');
    await fs.mkdir(testsDir, { recursive: true });

    // delete stale spec files
    const valid = new Set(
      suites.map((s) => {
        if (typeof s.file === 'string' && s.file.trim()) {
          return path.basename(s.file);
        }
        return `${slugify(s.name)}.spec.ts`;
      })
    );
    for (const f of await fs.readdir(testsDir)) {
      if (f.endsWith('.spec.ts') && !valid.has(f)) {
        await fs.rm(path.join(testsDir, f), { force: true });
      }
    }

    // write each suite
    for (const suite of suites) {
      let filename: string;
      if (typeof suite.file === 'string' && suite.file.trim()) {
        filename = path.basename(suite.file);
      } else {
        filename = `${slugify(suite.name)}.spec.ts`;
      }
      const dest = path.join(testsDir, filename);
      await fs.writeFile(dest, this.renderSuite(suite), 'utf8');
    }
  }

  /** Emit the full TS file for one suite, including hooks */
  private renderSuite(suite: TestSuite): string {
    let code = `import { test, expect } from '@playwright/test';\n\n`;
    code += `test.describe('${suite.name}', () => {\n\n`;

    // --- Hooks first ---
    const HOOKS: Array<[keyof NonNullable<TestSuite['hooks']>, string]> = [
      ['beforeAll', 'beforeAll'],
      ['beforeEach', 'beforeEach'],
      ['afterEach', 'afterEach'],
      ['afterAll', 'afterAll'],
    ];
    if (suite.hooks) {
      for (const [hookKey, hookFn] of HOOKS) {
        const actions = suite.hooks[hookKey] || [];
        if (actions.length) {
          code += `  test.${hookFn}(async ({ page }) => {\n`;
          for (const a of actions) {
            code += this.actionToTs(a);
          }
          code += `  });\n\n`;
        }
      }
    }

    // --- Then the test cases ---
    for (const c of suite.cases) {
      code += `  test('${c.name}', async ({ page }) => {\n`;
      for (const a of c.actions) {
        code += this.actionToTs(a);
      }
      code += `  });\n\n`;
    }

    code += `});\n`;
    return code;
  }

  /** Convert a single Action into its TS line(s) */
  private actionToTs(a: Action): string {
    switch (a.type) {
      case 'goto':
        return `    await page.goto('${a.url}');\n`;
      case 'fill':
        return `    await page.fill('${a.selector}', '${a.value}');\n`;
      case 'click':
        return `    await page.click('${a.selector}');\n`;
      case 'wait':
        return `    await page.waitForTimeout(${a.timeout});\n`;
        case 'dblclick':
         return  `    await page.dblclick('${a.selector}');\n`;
         
        case 'hover':
          return `    await page.hover('${a.selector}');\n`;
       case 'press':
          return `    await page.press('${a.selector}', '${a.key}');\n`;
          
        case 'check':
          return `    await page.check('${a.selector}');\n`;
         
        case 'uncheck':
          return `    await page.uncheck('${a.selector}');\n`;
         
        case 'selectOption':
          return `    await page.selectOption('${a.selector}', '${a.value}');\n`;
         
        case 'setInputFiles':
          return `    await page.setInputFiles('${a.selector}', ${JSON.stringify(a.files)});\n`;
         
        case 'screenshot':
          return `    await page.screenshot({ path: '${a.selector}' });\n`;
        
        case 'assertion':
        case 'assert':
          const target = a.selector
          ? `page.locator('${a.selector}')`
          : 'page';
        const matcher = a.assertion;
        var statement = '';
        // numeric expected for toHaveCount, string otherwise
          // Assertions that operate on the whole page:
       
        const arg = a.expected !== undefined
          ? (typeof a.expected === 'number' ? a.expected : `'${a.expected}'`)
          : '';
          
          if (matcher === 'toHaveURL' || matcher === 'toHaveTitle') 
            statement= `    await expect(page).${matcher}(${arg});\n`;
          else
          statement= `    await expect(${target}).${matcher}(${arg});\n`;
        return statement;
      

      default:
        return `    // TODO: handle ${JSON.stringify(a)}\n`;
    }
  }

  /** Generate PageObject files */
  private async generatePageObjects(pages: PageObject[]) {
    const outDir = path.join(this.projectDir, 'page-objects');
    await fs.mkdir(outDir, { recursive: true });

    for (const page of pages) {
      const slug = page.file
        ? path.basename(page.file, path.extname(page.file))
        : slugify(page.name);
      const dest = path.join(outDir, `${slug}.ts`);

      let code = `// Auto-generated page object for ${page.name}\n\n`;
      code += `import { Page } from '@playwright/test';\n`;
      code += `export class ${page.name
        .split(/\s+/)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join('')} {\n`;
      for (const [key, sel] of Object.entries(page.selectors || {})) {
        code += `  async ${key}(page: Page) { return page.locator('${sel}'); }\n`;
      }
      code += `}\n`;

      await fs.writeFile(dest, code, 'utf8');
    }
  }

  /** Simple renderer if needed */
  private renderPageObject(page: PageObject): string {
    let code = `// Auto-generated page object for ${page.name}\n\n`;
    code += `export class ${page.name
      .split(/\s+/)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join('')} {\n`;
    for (const [key, selector] of Object.entries(page.selectors || {})) {
      code += `  ${key}(page) { return page.locator('${selector}'); }\n`;
    }
    code += `}\n`;
    return code;
  }
}
