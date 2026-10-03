#!/usr/bin/env node
/**
 * EduFlow AI - Unified Full-Stack Dev Runner
 * 
 * Runs all three subsystems concurrently with live-reloading:
 * 1. React Frontend (Vite with full-stack external watcher on port 2174)
 * 2. ASP.NET Core Backend API (dotnet watch on port 5204)
 * 3. Python AI Multi-Agent Service (Uvicorn auto-reload on port 8888)
 */

import { spawn, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWindows = process.platform === 'win32';
const shellCmd = isWindows ? true : '/bin/sh';

// Passing an args array together with `shell` is deprecated (DEP0190), so build one command line.
const quoteArg = (arg) => (/[\s"]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg);
const toCommandLine = (cmd, args) => [cmd, ...args].map(quoteArg).join(' ');

function getPythonCommand() {
  const venvNames = ['.venv', 'venv'];
  for (const name of venvNames) {
    const relPath = isWindows ? path.join('.', name, 'Scripts', 'python.exe') : path.join('.', name, 'bin', 'python');
    const fullPath = path.join(__dirname, 'ai-agent', isWindows ? path.join(name, 'Scripts', 'python.exe') : path.join(name, 'bin', 'python'));
    if (fs.existsSync(fullPath)) {
      return relPath;
    }
  }
  return 'python';
}
const pythonCmd = getPythonCommand();


const services = [
  {
    name: 'Frontend',
    color: '\x1b[36m', // Cyan
    cwd: path.join(__dirname, 'frontend'),
    cmd: isWindows ? 'npm.cmd' : 'npm',
    args: ['run', 'dev'],
    url: 'http://localhost:2174 (or http://localhost:5173)'
  },
  {
    name: 'Backend ',
    color: '\x1b[32m', // Green
    cwd: path.join(__dirname, 'backend', 'EduFlow.Api'),
    cmd: 'dotnet',
    args: ['watch', 'run', '--no-hot-reload', '--non-interactive'],
    url: 'http://localhost:5204 (Swagger: http://localhost:5204/swagger)'
  },
  {
    name: 'AIAgent ',
    color: '\x1b[35m', // Magenta
    cwd: path.join(__dirname, 'ai-agent'),
    cmd: pythonCmd,
    // dev_server.py = uvicorn --reload without the Windows console-wide Ctrl+C on reload
    // (which used to stop every service whenever an ai-agent file changed).
    args: ['dev_server.py'],
    url: 'http://localhost:8888 (API Docs: http://localhost:8888/docs)'
  }
];

const children = [];

console.log('\x1b[1m\x1b[34m==============================================================\x1b[0m');
console.log('\x1b[1m\x1b[34m  🚀 EduFlow AI - Unified Full-Stack Live Development Server  \x1b[0m');
console.log('\x1b[1m\x1b[34m==============================================================\x1b[0m');
console.log('\x1b[1mService URLs:\x1b[0m');
console.log('  🌐 \x1b[36mFrontend Web App\x1b[0m  : http://localhost:2174');
console.log('  ⚙️  \x1b[32m.NET Backend API\x1b[0m  : http://localhost:5204 (Swagger: http://localhost:5204/swagger)');
console.log('  ⚡ \x1b[35mPython AI Engine\x1b[0m  : http://localhost:8888 (Interactive Docs: http://localhost:8888/docs)');
console.log('\x1b[1m\x1b[34m==============================================================\x1b[0m\n');

services.forEach((service) => {
  const child = spawn(toCommandLine(service.cmd, service.args), {
    cwd: service.cwd,
    shell: shellCmd,
    env: { ...process.env, FORCE_COLOR: 'true' }
  });

  children.push(child);

  const prefix = `${service.color}[${service.name}]\x1b[0m `;

  child.stdout.on('data', (chunk) => {
    const lines = chunk.toString().split(/\r?\n/);
    lines.forEach((line) => {
      if (line.trim()) {
        console.log(`${prefix}${line}`);
      }
    });
  });

  child.stderr.on('data', (chunk) => {
    const lines = chunk.toString().split(/\r?\n/);
    lines.forEach((line) => {
      if (line.trim()) {
        console.error(`${prefix}\x1b[31m${line}\x1b[0m`);
      }
    });
  });

  child.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`${prefix}\x1b[33mProcess exited with code ${code}\x1b[0m`);
    }
  });
});

let cleaningUp = false;
function cleanup() {
  if (cleaningUp) return;
  cleaningUp = true;
  console.log('\n\x1b[33mStopping all EduFlow services...\x1b[0m');
  children.forEach((child) => {
    try {
      if (isWindows) {
        // Must be synchronous: an async taskkill can be cut off by process.exit(),
        // leaving orphaned dotnet/uvicorn processes holding ports 5204/8888.
        spawnSync('taskkill', ['/pid', String(child.pid), '/f', '/t'], { stdio: 'ignore' });
      } else {
        child.kill('SIGINT');
      }
    } catch {}
  });
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('SIGHUP', cleanup); // console window closed on Windows
