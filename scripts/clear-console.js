console.clear();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const lockPath = path.join(__dirname, '..', '.next', 'dev', 'lock');
if (fs.existsSync(lockPath)) {
  fs.rmSync(lockPath, { force: true });
}

const nextExecutable = process.platform === 'win32' ? 'next.cmd' : 'next';
const nextBin = path.join(__dirname, '..', 'node_modules', '.bin', nextExecutable);
const command = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : nextBin;
const args = process.platform === 'win32' ? ['/d', '/c', 'call', nextBin, 'dev'] : ['dev'];

const child = spawn(command, args, {
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(`Failed to start Next.js dev server from ${nextBin}`);
  console.error(error);
  process.exit(1);
});

child.on('close', (code) => process.exit(code));
