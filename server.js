// Local edit server — run with: node server.js
// Handles write-text, import-image, write-json at http://127.0.0.1:5174

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT        = 5174;
const HOST        = '127.0.0.1';
const CONTENT_DIR = path.join(__dirname, 'content');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('end', function () {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function ok(res, payload) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(Object.assign({ ok: true }, payload)));
}

function fail(res, err) {
  res.writeHead(500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: String(err) }));
}

http.createServer(function (req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'POST') { res.writeHead(404); res.end(); return; }

  // ── POST /api/write-text ───────────────────────────────────────
  if (req.url === '/api/write-text') {
    readBody(req).then(function (writes) {
      writes.forEach(function (w) {
        var cellId  = String(w.cellId  || '').trim();
        var surface = String(w.surface || '').trim();
        var value   = String(w.value   != null ? w.value : '');
        if (!cellId || !surface) return;

        var file;
        var content;

        if (surface === 'question' || surface === 'answer') {
          file = path.join(CONTENT_DIR, cellId, surface + '.js');
          content =
            '(function () {\n' +
            '  window.TRIVIA_CONTENT = window.TRIVIA_CONTENT || {};\n' +
            '  window.TRIVIA_CONTENT[' + JSON.stringify(cellId) + '] = window.TRIVIA_CONTENT[' + JSON.stringify(cellId) + '] || {};\n' +
            '  window.TRIVIA_CONTENT[' + JSON.stringify(cellId) + '].' + surface + ' = ' + JSON.stringify(value) + ';\n' +
            '})();\n';
          fs.writeFileSync(file, content, 'utf8');

        } else if (surface === 'hint') {
          // Patch "source": [...] inside meta.js
          file = path.join(CONTENT_DIR, cellId, 'meta.js');
          var text = fs.readFileSync(file, 'utf8');
          var sources = value
            ? value.split(' / ').map(function (s) { return s.trim(); }).filter(Boolean)
            : [];
          // Replace existing source array; if absent, insert before closing brace
          if (/"source"\s*:/.test(text)) {
            text = text.replace(/"source"\s*:\s*\[[^\]]*\]/, '"source": ' + JSON.stringify(sources));
          } else {
            // Insert source before the last closing };
            text = text.replace(/(\};?\s*\}\)\(\);?\s*)$/, function (m) {
              return ',\n  "source": ' + JSON.stringify(sources) + '\n' + m;
            });
          }
          fs.writeFileSync(file, text, 'utf8');

        } else if (surface === 'categories') {
          // value is the full categories array
          var cats = Array.isArray(value) ? value : [];
          // Write manifest.json
          var jsonFile = path.join(CONTENT_DIR, 'manifest.json');
          var manifest = {};
          try { manifest = JSON.parse(fs.readFileSync(jsonFile, 'utf8')); } catch (e) {}
          manifest.categories = cats;
          fs.writeFileSync(jsonFile, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
          // Write manifest.js
          var jsFile = path.join(CONTENT_DIR, 'manifest.js');
          var jsText = fs.readFileSync(jsFile, 'utf8');
          jsText = jsText.replace(
            /"categories"\s*:\s*\[[^\]]*\]/,
            '"categories": ' + JSON.stringify(cats)
          );
          fs.writeFileSync(jsFile, jsText, 'utf8');
        }
      });
      ok(res);
    }).catch(function (err) { fail(res, err); });
    return;
  }

  // ── POST /api/import-image ─────────────────────────────────────
  if (req.url === '/api/import-image') {
    readBody(req).then(function (body) {
      var entity   = body.entity   || {};
      var filename = String(body.filename || 'image.png').replace(/[^a-zA-Z0-9._-]/g, '_');
      var dataUrl  = String(body.dataUrl  || '');
      var folder   = entity.mediaSurface === 'question' ? 'question-images' : 'answer-images';
      var dir      = path.join(CONTENT_DIR, String(entity.cellId || ''), folder);

      fs.mkdirSync(dir, { recursive: true });
      var base64 = dataUrl.replace(/^data:image\/[a-z+]+;base64,/, '');
      fs.writeFileSync(path.join(dir, filename), Buffer.from(base64, 'base64'));

      var src = './content/' + entity.cellId + '/' + folder + '/' + filename;
      ok(res, { src: src });
    }).catch(function (err) { fail(res, err); });
    return;
  }

  // ── POST /api/write-json ───────────────────────────────────────
  if (req.url === '/api/write-json') {
    readBody(req).then(function (body) {
      var storeFile = path.join(__dirname, '.editor-store.json');
      var store = {};
      try { store = JSON.parse(fs.readFileSync(storeFile, 'utf8')); } catch (e) {}
      store[body.key] = body.value;
      fs.writeFileSync(storeFile, JSON.stringify(store, null, 2), 'utf8');
      ok(res);
    }).catch(function (err) { fail(res, err); });
    return;
  }

  res.writeHead(404); res.end();

}).listen(PORT, HOST, function () {
  console.log('Edit server → http://' + HOST + ':' + PORT);
  console.log('Ready. Open the game at localhost and press Ctrl+Shift+E to activate edit mode.');
});
