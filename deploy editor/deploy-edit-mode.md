# Deploy Edit Mode — Same Codebase

Read `edit-mode-prompt.md` for the full spec. This project is identical in structure.
No exploration, no CSS changes. Three steps.

---

## 1. Copy into the project root — unchanged

- `editor.js`
- `server.js`

---

## 2. Wire the script — last line before `</body>` in `index.html`

```html
<script src="editor.js"></script>
```

---

## 3. Verify

- `node server.js` starts
- Open the game at `localhost`
- `Ctrl+Shift+E` activates edit mode
- Click any question, answer, hint, or category header to edit inline
- `Ctrl+S` saves to disk
