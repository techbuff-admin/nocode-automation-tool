"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runChecks = runChecks;
// backend/systemChecks.ts
const child_process_1 = require("child_process");
function runChecks() {
    const checks = [];
    // Helper to test a command
    function test(cmd) {
        try {
            const out = (0, child_process_1.execSync)(cmd, { stdio: 'pipe' }).toString().trim();
            // assume version is first line or “Version X.Y.Z”
            const line = out.split('\n')[0];
            const version = (line.match(/\d+\.\d+\.\d+/) || [line])[0];
            return { ok: true, version };
        }
        catch {
            return { ok: false };
        }
    }
    // Playwright
    const pw = test('npx playwright --version');
    checks.push({
        name: 'playwright',
        display: 'Playwright',
        installed: pw.ok,
        version: pw.ok ? pw.version : undefined,
    });
    // Java
    const java = test('java -version');
    checks.push({
        name: 'java',
        display: 'Java',
        installed: java.ok,
        version: java.ok ? java.version : undefined,
    });
    // Allure
    const allure = test('allure --version');
    checks.push({
        name: 'allure',
        display: 'Allure',
        installed: allure.ok,
        version: allure.ok ? allure.version : undefined,
    });
    return checks;
}
