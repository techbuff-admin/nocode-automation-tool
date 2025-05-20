"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
// main.ts (Electron main process)
const child_process_1 = require("child_process");
let mainWindow = null;
const DEV_URL = 'http://localhost:5173';
const promises_1 = __importDefault(require("fs/promises"));
const util_1 = __importDefault(require("util"));
const klaw_1 = __importDefault(require("klaw"));
const execAsync = util_1.default.promisify(child_process_1.exec);
electron_1.ipcMain.handle('select-directory', async () => {
    const { canceled, filePaths } = await electron_1.dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return canceled ? null : filePaths[0];
});
// Create main application window
async function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    // In dev, load Vite dev server; otherwise load built index.html
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
    }
    else {
        await mainWindow.loadFile(path_1.default.join(__dirname, '..', 'renderer', 'dist', 'index.html'));
    }
    mainWindow.webContents.openDevTools({ mode: 'detach' });
}
// ipcMain.handle('project:create', async (_evt, { basePath, projectName }) => {
//   const projectDir = path.join(basePath, projectName);
//   // 1) Make the folder
//   await fs.mkdir(projectDir, { recursive: true });
//   // 2) Initialize npm & install Playwright
//   await execAsync('npm init -y', { cwd: projectDir });
//   await execAsync('npm install -D @playwright/test playwright', { cwd: projectDir });
//   // 3) Download the browsers
//   await execAsync('npx playwright install', { cwd: projectDir });
//   // 4) Write a basic test file so users see something
//   const testCode = `
// import { test, expect } from '@playwright/test';
// test('example', async ({ page }) => {
//   await page.goto('https://example.com');
//   await expect(page).toHaveTitle(/Example Domain/);
// });
//   `.trim();
//   await fs.writeFile(path.join(projectDir, 'tests/example.spec.ts'), testCode, 'utf8');
//   return projectDir;
// });
electron_1.ipcMain.handle('project:create', async (_evt, { basePath, projectName }) => {
    const projectDir = path_1.default.join(basePath, projectName);
    // 1) Make directories
    await promises_1.default.mkdir(projectDir, { recursive: true });
    for (const sub of ['tests', 'page-objects', 'config']) {
        await promises_1.default.mkdir(path_1.default.join(projectDir, sub), { recursive: true });
    }
    // 2) Init npm + install deps
    await execAsync('npm init -y', { cwd: projectDir });
    await execAsync('npm install -D @playwright/test playwright allure-commandline', { cwd: projectDir });
    // 3) Download browsers
    await execAsync('npx playwright install', { cwd: projectDir });
    // 4) Write a blank config file
    await promises_1.default.writeFile(path_1.default.join(projectDir, 'playwright.config.ts'), `import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [['list'], ['allure-playwright']],
});`);
    return projectDir;
});
electron_1.ipcMain.handle('tests:execute', (_, scriptPaths) => Promise.resolve().then(() => __importStar(require('./backend/executeTests'))).then(m => m.runTests(scriptPaths)));
// Install a dependency globally or locally as needed
electron_1.ipcMain.handle('dependency:install', async (_evt, depName) => {
    return new Promise((resolve, reject) => {
        let cmd;
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
        (0, child_process_1.exec)(cmd, (err, stdout, stderr) => {
            if (err) {
                return reject(stderr || err.message);
            }
            resolve(stdout || `${depName} installed`);
        });
    });
});
// main.ts
electron_1.ipcMain.handle('system:check', () => Promise.resolve().then(() => __importStar(require('./backend/systemChecks'))).then((m) => m.runChecks()));
electron_1.ipcMain.handle('open-external', async (_event, url) => {
    // shell.openExternal returns a Promise<boolean>
    return electron_1.shell.openExternal(url);
});
electron_1.ipcMain.handle('suite:create', async (_evt, { projectDir, suiteName }) => {
    // sanitize name → no spaces, lower-kebab
    const fileName = `${suiteName.trim().replace(/\s+/g, '-')}.spec.ts`;
    const filePath = path_1.default.join(projectDir, 'tests', fileName);
    const boilerplate = `
import { test, expect } from '@playwright/test';

test.describe('${suiteName}', () => {
  // add tests here
});
    `.trim();
    await promises_1.default.writeFile(filePath, boilerplate, 'utf8');
    return filePath;
});
electron_1.ipcMain.handle('case:add', async (_evt, opts) => {
    // suiteFile is full path to e.g. tests/my-suite.spec.ts
    // Append the code before the final closing `});`
    let content = await promises_1.default.readFile(opts.suiteFile, 'utf8');
    const marker = /^}\);/m;
    const insertion = `  test('new case', async ({ page }) => {\n${opts.caseCode
        .split('\n')
        .map(l => '    ' + l)
        .join('\n')}\n  });\n`;
    // Insert it just above the final `});`
    content = content.replace(marker, insertion + '});');
    await promises_1.default.writeFile(opts.suiteFile, content, 'utf8');
    return opts.suiteFile;
});
electron_1.ipcMain.handle('fs:tree', async (_evt, projectDir) => {
    const items = [];
    return new Promise(resolve => {
        (0, klaw_1.default)(projectDir)
            .on('data', item => {
            const rel = path_1.default.relative(projectDir, item.path);
            if (rel) {
                items.push({
                    path: rel,
                    type: item.stats.isDirectory() ? 'dir' : 'file',
                });
            }
        })
            .on('end', () => resolve(items));
    });
});
electron_1.app.whenReady().then(createWindow);
electron_1.app.on('window-all-closed', () => electron_1.app.quit());
