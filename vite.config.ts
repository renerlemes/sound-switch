import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const componentsRoot = path.resolve(root, '../../../Componentes/components-react');

function productionCsp(): Plugin {
  return {
    name: 'sound-switch-csp',
    apply: 'build',
    transformIndexHtml(html) {
      const csp = [
        "default-src 'none'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-ancestors 'none'",
      ].join('; ');
      return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`);
    },
  };
}

export default defineConfig({
  root: path.join(root, 'src/renderer'),
  base: './',
  plugins: [react(), productionCsp()],
  resolve: {
    alias: {
      '@electron-components/ui': path.join(componentsRoot, 'src/desktop/index.ts'),
      'react/jsx-runtime': path.join(root, 'node_modules/react/jsx-runtime'),
      'react-dom': path.join(root, 'node_modules/react-dom'),
      react: path.join(root, 'node_modules/react'),
    },
  },
  server: {
    port: 5174,
    strictPort: false,
    host: '127.0.0.1',
    fs: { allow: [root, componentsRoot] },
  },
  build: {
    outDir: path.join(root, 'dist/renderer'),
    emptyOutDir: true,
    sourcemap: true,
  },
});
