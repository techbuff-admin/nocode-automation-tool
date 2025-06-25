import os from 'os';
import { app, BrowserWindow, ipcMain, shell,dialog,Menu } from 'electron';
let captureWindow: BrowserWindow | null = null;
let consoleWindow: BrowserWindow | null = null;
// Extend globalThis to include custom properties
declare global {
  var __scanBrowser: import('playwright').Browser | undefined;
  var __scanPage: import('playwright').Page | undefined;
  var __scanPageName: string | undefined;
  var __projectDir: string | undefined;
}
import path from 'path';
import { chromium } from 'playwright';
// main.ts (Electron main process)

import { exec,spawn } from 'child_process';
let mainWindow: BrowserWindow | null = null;
const DEV_URL = 'http://localhost:5173';
import fs from 'fs/promises';
import fsp from 'fs';
import util from 'util';
import klaw from 'klaw';
import { ProjectMeta } from './shared/types'; 
import { ProjectMetaService } from './backend/ProjectMetaService';
let scanContext: import('playwright').BrowserContext | null = null;
const scanSessions = new Map<string, BrowserWindow>();

const execAsync = util.promisify(exec);
const ROOT_PROJECTS_DIR = path.join(os.homedir(), 'nca-projects');
async function ensureProjectsDir() {
  try {
    await fs.mkdir(ROOT_PROJECTS_DIR, { recursive: true });
  } catch (err) {
    console.error('Could not create projects root:', err);
  }
}
ipcMain.handle('select-directory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return canceled ? null : filePaths[0];
});

// Create main application window
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  // In dev, load Vite dev server; otherwise load built index.html
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    await mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'dist', 'index.html'));
  }
  //mainWindow.webContents.openDevTools({ mode: 'detach' });
}

ipcMain.handle('open-report-window', async (_evt, projectDir: string) => {
  // Create a new window for the report
  const reportWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools: true,
    },
  });

  // Load the Allure report index.html
  const reportPath = `file://${path.join(projectDir, 'allure-report', 'index.html')}`;
  await reportWindow.loadURL(reportPath);
});
// replace your old “auto start console” logic with this:
ipcMain.handle('open-console-window', (_evt) => {
 
  if (mainWindow && !mainWindow.isDestroyed()) {
    // open in a detached window (you can also use 'bottom', 'right' etc.)
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
})

ipcMain.handle('project:create', async (_evt, { basePath, projectName }) => {
  const projectDir = path.join(basePath, projectName);

  // 1) Make directories
  await fs.mkdir(projectDir, { recursive: true });
  for (const sub of ['tests', 'page-objects', 'config']) {
    await fs.mkdir(path.join(projectDir, sub), { recursive: true });
  }

  // 2) Init npm + install deps
  await execAsync('npm init -y', { cwd: projectDir });
  await execAsync(
    'npm install -D @playwright/test playwright allure-commandline allure-playwright',
    { cwd: projectDir }
  );
  // 3) Download browsers
  await execAsync('npx playwright install', { cwd: projectDir });

  // 4) Write a blank config file
  await fs.writeFile(
    path.join(projectDir, 'playwright.config.ts'),
    `import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [['list'], ['allure-playwright',{
        resultsDir: "allure-results",
      },]],
});`
  );
 // 1) Write an initial metadata JSON
 const initialMeta = {
  name: projectName,
  env: {
    baseUrl: '',
    timeout: 5000,
    retries: 0,
    headless: false,
    elementWait: 0,
  },
  pages: [], // each page: { name, path, locators: [ { name, selector } ] }
  suites:[],
   // each suite: { name, path, cases: [ { name, path } ] }
};
await fs.writeFile(
  path.join(projectDir, 'nca-config.json'),
  JSON.stringify(initialMeta, null, 2),
  'utf8'
);
  return projectDir;
});
ipcMain.handle('tests:execute', (_, scriptPaths) =>
  import('./backend/executeTests').then(m => m.runTests(scriptPaths))
);

// Install a dependency globally or locally as needed
ipcMain.handle('dependency:install', async (_evt, depName: string) => {
  return new Promise<string>((resolve, reject) => {
    let cmd: string;
    switch (depName) {
      case 'playwright':
        cmd = 'npm install -g playwright';
        break;
      case 'allure':
        cmd = 'npm install -g allure-commandline';
        break;
      case 'java':
        // You probably can’t install Java via npm; you might open a download page instead
        // or invoke a package manager on the user’s OS:
        // mac: brew install --cask temurin
        // windows: choco install temurin
        cmd = process.platform === 'darwin'
          ? 'brew install --cask temurin'
          : process.platform === 'win32'
          ? 'choco install temurin'
          : 'sudo apt-get update && sudo apt-get install -y openjdk-17-jdk';
        break;
      default:
        return reject(`Unknown dependency: ${depName}`);
    }

    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        return reject(stderr || err.message);
      }
      resolve(stdout || `${depName} installed`);
    });
  });
});

