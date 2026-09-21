#!/usr/bin/env node
/**
 * EduFlow AI - Unified Full-Stack Dev Runner
 * 
 * Runs all three subsystems concurrently with live-reloading:
 * 1. React Frontend (Vite with full-stack external watcher on port 2174)
 * 2. ASP.NET Core Backend API (dotnet watch on port 5204)
 * 3. Python AI Multi-Agent Service (Uvicorn auto-reload on port 8000)
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWindows = process.platform === 'win32';
const shellCmd = isWindows ? true : '/bin/sh';

const services = [
  {
    name: 'Frontend',
    color: '\x1b[36m', // Cyan
    cwd: path.join(__dirname, 'frontend'),
    cmd: isWindows ? 'npm.cmd' : 'npm',
    args: ['run', 'dev']
  },
  {
    name: 'Backend ',
    color: '\x1b[32m', // Green
    cwd: path.join(__dirname, 'backend', 'EduFlow.Api'),
    cmd: 'dotnet',
    args: ['watch', 'run', '--non-interactive']
  },
  {
    name: 'AIAgent ',
    color: '\x1b[35m', // Magenta
    cwd: path.join(__dirname, 'ai-agent'),
    cmd: 'python',
    args: ['-m', 'uvicorn', 'main:app', '--reload', '--host', '0.0.0.0', '--port', '8000']
  }
];

const children = [];

console.log('\x1b[1m\x1b[34m==============================================================\x1b[0m');
console.log('\x1b[1m\x1b[34m  🚀 EduFlow AI - Unified Full-Stack Live Development Server  \x1b[0m');
console.log('\x1b[1m\x1b[34m==============================================================\x1b[0m');
console.log('⚡ Any code updates in Frontend, Backend, or AI Agent will');
console.log('   automatically recompile and reload the web application.\n');

services.forEach((service) => {
  const child = spawn(service.cmd, service.args, {
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

function cleanup() {
  console.log('\n\x1b[33mStopping all EduFlow services...\x1b[0m');
  children.forEach((child) => {
    try {
      if (isWindows) {
        spawn('taskkill', ['/pid', child.pid, '/f', '/t']);
      } else {
        child.kill('SIGINT');
      }
    } catch {}
  });
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
