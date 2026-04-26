(function () {
  'use strict';
  if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;

  var API = 'http://127.0.0.1:5174';

  var state = window.appEditorState = {
    isEditMode: false,
    selectedEntity: null,
    activeTextEdit: null,
    dirty: false,
    dirtyWrites: {},
    undoHistory: {},
    lastEditKey: null
  };

  // ── Badge ──────────────────────────────────────────────────────
  var badge = document.createElement('div');
  badge.id = 'tt-edit-badge';
  badge.textContent = 'EDIT MODE';
  document.body.appendChild(badge);

  function showBadgeMsg(msg, duration) {
    badge.textContent = msg;
    clearTimeout(badge._timer);
    badge._timer = setTimeout(function () {
      if (state.isEditMode) badge.textContent = 'EDIT MODE';
    }, duration || 2000);
  }

  // ── Toggle ─────────────────────────────────────────────────────
  function toggleEditMode() {
    state.isEditMode = !state.isEditMode;
    document.body.classList.toggle('edit-mode', state.isEditMode);
    if (state.isEditMode) {
      setTimeout(applyEditorEntityMarkers, 100);
    } else {
      cancelTextEdit();
      clearSelectedEntity();
      var menu = document.getElementById('tt-edit-img-menu');
      if (menu) menu.remove();
    }
  }

  // ── Keyboard ───────────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toUpperCase() === 'E') {
      e.preventDefault();
      toggleEditMode();
      return;
    }
    if (!state.isEditMode) return;
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 's') {
      e.preventDefault();
      saveEditorChanges();
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
      e.preventDefault();
      undoLastEdit();
    }
  });

  // ── Click handler (capture) ────────────────────────────────────
  document.addEventListener('click', function (e) {
    if (!state.isEditMode) return;

    var menu = document.getElementById('tt-edit-img-menu');
    if (menu && !menu.contains(e.target)) menu.remove();

    var node = e.target;
    var entityNode = null;
    while (node && node !== document.body) {
      if (node.classList && node.classList.contains('editable-entity')) {
        entityNode = node;
        break;
      }
      node = node.parentElement;
    }
    if (!entityNode) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    document.querySelectorAll('.editor-selected').forEach(function (el) {
      el.classList.remove('editor-selected');
    });
    entityNode.classList.add('editor-selected');

    var entity = {
      cellId:      entityNode.getAttribute('data-cell-id'),
      surface:     entityNode.getAttribute('data-surface'),
      entityId:    entityNode.getAttribute('data-entity-id'),
      mediaIndex:  parseInt(entityNode.getAttribute('data-media-index') || '0', 10),
      mediaSurface: entityNode.getAttribute('data-media-surface') || 'answer',
      colIndex:    parseInt(entityNode.getAttribute('data-col-index') || '0', 10)
    };
    state.selectedEntity = entity;

    if (entity.surface !== 'media') {
      beginInlineTextEdit(entityNode, entity);
    } else {
      showImageActionMenu(entity, entityNode, e);
    }
  }, true);

  // ── Entity markers ─────────────────────────────────────────────
  function markEntity(el, cellId, surface, mediaIndex, mediaSurface) {
    el.classList.add('editable-entity');
    el.setAttribute('data-cell-id', cellId);
    el.setAttribute('data-surface', surface);
    var entityId = cellId + '::' + surface +
      (surface === 'media' ? '::' + mediaSurface + '::' + mediaIndex : '');
    el.setAttribute('data-entity-id', entityId);
    if (surface === 'media') {
      el.setAttribute('data-media-index', mediaIndex);
      el.setAttribute('data-media-surface', mediaSurface);
    }
  }

  var ENTITY_ATTRS = ['data-cell-id','data-surface','data-entity-id','data-media-index','data-media-surface','data-col-index'];

  function clearEntityMarkers(root) {
    root.querySelectorAll('.editable-entity').forEach(function (el) {
      el.classList.remove('editable-entity', 'editor-selected');
      ENTITY_ATTRS.forEach(function (a) { el.removeAttribute(a); });
    });
  }

  function applyEditorEntityMarkers() {
    // ── Category headers (always on board) ─────────────────────────
    document.querySelectorAll('.grid-row-cats .cat-cell').forEach(function (el, idx) {
      ENTITY_ATTRS.forEach(function (a) { el.removeAttribute(a); });
      el.classList.remove('editable-entity', 'editor-selected');
      el.classList.add('editable-entity');
      el.setAttribute('data-surface', 'category');
      el.setAttribute('data-col-index', idx);
      el.setAttribute('data-entity-id', 'category::' + idx);
    });

    // ── Clue modal surfaces ─────────────────────────────────────────
    var cellId = window.ttCurrentClueId;
    var inner = document.querySelector('#question-modal .modal-inner');
    if (inner && cellId) {
      clearEntityMarkers(inner);

      var qCopy = inner.querySelector('.tt-question-copy');
      if (qCopy) markEntity(qCopy, cellId, 'question');

      var answerParts = inner.querySelector('.tt-answer-parts');
      if (answerParts) markEntity(answerParts, cellId, 'answer');

      inner.querySelectorAll('.tt-question-media-card img, .tt-question-media .tt-media-stepper-image')
        .forEach(function (img, idx) { markEntity(img, cellId, 'media', idx, 'question'); });

      inner.querySelectorAll('.tt-answer-media .tt-media-card img, .tt-answer-media .tt-media-stepper-image')
        .forEach(function (img, idx) { markEntity(img, cellId, 'media', idx, 'answer'); });
    }

    var hintBox = document.getElementById('tt-hint-box');
    if (hintBox && cellId) {
      ENTITY_ATTRS.forEach(function (a) { hintBox.removeAttribute(a); });
      hintBox.classList.remove('editable-entity', 'editor-selected');
      markEntity(hintBox, cellId, 'hint');
    }
  }

  window.applyEditorEntityMarkers = applyEditorEntityMarkers;

  // ── MutationObserver — re-apply markers when modal re-renders ──
  var _debounceTimer = null;
  var contentObserver = new MutationObserver(function () {
    if (!state.isEditMode) return;
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(applyEditorEntityMarkers, 120);
  });

  function startObserving() {
    var inner = document.querySelector('#question-modal .modal-inner');
    if (inner) contentObserver.observe(inner, { childList: true, subtree: false });

    var hintHub = document.getElementById('tt-hint-hub');
    if (hintHub) contentObserver.observe(hintHub, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(startObserving, 500); });
  } else {
    setTimeout(startObserving, 500);
  }

  // ── Data model access ──────────────────────────────────────────
  function getEditableText(entity) {
    if (entity.surface === 'category') {
      var catCells = document.querySelectorAll('.grid-row-cats .cat-cell');
      return catCells[entity.colIndex] ? catCells[entity.colIndex].textContent.trim() : '';
    }
    var entry = window.transferTriviaDeck && window.transferTriviaDeck[entity.cellId];
    if (!entry) return '';
    if (entity.surface === 'question') return String(entry.question || '');
    if (entity.surface === 'answer') return String(entry.answer || '');
    if (entity.surface === 'hint') {
      var meta = entry.meta || {};
      var src = Array.isArray(meta.source) ? meta.source : (meta.source ? [String(meta.source)] : []);
      return src.join(' / ');
    }
    return '';
  }

  function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function applyTextDraft(entity, value) {
    if (entity.surface === 'category') {
      // Update header cell
      var catCells = document.querySelectorAll('.grid-row-cats .cat-cell');
      if (catCells[entity.colIndex]) catCells[entity.colIndex].textContent = value;
      // Update data-category on every question cell in this column
      document.querySelectorAll('.grid-row-questions .grid-cell[data-col="' + entity.colIndex + '"] .cell-inner')
        .forEach(function (el) { el.setAttribute('data-category', value); });
      // Update open modal title if it belongs to this column
      var activeCell = document.querySelector('.grid-row-questions .active-question');
      if (activeCell && parseInt(activeCell.getAttribute('data-col'), 10) === entity.colIndex) {
        var titleEl = document.getElementById('question-title');
        if (titleEl) {
          var pts = (activeCell.querySelector('.cell-inner') || {}).innerText || '';
          titleEl.innerText = value.toUpperCase() + ' for ' + pts;
        }
      }
      return;
    }

    var entry = window.transferTriviaDeck && window.transferTriviaDeck[entity.cellId];
    if (!entry) return;

    if (entity.surface === 'question') {
      entry.question = value;
      var qCopy = document.querySelector('#question-modal .tt-question-copy');
      if (qCopy) {
        qCopy.textContent = value;
        if (typeof fitQuestionTextInModal === 'function') {
          try { fitQuestionTextInModal(); } catch (e) {}
        }
      }
    } else if (entity.surface === 'answer') {
      entry.answer = value;
      var partsEl = document.querySelector('#question-modal .tt-answer-parts');
      if (partsEl) {
        var parts = value.replace(/\r/g, '').split(/\n+/).map(function (p) { return p.trim(); }).filter(Boolean);
        if (!parts.length && value.trim()) parts = [value.trim()];
        partsEl.innerHTML = parts.map(function (p) {
          return '<div class="tt-answer-part">' + escHtml(p) + '</div>';
        }).join('');
      }
    } else if (entity.surface === 'hint') {
      var meta = entry.meta || (entry.meta = {});
      meta.source = value
        ? value.split(' / ').map(function (s) { return s.trim(); }).filter(Boolean)
        : [];
      var hintBox = document.getElementById('tt-hint-box');
      if (hintBox) hintBox.textContent = value;
    }
  }

  // ── Inline text editor ─────────────────────────────────────────
  function beginInlineTextEdit(node, entity) {
    cancelTextEdit();
    var originalValue = getEditableText(entity);
    state.activeTextEdit = { entity: entity, originalValue: originalValue, committed: false };

    var rect = node.getBoundingClientRect();
    var ta = document.createElement('textarea');
    ta.id = 'tt-edit-textarea';
    ta.value = originalValue;
    var cs = window.getComputedStyle(node);
    ta.style.cssText = [
      'position:fixed',
      'left:' + Math.max(4, rect.left) + 'px',
      'top:' + Math.max(4, rect.top) + 'px',
      'width:' + Math.max(rect.width, 280) + 'px',
      'min-height:' + Math.max(rect.height, 72) + 'px',
      'z-index:100000',
      'background:#111',
      'color:#ffe270',
      'border:2px solid #ffe270',
      'border-radius:4px',
      'padding:8px',
      'font-family:' + cs.fontFamily,
      'font-size:' + cs.fontSize,
      'line-height:' + cs.lineHeight,
      'resize:both',
      'box-sizing:border-box',
      'outline:none'
    ].join(';');

    document.body.appendChild(ta);
    ta.focus();
    ta.select();

    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitTextEdit(); }
      if (e.key === 'Escape') { e.preventDefault(); cancelTextEdit(); }
    });
    ta.addEventListener('blur', function () {
      setTimeout(commitTextEdit, 120);
    });
  }

  function commitTextEdit() {
    var ta = document.getElementById('tt-edit-textarea');
    if (!ta || !state.activeTextEdit || state.activeTextEdit.committed) return;
    state.activeTextEdit.committed = true;

    var entity   = state.activeTextEdit.entity;
    var oldValue = state.activeTextEdit.originalValue;
    var newValue = ta.value;
    ta.remove();
    state.activeTextEdit = null;

    if (newValue === oldValue) return;

    var key = entity.surface === 'category'
      ? 'category::' + entity.colIndex
      : entity.cellId + '::' + entity.surface;
    if (!state.undoHistory[key]) state.undoHistory[key] = [];
    state.undoHistory[key].push(oldValue);
    state.lastEditKey = key;

    applyTextDraft(entity, newValue);
    state.dirtyWrites[key] = true;
    state.dirty = true;

    setTimeout(applyEditorEntityMarkers, 50);
  }

  function cancelTextEdit() {
    var ta = document.getElementById('tt-edit-textarea');
    if (ta) ta.remove();
    if (state.activeTextEdit && !state.activeTextEdit.committed) {
      applyTextDraft(state.activeTextEdit.entity, state.activeTextEdit.originalValue);
    }
    state.activeTextEdit = null;
  }

  function clearSelectedEntity() {
    document.querySelectorAll('.editor-selected').forEach(function (el) {
      el.classList.remove('editor-selected');
    });
    state.selectedEntity = null;
  }

  // ── Image actions ──────────────────────────────────────────────
  function showImageActionMenu(entity, node, e) {
    var existing = document.getElementById('tt-edit-img-menu');
    if (existing) existing.remove();

    var menu = document.createElement('div');
    menu.id = 'tt-edit-img-menu';
    menu.style.cssText = [
      'position:fixed',
      'left:' + e.clientX + 'px',
      'top:' + e.clientY + 'px',
      'z-index:100000',
      'background:#111',
      'border:1.5px solid #ffe270',
      'border-radius:6px',
      'padding:8px',
      'display:flex',
      'flex-direction:column',
      'gap:6px',
      'box-shadow:0 4px 16px rgba(0,0,0,.6)'
    ].join(';');

    var replaceBtn = makeMenuBtn('Replace', '#ffe270');
    replaceBtn.addEventListener('click', function () {
      menu.remove();
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = function () {
        if (input.files && input.files[0]) importImage(entity, input.files[0]);
      };
      input.click();
    });

    var deleteBtn = makeMenuBtn('Delete', '#ff6b6b');
    deleteBtn.addEventListener('click', function () {
      menu.remove();
      deleteImageAtEntity(entity);
    });

    menu.appendChild(replaceBtn);
    menu.appendChild(deleteBtn);
    document.body.appendChild(menu);
  }

  function makeMenuBtn(label, color) {
    var btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = 'background:#1a1a1a;color:' + color + ';border:1px solid ' + color +
      ';border-radius:4px;padding:6px 22px;cursor:pointer;font-size:14px;font-family:monospace;';
    return btn;
  }

  function importImage(entity, file) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      fetch(API + '/api/import-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cellId: entity.cellId,
          surface: entity.mediaSurface,
          filename: file.name,
          data: ev.target.result
        })
      }).then(function (r) { return r.json(); }).then(function (res) {
        if (res.ok && res.path) applyMediaReplacement(entity, res.path);
        else showBadgeMsg('Import failed: ' + (res.error || '?'), 3000);
      }).catch(function () {
        showBadgeMsg('Import failed — helper running?', 3000);
      });
    };
    reader.readAsDataURL(file);
  }

  function applyMediaReplacement(entity, src) {
    var entry = window.transferTriviaDeck && window.transferTriviaDeck[entity.cellId];
    if (entry && entry.meta) {
      var key = entity.mediaSurface === 'question' ? 'questionMedia' : 'answerMedia';
      var arr = Array.isArray(entry.meta[key]) ? entry.meta[key] : (Array.isArray(entry.meta.media) ? entry.meta.media : []);
      if (arr[entity.mediaIndex]) arr[entity.mediaIndex].src = src;
    }
    document.querySelectorAll('[data-entity-id="' + entity.entityId + '"]').forEach(function (img) {
      img.src = src + '?t=' + Date.now();
    });
    var k = entity.cellId + '::media::' + entity.mediaSurface + '::' + entity.mediaIndex;
    state.dirtyWrites[k] = true;
    state.dirty = true;
  }

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

  // ── Save ───────────────────────────────────────────────────────
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

    // Categories: write-json to categories.json (the source loadCategoryOverrides reads)
    if (hasCategoryDirty) {
      var catCells = document.querySelectorAll('.grid-row-cats .cat-cell');
      var categories = Array.prototype.map.call(catCells, function (el) {
        return el.textContent.trim();
      });
      requests.push(postJson('/api/write-json', {
        path: 'content/categories.json',
        json: { categories: categories }
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

  // ── Undo ───────────────────────────────────────────────────────
  function undoLastEdit() {
    var key = state.lastEditKey;
    if (!key || !state.undoHistory[key] || !state.undoHistory[key].length) {
      key = Object.keys(state.undoHistory).filter(function (k) {
        return state.undoHistory[k].length > 0;
      })[0];
    }
    if (!key) return;

    var prevValue = state.undoHistory[key].pop();
    var parts  = key.split('::');
    var entity;
    if (parts[0] === 'category') {
      entity = { surface: 'category', colIndex: parseInt(parts[1], 10), entityId: key };
    } else {
      entity = { cellId: parts[0], surface: parts[1], entityId: parts[0] + '::' + parts[1] };
    }
    applyTextDraft(entity, prevValue);
    state.dirtyWrites[key] = true;
    state.dirty = true;
    setTimeout(applyEditorEntityMarkers, 50);
  }
})();
