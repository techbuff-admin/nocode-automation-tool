import { spawn } from 'child_process';

export function runTests(testFiles: string[]) {
  const proc = spawn('npx', ['playwright', 'test', ...testFiles], { shell: true });
  proc.stdout.on('data', data => {
    // forward logs to renderer
    process.stdout.write(data.toString());
  });
  proc.stderr.on('data', data => {
    process.stdout.write(data.toString());
  });
  return new Promise(resolve => proc.on('close', resolve));
}
