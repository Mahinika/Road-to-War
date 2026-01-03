import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Start Vite dev server
const vite = spawn('npm', ['run', 'dev'], {
  cwd: projectRoot,
  shell: true,
  stdio: 'inherit'
});

// Wait a bit for server to start, then open browser with DevTools
setTimeout(() => {
  const platform = process.platform;
  let command;
  let args;

  if (platform === 'win32') {
    // Windows - use PowerShell to launch Chrome with DevTools
    command = 'powershell';
    args = ['-Command', 'Start-Process', 'chrome', '-ArgumentList', '--auto-open-devtools-for-tabs,http://localhost:3000'];
  } else if (platform === 'darwin') {
    // macOS
    command = 'open';
    args = ['-a', 'Google Chrome', '--args', '--auto-open-devtools-for-tabs', 'http://localhost:3000'];
  } else {
    // Linux
    command = 'google-chrome';
    args = ['--auto-open-devtools-for-tabs', 'http://localhost:3000'];
  }

  spawn(command, args, {
    shell: true,
    detached: true,
    stdio: 'ignore'
  });
}, 3000); // Wait 3 seconds for server to start

// Handle cleanup
process.on('SIGINT', () => {
  vite.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  vite.kill();
  process.exit();
});

