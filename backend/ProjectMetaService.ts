// backend/ProjectMetaService.ts
import fs from 'fs/promises';
import path from 'path';
import { PageObject, ProjectMeta, TestSuite } from '../shared/types';

function slugify(name: string) {
  return name.trim().toLowerCase().replace(/\W+/g, '_') || 'page';
}
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // ← new
}
export class ProjectMetaService {
  constructor(private projectDir: string) { }

  private get metaPath() {
    return path.join(this.projectDir, 'nca-config.json');
  }

  /** Load existing JSON or write & return a default one */
  async load(): Promise<ProjectMeta> {
    let meta: ProjectMeta;
    try {
      const raw = await fs.readFile(this.metaPath, 'utf8');
      const m = JSON.parse(raw) as ProjectMeta;
      // Convert object→array if needed
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
    // 1) Load the old meta from disk (if any)
    let oldMeta: ProjectMeta = { name: '', env: { baseUrl: '', timeout: 0 }, pages: [], suites: [] };
    try {
      const raw = await fs.readFile(this.metaPath, 'utf8');
      oldMeta = JSON.parse(raw);
    } catch {
      /* ignore missing file */
    }
    // 2) Write out the new JSON
    await fs.writeFile(this.metaPath, JSON.stringify(meta, null, 2), 'utf8');
    // ← new: delete any suite files that existed before but are no longer in meta.suites
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

    // 3) Prepare the page-objects directory
    const outDir = path.join(this.projectDir, 'page-objects');
    await fs.mkdir(outDir, { recursive: true });

    // 4) Detect a simple rename:
    const oldNames = oldMeta.pages.map(p => p.name);
    const newNames = meta.pages.map(p => p.name);
    const removed = oldNames.filter(n => !newNames.includes(n));
    const added = newNames.filter(n => !oldNames.includes(n));

    const isSimpleRename =
      removed.length === 1 &&
      added.length === 1 &&
      oldMeta.pages.length === meta.pages.length;
    // ← new: delete any files for pages that truly went away (but skip the one rename case)
    if (!isSimpleRename && removed.length) {
      for (const name of removed) {
        const stale = path.join(outDir, `${slugify(name)}.ts`);
        await fs.rm(stale, { force: true });
        console.log(`[ProjectMetaService] deleted stale page-object file ${stale}`);
      }
    }
    if (isSimpleRename) {
      const [oldName] = removed;
      const [newName] = added;
      const oldSlug = slugify(oldName);
      const newSlug = slugify(newName);

      const oldFile = path.join(outDir, `${oldSlug}.ts`);
      const newFile = path.join(outDir, `${newSlug}.ts`);

      try {
        // Rename the file
        await fs.rename(oldFile, newFile);
      } catch {
        // If rename fails (e.g. file missing), we'll fall back to full regen below
        console.warn(`[ProjectMetaService] could not rename ${oldFile}, regenerating all pages`);
      }
      // Rewrite its contents with updated class name/selectors
      const renamedPage = meta.pages.find(p => p.name === newName)!;
      const code = this.renderPageObject(renamedPage);
      await fs.writeFile(newFile, code, 'utf8');
      for (const page of meta.pages) {
        const slug = slugify(page.name);
        const dest = path.join(outDir, `${slug}.ts`);
        const code = this.renderPageObject(page);
        await fs.writeFile(dest, code, 'utf8');
      }
    }
    // ← new: patch individual locator changes per page
    for (const page of meta.pages) {
      const slug = slugify(page.name);
      const file = path.join(outDir, `${slug}.ts`);

      // only proceed if file already exists
      let content: string;
      try {
        content = await fs.readFile(file, 'utf8');
      } catch {
        // missing file → full write
        await fs.writeFile(file, this.renderPageObject(page), 'utf8');
        console.log(`[PageObjects] created ${file}`);
        continue;
      }

      const oldPage = oldMeta.pages.find(p => p.name === page.name);
      const oldSel = oldPage?.selectors || {};
      const newSel = page.selectors || {};

      // 5a) locator keys removed
      const removedKeys = Object.keys(oldSel).filter(k => !(k in newSel));
      for (const key of removedKeys) {
        // strip the entire method block
        const re = new RegExp(`\\s*${key}\\(page\\) \\{[^}]*\\}\\n?`, 'g');
        content = content.replace(re, '');
        console.log(`Removed locator ${key} from ${file}`); // ← new
      }

      // 5b) locator values edited
      const commonKeys = Object.keys(newSel).filter(k => k in oldSel);
      for (const key of commonKeys) {
        const oldVal = oldSel[key], newVal = newSel[key];
        if (oldVal !== newVal) {
          const esc = escapeRegExp(oldVal);
          // replace only inside the locator string
          const re = new RegExp(`${key}\\(page\\) \\{\\s*return page\\.locator\\('${esc}'\\);`);
          content = content.replace(re, `${key}(page) { return page.locator('${newVal}');`);
          console.log(`Updated locator ${key} in ${file}`); // ← new
        }
      }

      // 5c) new locator keys added
      const addedKeys = Object.keys(newSel).filter(k => !(k in oldSel));
      if (addedKeys.length) {
        // inject just before final closing brace
        const snippet = addedKeys
          .map(key => `  ${key}(page) { return page.locator('${newSel[key]}'); }`)
          .join('\n') + '\n';
        content = content.replace(/}\s*$/, snippet + '}');
        console.log(`Added locators [${addedKeys.join(', ')}] to ${file}`); // ← new
      }

      // write back the patched file
      await fs.writeFile(file, content, 'utf8');
    }


    // Ensure pages & suites exist
    meta.pages = Array.isArray(meta.pages) ? meta.pages : [];
    meta.suites = Array.isArray(meta.suites) ? meta.suites : [];


    // 1) Write the metadata JSON
    await fs.writeFile(this.metaPath, JSON.stringify(meta, null, 2), 'utf8');

    // 2) Regenerate your specs
    await this.generateAllSpecs(meta.suites, meta.env);
    await this.generatePageObjects(meta.pages)
  }

