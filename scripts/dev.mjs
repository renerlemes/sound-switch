import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { watchAll } from './build-main.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const electronPath = createRequire(import.meta.url)('electron');

const server = await createServer({ configFile: path.join(root, 'vite.config.ts') });
await server.listen();
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('Servidor Vite sem URL local');
console.log(`[dev] renderer em ${url}`);

let child = null;
let restarting = false;
function startElectron() {
  child = spawn(electronPath, [root], { stdio: 'inherit', env: { ...process.env, VITE_DEV_SERVER_URL: url } });
  child.on('exit', (code) => {
    if (restarting) return;
    console.log(`[dev] Electron encerrado (código ${code}).`);
    void server.close().then(() => process.exit(code ?? 0));
  });
}

let timer = null;
await watchAll(() => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (child) {
      restarting = true;
      child.once('exit', () => {
        restarting = false;
        startElectron();
      });
      child.kill();
    } else startElectron();
  }, 200);
});
