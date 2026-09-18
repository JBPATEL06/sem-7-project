# Figma Custom Canvas — Standalone Backup

- **Branch:** `backup/figma-custom-canvas`
- **Date:** 2026-09-18
- **Base Commit:** `f5e8d93` (`feat: complete Figma specs studio, Excalidraw diagram canvas, Git visualizer and Atlas persistence`)
- **Origin:** Renamed & preserved from `coreWrokingFigma`

---

## Purpose
This branch serves as a permanent, standalone backup preserving the **custom React canvas engine for Figma / screens studio** developed during Day 4 & Day 5 milestones.

### What is preserved here:
1. **Custom Canvas Engine (`packages/ai-manager-web/src/pages/ScreensPage.tsx`)**:
   - Custom coordinate drag-and-drop with alignment snapping.
   - 8-point bounding box resize handles (`nw`, `n`, `ne`, `e`, `se`, `s`, `sw`, `w`).
   - Figma UI 3 floating frosted bottom toolbar dock.
   - Coordinate normalization for parent/child container frames.
   - Multi-element selection and in-place property inspection.
2. **Penpot / Figma Layout Spec Bridge (`server/screenRoutes.ts`)**:
   - Structured Layout Spec AST schemas and prompt-to-layout generator.
3. **Reason for Preservation**:
   - While the active `main` and `feature/*` branches use the upstream `@open-pencil/core` WebGL engine (per project rule: 100% OpenPencil, zero custom canvas hacks), this custom canvas codebase is retained here for permanent reference, historical continuity, and standalone testing.
