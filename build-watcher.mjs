#!/usr/bin/env node
/**
 * ===============================================================================
 * EduFlow AI - Full-Stack Continuous Rebuild Watcher ("Build Reload")
 * ===============================================================================
 * Automatically rebuilds artifacts and re-compiles code in the background
 * whenever source files are updated in:
 * 
 * 1. Backend (.NET)       -> Executes 'dotnet build' on solution
 * 2. Frontend (React/Vite)-> Executes 'npm run build' (Vite production bundle)
 * 3. AI Agent (Python)    -> Executes Python bytecode compilation & syntax validation
 * ===============================================================================
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWindows = process.platform === 'win32';
const rootDir = __dirname;

const CONFIG = {
  backend: {
    name: 'Backend (.NET)',
    color: '\x1b[32m', // Green
    watchDirs: [path.join(rootDir, 'backend')],
    extensions: ['.cs', '.csproj', '.slnx', '.json'],
    ignored: ['bin', 'obj', '.vs', 'TestResults', 'appsettings.Development.json'],
    runBuild: () => {
      const solutionPath = path.join(rootDir, 'backend', 'EduFlow.slnx');
      return runProcess('dotnet', ['build', solutionPath, '-v', 'm', '--nologo'], rootDir);
    }
  },
  frontend: {
    name: 'Frontend (Vite)',
    color: '\x1b[36m', // Cyan
    watchDirs: [path.join(rootDir, 'frontend', 'src'), path.join(rootDir, 'frontend', 'public')],
    extensions: ['.jsx', '.js', '.css', '.html', '.svg', '.json'],
    ignored: ['dist', 'node_modules', 'playwright-report', 'test-results'],
    runBuild: () => {
      const npmCmd = isWindows ? 'npm.cmd' : 'npm';
      return runProcess(npmCmd, ['run', 'build'], path.join(rootDir, 'frontend'));
    }
  },
  aiAgent: {
    name: 'AI Agent (Python)',
    color: '\x1b[35m', // Magenta
    watchDirs: [
      path.join(rootDir, 'ai-agent', 'agents'),
      path.join(rootDir, 'ai-agent', 'core'),
      path.join(rootDir, 'ai-agent', 'graph'),
      path.join(rootDir, 'ai-agent', 'models'),
      path.join(rootDir, 'ai-agent', 'tools'),
      path.join(rootDir, 'ai-agent')
    ],
    extensions: ['.py'],
    ignored: ['venv', '__pycache__', '.pytest_cache', 'tests'],
    runBuild: () => {
      return runProcess(
        'python',
        [
          '-m', 'compileall', '-q',
          path.join(rootDir, 'ai-agent', 'agents'),
          path.join(rootDir, 'ai-agent', 'core'),
          path.join(rootDir, 'ai-agent', 'graph'),
          path.join(rootDir, 'ai-agent', 'models'),
          path.join(rootDir, 'ai-agent', 'tools'),
          path.join(rootDir, 'ai-agent', 'main.py')
        ],
        rootDir
      );
    }
  }
};

const activeBuilds = {
  backend: false,
  frontend: false,
  aiAgent: false
};

const debounceTimers = {
  backend: null,
  frontend: null,
  aiAgent: null
};

function log(subsystemKey, message, isError = false) {
  const cfg = CONFIG[subsystemKey];
  const prefix = `${cfg.color}[${cfg.name}]\x1b[0m`;
  const time = new Date().toLocaleTimeString();
  const colorFn = isError ? '\x1b[31m' : '\x1b[0m';
  console.log(`[${time}] ${prefix} ${colorFn}${message}\x1b[0m`);
}

function runProcess(cmd, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      shell: isWindows,
      env: { ...process.env, FORCE_COLOR: 'true' }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    child.on('error', (err) => {
      resolve({ code: 1, stdout: '', stderr: err.message });
    });
  });
}

async function triggerBuild(subsystemKey, triggerFile) {
  if (activeBuilds[subsystemKey]) {
    // Re-queue build after current finishes
    return;
  }

  activeBuilds[subsystemKey] = true;
  const cfg = CONFIG[subsystemKey];
  const rel = path.relative(rootDir, triggerFile);

  log(subsystemKey, `\x1b[33m⚡ File changed: ${rel} -> Triggering continuous rebuild...\x1b[0m`);
  const startTime = Date.now();

  try {
    const result = await cfg.runBuild();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (result.code === 0) {
      log(subsystemKey, `\x1b[32m✔ Build succeeded in ${duration}s!\x1b[0m`);
    } else {
      log(subsystemKey, `\x1b[31m✖ Build failed (code ${result.code}) in ${duration}s:\x1b[0m`, true);
      // Print first few lines of error
      const output = (result.stderr || result.stdout || '').trim();
      const lines = output.split('\n').filter(l => l.trim().length > 0).slice(0, 10);
      lines.forEach(line => console.error(`    ${line}`));
    }
  } catch (err) {
    log(subsystemKey, `\x1b[31m✖ Execution error: ${err.message}\x1b[0m`, true);
  } finally {
    activeBuilds[subsystemKey] = false;
  }
}

function shouldIgnore(filePath, ignoredPatterns) {
  const normalized = filePath.replace(/\\/g, '/');
  return ignoredPatterns.some(pat => normalized.includes(`/${pat}/`) || normalized.endsWith(`/${pat}`));
}

function watchDirectory(dirPath, subsystemKey) {
  if (!fs.existsSync(dirPath)) return;

  const cfg = CONFIG[subsystemKey];

  try {
    fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      const fullPath = path.join(dirPath, filename);
      const ext = path.extname(filename).toLowerCase();

      if (!cfg.extensions.includes(ext)) return;
      if (shouldIgnore(fullPath, cfg.ignored)) return;

      if (debounceTimers[subsystemKey]) {
        clearTimeout(debounceTimers[subsystemKey]);
      }

      debounceTimers[subsystemKey] = setTimeout(() => {
        triggerBuild(subsystemKey, fullPath);
      }, 350);
    });
  } catch (err) {
    console.error(`Failed to watch directory ${dirPath}:`, err.message);
  }
}

console.log('\x1b[1m\x1b[34m==============================================================\x1b[0m');
console.log('\x1b[1m\x1b[34m  🔨 EduFlow AI - Full-Stack Continuous Rebuild Watcher       \x1b[0m');
console.log('\x1b[1m\x1b[34m==============================================================\x1b[0m');
console.log('👀 Watching files for continuous background rebuilds:\n');
console.log('   • \x1b[32mBackend (.NET)\x1b[0m       : backend/**/*.cs, *.csproj -> dotnet build');
console.log('   • \x1b[36mFrontend (Vite)\x1b[0m      : frontend/src/**/*.{jsx,js,css} -> vite build');
console.log('   • \x1b[35mAI Agent (Python)\x1b[0m    : ai-agent/**/*.py -> bytecode compile & syntax check');
console.log('\nReady! Edit any file to trigger an immediate build reload.\n');

// Initialize watchers
Object.keys(CONFIG).forEach((key) => {
  CONFIG[key].watchDirs.forEach((d) => watchDirectory(d, key));
});

// Keep process alive
process.stdin.resume();
