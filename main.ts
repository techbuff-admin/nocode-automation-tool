import os from 'os';
import { app, BrowserWindow, ipcMain, shell,dialog } from 'electron';
import path from 'path';
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
      nodeIntegration: false
    }
  });

  // In dev, load Vite dev server; otherwise load built index.html
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    await mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'dist', 'index.html'));
  }
  mainWindow.webContents.openDevTools({ mode: 'detach' });
}

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
  await execAsync(
    `npx allure open "${reportDir}"`,
    { cwd: projectDir }
  );
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

/** 2) Jira description fetch */
// ipcMain.handle('jira:fetchDescription', async (_evt, ticketId: string) => {
//   const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
//   if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
//     throw new Error('Missing JIRA_BASE_URL, JIRA_EMAIL or JIRA_API_TOKEN in env');
//   }
//   const url = `${JIRA_BASE_URL}/rest/api/3/issue/${encodeURIComponent(ticketId)}?fields=description`;
//   const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
//   const res = await fetch(url, {
//     headers: {
//       'Authorization': `Basic ${auth}`,
//       'Accept': 'application/json',
//     },
//   });
//   if (!res.ok) throw new Error(`Jira API returned ${res.status}`);
//   const data = await res.json() as any;
//   // Convert ADF → plain text
//   const content = data.fields.description?.content || [];
//   let text = '';
//   for (const block of content) {
//     for (const inner of block.content || []) {
//       text += inner.text || '';
//     }
//     text += '\n\n';
//   }
//   return text.trim();
// });

// /** 3) Azure DevOps description fetch */
// ipcMain.handle('azure:fetchDescription', async (_evt, workItemId: string) => {
//   const { AZURE_DEVOPS_ORG_URL, AZURE_DEVOPS_PAT } = process.env;
//   if (!AZURE_DEVOPS_ORG_URL || !AZURE_DEVOPS_PAT) {
//     throw new Error('Missing AZURE_DEVOPS_ORG_URL or AZURE_DEVOPS_PAT in env');
//   }
//   const url = `${AZURE_DEVOPS_ORG_URL}/_apis/wit/workitems/${encodeURIComponent(workItemId)}?api-version=6.0&$expand=fields`;
//   const auth = Buffer.from(`:${AZURE_DEVOPS_PAT}`).toString('base64');
//   const res = await fetch(url, {
//     headers: {
//       'Authorization': `Basic ${auth}`,
//       'Accept': 'application/json',
//     },
//   });
//   if (!res.ok) throw new Error(`Azure DevOps API returned ${res.status}`);
//   const data = await res.json() as any;
//   const html = data.fields['System.Description'] || '';
//   // strip HTML tags
//   const text = html.replace(/<[^>]+>/g, '');
//   return text.trim();
// });


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

ipcMain.handle(
  'azure:fetchDescription',
  async (_evt, projectDir: string, workItemId: string) => {
    const { integrations = {} } = await loadProjectMeta(projectDir);
    const { azureOrgUrl, azurePAT } = integrations;
    if (!azureOrgUrl || !azurePAT) {
      throw new Error(
        'Please configure your Azure DevOps Org URL & PAT in Integration Settings.'
      );
    }

    const url = `${azureOrgUrl.replace(/\/$/, '')}/_apis/wit/workitems/${encodeURIComponent(
      workItemId
    )}?api-version=6.0&$expand=fields`;
    const auth = Buffer.from(`:${azurePAT}`).toString('base64');
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    });

    if (res.status === 404) {
      throw new Error(`Azure work item "${workItemId}" not found.`);
    }
    if (!res.ok) {
      throw new Error(`Azure DevOps API error (status ${res.status}).`);
    }

    const data = (await res.json()) as any;
    const html = data.fields['System.Description'] || '';
    const text = html.replace(/<[^>]+>/g, '');
    return text.trim();
  });

 /** List the most recent 50 Jira issues visible to the user */
ipcMain.handle('jira:listIssues', async (_evt, projectDir: string) => {
  const { integrations = {} } = await loadProjectMeta(projectDir);
  const { jiraBaseUrl, jiraEmail, jiraToken } = integrations;
  if (!jiraBaseUrl || !jiraEmail || !jiraToken) {
    throw new Error('Please configure Jira settings first');
  }

  const jql = encodeURIComponent('ORDER BY updated DESC');
  const url = `${jiraBaseUrl.replace(/\/$/, '')}/rest/api/3/search?jql=${jql}&maxResults=50&fields=summary`;
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

/** List the most recent 50 Azure DevOps work items */
ipcMain.handle('azure:listWorkItems', async (_evt, projectDir: string) => {
  const { integrations = {} } = await loadProjectMeta(projectDir);
  const { azureOrgUrl, azurePAT } = integrations;
  if (!azureOrgUrl || !azurePAT) {
    throw new Error('Please configure Azure DevOps settings first');
  }

  const auth = Buffer.from(`:${azurePAT}`).toString('base64');
  // 1) Run WIQL query to fetch IDs
  const wiqlUrl = `${azureOrgUrl.replace(/\/$/, '')}/_apis/wit/wiql?api-version=6.0`;
  const wiqlRes = await fetch(wiqlUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'Select [System.Id], [System.Title] From WorkItems ORDER BY [System.ChangedDate] DESC',
    }),
  });
  if (!wiqlRes.ok) throw new Error(`Azure WIQL failed (${wiqlRes.status})`);
  const wiqlData = (await wiqlRes.json()) as any;
  const ids: number[] = (wiqlData.workItems || []).slice(0, 50).map((w: any) => w.id);
  if (!ids.length) return [];

  // 2) Batch GET their titles
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
  const itemsData = (await itemsRes.json()) as any;

  return (itemsData.value || []).map((w: any) => ({
    id: String(w.id),
    title: w.fields['System.Title'] as string,
  }));
});
 
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

// async function runPlaywright(
//   projectDir: string,
//   args: string[]
// ): Promise<{ passed: boolean; output: string }> {
//   return new Promise((resolve) => {
//     const cp = spawn('npx', ['playwright', 'test', ...args], {
//       cwd: projectDir,
//       shell: true,
//     });
//     let output = '';
//     cp.stdout.on('data', (d) => (output += d.toString()));
//     cp.stderr.on('data', (d) => (output += d.toString()));
//     cp.on('close', (code) => resolve({ passed: code === 0, output }));
//   });
// }
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
  return meta as { integrations?: {
    jiraBaseUrl?: string;
    jiraEmail?: string;
    jiraToken?: string;
    azureOrgUrl?: string;
    azurePAT?: string;
  } };
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