// main.ts
ipcMain.handle('system:check', () =>
  import('./backend/systemChecks').then((m) => m.runChecks())
);
ipcMain.handle('open-external', async (_event, url: string) => {
  // shell.openExternal returns a Promise<boolean>
  return shell.openExternal(url);
});

ipcMain.handle(
  'suite:create',
  async (_evt, { projectDir, suiteName }: { projectDir: string; suiteName: string }) => {
    // sanitize name → no spaces, lower-kebab
    const fileName = `${suiteName.trim().replace(/\s+/g, '-')}.spec.ts`;
    const filePath = path.join(projectDir, 'tests', fileName);
      // ensure tests folder exists
     await fs.mkdir(path.dirname(filePath), { recursive: true });
    const boilerplate = `
import { test, expect } from '@playwright/test';

test.describe('${suiteName}', () => {
  // add tests here
});
    `.trim();
    await fs.writeFile(filePath, boilerplate, 'utf8');
     // now load & update metadata JSON
     const metaPath = path.join(projectDir, 'nca-config.json');
     const raw = await fs.readFile(metaPath, 'utf8');
     const meta: ProjectMeta = JSON.parse(raw);
     meta.suites = meta.suites || [];
     meta.suites.push({
       name: suiteName, cases: [],
       file: '',
       parallel: false,
       beforeAll: [],
       afterAll: [],
       beforeEach: [],
       afterEach: []
     });
     await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8');
    return filePath;
  }
);
ipcMain.handle(
  'case:add',
  async (
    _evt,
    opts: { projectDir: string; suiteFile: string; caseCode: string }
  ) => {
    // suiteFile is full path to e.g. tests/my-suite.spec.ts
    // Append the code before the final closing `});`
    let content = await fs.readFile(opts.suiteFile, 'utf8');
    const marker = /^}\);/m;
    const insertion = `  test('new case', async ({ page }) => {\n${opts.caseCode
      .split('\n')
      .map(l => '    ' + l)
      .join('\n')}\n  });\n`;
    // Insert it just above the final `});`
    content = content.replace(marker, insertion + '});');
    await fs.writeFile(opts.suiteFile, content, 'utf8');
    return opts.suiteFile;
  }
);
ipcMain.handle('fs:tree', async (_evt, projectDir: string) => {
  // if the folder is gone, just return empty
  try {
    await fs.stat(projectDir);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return [];    // ← rather than throwing, we send back an empty tree
    }
    throw err;      // real errors bubble
  }

  // otherwise walk the tree
  return new Promise<{ path: string; type: 'file' | 'dir' }[]>((resolve, reject) => {
    const items: { path: string; type: 'file' | 'dir' }[] = [];
    klaw(projectDir)
      .on('data', (item) => {
        const rel = path.relative(projectDir, item.path);
        if (rel) {
          items.push({
            path: rel,
            type: item.stats.isDirectory() ? 'dir' : 'file',
          });
        }
      })
      .on('end', () => resolve(items))
      .on('error', (e) => reject(e));
  });
});
// IPC handler to list all sub-folders under ROOT_PROJECTS_DIR
ipcMain.handle('projects:list', async () => {
  const entries = await fs.readdir(ROOT_PROJECTS_DIR, { withFileTypes: true });
  return entries
    .filter((d) => d.isDirectory())
    .map((d) => ({
      name: d.name,
      path: path.join(ROOT_PROJECTS_DIR, d.name),
    }));
});
// IPC handler to return the root path itself (so the UI can tell the user)
ipcMain.handle('projects:getRoot', async () => {
  return ROOT_PROJECTS_DIR;
});

