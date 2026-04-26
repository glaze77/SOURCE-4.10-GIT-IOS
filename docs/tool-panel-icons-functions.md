# Tool Panel Icons And Functions (Reference For Porting)

This file documents the current tool panel behavior so you can implement the same system in another project.

## Style Rule (Important)

If tools/icons/buttons already exist in the target project:

- Keep the **existing color palette, glass treatment, border radii, icon style, and button look** from that project.
- Apply the **functionality and layout behaviors** described below.
- Do not force this project's colors onto the target project.

In short: **preserve visual style, port behavior/layout.**

## Runtime Tool Stack (View Mode, Engine/ATS Scenes)

Fixed top-right vertical icon stack:

1. **Fullscreen button** (`scene-global-fullscreen-btn`)
2. **Zoom button** (`scene-global-zoom-btn`)
3. **Pen button** (`scene-global-pen-btn`)
4. **Eraser button** (`scene-global-eraser-btn`)
5. **Laser button** (`scene-global-laser-btn`)

The stack is re-parented into the fullscreen element when entering fullscreen, then restored when exiting so tools stay visible.

## Runtime Tool Behaviors

### Fullscreen

- Toggles browser fullscreen for the app surface.
- Must keep icon position stable when entering/exiting fullscreen.

### Zoom

- Available in runtime view for `station-*-engine` and `station-*-ats` scenes.
- Default enter zoom level: `1.5` (50% in).
- Mouse wheel while zoom active changes zoom level (bounded).
- Left-drag pans while zoomed.
- Hotspots are hidden while zoom is active.
- Right-click exits zoom/tool mode.
- Right-click can also enter zoom when no other runtime tool is active and scene is zoom-eligible.

### Pen

- Red draw tool.
- Click to toggle on/off.
- When active, zoom/other tools are deactivated.
- Draw layer sits above stage content.
- Right-click exits tool.
- Toolbar (`pen-toolbar`) supports:
  - Color
  - Tip size
  - Draw mode: freeform vs straight line

### Eraser

- Erases pen strokes.
- Mutually exclusive with pen/laser/zoom tool modes.
- Right-click exits.

### Laser Pointer

- Pointer/draw light effect with fading trail.
- Mutually exclusive with pen/eraser/zoom modes.
- Right-click exits.
- Toolbar (`laser-toolbar`) supports:
  - Color
  - Tip size

## Edit Mode Panels

Edit mode is toggled via **Shift+E** (with cross-platform modifier handling).

Panel layout:

- Left rail: debug controls + text inspector
- Right rail: image inspector + hotspot inspector

### Debug Controls Panel

- Scene neighbor jump buttons
- State group controls:
  - Prev/Next state
  - Direct labeled state buttons
- Overlay toggles
- JSON visibility toggle

### Image Inspector

- Selection metadata
- Editable `x/y/width/height`
- Add image input
- Export actions:
  - Copy Selected Image JSON
  - Copy Scene Images JSON

### Text Box Inspector

- Selection metadata
- Editable `x/y`
- Text content editing
- Align controls:
  - Left / Center / Right buttons
  - Shortcuts: `Ctrl/Cmd+L`, `Ctrl/Cmd+E`, `Ctrl/Cmd+R`
- Export actions:
  - Copy Selected Text JSON
  - Copy Active State Text JSON
  - Copy Scene Text JSON

### Hotspot Inspector

- Selection metadata
- Editable geometry + behavior fields
- Action/type/kind/state/target controls
- Snap + align snap controls
- Draw mode toggle
- Hotspot visibility toggle
- Export actions:
  - Copy Selected JSON
  - Copy Active State JSON
  - Copy Scene JSON

## Edit Mode Interaction Shortcuts

- `Shift+E`: toggle edit mode
- `N`: toggle "draw new hotspot" mode
- `H`: toggle hotspot visibility in edit mode
- `Cmd/Ctrl+D`: duplicate selected hotspot
- `Delete`/`Backspace`: delete selected hotspot
- `Cmd/Ctrl+Z`: undo
- `Cmd/Ctrl+Shift+Z`: redo

Additional edit interactions:

- Modifier-click passthrough on hotspots to navigate while editing (`Ctrl` on Win/Linux, `Cmd` on macOS).
- Inline text edit supported for selected text callouts.
- Drag selected text callout to reposition.
- Resize handles for selected text callout box.

## Context/Scene UI Elements (Runtime)

- Styled side navigation arrows
- Styled door action button (`Open Door` / `Close Door`)
- Styled bottom-right scene switch button (`View ATS` / `View Engine`)
- Styled bottom-left home button (`Home`)
- Home hover preview card (scene preview + label chips)

## Porting Checklist

1. Implement same tool stack ordering and visibility rules.
2. Keep existing project visuals if controls already exist.
3. Preserve right-click exit semantics for runtime tools.
4. Preserve mutual-exclusion among zoom/pen/eraser/laser.
5. Preserve edit panel split and export-copy actions.
6. Preserve keyboard shortcuts and cross-platform Ctrl/Cmd logic.
7. Ensure fullscreen re-parenting keeps tool buttons visible and positioned.

