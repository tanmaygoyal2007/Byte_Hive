console.clear();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function buildNodeOptions() {
  const existing = process.env.NODE_OPTIONS || '';
  const flags = existing.split(/\s+/).filter(Boolean);

  if (!flags.includes('--use-system-ca')) {
    flags.push('--use-system-ca');
  }

  return flags.join(' ');
}

const lockPath = path.join(__dirname, '.next', 'dev', 'lock');
if (fs.existsSync(lockPath)) {
  fs.rmSync(lockPath);
}

const child = spawn('npx', ['next', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_OPTIONS: buildNodeOptions(),
  },
});
child.on('close', (code) => process.exit(code));
