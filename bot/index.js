const fs = require('fs');
const path = require('path');

function tryDirectAttach(mod, client, io) {
  if (!mod) return false;
  if (typeof mod.attach === 'function') { mod.attach(client, io); return true; }
  if (typeof mod.default === 'function') { mod.default(client, io); return true; }
  if (typeof mod === 'function') { mod(client, io); return true; }
  return false;
}

function patchLegacySource(src) {
  src = src.replace(/const\s+client\s*=\s*new\s+Client\s*\([^)]*\)\s*;/g, "const client = global.__FIREZAP_CLIENT__ || new Client();");
  src = src.replace(/client\.initialize\s*\(\s*\)\s*;?/g, "// client.initialize(); // (host inicializa)");
  src = src.replace(/qrcode-terminal/g, "/* qrcode-terminal removido pelo adapter */ null");
  return src;
}

async function dynamicRequirePatched(file, client, io) {
  const src = fs.readFileSync(file, 'utf8');
  const patched = patchLegacySource(src);
  const tmp = path.join(path.dirname(file), path.basename(file, path.extname(file)) + '.__patched__.js');
  fs.writeFileSync(tmp, patched, 'utf8');
  global.__FIREZAP_CLIENT__ = client;
  return require(tmp);
}

module.exports.attach = async (client, io) => {
  const roboFile = path.resolve(__dirname, 'robo.js');
  if (!fs.existsSync(roboFile)) {
    console.log('[bot-adapter] Nenhum robo.js encontrado em /bot. Nada para carregar.');
    return;
  }
  try {
    const mod = require(roboFile);
    if (tryDirectAttach(mod, client, io)) {
      console.log('[bot-adapter] Bot carregado no modo attach.');
      return;
    }
  } catch (_) {}
  try {
    const mod2 = await dynamicRequirePatched(roboFile, client, io);
    if (tryDirectAttach(mod2, client, io)) {
      console.log('[bot-adapter] Bot legado carregado com patch.');
      return;
    }
    console.log('[bot-adapter] Bot legado carregado: handlers foram registrados no require.');
  } catch (e) {
    console.error('[bot-adapter] Falhou ao carregar robo.js:', e);
  }
};
