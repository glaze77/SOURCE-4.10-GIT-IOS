# Transfer Trivia Editor — Repair Guide

Five bugs prevent the node-helper save system from working correctly.
Fix them in order. All changes are in the client-side editor script and `index.html`.

---

## Bug 1 — `importImage` sends wrong request body to server

**Symptom:** Replacing an image silently does nothing. No file is written to disk.

**Root cause:** The fetch call sends `{ entity, filename, dataUrl }` but the server's
`/api/import-image` endpoint expects the flat fields `cellId`, `surface`, `filename`, and `data`.

**Find this code:**
```js
body: JSON.stringify({ entity: entity, filename: file.name, dataUrl: ev.target.result })
```

**Replace with:**
```js
body: JSON.stringify({
  cellId: entity.cellId,
  surface: entity.mediaSurface,
  filename: file.name,
  data: ev.target.result
})
```

---

## Bug 2 — `importImage` checks a response field that doesn't exist

**Symptom:** Even when the server successfully writes the image, the UI image never updates.

**Root cause:** After the import fetch, the code checks `res.src` — a field the server never
returns. The server returns `{ ok, path, file }`. The check always evaluates to falsy so
`applyMediaReplacement` is never called.

**Find this code:**
```js
if (res.src) applyMediaReplacement(entity, res.src);
```

**Replace with:**
```js
if (res.ok && res.path) applyMediaReplacement(entity, res.path);
else showBadgeMsg('Import failed: ' + (res.error || '?'), 3000);
```

Also replace the `.catch` alert below it:
```js
// OLD
alert('Image import failed — is the edit server running?\nnode server.js');

// NEW
showBadgeMsg('Import failed — helper running?', 3000);
```

---

## Bug 3 — `deleteImageAtEntity` never calls the server

**Symptom:** Clicking Delete removes the image from the screen but the file remains on disk.
On page reload the image comes back.

**Root cause:** The function only removes DOM elements and splices the in-memory deck array.
It never POSTs to `/api/delete-image`.

**Replace the entire `deleteImageAtEntity` function with:**
```js
function deleteImageAtEntity(entity) {
  var entry = window.transferTriviaDeck && window.transferTriviaDeck[entity.cellId];

  var mediaKey = entity.mediaSurface === 'question' ? 'questionMedia' : 'answerMedia';
  var mediaArr = entry && entry.meta && Array.isArray(entry.meta[mediaKey]) ? entry.meta[mediaKey]
    : (entry && entry.meta && entry.meta.media && Array.isArray(entry.meta.media[entity.mediaSurface])
        ? entry.meta.media[entity.mediaSurface] : []);
  var item = mediaArr[entity.mediaIndex];
  var filename = item && item.src ? item.src.split('/').pop() : null;

  function applyDeletion() {
    document.querySelectorAll('[data-entity-id="' + entity.entityId + '"]').forEach(function (img) {
      var card = img.closest('.tt-media-card, .tt-question-media-card');
      if (card) card.remove(); else img.remove();
    });
    mediaArr.splice(entity.mediaIndex, 1);
    if (!mediaArr.length) {
      ['#question-modal .tt-answer-content', '#question-modal .tt-question-text'].forEach(function (sel) {
        var el = document.querySelector(sel);
        if (el) el.classList.remove('has-media');
      });
    }
    state.dirty = true;
  }

  if (filename) {
    fetch(API + '/api/delete-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cellId: entity.cellId, surface: entity.mediaSurface, filename: filename })
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (res.ok) applyDeletion();
      else showBadgeMsg('Delete failed: ' + (res.error || '?'), 3000);
    }).catch(function () {
      showBadgeMsg('Delete failed — helper running?', 3000);
    });
  } else {
    applyDeletion();
  }
}
```

---

## Bug 4 — Hint save overwrites all of `meta.json`

**Symptom:** Saving a hint edit wipes the cell's `category`, `points`, `questionSlide`,
`answerSlide`, `media`, and `badges` fields. `meta.json` is left with only `{ "source": [...] }`.

**Root cause:** The save posts `{ json: { source: sources } }` directly to `/api/write-json`,
which replaces the entire file with just that object.

**Fix:** Replace the entire `saveEditorChanges` function with the version below, which:
- Adds `postJson` and `patchJsonFile` helpers to do read → patch → write safely
- Commits any open textarea before saving
- Saves hints by patching only the `source` field in `meta.json`
- Saves categories (see Bug 5 below) by patching only the `categories` field in `manifest.json`

