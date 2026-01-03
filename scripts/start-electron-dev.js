import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { join } from 'path';
import http from 'http';
import { platform } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

// Determine npm command based on platform
const isWindows = platform() === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// Start Vite dev server - use npx vite directly to avoid npm script issues
const vite = spawn('npx', ['vite', '--port', '3000'], {
  cwd: projectRoot,
  shell: isWindows, // Use shell on Windows for .cmd files
  stdio: 'inherit',
  env: process.env
});

// Wait for Vite server to be ready
function waitForServer(url, maxAttempts = 30, delay = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const checkServer = () => {
      attempts++;
      
      const req = http.get(url, (res) => {
        resolve();
      });
      
      req.on('error', () => {
        if (attempts >= maxAttempts) {
          reject(new Error('Vite server failed to start'));
        } else {
          setTimeout(checkServer, delay);
        }
      });
    };
    
    checkServer();
  });
}

// Wait for server, then start Electron
waitForServer('http://localhost:3000')
  .then(() => {
    
    // Start Electron
    const electron = spawn(npmCmd, ['run', 'electron:dev'], {
      cwd: projectRoot,
      shell: isWindows, // Use shell on Windows for .cmd files
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    });
    
    // Handle cleanup
    const cleanup = () => {
      vite.kill();
      electron.kill();
      process.exit();
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    // Handle Electron exit
    electron.on('exit', () => {
      vite.kill();
      process.exit();
    });
  })
  .catch((error) => {
    console.error('Failed to start Electron:', error);
    vite.kill();
    process.exit(1);
  });

