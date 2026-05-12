console.clear();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const lockPath = path.join(__dirname, '..', '.next', 'dev', 'lock');
if (fs.existsSync(lockPath)) {
  fs.rmSync(lockPath);
}

const nextBin = path.join(__dirname, '..', 'node_modules', '.bin', 'next');

const child = spawn(nextBin, ['dev'], {
  stdio: 'inherit',
});
child.on('close', (code) => process.exit(code));