ipcMain.handle('meta:load', async (_evt, projectDir: string) => {
  if (typeof projectDir !== 'string') {
    throw new Error('NO_PROJECT_DIR');
  }
  const svc = new ProjectMetaService(projectDir);
  return svc.load();
});

ipcMain.handle(
  'meta:save',
  async (_evt, projectDir: string, meta: any) => {
    console.log('Saving meta:', projectDir, meta);
    if (typeof projectDir !== 'string') {
      throw new Error('NO_PROJECT_DIR');
    }
    const svc = new ProjectMetaService(projectDir);
    //await generatePageObjects(projectDir, meta.pages); // writes page-objects folder
    await svc.save(meta);                              // writes JSON + specs
    
    return;
  }
);
// ← new:
ipcMain.handle('path-exists', async (_evt, fullPath: string) => {
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('delete-path', async (_evt, fullPath: string) => {
  // recursive + force in case it’s a non-empty dir
  await fs.rm(fullPath, { recursive: true, force: true });
  return;
});



ipcMain.handle(
  'run:suite',
  async (
    _evt,
    projectDir: string,
    suiteName: string,
    headless: boolean,
    browsers: string[]       // [ 'chrome', 'firefox', ... ]
  ) => {
    const spec = findSpecFile(projectDir, suiteName);

    const results = await Promise.all(
      browsers.map(name => {
        const { browser, channel } = normalizeBrowserFlags(name);
        const args = [
          spec,
          '--reporter=list,allure-playwright',
          `--browser=${browser}`,         // e.g. chromium|firefox|webkit|all
        ];
        if (channel) args.push(`--channel=${channel}`); // for edge
        if (!headless) args.push('--headed');
        return runPlaywright(projectDir, args).then(r => ({ name, ...r }));
      })
    );

    const passed = results.every(r => r.passed);
    const output = results
      .map(r => `[${r.name}] ${r.passed ? 'PASS' : 'FAIL'}\n${r.output}`)
      .join('\n\n');

    return { passed, output };
  }
);

ipcMain.handle(
  'run:testcase',
  async (
    _evt,
    projectDir: string,
    suiteName: string,
    caseName: string,
    headless: boolean,
    browsers: string[]
  ) => {
    const spec = findSpecFile(projectDir, suiteName);

    const results = await Promise.all(
      browsers.map(name => {
        const { browser, channel } = normalizeBrowserFlags(name);
        const args = [
          spec,
          `--grep=${caseName}`,
          '--reporter=list,allure-playwright',
          `--browser=${browser}`,
        ];
        if (channel) args.push(`--channel=${channel}`);
        if (!headless) args.push('--headed');
        return runPlaywright(projectDir, args).then(r => ({ name, ...r }));
      })
    );

    const passed = results.every(r => r.passed);
    const output = results
      .map(r => `[${r.name}] ${r.passed ? 'PASS' : 'FAIL'}\n${r.output}`)
      .join('\n\n');

    return { passed, output };
  }
);


// ← new: generate & open Allure report in browser
ipcMain.handle('generateReport', async (_evt, projectDir: string) => {
  const resultsDir = path.join(projectDir, 'allure-results');
  const reportDir  = path.join(projectDir, 'allure-report');

  // 1) regenerate the report
  await execAsync(
    `npx allure generate "${resultsDir}" --clean -o "${reportDir}"`,
    { cwd: projectDir }
  );

  // 2) open it in the browser
  // await execAsync(
  //   `npx allure open "${reportDir}"`,
  //   { cwd: projectDir }
  // );
  const reportWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools: true,
    },
  });

  // Load the Allure report index.html
  const reportPath = `file://${path.join(projectDir, 'allure-report', 'index.html')}`;
  await reportWindow.loadURL(reportPath);
});
// ← new: clear both folders
ipcMain.handle(
  'clearReports',
  async (_evt, projectDir: string) => {
    const resultsDir = path.join(projectDir, 'allure-results');
    const reportDir  = path.join(projectDir, 'allure-report');
    await fs.rm(resultsDir, { recursive: true, force: true });
    await fs.rm(reportDir,  { recursive: true, force: true });
  }
);



