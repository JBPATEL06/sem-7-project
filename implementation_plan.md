# 100% OpenPencil Vector Engine + Stitch AI & Figma Manual Editing Plan

## 1. Executive Summary & Architecture

The user goal:
1. **100% Real OpenPencil Engine**: Drive both frontend and backend using official `@open-pencil/scene-graph` and `@open-pencil/core` (with `canvaskit-wasm` / vector math) rather than a disconnected mock class.
2. **Stitch-Grade AI Generation**: Press `E` to trigger targeted in-place AI prompt edits on selected elements, plus full zero-template screen generation using Groq LLMs.
3. **Full Manual Figma Studio Editing**:
   - Click & drag to move elements.
   - 8-point perimeter handles to resize elements.
   - Toolbar tools: Select (`V`), Frame (`F`), Rectangle (`R`), Text (`T`).
   - Left Layers Tree (reorder, rename, hide/lock, parent-child hierarchy).
   - Right Property Inspector (X, Y, W, H, fills, strokes, radius, typography).
   - Standard shortcuts (`Delete`, `Ctrl+Z`, `Ctrl+D`, arrow nudges).

---

## 2. Technical Strategy: Connecting OpenPencil Across Stack

### A. Backend Layer (Already Installed)
- **Packages**: `@open-pencil/fig`, `@open-pencil/kiwi`, `@open-pencil/scene-graph`
- **Role**:
  - `POST /api/screens/generate-stitch`: Generates `SceneGraph` nodes matching OpenPencil schemas.
  - `GET /api/screens/:id/export?format=fig`: Uses `@open-pencil/fig` & `@open-pencil/kiwi` to write real binary `.fig` files to disk (`ui/<screen>.fig`).
  - Supports targeted AI mutation on specific node IDs.

### B. Frontend Engine Layer (`OpenPencilCanvas.tsx`)
- **Package**: `@open-pencil/scene-graph` (imported directly instead of the local class)
- **Canvas Engine**:
  - Integrate `@open-pencil/scene-graph` as the single source of truth for nodes, parents, children, and bounding boxes.
  - Implement the full interactive event loop:
    1. **Tool Switcher**: Select (`V`), Frame (`F`), Rectangle (`R`), Text (`T`), Hand (`H`).
    2. **Mouse Interactions**:
       - Drag to select (bounding box marquee) or single click.
       - Drag selected node to move with coordinate updates.
       - Drag any of the 8 perimeter handles to scale/resize with live bounds calculation.
       - Draw mode: click-and-drag to create new Frame/Rect/Text.
    3. **Keyboard & Shortcuts**:
       - `E`: Open Stitch Quick AI Command Bar for selected nodes.
       - `Delete` / `Backspace`: Remove selected node.
       - `Ctrl+Z` / `Ctrl+Y`: Undo / Redo using `@open-pencil/scene-graph/undo`.
       - `Ctrl+D`: Duplicate selected node.
       - Arrow keys: Nudge 1px (or 10px with `Shift`).

### C. Left Sidebar: Layers Tree Panel (`LayersPanel.tsx`)
- Tree hierarchy view derived directly from `@open-pencil/scene-graph`.
- Drag-and-drop layer reordering (controls z-index and nesting).
- Visibility toggle (eye), lock toggle (lock), inline double-click renaming.

### D. Right Sidebar: Property Inspector (`PropertyInspector.tsx`)
- Visual inputs for:
  - Alignment & Auto-Layout
  - Position: X, Y
  - Dimensions: Width, Height
  - Fills: Color picker + Opacity
  - Strokes: Color picker + Weight + Style
  - Corner Radius (individual & uniform)
  - Typography (Font size, weight, text content)

### E. Stitch Quick AI Dock ('E' Key Bar)
- Pressing `E` focuses a floating frosted AI prompt input.
- Displays selected node badges (e.g. `Metric Card [card_metric_0]`).
- Pre-made transformation chips (e.g. `Make glassmorphic`, `Change color to emerald`, `Add rounded pill corners`).
- Sends targeted mutation payload to `/api/screens/generate-stitch`.

---

## 3. Implementation Steps

1. **Step 1: Replace Custom SceneGraph with Official `@open-pencil/scene-graph`**
   - Import `SceneGraph`, `SceneNode`, `NodeType` directly from `@open-pencil/scene-graph`.
   - Update serializer/deserializer to maintain compatibility with backend `.fig` exporter.

2. **Step 2: Interactive Drag, Move, and 8-Point Handle Resizing Engine**
   - Add pointer state machine (`idle`, `dragging`, `resizing`, `drawing`, `panning`).
   - Implement handle hit-testing and edge-anchored resizing math.
   - Add 4px grid snapping and visual guide indicators.

3. **Step 3: Drawing & Creation Toolbar**
   - Add floating Figma UI 3 toolbar at top/bottom.
   - Enable interactive creation of Frames, Rectangles, and Text.

4. **Step 4: Left Layers Tree & Right Property Inspector**
   - Create `src/components/studio/LayersPanel.tsx`.
   - Create `src/components/studio/PropertyInspector.tsx`.
   - Wire both to active canvas node selection and mutations.

5. **Step 5: Stitch 'E' Quick Edit & AI Mutation HUD**
   - Add global key listener for `E`.
   - Mount floating prompt pill on selection.
   - Connect to `/api/screens/generate-stitch` targeted mode.

6. **Step 6: Screen Persistence & Multi-Screen Management**
   - Connect `useScreens` hook to `ScreensPage.tsx`.
   - Add left screen switcher drawer so created screens never disappear on reload.