  async generateAllSpecs(suites: any[], env: any) {
    if (!Array.isArray(suites)) return;

    // 1) Ensure the tests/ folder exists
    const testsDir = path.join(this.projectDir, 'tests');
    await fs.mkdir(testsDir, { recursive: true });
    // ← new: delete any .spec.ts in tests/ that aren't in our current suites list
    {
      // build the set of filenames we _will_ write
      const validFiles = new Set(
        suites.map(suite => {
          if (typeof suite.file === 'string' && suite.file.trim()) {
            return path.basename(suite.file);
          } else {
            const base = String(suite.name || 'suite')
              .trim()
              .toLowerCase()
              .replace(/\W+/g, '_');
            return `${base}.spec.ts`;
          }
        })
      );

      const existing = await fs.readdir(testsDir);
      for (const f of existing) {
        if (f.endsWith('.spec.ts') && !validFiles.has(f)) {
          await fs.rm(path.join(testsDir, f), { force: true });
          console.log(`[generateAllSpecs] deleted stale test file ${f}`);
        }
      }
    }
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

      const out = this.renderSuite(suite);
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


  /** Write one .ts file per PageObject in the array */
  private async generatePageObjects(pages: PageObject[]) {
    const outDir = path.join(this.projectDir, 'page-objects');
    await fs.mkdir(outDir, { recursive: true });

    for (const page of pages) {
      // Derive a slug from either page.file or page.name
      const slug = page.file
        ? path.basename(page.file, path.extname(page.file))
        : page.name.trim().toLowerCase().replace(/\W+/g, '_') || 'page';

      // Only .ts extension
      const filename = `${slug}.ts`;
      const dest = path.join(outDir, filename);

      // Build the class source
      let code = `// Auto-generated page object for ${page.name}\n\n`;
      code += `import { Page } from '@playwright/test';
            export class ${page.name
          .split(/\s+/)
          .map(w => w[0].toUpperCase() + w.slice(1))
          .join('')} {\n`;

      for (const [key, sel] of Object.entries(page.selectors || {})) {
        code += `async  ${key}(page) { return page.locator('${sel}'); }\n`;
      }
      code += `}\n`;

      console.log('[generatePageObjects] writing', dest);
      await fs.writeFile(dest, code, 'utf8');
    }
  }
  /** Sample renderer for a PageObject */
  private renderPageObject(page: PageObject): string {
    let code = `// Auto-generated page object for ${page.name}\n\n`
    code += `export class ${page.name
      .trim()
      .split(/\s+/)
      .map(s => s[0].toUpperCase() + s.slice(1))
      .join('')} {\n`
    for (const [key, selector] of Object.entries(page.selectors || {})) {
      code += `  ${key}(page) { return page.locator('${selector}') }\n`
    }
    code += `}\n`
    return code
  }
}