/** Jira description fetch */
ipcMain.handle(
  'jira:fetchDescription',
  async (_evt, projectDir: string, ticketId: string) => {
    const { integrations = {} } = await loadProjectMeta(projectDir);
    const { jiraBaseUrl, jiraEmail, jiraToken } = integrations;
    if (!jiraBaseUrl || !jiraEmail || !jiraToken) {
      throw new Error(
        'Please configure your Jira URL, email & token in Integration Settings.'
      );
    }

    const url = `${jiraBaseUrl.replace(/\/$/, '')}/rest/api/3/issue/${encodeURIComponent(
      ticketId
    )}?fields=description`;
    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    });

    if (res.status === 404) {
      throw new Error(`Jira issue "${ticketId}" not found.`);
    }
    if (!res.ok) {
      throw new Error(`Jira API error (status ${res.status}).`);
    }
    const data = (await res.json()) as any;
    const adf = data.fields.description?.content || [];
    const text = extractADFText(adf).trim();
    return text;
  }
);


 /** List the most recent 500 Jira issues visible to the user */
ipcMain.handle('jira:listIssues', async (_evt, projectDir: string) => {
  const { integrations = {} } = await loadProjectMeta(projectDir);
  const { jiraBaseUrl, jiraEmail, jiraToken } = integrations;
  if (!jiraBaseUrl || !jiraEmail || !jiraToken) {
    throw new Error('Please configure Jira settings first');
  }

  const jql = encodeURIComponent('ORDER BY updated DESC');
  const url = `${jiraBaseUrl.replace(/\/$/, '')}/rest/api/3/search?jql=${jql}&maxResults=500&fields=summary`;
  const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Jira search failed (${res.status})`);
  const data = (await res.json()) as any;

  return (data.issues || []).map((i: any) => ({
    key: i.key,
    summary: i.fields.summary as string,
  }));
});


ipcMain.handle('azure:listWorkItems', async (_evt, projectDir: string) => {
  const { integrations = {} } = await loadProjectMeta(projectDir);
  const { azureOrgUrl, azurePAT } = integrations;
  if (!azureOrgUrl || !azurePAT) {
    throw new Error('Please configure Azure DevOps settings first');
  }

  const auth = Buffer.from(`:${azurePAT}`).toString('base64');
  // 1) Ask for just 50 items max by adding &$top=50
  const wiqlUrl = `${azureOrgUrl.replace(/\/$/, '')}/_apis/wit/wiql?api-version=6.1-preview.2&$top=500`;
  const wiqlRes = await fetch(wiqlUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        SELECT [System.Id], [System.Title]
        FROM WorkItems
        ORDER BY [System.ChangedDate] DESC
      `,
    }),
  });
  if (!wiqlRes.ok) {
    const body = await wiqlRes.text();
    throw new Error(`Azure WIQL failed (${wiqlRes.status}): ${body}`);
  }
  const wiqlData = await wiqlRes.json() as any;
  // wiqlData.workItems will now be at most 50 entries
  const ids: number[] = (wiqlData.workItems || []).map((w: any) => w.id);
  if (!ids.length) return [];

  // 2) Pull down their titles
  const itemsUrl = `${azureOrgUrl.replace(/\/$/, '')}/_apis/wit/workitems?ids=${ids.join(
    ','
  )}&fields=System.Title&api-version=6.0`;
  const itemsRes = await fetch(itemsUrl, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
    },
  });
  if (!itemsRes.ok) throw new Error(`Azure items fetch failed (${itemsRes.status})`);
  const itemsData = await itemsRes.json() as any;

  return (itemsData.value || []).map((w: any) => ({
    id: String(w.id),
    title: w.fields['System.Title'] as string,
  }));
});


