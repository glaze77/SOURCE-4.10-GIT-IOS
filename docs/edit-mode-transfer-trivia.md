# Edit Mode + Node Helper Plan (Transfer Trivia)

- Derived from `edit-mode-capture-plan.md`
- Mapped specifically to Transfer Trivia project structure
- Scope model: `cellId::surface::entityId`

## Editable Text Locations

Editable clue text is stored outside the engine HTML in the per-cell content folders.

- Questions: `content/{cellId}/question.txt`
- Answers: `content/{cellId}/answer.txt`
- Runtime deck entries: `window.transferTriviaDeck[cellId].question` and `window.transferTriviaDeck[cellId].answer`

The `.txt` files are the editable source of truth. Each cell also has fallback script mirrors:

- `content/{cellId}/question.js`
- `content/{cellId}/answer.js`

Those fallback files register text for `file://` loading and should be regenerated or updated when text is saved.

## Image / Media Structure

Media stays inside each clue folder:

- Question media: `content/{cellId}/question-images/`
- Answer media: `content/{cellId}/answer-images/`

Media is declared in `content/{cellId}/meta.json`, usually through `media`, `questionMedia`, or `answerMedia` entries. At runtime, the loader normalizes these entries by resolving file names into `./content/{cellId}/...` `src` paths and by mapping bare file names into the expected question or answer image folders.

The editor should preserve this content-folder-driven model. Image replacement should import files into the correct per-cell image folder and update that cell's metadata.

## Scope Model

Transfer Trivia does not have a scene/state system. Edit scope should be modeled directly around clue content.

- `cellId`: the clue folder and board cell ID, such as `cell-1-0`
- `surface`: the clue surface being edited. Allowed values are only `question` and `answer`.
- `entityId`: the editable entity on that surface, such as `text` or `media[index]`

Canonical editor key:

```text
cellId::surface::entityId
```

Examples:

- `cell-1-0::question::text`
- `cell-1-0::answer::text`
- `cell-6-4::question::media[0]`
- `cell-4-3::answer::media[2]`

Do not introduce scenes, states, hotspots, or legacy interaction scopes for this project.

## Persistence Targets

Text saves write to:

- `content/{cellId}/question.txt`
- `content/{cellId}/answer.txt`

Media metadata saves write to:

- `content/{cellId}/meta.json`

Imported replacement images write to:

- `content/{cellId}/question-images/`
- `content/{cellId}/answer-images/`

Optional local-file fallback mirrors should be regenerated or updated after saves:

- `content/{cellId}/question.js`
- `content/{cellId}/answer.js`
- `content/{cellId}/meta.js`

## Mapping Table

| Generic capture key | Transfer Trivia key | Transfer Trivia target |
| --- | --- | --- |
| `sceneId::stateId::entityId` | `cellId::surface::entityId` | Project-specific editor key |
| `sceneId` | `cellId` | Board cell ID and `content/{cellId}/` folder |
| `stateId` | `surface` | `question` or `answer` |
| `entityId` | `entityId` | `text` or `media[index]` |
| `cell-1-0::question::text` | same | `content/cell-1-0/question.txt` |
| `cell-1-0::answer::text` | same | `content/cell-1-0/answer.txt` |
| `cell-6-4::question::media[0]` | same | `content/cell-6-4/meta.json` plus `question-images/` |
| `cell-4-3::answer::media[2]` | same | `content/cell-4-3/meta.json` plus `answer-images/` |

## Minimal Function List

### edit-state

- `createEditorState()`
- `setEditMode(enabled)`
- `selectEditableEntity({ cellId, surface, entityId, mediaIndex })`
- `clearEditorSelection()`
- `markDirty(writeDescriptor)`

### text-edit

- `getEditableText({ cellId, surface })`
- `beginInlineTextEdit(targetEl, entity)`
- `applyTextDraft(entity, value)`
- `commitTextEdit(entity, value)`
- `rerenderActiveCluePreservingModalState()`

### image-replace

- `getEditableMedia(entity)`
- `chooseReplacementImage(entity)`
- `importImageToContentFolder(file, { cellId, surface })`
- `replaceMediaAtIndex(entity, importedFile)`
- `updateMetaMediaList(cellId, surface, mediaList)`

### save

- `buildTextWrite(cellId, surface)`
- `buildMetaWrite(cellId)`
- `writeContentText(path, text)`
- `writeContentJson(path, json)`
- `writeFallbackJsMirror(path, registrationCall)`
- `saveDirtyEditorChanges()`

## Implementation Phases

1. node-helper
   - Add a minimal local helper with guarded endpoints for reading, writing, and importing files under `content/` only.

2. editor state
   - Add isolated edit-mode state, selected entity tracking, and dirty-write tracking.

3. selectable entities
   - In edit mode only, mark modal question text, answer text, and rendered media images as selectable editor entities.

4. text editing
   - Support in-memory edits for question and answer text, updating `window.transferTriviaDeck[cellId]` and rerendering the active modal.

5. image replace
   - Import selected replacement images into the appropriate per-cell image folder and update runtime metadata in memory.

6. save
   - Save dirty `.txt` and `meta.json` changes only through a manual/explicit save action, then regenerate optional `.js` mirrors. Do not implement autosave.

7. validation
   - Verify edited text and replaced images persist after reload.
   - Reject invalid paths, invalid JSON writes, and unsupported image extensions.
   - Confirm edit mode does not affect gameplay, scoring, intro, or clue behavior.

## Project Constraints

- This document is for the Transfer Trivia project only.
- Do not introduce a scene/state system.
- Do not modify gameplay, scoring, intro, or clue behavior.
- Content must remain external and content-folder driven.
- Do not add hotspots or legacy systems.
