console.clear();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const lockPath = path.join(__dirname, '.next', 'dev', 'lock');
if (fs.existsSync(lockPath)) {
  fs.rmSync(lockPath);
}

const child = spawn('npx', ['next', 'dev'], { stdio: 'inherit', shell: true });
child.on('close', (code) => process.exit(code));