ipcMain.handle(
  'azure:fetchDescription',
  async (_evt, projectDir: string, workItemId: string) => {
    const { integrations = {} } = await loadProjectMeta(projectDir);
    const { azureOrgUrl, azurePAT, azureProject } = integrations;
    if (!azureOrgUrl || !azurePAT || !azureProject) {
      throw new Error(
        'Please configure your Azure DevOps Org URL, Project & PAT in Integration Settings.'
      );
    }

    const auth = Buffer.from(`:${azurePAT}`).toString('base64');
    const org = azureOrgUrl.replace(/\/$/, '');
    const proj = encodeURIComponent(azureProject);
    const url = `${org}/${proj}/_apis/wit/workitems/${encodeURIComponent(
      workItemId
    )}?api-version=6.0&$expand=fields`;

    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    });

    if (res.status === 404) {
      throw new Error(`Azure work item "${workItemId}" not found in project "${azureProject}".`);
    }
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Azure DevOps API error (status ${res.status}): ${err}`);
    }

    const data = (await res.json()) as any;
    const html = data.fields['System.Description'] || '';
    const text = html.replace(/<[^>]+>/g, '').trim();
    return text;
  }
);


/**  
 * IPC handler: crawl the given URL, extract interactive elements, 
 * and return an array of { name, selector }  
 */
ipcMain.handle(
  'page:scan',
  async (_evt, projectDir: string, pageName: string, url: string) => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Evaluate in page to pull out links, buttons, inputs, selects, etc.
    const elements = await page.evaluate(() => {
      const out: Array<{ name: string; selector: string }> = [];
      const nodes = Array.from(
        document.querySelectorAll(
          'a, button, input, textarea, select, [role=button], [role=link]'
        )
      );
      for (const el of nodes) {
        let name =
          el.getAttribute('aria-label') ||
          el.getAttribute('alt') ||
          el.getAttribute('title') ||
          (el.textContent || '').trim().slice(0, 50) ||
          (el as HTMLInputElement).placeholder ||
          el.id ||
          el.tagName.toLowerCase();
        name = name
          .replace(/[^a-zA-Z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .toLowerCase() || el.tagName.toLowerCase();

        let selector = '';
        if (el.id) {
          selector = `#${el.id}`;
        } else if (el.tagName && (el as any).className) {
          const classes = (el as any).className
            .toString()
            .trim()
            .split(/\s+/)
            .join('.');
          selector = `${el.tagName.toLowerCase()}${classes ? '.' + classes : ''}`;
        } else {
          selector = el.tagName.toLowerCase();
        }

        out.push({ name, selector });
      }
      return out;
    });

    await browser.close();
    return elements; // back to renderer
  }
);
 

