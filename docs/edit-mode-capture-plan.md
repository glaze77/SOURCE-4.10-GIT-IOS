# Edit Mode + Node-Helper Capture Plan (Context Guide)

## Important Scope Note
This document is for **context and concept capture only**.
The patterns and ideas here **must be mapped to the actual content model, file layout, and runtime structure of the project under investigation** before implementation.

## Goal
Capture the minimal, reusable concepts needed to rebuild:
- Edit mode for replacing photos.
- Edit mode for editing text.
- Node-helper persistence for JSON and imported images.

Exclude legacy/extra systems (hotspots, scene-context bars, legacy shape handling, etc.) unless required by the target project.

## Capture Strategy
1. Capture **contracts first** (data shape + save endpoints).
2. Capture **interaction flows** (how edits are made in UI).
3. Capture **persistence adapters** (how in-memory edits become JSON).
4. Rebuild in a small project with a reduced surface area.

## Source Anchors (Current Project)
- Edit state + override maps: `src/app.js` (`editorState`).
- Text inline edit behavior: `mountInlineTextEditor(...)`.
- Image replace behavior: `replaceSelectedImageFromPicker(...)`.
- Save-to-file behavior: `overwriteImageJsonViaNodeHelper(...)`, `overwriteInteractionJsonViaNodeHelper(...)`.
- Node-helper API and guardrails: `node-helper/server.js`.

## Minimal Contracts To Preserve
1. **Scoped override key**
- Pattern: `sceneId::stateId::entityId`.
- Used for text and image overrides.

2. **Text override row**
- Required: `id`, `stateId`.
- Optional: `x`, `y`, `width`, `height`, `textLines`, `textAlign`, `textBackground`, `textFontFamily`, `textFontSize`.

3. **Image override row**
- Required: `id`, `stateId`.
- Optional: `x`, `y`, `width`, `height`, `src`, `isAdded`.

4. **Node-helper endpoints**
- `POST /api/read-json`
- `POST /api/write-json`
- `POST /api/import-image`

## Keep / Skip / Rewrite Checklist
1. Keep
- Edit mode toggle and selected entity model (text/image).
- Inline text editing + inspector-driven text controls.
- Image picker/import/replace flow.
- JSON overwrite flow through node-helper.
- Undo checkpoints around text/image edits.

2. Skip
- Hotspot systems.
- Scene context bar/editor.
- Station/hub navigation-specific logic.
- Transition/audio/overlay systems unrelated to edit mode.
- Any legacy shape reconciliation logic not needed by target content.

3. Rewrite
- Data adapters that currently assume your existing scene/callout schema.
- Rendering hooks tightly coupled to current scene runtime.
- UI inspector layout if the new project uses different component structure.

## Mapping Template (Use Per Target Project)
1. Target project data model
- Where are images stored?
- Where is editable text stored?
- What is the scope unit (scene/state/slide/page)?

2. Compatibility map
- Current concept -> target field/path.
- Example: `textLines[]` -> `content.blocks[i].text`.

3. Persistence map
- Which file(s) should be saved?
- Do saves occur per scene, per page, or globally?
- Which endpoint writes each file?

4. Runtime integration map
- Where to bind edit mode toggle.
- How selection is tracked in the target renderer.
- How rerender is triggered after edits.

## Implementation Sequence (Simpler Project)
1. Implement minimal node-helper server (read/write/import with path and extension guards).
2. Implement base renderer for target content.
3. Add edit mode toggle and selection states.
4. Add text editing (inline + inspector controls).
5. Add image replacement (picker -> import -> src swap -> optional resize policy).
6. Add save action (Ctrl/Cmd+S in edit mode).
7. Add undo checkpoints for text/image mutations only.
8. Validate end-to-end: edit -> save -> reload -> persisted output matches target schema.

## Validation Checklist
- Replaced image persists across reload.
- Edited text persists across reload.
- Save fails safely when node-helper is unavailable.
- Invalid JSON write is rejected.
- Invalid image extension is rejected.
- No edits leak outside intended scope.

## Decision Notes To Confirm Per Project
1. Single-state vs multi-state scope.
2. Whether text box rect editing is allowed or text-only edits.
3. Whether image replacement preserves width or recalculates by aspect ratio.
4. Whether immediate auto-save or explicit save-only workflow is preferred.

## Output of This Capture
When this plan is applied to a new project, produce:
1. A target-specific data mapping table.
2. A minimal function list (`edit-state`, `text-edit`, `image-replace`, `save`).
3. A test checklist tied to that project’s files and content model.
