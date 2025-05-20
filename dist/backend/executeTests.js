"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTests = runTests;
const child_process_1 = require("child_process");
function runTests(testFiles) {
    const proc = (0, child_process_1.spawn)('npx', ['playwright', 'test', ...testFiles], { shell: true });
    proc.stdout.on('data', data => {
        // forward logs to renderer
        process.stdout.write(data.toString());
    });
    proc.stderr.on('data', data => {
        process.stdout.write(data.toString());
    });
    return new Promise(resolve => proc.on('close', resolve));
}
