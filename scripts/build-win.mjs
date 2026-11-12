import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { build } = require('electron-builder');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const metadata = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const productName = metadata.productName || 'SoundSwitch';
const publishFlag = process.argv.indexOf('--publish');
const publish = publishFlag === -1 ? undefined : process.argv[publishFlag + 1];

// O Gerenciador de Tarefas exibe FileDescription. O electron-builder grava a
// description do package.json nesse campo do instalador e do desinstalador.
await build({
  projectDir: root,
  config: path.join(root, 'electron-builder.yml'),
  win: [],
  ...(publish == null ? {} : { publish }),
  effectiveOptionComputed: async (options) => {
    const commands = Array.isArray(options) ? options[1] : undefined;
    if (!Array.isArray(commands?.VIAddVersionKey)) return false;
    commands.VIAddVersionKey = commands.VIAddVersionKey.map((entry) =>
      entry.replace(/FileDescription ".*"$/, `FileDescription "${productName}"`),
    );
    return false;
  },
});