```js
function postJson(endpoint, body) {
  return fetch(API + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(function (r) { return r.json(); });
}

function patchJsonFile(path, patchFn) {
  return postJson('/api/read-json', { path: path }).then(function (res) {
    var obj = (res.ok && res.json) ? res.json : {};
    patchFn(obj);
    return postJson('/api/write-json', { path: path, json: obj });
  });
}

function saveEditorChanges() {
  if (state.activeTextEdit) commitTextEdit();
  if (!state.dirty) { showBadgeMsg('Nothing to save', 1500); return; }

  var requests = [];
  var hintCells = {};
  var hasCategoryDirty = false;

  Object.keys(state.dirtyWrites).forEach(function (key) {
    var parts   = key.split('::');
    var cellId  = parts[0];
    var surface = parts[1];
    if (cellId === 'category') { hasCategoryDirty = true; return; }
    if (surface === 'media') return;
    var entry = window.transferTriviaDeck && window.transferTriviaDeck[cellId];
    if (!entry) return;

    if (surface === 'question') {
      requests.push(postJson('/api/write-text', {
        path: 'content/' + cellId + '/question.txt',
        text: String(entry.question || '')
      }));
    } else if (surface === 'answer') {
      requests.push(postJson('/api/write-text', {
        path: 'content/' + cellId + '/answer.txt',
        text: String(entry.answer || '')
      }));
    } else if (surface === 'hint') {
      hintCells[cellId] = entry;
    }
  });

  // Hint: read-patch-write meta.json to preserve all other fields
  Object.keys(hintCells).forEach(function (cellId) {
    var entry = hintCells[cellId];
    var sources = Array.isArray((entry.meta || {}).source) ? entry.meta.source : [];
    requests.push(patchJsonFile('content/' + cellId + '/meta.json', function (obj) {
      obj.source = sources;
    }));
  });

  // Categories: read-patch-write manifest.json
  if (hasCategoryDirty) {
    var catCells = document.querySelectorAll('.grid-row-cats .cat-cell');
    var categories = Array.prototype.map.call(catCells, function (el) {
      return el.textContent.trim();
    });
    requests.push(patchJsonFile('content/manifest.json', function (obj) {
      obj.categories = categories;
    }));
  }

  if (!requests.length) {
    state.dirtyWrites = {};
    state.dirty = false;
    showBadgeMsg('Saved', 2000);
    return;
  }

  Promise.all(requests).then(function (results) {
    var allOk = results.every(function (res) { return res && res.ok; });
    if (allOk) {
      state.dirtyWrites = {};
      state.dirty = false;
      showBadgeMsg('Saved ✓', 2000);
    } else {
      results.forEach(function (res, i) {
        if (!res || !res.ok) console.error('Save failed for request ' + i, res);
      });
      showBadgeMsg('Save failed!', 3000);
    }
  }).catch(function (err) {
    console.error('Save error:', err);
    showBadgeMsg('Save failed — helper running?', 3000);
  });
}
```

---

## Bug 5 — Category edits are never saved to disk

**Symptom:** Editing a category header and pressing Ctrl+S shows "Saved ✓" but on reload
the old category name comes back. No write to `manifest.json` happens.

**Root cause:** `saveEditorChanges` had an early `return` for any key starting with `category::`,
and no category-specific save path existed at all.

**Fix:** Already handled by the replacement `saveEditorChanges` in Bug 4 above — the
`hasCategoryDirty` / `patchJsonFile('content/manifest.json', ...)` block is the fix.
No additional code change needed beyond replacing `saveEditorChanges`.

---

## Bug 6 — Page load does not apply saved category names to the board

**Symptom:** Category names are correctly saved in `manifest.json` but the board always
shows the hardcoded placeholder text ("Category 1", "Category 2", etc.) after reload.

**Root cause:** The manifest loader in `index.html` reads `manifest.cells` to load clue
content but ignores `manifest.categories` entirely. The HTML category header cells have
hardcoded placeholder text that is never overwritten.

**Find this block in `index.html`** (inside `loadExternalDeck`, just after the manifest
fetch resolves):
```js
loadState.manifestCellIds = Array.isArray(manifest && manifest.cells) ? manifest.cells.slice() : [];
var cellIds = Array.isArray(manifest && manifest.cells) ? manifest.cells.slice() : [];
if(!cellIds.length){
```

**Insert these lines between the `cellIds` assignment and the `if(!cellIds.length)` check:**
```js
if(Array.isArray(manifest && manifest.categories)){
  var catEls = document.querySelectorAll('.grid-row-cats .cat-cell');
  manifest.categories.forEach(function(name, i){
    if(catEls[i]) catEls[i].textContent = name;
  });
}
```

---

## Verify `manifest.json` category data is intact

After all fixes are applied, open `content/manifest.json` and confirm the `categories`
array contains the real topic names, not placeholder strings like `"Category 1"`.
If placeholders are present, restore the correct names manually — they can be cross-referenced
from any cell's `meta.json` (`"category"` field) or from `content/manifest.js` if it exists.

---

## Summary checklist

| # | File | What to fix |
|---|------|-------------|
| 1 | editor script | `importImage` — fix request body fields |
| 2 | editor script | `importImage` — fix response field check (`res.src` → `res.ok && res.path`) |
| 3 | editor script | `deleteImageAtEntity` — add `/api/delete-image` fetch before DOM removal |
| 4 | editor script | `saveEditorChanges` + helpers — hint saves must patch, not overwrite, `meta.json` |
| 5 | editor script | `saveEditorChanges` — add category save via `patchJsonFile` on `manifest.json` |
| 6 | `index.html` | Manifest loader — apply `manifest.categories` to `.cat-cell` headers on load |
| — | `manifest.json` | Verify real category names are present, restore if overwritten by test saves |
