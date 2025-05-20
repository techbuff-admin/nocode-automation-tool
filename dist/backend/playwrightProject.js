"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProject = createProject;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function createProject({ baseDir }) {
    const projectPath = path_1.default.join(baseDir, 'playwright-project');
    if (!fs_1.default.existsSync(projectPath)) {
        fs_1.default.mkdirSync(projectPath, { recursive: true });
        // Initialize a basic Playwright setup
        fs_1.default.writeFileSync(path_1.default.join(projectPath, 'package.json'), JSON.stringify({ name: 'pw', dependencies: { playwright: '^1.40.0' } }, null, 2));
        fs_1.default.writeFileSync(path_1.default.join(projectPath, 'tests.example.ts'), `import { test } from '@playwright/test';\n\ntest('example', async ({ page }) => {\n  await page.goto('https://example.com');\n});\n`);
    }
    return projectPath;
}
