# OpenPencil AI Settings & Generation Fix Plan

## Goal
Integrate OpenPencil's authentic "AI & Agents" multi-provider settings system (Groq, xAI Grok, OpenAI, Custom) and fix canvas wipeout, dragging snapback, and frame-in-frame nesting.

## Tasks
- [ ] **Task 1: Backend AI Config & Credentials API (`server/settingsRoutes.ts`)**
  Add `GET /api/settings/ai-config` and `POST /api/settings/ai-config` with AES-256 encrypted persistence for reusable models (Groq, xAI Grok, OpenAI, Anthropic, Custom Base URL) and role assignments (`designAgent`, `review`, `fastTasks`, `vision`).
  *Verify*: `curl -s http://localhost:5173/api/settings/ai-config` returns default configured models and assignments.

- [ ] **Task 2: OpenPencil "AI & Agents" Settings Modal (`src/components/studio/OpenPencilAiSettingsModal.tsx`)**
  Build exact OpenPencil dark settings modal matching design specs (`bg-[#1e1e1e]`, border `#2d2d2d`, tabs: `AI & agents`, `Media`, `Cloud storage`, `+ Add model` drawer, assignment dropdowns).
  *Verify*: Open modal, add a Groq/Grok model, assign to `Design agent`, click Done, verify state persists.

- [ ] **Task 3: Dynamic Multi-Provider AI Dispatcher (`server/screenRoutes.ts`)**
  Update `callLlmForScreenAst` to dynamically route requests based on `assignments.designAgent` to Groq (`api.groq.com/openai/v1`), xAI Grok (`api.x.ai/v1`), OpenAI (`api.openai.com/v1`), or Custom endpoints.
  *Verify*: Trigger prompt on canvas and verify chosen provider handles generation.

- [ ] **Task 4: Additive Generation & Canvas Preservation (`server/screenRoutes.ts` & `ScreensPage.tsx`)**
  Add regex detection for additive prompts (`add`, `insert`, `append`, `create X containers`), enforce `modify` mode, and append new elements to `baseComponents` in clean grid positions instead of wiping the canvas.
  *Verify*: On existing screen, prompt *"add 5 container in screen"*; confirm original components remain intact and 5 new containers appear.

- [ ] **Task 5: Recursive Dragging & Graph Stability Fix (`ScreensPage.tsx`)**
  Implement recursive updates (`updateComponentRecursive`) for nested children in `handleUpdateNode`, and decouple `useEffect` graph reconstruction from micro `updatedAt` mutations.
  *Verify*: Drag containers and child elements across canvas; confirm smooth movement with zero snapback.

- [ ] **Task 6: Flatten Unnecessary Frame-in-Frame Hierarchies (`sceneGraphUtils.ts` & system prompt)**
  Refine LLM prompt to emit direct sibling items for multi-container requests, and add single full-screen wrapper flattening in `createSceneGraphFromComponents`.
  *Verify*: Inspect SceneGraph tree; confirm 5 containers are placed directly on the root artboard without intermediate wrapper frames.

- [ ] **Task 7: Automated Test Suite & TypeScript Verification**
  Run TypeScript type check and Vitest suite to ensure 0 errors and 100% test coverage.
  *Verify*: `npx tsc --noEmit` exits 0; `npx vitest run tests/screensUi.test.ts` passes all tests.

## Done When
- [ ] OpenPencil "AI & Agents" settings modal allows configuring Groq, xAI Grok, OpenAI, and Custom models with role assignments.
- [ ] Prompting *"add 5 container in screen"* preserves all existing components, adds 5 clean containers, and creates no extra wrapper frames.
- [ ] All elements can be freely dragged and moved without snapping back.
- [ ] TypeScript check and Vitest tests pass with 0 errors.

## Notes
- Strict adherence to `@open-pencil/scene-graph` and `@open-pencil/fig` standards. Zero ad-hoc custom canvas abstractions.
