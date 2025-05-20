import os from 'os';
import { app, BrowserWindow, ipcMain, shell,dialog } from 'electron';
import path from 'path';
// main.ts (Electron main process)
import { exec } from 'child_process';
let mainWindow: BrowserWindow | null = null;
const DEV_URL = 'http://localhost:5173';
import fs from 'fs/promises';
import util from 'util';
import klaw from 'klaw';

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
    'npm install -D @playwright/test playwright allure-commandline',
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
  reporter: [['list'], ['allure-playwright']],
});`
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
    const boilerplate = `
import { test, expect } from '@playwright/test';

test.describe('${suiteName}', () => {
  // add tests here
});
    `.trim();
    await fs.writeFile(filePath, boilerplate, 'utf8');
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