ipcMain.handle(
  'page:open-scan-session',
  async (_evt, url: string) => {
    // close any existing session
    if (captureWindow && !captureWindow.isDestroyed()) {
      captureWindow.close();
      captureWindow = null;
    }
    captureWindow = new BrowserWindow({
      width: 1200,
      height: 800, 
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        devTools: true,
        contextIsolation: true,
      nodeIntegration: false,
      },
    });
    // once the page is loaded, open DevTools and install a right-click menu
  captureWindow.webContents.on('did-finish-load', () => {
    // 1️⃣ open the DevTools docked on the bottom
    captureWindow!.webContents.openDevTools({ mode: 'bottom' });

    // 2️⃣ hook up a context menu so “Inspect Element” is available on right-click
    captureWindow!.webContents.on(
      'context-menu',
      (_event, params) => {
        const menu = Menu.buildFromTemplate([
          {
            label: 'Inspect Element',
            click: () => {
              // params.x/y are the click coordinates within the window
              captureWindow!.webContents.inspectElement(params.x, params.y);
            }
          },
          { type: 'separator' },
          { role: 'reload' },
          { role: 'toggleDevTools' }
        ]);
        menu.popup({ window: captureWindow! });
      }
    );
  });
    await captureWindow.loadURL(url);
    // leave it open for the user to log in
  }
);


ipcMain.handle('page:extract-locators', async () => {
  if (!captureWindow || captureWindow.isDestroyed()) {
    throw new Error('Scan session not started. Click “Open & Log In” first.');
  }
  const wc = captureWindow.webContents;
  const elements = await wc.executeJavaScript(`(() => {
    // builds an XPath fallback if needed
    function getXPath(el) {
      if (el.id) return 'id("' + el.id + '")';
      const parts = [];
      while (el && el.nodeType === Node.ELEMENT_NODE) {
        let count = 0, sib = el;
        while (sib) {
          if (sib.nodeType === Node.ELEMENT_NODE && sib.nodeName === el.nodeName) {
            count++;
          }
          sib = sib.previousElementSibling;
        }
        parts.unshift(el.nodeName.toLowerCase() + '[' + count + ']');
        el = el.parentNode;
      }
      return '/' + parts.join('/');
    }

    const out = [];
    const nodes = Array.from(document.querySelectorAll(
      'a, button, input, textarea, select, [role=button], [role=link]'
    ));
    for (const el of nodes) {
      const tag = el.tagName.toLowerCase();
      let prefix = '';
      if (tag === 'input') {
        const t = el.getAttribute('type') || 'text';
        if (t === 'checkbox') prefix = 'checkbox_';
        else if (t === 'radio') prefix = 'radio_';
        else prefix = 'text_';
      } else if (tag === 'textarea') {
        prefix = 'text_';
      } else if (tag === 'button') {
        prefix = 'button_';
      } else if (tag === 'a' || el.getAttribute('role') === 'link') {
        prefix = 'link_';
      } else if (/^h[1-6]$/.test(tag)) {
        prefix = 'heading_' + tag + '_';
      } else if (tag === 'select') {
        prefix = 'select_';
      } else {
        prefix = tag + '_';
      }

      let base =
        el.getAttribute('aria-label') ||
        el.getAttribute('alt') ||
        el.getAttribute('title') ||
        (el.textContent || '').trim().slice(0, 50) ||
        el.getAttribute('placeholder') ||
        el.id ||
        el.getAttribute('name') ||
        '';
      base = base
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();
      if (!base) base = tag;
      const name = prefix + base;

      // stable selector
      let selector = '';
      if (el.id) {
        selector = '#' + el.id;
      } else if (el.getAttribute('name')) {
        selector = el.tagName.toLowerCase() +
          '[name="' + el.getAttribute('name') + '"]';
      } else if (el.classList.length > 0) {
        selector = el.tagName.toLowerCase() +
          '.' + Array.from(el.classList).join('.');
      } else {
        selector = 'xpath:' + getXPath(el);
      }

      out.push({ name, selector });
    }
    return out;
  })()`);
  return elements as Array<{ name: string; selector: string }>;
});


// IPC handler to capture a specific element by locator key
ipcMain.handle(
  'capture-element',
  async (_evt, projectDir: string, locatorKey: string) => {
    if (!captureWindow || captureWindow.isDestroyed())
      throw new Error('Scan session not started.');

    const meta = await loadProjectMeta(projectDir);
    const found = meta.pages
      .flatMap((p: { selectors: { [s: string]: unknown; } | ArrayLike<unknown>; }) =>
        Object.entries(p.selectors).map(([k, s]) => ({ key: k, selector: s as string }))
      )
      .find((x: { key: string; }) => x.key === locatorKey);
    if (!found) throw new Error(`Locator "${locatorKey}" not in meta`);

    // query the live window
    const rect = await captureWindow.webContents.executeJavaScript(`
      (() => {
        const el = document.querySelector(${JSON.stringify(found.selector)});
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      })()
    `);
    if (!rect) throw new Error(`Element for "${locatorKey}" not found on screen`);

    // capture just that region
    const image = await captureWindow.webContents.capturePage({
      x: Math.floor(rect.x),
      y: Math.floor(rect.y),
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height),
    });
    return image.toDataURL();
  }
);
app.whenReady().then(async () => {
  // 1) Make sure the folder is there
  await ensureProjectsDir();

  // 2) Now spin up your window
  createWindow();

  // 3) On macOS re-open behavior
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => app.quit());

async function generatePageObjects(
  projectDir: string,
  pages: Record<string, Record<string, string>>
) {
  const dir = path.join(projectDir, 'page-objects');
  await fs.mkdir(dir, { recursive: true });

  for (const [pageName, locators] of Object.entries(pages)) {
    const className = `${pageName[0].toUpperCase() + pageName.slice(1)}Page`;
    const lines = [
      `import { Page } from '@playwright/test';`,
      ``,
      `export class ${className} {`,
      `  constructor(public page: Page) {}`,
    ];
    for (const [locName, sel] of Object.entries(locators)) {
      lines.push(
        `  async ${locName}() {`,
        `    return this.page.locator('${sel}');`,
        `  }`
      );
    }
    lines.push(`}`);
    const filePath = path.join(dir, `${pageName}.ts`);
    await fs.writeFile(filePath, lines.join('\n'), 'utf8');
  }
}

/** Simple slugify: “My Suite Name” → “my_suite_name” */
function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function findSpecFile(projectDir: string, suiteName: string): string {
  const testsDir = path.join(projectDir, 'tests');
  const files = fsp.readdirSync(testsDir);   // ← now using fs.readdirSync
  const slug = slugify(suiteName);
  const match = files.find((f) => f === `${slug}.spec.ts`);
  if (!match) {
    throw new Error(`Spec for suite "${suiteName}" not found`);
  }
  return path.join(testsDir, match);
}


function runPlaywright(
  cwd: string,
  args: string[]
): Promise<{ passed: boolean; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['playwright', 'test', ...args], { cwd, shell: true });
    let out = '';
    child.stdout.on('data', d => (out += d.toString()));
    child.stderr.on('data', d => (out += d.toString()));
    child.on('exit', code => resolve({ passed: code === 0, output: out }));
    child.on('error', reject);
  });
}

/** 
 * helper to map your UI names → Playwright flags 
 */
function normalizeBrowserFlags(name: string): { browser: string; channel?: string } {
  switch (name) {
    case 'chrome':
      return { browser: 'chromium' };
    case 'edge':
      return { browser: 'chromium'};
    case 'safari':
      return { browser: 'webkit' };
    case 'firefox':
      return { browser: 'firefox' };
    default:
      // fallback to "all" if somehow empty
      return { browser: 'all' };
  }
}

/**
 * Helper: load nca-config.json for a project
 */
async function loadProjectMeta(projectDir: string) {
  const metaPath = path.join(projectDir, 'nca-config.json');
  const raw = await fs.readFile(metaPath, 'utf8');
  const meta = JSON.parse(raw) as any;
  return meta ;
}
// Recursively extract all text from an ADF node tree
function extractADFText(nodes: any[]): string {
  let out = '';
  for (const node of nodes) {
    if (node.text) {
      out += node.text;
    }
    if (node.content) {
      out += extractADFText(node.content);
    }
    // Add a newline after paragraphs and headings for readability
    if (['paragraph', 'heading', 'listItem'].includes(node.type)) {
      out += '\n';
    }
  }
  return out;
}
