import http from 'http';

const PORT = 8082;

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Supabase Studio — Local PGlite</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #101012;
      --bg-surface: #161618;
      --bg-overlay: #1e1e20;
      --bg-hover: #26262a;
      --border-subtle: #29292e;
      --border-strong: #3b3b42;
      --emerald-brand: #3ecf8e;
      --emerald-dark: #006239;
      --emerald-bg: rgba(62, 207, 142, 0.12);
      --emerald-glow: rgba(62, 207, 142, 0.3);
      --ruby-brand: #f87171;
      --ruby-bg: rgba(248, 113, 113, 0.12);
      --amber-brand: #fbbf24;
      --sky-brand: #38bdf8;
      --text-main: #f4f4f5;
      --text-muted: #a1a1aa;
      --text-subtle: #71717a;
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg-base);
      color: var(--text-main);
      font-family: var(--font-sans);
      display: flex;
      height: 100vh;
      overflow: hidden;
      font-size: 13px;
      -webkit-font-smoothing: antialiased;
    }

    /* Left Sidebar */
    #sidebar {
      width: 270px;
      background: var(--bg-surface);
      border-right: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      user-select: none;
    }

    .brand-header {
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .brand-icon {
      width: 26px;
      height: 26px;
      background: linear-gradient(135deg, #3ecf8e 0%, #2bb874 100%);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #000;
      font-weight: 800;
      font-size: 14px;
      box-shadow: 0 0 12px var(--emerald-glow);
    }
    .brand-text { font-weight: 600; font-size: 14px; letter-spacing: -0.2px; }
    .engine-pill {
      font-family: var(--font-mono);
      font-size: 10px;
      padding: 2px 6px;
      background: var(--emerald-bg);
      color: var(--emerald-brand);
      border: 1px solid rgba(62, 207, 142, 0.25);
      border-radius: 4px;
      margin-left: auto;
    }

    .nav-group { padding: 12px 12px 6px; }
    .nav-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text-subtle);
      padding: 4px 8px 6px;
    }
    .nav-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 6px;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
      font-weight: 500;
      margin-bottom: 2px;
    }
    .nav-btn:hover { background: var(--bg-hover); color: var(--text-main); }
    .nav-btn.active {
      background: var(--emerald-bg);
      color: var(--emerald-brand);
      font-weight: 600;
      border: 1px solid rgba(62, 207, 142, 0.2);
    }
    .nav-icon { width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 13px; }

    /* Tables Sidebar List */
    .tables-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-top: 1px solid var(--border-subtle);
      padding: 12px;
    }
    .tables-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .search-box {
      background: var(--bg-base);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 6px 10px;
      color: var(--text-main);
      font-size: 12px;
      width: 100%;
      outline: none;
      margin-bottom: 8px;
      transition: border-color 0.15s;
    }
    .search-box:focus { border-color: var(--emerald-brand); }
    .table-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
    .table-item {
      padding: 7px 10px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 12px;
      transition: all 0.15s ease;
      font-family: var(--font-mono);
    }
    .table-item:hover { background: var(--bg-hover); color: var(--text-main); }
    .table-item.active {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
      font-weight: 600;
      border-left: 3px solid var(--emerald-brand);
    }
    .row-badge {
      font-size: 10px;
      background: rgba(255, 255, 255, 0.06);
      padding: 1px 6px;
      border-radius: 10px;
      color: var(--text-subtle);
    }

    .sidebar-footer {
      padding: 10px 14px;
      border-top: 1px solid var(--border-subtle);
      font-size: 11px;
      color: var(--text-subtle);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-pulse {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--emerald-brand);
      box-shadow: 0 0 8px var(--emerald-brand);
    }

    /* Main Content Area */
    #main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--bg-base);
    }

    .topbar {
      height: 48px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      background: var(--bg-surface);
      flex-shrink: 0;
    }
    .topbar-left { display: flex; align-items: center; gap: 10px; }
    .topbar-title { font-weight: 600; font-size: 14px; }
    .topbar-actions { display: flex; align-items: center; gap: 8px; }

    /* Common Buttons */
    .btn {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--border-subtle);
      background: var(--bg-overlay);
      color: var(--text-main);
    }
    .btn:hover { background: var(--bg-hover); border-color: var(--border-strong); }
    .btn-primary {
      background: var(--emerald-brand);
      color: #000;
      border-color: var(--emerald-brand);
      font-weight: 600;
    }
    .btn-primary:hover { background: #34b27b; border-color: #34b27b; }
    .btn-danger {
      background: var(--ruby-bg);
      color: var(--ruby-brand);
      border-color: rgba(248, 113, 113, 0.3);
    }
    .btn-danger:hover { background: rgba(248, 113, 113, 0.2); }

    /* View Panels */
    .view-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 16px;
      position: relative;
    }

    /* 1. Table Editor View */
    .grid-container {
      flex: 1;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .grid-toolbar {
      padding: 10px 16px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #141416;
    }
    .grid-table-wrapper { flex: 1; overflow: auto; position: relative; }
    table.data-grid {
      width: 100%;
      border-collapse: collapse;
      font-family: var(--font-mono);
      font-size: 12px;
    }
    table.data-grid th {
      background: #141416;
      padding: 8px 14px;
      text-align: left;
      font-weight: 600;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-subtle);
      border-right: 1px solid rgba(255, 255, 255, 0.04);
      position: sticky;
      top: 0;
      z-index: 2;
      user-select: none;
      white-space: nowrap;
    }
    .th-content { display: flex; align-items: center; gap: 6px; }
    .type-tag {
      font-size: 10px;
      font-weight: normal;
      color: var(--text-subtle);
      background: rgba(255, 255, 255, 0.05);
      padding: 1px 4px;
      border-radius: 3px;
    }
    .pk-tag {
      font-size: 9px;
      color: #fbbf24;
      background: rgba(251, 191, 36, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.25);
      padding: 1px 4px;
      border-radius: 3px;
    }
    table.data-grid td {
      padding: 7px 14px;
      border-bottom: 1px solid var(--border-subtle);
      border-right: 1px solid rgba(255, 255, 255, 0.04);
      color: #e4e4e7;
      white-space: nowrap;
      max-width: 280px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    table.data-grid tr:hover td { background: rgba(255, 255, 255, 0.025); }
    td.editable { cursor: cell; }
    td.editable:hover { outline: 1px dashed var(--emerald-brand); }
    td.editing input {
      width: 100%;
      background: #000;
      border: 1px solid var(--emerald-brand);
      color: #fff;
      font-family: var(--font-mono);
      font-size: 12px;
      padding: 4px 6px;
      border-radius: 4px;
      outline: none;
    }

    .grid-footer {
      padding: 8px 16px;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-muted);
      background: var(--bg-surface);
    }

    /* 2. SQL Editor */
    .sql-workspace {
      flex: 1;
      display: flex;
      gap: 12px;
      overflow: hidden;
    }
    .sql-history-pane {
      width: 220px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      padding: 10px;
      overflow: hidden;
      flex-shrink: 0;
    }
    .history-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
    .history-card {
      padding: 6px 8px;
      background: var(--bg-base);
      border: 1px solid var(--border-subtle);
      border-radius: 5px;
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .history-card:hover { border-color: var(--emerald-brand); color: #fff; }

    .sql-main-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }
    .editor-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 8px 8px 0 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      height: 380px;
      min-height: 180px;
      transition: height 0.1s ease;
    }
    .editor-card.maximized {
      height: 75vh !important;
    }
    .editor-header {
      padding: 8px 14px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #141416;
    }
    .code-textarea {
      width: 100%;
      flex: 1;
      background: #0c0c0e;
      border: none;
      color: #3ecf8e;
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 1.5;
      padding: 12px 14px;
      resize: none;
      outline: none;
    }

    /* SQL Splitter */
    .sql-splitter {
      height: 8px;
      background: var(--bg-base);
      border-top: 1px solid var(--border-subtle);
      border-bottom: 1px solid var(--border-subtle);
      cursor: row-resize;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      transition: background 0.15s;
    }
    .sql-splitter:hover, .sql-splitter.dragging {
      background: var(--emerald-bg);
      border-color: var(--emerald-brand);
    }
    .splitter-handle {
      width: 36px;
      height: 3px;
      background: var(--text-subtle);
      border-radius: 2px;
    }

    .sql-results-card {
      flex: 1;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 0 0 8px 8px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 140px;
    }

    /* 3. Schema ERD Visualizer */
    .erd-canvas {
      flex: 1;
      background: #09090b;
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      position: relative;
      overflow: auto;
      padding: 40px;
      background-image: radial-gradient(#26262a 1px, transparent 1px);
      background-size: 20px 20px;
    }
    #erdSvgOverlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 5;
    }
    .erd-fk-edge {
      stroke: var(--emerald-brand);
      stroke-width: 2;
      fill: none;
      opacity: 0.85;
      pointer-events: stroke;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .erd-fk-edge:hover, .erd-fk-edge.active {
      stroke: var(--sky-brand);
      stroke-width: 3.5;
      opacity: 1;
      filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.6));
    }
    .erd-grid-nodes {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 50px 60px;
      align-items: start;
      position: relative;
      z-index: 10;
      min-width: 900px;
    }
    .erd-table-card {
      background: #151517;
      border: 1px solid var(--border-strong);
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
      overflow: hidden;
      transition: transform 0.15s, border-color 0.15s;
    }
    .erd-table-card:hover {
      border-color: var(--emerald-brand);
      transform: translateY(-2px);
    }
    .erd-table-card.highlighted {
      border-color: var(--sky-brand);
      box-shadow: 0 0 18px rgba(56, 189, 248, 0.35);
    }
    .erd-header {
      background: #1c1c1f;
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .erd-title { font-family: var(--font-mono); font-weight: 700; color: #fff; font-size: 13px; }
    .erd-rows-list { padding: 4px 0; }
    .erd-col-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px;
      font-family: var(--font-mono);
      font-size: 11px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      transition: background 0.15s;
    }
    .erd-col-row:last-child { border-bottom: none; }
    .erd-col-row:hover { background: rgba(255, 255, 255, 0.04); }
    .erd-col-row.fk-col { color: var(--emerald-brand); }
    .erd-col-row.highlighted { background: var(--emerald-bg); }

    /* 4. Functions View */
    .functions-container {
      flex: 1;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 16px;
      gap: 16px;
    }
    .fn-card {
      background: var(--bg-overlay);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .fn-header { display: flex; align-items: center; justify-content: space-between; }
    .fn-name { font-family: var(--font-mono); font-weight: 600; color: var(--emerald-brand); font-size: 13px; }
    .fn-test-panel {
      background: #0e0e10;
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 10px 12px;
      font-family: var(--font-mono);
      font-size: 12px;
    }

    /* Modals */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(3px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
    }
    .modal-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: 10px;
      width: 520px;
      max-width: 92vw;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      max-height: 85vh;
    }
    .modal-header {
      padding: 14px 18px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 600;
      font-size: 14px;
      background: #141416;
    }
    .modal-body { padding: 18px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
    .modal-footer {
      padding: 12px 18px;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      background: #141416;
    }
    .form-group { display: flex; flex-direction: column; gap: 4px; position: relative; }
    .form-label {
      font-size: 11px;
      color: var(--text-muted);
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .form-input {
      background: var(--bg-base);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 7px 10px;
      color: #fff;
      font-family: var(--font-mono);
      font-size: 12px;
      outline: none;
      transition: border-color 0.15s;
    }
    .form-input:focus { border-color: var(--emerald-brand); }
    .form-input.form-input-error { border-color: var(--ruby-brand) !important; }
    .inline-field-error {
      color: var(--ruby-brand);
      font-size: 11px;
      font-weight: 500;
      margin-top: 2px;
    }
    .pill-badge {
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-weight: 600;
      text-transform: uppercase;
    }
    .pill-auto { background: var(--emerald-bg); color: var(--emerald-brand); }
    .pill-required { background: var(--ruby-bg); color: var(--ruby-brand); }
    .pill-default { background: rgba(56, 189, 248, 0.12); color: var(--sky-brand); }
    .pill-optional { background: rgba(255, 255, 255, 0.06); color: var(--text-subtle); }

    /* Builder Table */
    .builder-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      font-family: var(--font-mono);
    }
    .builder-table th {
      padding: 6px 8px;
      background: #111113;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-subtle);
      text-align: left;
      font-weight: 500;
    }
    .builder-table td {
      padding: 6px 8px;
      border-bottom: 1px solid var(--border-subtle);
      vertical-align: middle;
    }

    /* Toast Notification Container */
    #toastContainer {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    }
    .toast-item {
      pointer-events: auto;
      min-width: 280px;
      max-width: 420px;
      background: #1c1c20;
      border: 1px solid var(--border-strong);
      border-radius: 8px;
      padding: 12px 14px;
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: flex-start;
      gap: 10px;
      animation: toastSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .toast-item.toast-success { border-left: 4px solid var(--emerald-brand); }
    .toast-item.toast-error { border-left: 4px solid var(--ruby-brand); }
    .toast-item.toast-info { border-left: 4px solid var(--sky-brand); }
    @keyframes toastSlideIn {
      from { transform: translateX(40px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  </style>
</head>
<body>

  <!-- Left Sidebar -->
  <div id="sidebar">
    <div class="brand-header">
      <div class="brand-icon">⚡</div>
      <span class="brand-text">Supabase Studio</span>
      <span class="engine-pill">PGlite</span>
    </div>

    <!-- Navigation Tabs -->
    <div class="nav-group">
      <div class="nav-label">Navigation</div>
      <div class="nav-btn active" id="btnNavTables" onclick="switchNav('tables')">
        <span class="nav-icon">📊</span>
        <span>Table Editor</span>
      </div>
      <div class="nav-btn" id="btnNavSql" onclick="switchNav('sql')">
        <span class="nav-icon">⚡</span>
        <span>SQL Editor</span>
      </div>
      <div class="nav-btn" id="btnNavSchema" onclick="switchNav('schema')">
        <span class="nav-icon">🗂️</span>
        <span>Database Schema</span>
      </div>
      <div class="nav-btn" id="btnNavFunctions" onclick="switchNav('functions')">
        <span class="nav-icon">⚙️</span>
        <span>Functions (plpgsql)</span>
      </div>
    </div>

    <!-- Tables List -->
    <div class="tables-section">
      <div class="tables-header-row">
        <div class="nav-label" style="padding: 0;">Tables</div>
        <button class="btn btn-primary" style="padding: 3px 8px; font-size: 11px;" onclick="openCreateTableModal()">+ New Table</button>
      </div>
      <input type="text" class="search-box" placeholder="Search tables..." oninput="filterTables(this.value)" />
      <div class="table-list" id="sidebarTableList">
        <div style="padding: 8px; color: var(--text-subtle); font-size: 11px;">Loading tables...</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="sidebar-footer">
      <span class="status-pulse"></span>
      <span>postgres-meta :1337 Active</span>
    </div>
  </div>

  <!-- Main Content Area -->
  <div id="main-content">
    <div class="topbar">
      <div class="topbar-left">
        <span class="topbar-title" id="viewHeaderTitle">Table Editor</span>
        <span style="color: var(--text-subtle);">•</span>
        <span style="color: var(--text-muted); font-family: var(--font-mono); font-size: 12px;" id="subHeaderInfo">acme-api</span>
      </div>
      <div class="topbar-actions">
        <button class="btn" onclick="refreshCurrentView()">↻ Refresh</button>
      </div>
    </div>

    <!-- 1. Table Editor View -->
    <div class="view-panel" id="viewTables">
      <div class="grid-container">
        <div class="grid-toolbar">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-weight: 600; font-size: 14px; font-family: var(--font-mono);" id="currentTableLabel">users</span>
            <span class="row-badge" id="currentTableRowCount">0 rows</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-primary" onclick="openInsertRowModal()">+ Insert Row</button>
          </div>
        </div>

        <div class="grid-table-wrapper">
          <table class="data-grid" id="mainDataGrid">
            <thead id="gridThead">
              <tr><th>Loading table columns...</th></tr>
            </thead>
            <tbody id="gridTbody">
              <tr><td>Fetching records from PGlite...</td></tr>
            </tbody>
          </table>
        </div>

        <div class="grid-footer">
          <span id="gridPaginationInfo">Showing 1-15 of 0</span>
          <div style="display: flex; gap: 6px;">
            <button class="btn" style="padding: 3px 8px; font-size: 11px;" onclick="prevPage()">Prev</button>
            <button class="btn" style="padding: 3px 8px; font-size: 11px;" onclick="nextPage()">Next</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. SQL Editor View -->
    <div class="view-panel" id="viewSql" style="display: none;">
      <div class="sql-workspace">
        <div class="sql-history-pane">
          <div class="nav-label" style="padding: 0 0 6px;">Query History</div>
          <div class="history-list" id="sqlHistoryList">
            <div style="color: var(--text-subtle); font-size: 11px;">No queries run yet.</div>
          </div>
        </div>

        <div class="sql-main-pane" id="sqlMainPane">
          <div class="editor-card" id="sqlEditorCard">
            <div class="editor-header">
              <span style="font-size: 12px; font-family: var(--font-mono); color: var(--text-muted);">SQL Query Editor</span>
              <div style="display: flex; gap: 6px;">
                <button class="btn" style="padding: 3px 8px; font-size: 11px;" onclick="setSampleQuery('users')">Sample Users</button>
                <button class="btn" style="padding: 3px 8px; font-size: 11px;" onclick="setSampleQuery('join')">Sample Join</button>
                <button class="btn" style="padding: 3px 8px; font-size: 11px;" id="btnToggleSqlMaximize" onclick="toggleSqlMaximize()">⛶ Expand</button>
                <button class="btn btn-primary" style="padding: 3px 12px;" onclick="executeSql()">▶ Run (Ctrl+Enter)</button>
              </div>
            </div>
            <textarea class="code-textarea" id="sqlEditorTextarea" spellcheck="false">SELECT * FROM users;</textarea>
          </div>

          <!-- Drag Splitter -->
          <div class="sql-splitter" id="sqlSplitter" title="Drag up or down to resize query box">
            <div class="splitter-handle"></div>
          </div>

          <div class="sql-results-card" id="sqlResultsCard">
            <div class="editor-header">
              <span style="font-size: 12px; font-family: var(--font-mono);" id="sqlResultStatus">Results</span>
              <span style="font-size: 11px; font-family: var(--font-mono); color: var(--text-subtle);" id="sqlResultTiming">0ms</span>
            </div>
            <div class="grid-table-wrapper" id="sqlResultWrapper">
              <div style="padding: 24px; color: var(--text-subtle); text-align: center;">Run a query to inspect output rows.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Database Schema ERD View -->
    <div class="view-panel" id="viewSchema" style="display: none;">
      <div class="erd-canvas" id="erdCanvas">
        <svg id="erdSvgOverlay">
          <defs>
            <marker id="erdArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#3ecf8e" />
            </marker>
          </defs>
        </svg>
        <div class="erd-grid-nodes" id="erdNodesContainer">
          <div style="color: var(--text-subtle);">Generating ERD layout...</div>
        </div>
      </div>
    </div>

    <!-- 4. Functions View -->
    <div class="view-panel" id="viewFunctions" style="display: none;">
      <div class="functions-container">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <h3 style="font-size: 15px; font-weight: 600;">PostgreSQL Stored Functions (plpgsql)</h3>
            <p style="font-size: 12px; color: var(--text-muted);">Manage and test custom PL/pgSQL database functions directly in PGlite.</p>
          </div>
          <button class="btn btn-primary" onclick="openCreateFunctionModal()">+ Create Function</button>
        </div>

        <div id="functionsList" style="display: flex; flex-direction: column; gap: 12px; overflow-y: auto;">
          <div style="color: var(--text-subtle);">Loading functions from pg_proc...</div>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL: Insert Row -->
  <div class="modal-overlay" id="insertRowModal" style="display: none;">
    <div class="modal-card">
      <div class="modal-header">
        <span>Insert Row into <code id="insertModalTable" style="color: var(--emerald-brand);"></code></span>
        <span style="cursor: pointer;" onclick="closeInsertRowModal()">✕</span>
      </div>
      <form onsubmit="handleInsertSubmit(event)" novalidate>
        <div class="modal-body" id="insertFormFields">
          <!-- Dynamically generated fields -->
        </div>
        <div class="modal-footer">
          <button type="button" class="btn" onclick="closeInsertRowModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Row</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: Create Table (Visual Table Builder) -->
  <div class="modal-overlay" id="createTableModal" style="display: none;">
    <div class="modal-card" style="width: 820px; max-width: 95vw;">
      <div class="modal-header">
        <span>Create New Table</span>
        <span style="cursor: pointer;" onclick="closeCreateTableModal()">✕</span>
      </div>
      <form onsubmit="handleCreateTableSubmit(event)">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Table Name</label>
            <input type="text" class="form-input" id="newTableName" placeholder="e.g. order_notes" required spellcheck="false" />
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px;">
            <label class="form-label" style="font-weight: 600;">Columns</label>
            <button type="button" class="btn" style="padding: 3px 8px; font-size: 11px;" onclick="addBuilderColumnRow()">+ Add Column</button>
          </div>

          <div style="max-height: 320px; overflow-y: auto; border: 1px solid var(--border-subtle); border-radius: 6px;">
            <table class="builder-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th style="text-align: center;">PK</th>
                  <th style="text-align: center;">Not Null</th>
                  <th style="text-align: center;">Unique</th>
                  <th>Default</th>
                  <th>Foreign Key (Target)</th>
                  <th style="text-align: center;">Del</th>
                </tr>
              </thead>
              <tbody id="builderColumnsBody">
                <!-- Dynamic Column Rows -->
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn" onclick="closeCreateTableModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Table</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: Create Function -->
  <div class="modal-overlay" id="createFunctionModal" style="display: none;">
    <div class="modal-card" style="width: 580px;">
      <div class="modal-header">
        <span>Create PL/pgSQL Function</span>
        <span style="cursor: pointer;" onclick="closeCreateFunctionModal()">✕</span>
      </div>
      <form onsubmit="handleCreateFunctionSubmit(event)">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">SQL Definition (CREATE OR REPLACE FUNCTION)</label>
            <textarea class="code-textarea" id="functionSqlBody" style="height: 220px;" spellcheck="false">CREATE OR REPLACE FUNCTION get_user_count()
RETURNS integer AS $$
DECLARE
  total integer;
BEGIN
  SELECT count(*) INTO total FROM users;
  RETURN total;
END;
$$ LANGUAGE plpgsql;</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn" onclick="closeCreateFunctionModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Deploy Function</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Toast Notification Container -->
  <div id="toastContainer"></div>

  <!-- Client JavaScript -->
  <script>
    const META_API = 'http://localhost:1337';
    let currentNav = 'tables';
    let allTables = [];
    let activeTable = 'users';
    let currentColumns = [];
    let currentPageNum = 0;
    const PAGE_SIZE = 15;
    let queryHistory = [];
    let erdCachedFks = [];

    // Toast Notification Utility (Replaces native browser alert())
    function showToast(title, message = '', type = 'success', duration = 3500) {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = \`toast-item toast-\${type}\`;
      
      const icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ');
      const iconColor = type === 'success' ? 'var(--emerald-brand)' : (type === 'error' ? 'var(--ruby-brand)' : 'var(--sky-brand)');
      
      toast.innerHTML = \`
        <div style="font-size: 14px; font-weight: bold; color: \${iconColor}; margin-top: 1px;">\${icon}</div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; font-size: 12px; color: #fff;">\${title}</div>
          \${message ? \`<div style="font-size: 11px; color: var(--text-muted); margin-top: 2px; word-break: break-word;">\${message}</div>\` : ''}
        </div>
        <div style="cursor: pointer; color: var(--text-subtle); font-size: 12px;" onclick="this.parentElement.remove()">✕</div>
      \`;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.2s ease';
        setTimeout(() => toast.remove(), 200);
      }, duration);
    }

    // Navigation Switcher
    function switchNav(nav) {
      currentNav = nav;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('viewTables').style.display = nav === 'tables' ? 'flex' : 'none';
      document.getElementById('viewSql').style.display = nav === 'sql' ? 'flex' : 'none';
      document.getElementById('viewSchema').style.display = nav === 'schema' ? 'flex' : 'none';
      document.getElementById('viewFunctions').style.display = nav === 'functions' ? 'flex' : 'none';

      if (nav === 'tables') {
        document.getElementById('btnNavTables').classList.add('active');
        document.getElementById('viewHeaderTitle').innerText = 'Table Editor';
        loadTableData(activeTable);
      } else if (nav === 'sql') {
        document.getElementById('btnNavSql').classList.add('active');
        document.getElementById('viewHeaderTitle').innerText = 'SQL Editor';
      } else if (nav === 'schema') {
        document.getElementById('btnNavSchema').classList.add('active');
        document.getElementById('viewHeaderTitle').innerText = 'Database Schema Visualizer (ERD)';
        loadErdSchema();
      } else if (nav === 'functions') {
        document.getElementById('btnNavFunctions').classList.add('active');
        document.getElementById('viewHeaderTitle').innerText = 'Stored Functions (PL/pgSQL)';
        loadFunctions();
      }
    }

    function refreshCurrentView() {
      if (currentNav === 'tables') loadTableData(activeTable);
      if (currentNav === 'schema') loadErdSchema();
      if (currentNav === 'functions') loadFunctions();
      loadTablesList();
    }

    // 1. Fetch Tables List
    async function loadTablesList() {
      try {
        const res = await fetch(META_API + '/tables');
        const data = await res.json();
        allTables = Array.isArray(data) ? data : [];
        renderSidebarTables(allTables);
        if (allTables.length > 0 && !allTables.some(t => t.name === activeTable)) {
          activeTable = allTables[0].name;
        }
      } catch (err) {
        showToast('Tables Load Error', err.message, 'error');
      }
    }

    function renderSidebarTables(tables) {
      const listEl = document.getElementById('sidebarTableList');
      if (!tables || tables.length === 0) {
        listEl.innerHTML = '<div style="padding: 8px; color: var(--text-subtle); font-size: 11px;">No tables found</div>';
        return;
      }
      listEl.innerHTML = tables.map(t => \`
        <div class="table-item \${t.name === activeTable ? 'active' : ''}" onclick="selectTable('\${t.name}')">
          <span>📄 \${t.name}</span>
          <span class="row-badge">\${t.rowCount || 0}</span>
        </div>
      \`).join('');
    }

    function filterTables(q) {
      const filtered = allTables.filter(t => t.name.toLowerCase().includes(q.toLowerCase()));
      renderSidebarTables(filtered);
    }

    function selectTable(tableName) {
      activeTable = tableName;
      currentPageNum = 0;
      renderSidebarTables(allTables);
      switchNav('tables');
    }

    // 2. Load Table Grid Data
    async function loadTableData(tableName) {
      activeTable = tableName || activeTable || 'users';
      document.getElementById('currentTableLabel').innerText = activeTable;

      try {
        const colsRes = await fetch(META_API + '/columns?table=' + activeTable);
        const colsData = await colsRes.json();
        currentColumns = Array.isArray(colsData) ? colsData : [];

        // Render Table Headers
        const thead = document.getElementById('gridThead');
        if (currentColumns.length === 0) {
          thead.innerHTML = '<tr><th style="padding: 12px; color: var(--text-subtle);">No columns found</th></tr>';
        } else {
          thead.innerHTML = '<tr>' + currentColumns.map(c => \`
            <th>
              <div class="th-content">
                <span>\${c.column_name}</span>
                <span class="type-tag">\${c.data_type}</span>
                \${c.is_primary ? '<span class="pk-tag">PK</span>' : ''}
              </div>
            </th>
          \`).join('') + '</tr>';
        }

        // Fetch Records
        const offset = currentPageNum * PAGE_SIZE;
        const dataRes = await fetch(META_API + '/table-data?table=' + activeTable + '&limit=' + PAGE_SIZE + '&offset=' + offset);
        const data = await dataRes.json();

        const tbody = document.getElementById('gridTbody');
        const rows = (data && Array.isArray(data.rows)) ? data.rows : [];
        document.getElementById('currentTableRowCount').innerText = (data.total || rows.length) + ' rows';
        document.getElementById('gridPaginationInfo').innerText = \`Showing \${offset + 1}-\${Math.min(offset + PAGE_SIZE, data.total)} of \${data.total}\`;

        if (rows.length === 0) {
          tbody.innerHTML = '<tr><td colspan="' + currentColumns.length + '" style="text-align: center; color: var(--text-subtle); padding: 24px;">No rows in this table. Click "+ Insert Row" to add one.</td></tr>';
          return;
        }

        const pkCol = currentColumns.find(c => c.is_primary)?.column_name || currentColumns[0]?.column_name;

        tbody.innerHTML = rows.map(r => {
          const pkVal = r[pkCol];
          return '<tr>' + currentColumns.map(c => {
            const rawVal = r[c.column_name];
            const displayVal = rawVal === null ? '<span style="color: var(--text-subtle);">null</span>' : (typeof rawVal === 'object' ? JSON.stringify(rawVal) : String(rawVal));
            return \`<td class="editable" ondblclick="startInlineEdit(this, '\${activeTable}', '\${pkCol}', '\${pkVal}', '\${c.column_name}')">\${displayVal}</td>\`;
          }).join('') + '</tr>';
        }).join('');

      } catch (err) {
        document.getElementById('gridTbody').innerHTML = '<tr><td colspan="5" style="color: #f87171;">Error loading data: ' + err.message + '</td></tr>';
      }
    }

    // Inline Editing
    function startInlineEdit(td, table, pkCol, pkVal, colName) {
      if (td.classList.contains('editing')) return;
      const originalText = td.innerText === 'null' ? '' : td.innerText;
      td.classList.add('editing');
      td.innerHTML = \`<input type="text" value="\${originalText.replace(/"/g, '&quot;')}" onkeydown="handleInlineKey(event, this, '\${table}', '\${pkCol}', '\${pkVal}', '\${colName}')" onblur="cancelInlineEdit(this, '\${originalText}')" />\`;
      td.querySelector('input').focus();
    }

    function cancelInlineEdit(input, originalText) {
      const td = input.parentElement;
      td.classList.remove('editing');
      td.innerText = originalText;
    }

    async function handleInlineKey(e, input, table, pkCol, pkVal, colName) {
      if (e.key === 'Escape') {
        cancelInlineEdit(input, input.value);
      } else if (e.key === 'Enter') {
        const newVal = input.value;
        const td = input.parentElement;
        td.classList.remove('editing');
        td.innerText = newVal;

        try {
          const res = await fetch(META_API + '/update-cell', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table,
              pkColumn: pkCol,
              pkValue: pkVal,
              column: colName,
              value: newVal
            })
          });
          const json = await res.json();
          if (json.error) {
            showToast('Cell Update Error', json.error, 'error');
            loadTableData(activeTable);
          } else {
            showToast('Cell Updated', \`\${colName} updated successfully\`, 'success');
            loadTableData(activeTable);
          }
        } catch (err) {
          showToast('Update Failed', err.message, 'error');
          loadTableData(activeTable);
        }
      }
    }

    // Insert Row Modal (With Real Constraint Inspection)
    function openInsertRowModal() {
      document.getElementById('insertModalTable').innerText = activeTable;
      const fieldsContainer = document.getElementById('insertFormFields');
      
      fieldsContainer.innerHTML = currentColumns.map(c => {
        const hasSeqDefault = c.column_default && c.column_default.includes('nextval(');
        const hasStaticDefault = !!c.column_default && !hasSeqDefault;
        const isStrictRequired = !hasSeqDefault && !hasStaticDefault && (c.is_primary || c.is_nullable === 'NO' || c.is_nullable === false);

        let badge = '<span class="pill-badge pill-optional">Optional</span>';
        let placeholder = \`Enter \${c.column_name}\`;
        let requiredAttr = '';

        if (hasSeqDefault) {
          badge = '<span class="pill-badge pill-auto">Auto</span>';
          placeholder = 'Auto-generated sequence';
        } else if (hasStaticDefault) {
          badge = \`<span class="pill-badge pill-default">Default</span>\`;
          placeholder = \`Default: \${c.column_default}\`;
        } else if (isStrictRequired) {
          badge = '<span class="pill-badge pill-required">Required</span> <span style="color: var(--ruby-brand);">*</span>';
          placeholder = \`Required — enter a unique \${c.data_type}\`;
          requiredAttr = 'data-required="true"';
        }

        return \`
          <div class="form-group" id="group_\${c.column_name}">
            <label class="form-label">
              <span>\${c.column_name}</span>
              <span class="type-tag">\${c.data_type}</span>
              \${badge}
            </label>
            <input type="text" class="form-input" name="\${c.column_name}" id="input_\${c.column_name}" placeholder="\${placeholder}" \${requiredAttr} oninput="clearFieldError(this)" />
          </div>
        \`;
      }).join('');
      document.getElementById('insertRowModal').style.display = 'flex';
    }

    function clearFieldError(input) {
      input.classList.remove('form-input-error');
      const errEl = input.parentElement.querySelector('.inline-field-error');
      if (errEl) errEl.remove();
    }

    function closeInsertRowModal() {
      document.getElementById('insertRowModal').style.display = 'none';
    }

    async function handleInsertSubmit(e) {
      e.preventDefault();
      const form = e.target;
      const requiredInputs = form.querySelectorAll('[data-required="true"]');
      let hasError = false;

      // Client-side strict validation
      requiredInputs.forEach(input => {
        clearFieldError(input);
        if (!input.value || input.value.trim() === '') {
          hasError = true;
          input.classList.add('form-input-error');
          const err = document.createElement('div');
          err.className = 'inline-field-error';
          err.innerText = 'This field is required.';
          input.parentElement.appendChild(err);
        }
      });

      if (hasError) {
        showToast('Validation Error', 'Please complete all required fields.', 'error');
        return;
      }

      const rowData = {};
      new FormData(form).forEach((value, key) => {
        if (value.trim() !== '') rowData[key] = value.trim();
      });

      try {
        const res = await fetch(META_API + '/insert-row', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: activeTable, row: rowData })
        });
        const data = await res.json();
        if (data.error) {
          showToast('Insert Failed', data.error, 'error');
        } else {
          showToast('Row Inserted', \`Record successfully added to \${activeTable}\`, 'success');
          closeInsertRowModal();
          loadTableData(activeTable);
          loadTablesList();
        }
      } catch (err) {
        showToast('Insert Network Error', err.message, 'error');
      }
    }

    function prevPage() {
      if (currentPageNum > 0) {
        currentPageNum--;
        loadTableData(activeTable);
      }
    }

    function nextPage() {
      currentPageNum++;
      loadTableData(activeTable);
    }

    // 2b. Visual Table Builder Modal
    function openCreateTableModal() {
      document.getElementById('newTableName').value = '';
      const tbody = document.getElementById('builderColumnsBody');
      tbody.innerHTML = '';
      // Seed two initial default rows
      addBuilderColumnRow('id', 'integer', true, true, false, '');
      addBuilderColumnRow('created_at', 'timestamp with time zone', false, true, false, 'CURRENT_TIMESTAMP');
      document.getElementById('createTableModal').style.display = 'flex';
    }

    function closeCreateTableModal() {
      document.getElementById('createTableModal').style.display = 'none';
    }

    function addBuilderColumnRow(name = '', type = 'varchar(255)', isPk = false, isNotNull = false, isUnique = false, defVal = '') {
      const tbody = document.getElementById('builderColumnsBody');
      const tr = document.createElement('tr');
      tr.className = 'builder-row';

      const typeOptions = [
        'integer', 'bigint', 'text', 'varchar(255)', 'boolean',
        'timestamp with time zone', 'numeric(10,2)', 'uuid', 'jsonb', 'date'
      ].map(t => \`<option value="\${t}" \${t === type ? 'selected' : ''}>\${t}</option>\`).join('');

      const fkOptions = '<option value="">None</option>' + allTables.map(t => \`
        <option value="\${t.name}">→ \${t.name}</option>
      \`).join('');

      tr.innerHTML = \`
        <td><input type="text" class="form-input col-name" value="\${name}" placeholder="col_name" style="width: 130px;" required /></td>
        <td><select class="form-input col-type" style="width: 140px;">\${typeOptions}</select></td>
        <td style="text-align: center;"><input type="checkbox" class="col-pk" \${isPk ? 'checked' : ''} onchange="if(this.checked){ this.closest('tr').querySelector('.col-nn').checked = true; }" /></td>
        <td style="text-align: center;"><input type="checkbox" class="col-nn" \${isNotNull ? 'checked' : ''} /></td>
        <td style="text-align: center;"><input type="checkbox" class="col-un" \${isUnique ? 'checked' : ''} /></td>
        <td><input type="text" class="form-input col-def" value="\${defVal}" placeholder="NULL" style="width: 100px;" /></td>
        <td>
          <div style="display: flex; gap: 4px; align-items: center;">
            <select class="form-input col-fk-table" style="width: 110px;" onchange="updateFkColumnOptions(this)">\${fkOptions}</select>
            <input type="text" class="form-input col-fk-col" placeholder="Target col (id)" style="width: 100px; display: none;" />
          </div>
        </td>
        <td style="text-align: center;"><button type="button" class="btn btn-danger" style="padding: 2px 6px;" onclick="this.closest('tr').remove()">✕</button></td>
      \`;
      tbody.appendChild(tr);
    }

    function updateFkColumnOptions(select) {
      const targetColInput = select.parentElement.querySelector('.col-fk-col');
      if (select.value) {
        targetColInput.style.display = 'inline-block';
        // Auto-guess common primary key for that table
        targetColInput.value = select.value === 'customers' ? 'customer_id' : (select.value === 'orders' ? 'order_id' : (select.value === 'products' ? 'product_id' : 'id'));
      } else {
        targetColInput.style.display = 'none';
        targetColInput.value = '';
      }
    }

    async function handleCreateTableSubmit(e) {
      e.preventDefault();
      const tableName = document.getElementById('newTableName').value.trim();
      if (!tableName) {
        showToast('Table Builder', 'Table name is required', 'error');
        return;
      }

      const rows = document.querySelectorAll('#builderColumnsBody .builder-row');
      if (rows.length === 0) {
        showToast('Table Builder', 'At least one column is required', 'error');
        return;
      }

      const columns = [];
      rows.forEach(tr => {
        const name = tr.querySelector('.col-name').value.trim();
        const type = tr.querySelector('.col-type').value;
        const isPrimary = tr.querySelector('.col-pk').checked;
        const isNotNull = tr.querySelector('.col-nn').checked;
        const isUnique = tr.querySelector('.col-un').checked;
        const defaultValue = tr.querySelector('.col-def').value.trim();
        const fkTable = tr.querySelector('.col-fk-table').value;
        const fkCol = tr.querySelector('.col-fk-col').value.trim();

        if (name) {
          const colData = {
            name,
            type,
            isPrimary,
            isNullable: !isNotNull,
            isUnique,
            defaultValue
          };
          if (fkTable && fkCol) {
            colData.foreignKey = { targetTable: fkTable, targetColumn: fkCol };
          }
          columns.push(colData);
        }
      });

      try {
        const res = await fetch(META_API + '/create-table', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: tableName, columns })
        });
        const data = await res.json();
        if (data.error) {
          showToast('Table Creation Failed', data.error, 'error');
        } else {
          showToast('Table Created', \`Table "\${tableName}" created successfully\`, 'success');
          closeCreateTableModal();
          await loadTablesList();
          selectTable(tableName);
        }
      } catch (err) {
        showToast('Creation Error', err.message, 'error');
      }
    }

    // 3. SQL Execution & Resizing
    let isDraggingSplitter = false;
    const splitter = document.getElementById('sqlSplitter');
    const editorCard = document.getElementById('sqlEditorCard');

    splitter.addEventListener('mousedown', (e) => {
      isDraggingSplitter = true;
      splitter.classList.add('dragging');
      document.body.style.cursor = 'row-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDraggingSplitter) return;
      const containerRect = document.getElementById('sqlMainPane').getBoundingClientRect();
      const newHeight = e.clientY - containerRect.top;
      if (newHeight >= 160 && newHeight <= (containerRect.height - 120)) {
        editorCard.style.height = newHeight + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDraggingSplitter) {
        isDraggingSplitter = false;
        splitter.classList.remove('dragging');
        document.body.style.cursor = 'default';
      }
    });

    function toggleSqlMaximize() {
      const btn = document.getElementById('btnToggleSqlMaximize');
      const isMax = editorCard.classList.toggle('maximized');
      btn.innerText = isMax ? '⛶ Minimize' : '⛶ Expand';
    }

    async function executeSql() {
      const sql = document.getElementById('sqlEditorTextarea').value;
      if (!sql.trim()) return;

      const startTime = performance.now();
      const statusEl = document.getElementById('sqlResultStatus');
      const timingEl = document.getElementById('sqlResultTiming');
      const wrapperEl = document.getElementById('sqlResultWrapper');

      statusEl.innerHTML = '<span style="color: var(--emerald-brand);">Executing against PGlite...</span>';

      try {
        const res = await fetch(META_API + '/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: sql })
        });
        const duration = Math.round(performance.now() - startTime);
        timingEl.innerText = duration + 'ms';

        const data = await res.json();

        // Add to history
        queryHistory.unshift({ sql: sql.trim(), time: new Date().toLocaleTimeString(), duration });
        renderQueryHistory();

        if (data.error) {
          statusEl.innerHTML = '<span style="color: var(--ruby-brand);">Error</span>';
          wrapperEl.innerHTML = \`<div style="padding: 16px; color: var(--ruby-brand); background: var(--ruby-bg); font-family: var(--font-mono); font-size: 12px; border-radius: 6px; margin: 10px;">\${data.error}</div>\`;
          showToast('SQL Execution Failed', data.error, 'error');
          return;
        }

        const rows = data.rows || [];
        statusEl.innerHTML = \`<span style="color: var(--emerald-brand); font-weight: 600;">Success (\${rows.length} rows)</span>\`;
        showToast('Query Completed', \`Executed in \${duration}ms (\${data.totalStatements || 1} statement\${data.totalStatements > 1 ? 's' : ''})\`, 'success');

        if (rows.length === 0) {
          wrapperEl.innerHTML = '<div style="padding: 24px; color: var(--text-subtle); text-align: center;">Query executed successfully with 0 rows returned. (Affected: ' + (data.affectedRows || 0) + ')</div>';
          return;
        }

        const keys = Object.keys(rows[0]);
        let html = '<table class="data-grid"><thead><tr>' + keys.map(k => \`<th>\${k}</th>\`).join('') + '</tr></thead><tbody>';
        rows.forEach(r => {
          html += '<tr>' + keys.map(k => \`<td>\${r[k] !== undefined && r[k] !== null ? (typeof r[k] === 'object' ? JSON.stringify(r[k]) : String(r[k])) : '<span style="color: var(--text-subtle);">null</span>'}</td>\`).join('') + '</tr>';
        });
        html += '</tbody></table>';
        wrapperEl.innerHTML = html;

        loadTablesList();
      } catch (err) {
        statusEl.innerHTML = '<span style="color: var(--ruby-brand);">Network Error</span>';
        wrapperEl.innerHTML = '<div style="padding: 16px; color: var(--ruby-brand);">' + err.message + '</div>';
        showToast('Execution Error', err.message, 'error');
      }
    }

    function renderQueryHistory() {
      const container = document.getElementById('sqlHistoryList');
      container.innerHTML = queryHistory.slice(0, 15).map(h => \`
        <div class="history-card" title="\${h.sql.replace(/"/g, '&quot;')}" onclick="applyHistoryQuery('\${h.sql.replace(/'/g, "\\\\'")}')">
          <div style="display: flex; justify-content: space-between; color: var(--text-subtle); font-size: 9px; margin-bottom: 2px;">
            <span>\${h.time}</span>
            <span>\${h.duration}ms</span>
          </div>
          <div>\${h.sql}</div>
        </div>
      \`).join('');
    }

    function applyHistoryQuery(sql) {
      document.getElementById('sqlEditorTextarea').value = sql;
      executeSql();
    }

    function setSampleQuery(type) {
      if (type === 'users') {
        document.getElementById('sqlEditorTextarea').value = 'SELECT * FROM users;';
      } else if (type === 'join') {
        document.getElementById('sqlEditorTextarea').value = \`SELECT 
  o.order_id,
  c.name AS customer_name,
  p.name AS product_name,
  oi.quantity,
  oi.unit_price
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
LIMIT 20;\`;
      }
      executeSql();
    }

    // 4. Schema ERD Visualizer (With SVG Bezier Curves)
    async function loadErdSchema() {
      const container = document.getElementById('erdNodesContainer');
      const svg = document.getElementById('erdSvgOverlay');
      container.innerHTML = '<div style="color: var(--text-subtle);">Loading schema relationships and foreign keys...</div>';

      try {
        const res = await fetch(META_API + '/schema/erd');
        const data = await res.json();
        const tables = data.tables || [];
        erdCachedFks = data.foreignKeys || [];

        if (tables.length === 0) {
          container.innerHTML = '<div style="color: var(--text-subtle);">No tables found to display.</div>';
          return;
        }

        container.innerHTML = tables.map(t => {
          return \`
            <div class="erd-table-card" id="erd_card_\${t.name}">
              <div class="erd-header">
                <span class="erd-title">📄 \${t.name}</span>
                <span class="row-badge">\${t.rowCount} rows</span>
              </div>
              <div class="erd-rows-list">
                \${t.columns.map(c => {
                  const fkMatch = erdCachedFks.find(fk => fk.source_table === t.name && fk.source_column === c.name);
                  return \`
                    <div class="erd-col-row \${fkMatch ? 'fk-col' : ''}" id="erd_col_\${t.name}_\${c.name}" data-table="\${t.name}" data-column="\${c.name}">
                      <div style="display: flex; align-items: center; gap: 6px;">
                        \${c.isPrimary ? '<span style="color: var(--amber-brand);" title="Primary Key">🔑</span>' : (fkMatch ? '<span style="color: var(--emerald-brand);" title="Foreign Key to ' + fkMatch.target_table + '.' + fkMatch.target_column + '">🔗</span>' : '<span style="color: var(--text-subtle);">•</span>')}
                        <span style="color: #fff; font-weight: \${c.isPrimary ? '600' : '400'};">\${c.name}</span>
                      </div>
                      <div style="display: flex; align-items: center; gap: 4px;">
                        \${fkMatch ? \`<span class="type-tag" style="color: var(--emerald-brand);">→ \${fkMatch.target_table}</span>\` : ''}
                        <span class="type-tag">\${c.type}</span>
                      </div>
                    </div>
                  \`;
                }).join('')}
              </div>
            </div>
          \`;
        }).join('');

        // Wait for DOM to finish layout, then calculate bezier lines
        setTimeout(() => {
          drawErdRelationships(erdCachedFks);
        }, 60);

      } catch (err) {
        container.innerHTML = '<div style="color: var(--ruby-brand);">Failed to load ERD: ' + err.message + '</div>';
        showToast('ERD Error', err.message, 'error');
      }
    }

    function drawErdRelationships(fks) {
      const svg = document.getElementById('erdSvgOverlay');
      const canvas = document.getElementById('erdCanvas');
      if (!svg || !canvas) return;

      // Match SVG canvas size
      svg.setAttribute('width', Math.max(canvas.scrollWidth, canvas.clientWidth));
      svg.setAttribute('height', Math.max(canvas.scrollHeight, canvas.clientHeight));

      // Remove existing paths, keep defs
      const defs = svg.querySelector('defs');
      svg.innerHTML = '';
      if (defs) svg.appendChild(defs);

      if (!fks || fks.length === 0) return;

      const canvasRect = canvas.getBoundingClientRect();

      fks.forEach(fk => {
        const sourceId = 'erd_col_' + fk.source_table + '_' + fk.source_column;
        const targetId = 'erd_col_' + fk.target_table + '_' + fk.target_column;
        const sourceEl = document.getElementById(sourceId);
        const targetEl = document.getElementById(targetId);

        if (!sourceEl || !targetEl) return;

        const sRect = sourceEl.getBoundingClientRect();
        const tRect = targetEl.getBoundingClientRect();

        const sMidY = sRect.top - canvasRect.top + canvas.scrollTop + sRect.height / 2;
        const tMidY = tRect.top - canvasRect.top + canvas.scrollTop + tRect.height / 2;
        const sLeft = sRect.left - canvasRect.left + canvas.scrollLeft;
        const sRight = sRect.right - canvasRect.left + canvas.scrollLeft;
        const tLeft = tRect.left - canvasRect.left + canvas.scrollLeft;
        const tRight = tRect.right - canvasRect.left + canvas.scrollLeft;

        let startX, startY = sMidY, endX, endY = tMidY;
        let dx;

        if (sRight < tLeft) {
          // Source on the left, target on the right
          startX = sRight;
          endX = tLeft;
          dx = Math.max(45, (endX - startX) / 2);
        } else if (tRight < sLeft) {
          // Source on the right, target on the left
          startX = sLeft;
          endX = tRight;
          dx = Math.max(45, (startX - endX) / 2);
          startX -= 2;
          endX += 2;
        } else {
          // Stacked vertically
          startX = sRight;
          endX = tRight;
          dx = 60;
        }

        const pathD = (startX < endX)
          ? \`M \${startX} \${startY} C \${startX + dx} \${startY}, \${endX - dx} \${endY}, \${endX} \${endY}\`
          : \`M \${startX} \${startY} C \${startX - dx} \${startY}, \${endX + dx} \${endY}, \${endX} \${endY}\`;

        // Create Path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathD);
        path.setAttribute('class', 'erd-fk-edge');
        path.setAttribute('marker-end', 'url(#erdArrow)');

        // Tooltip
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = \`\${fk.source_table}.\${fk.source_column} → \${fk.target_table}.\${fk.target_column} (\${fk.constraint_name})\`;
        path.appendChild(title);

        // Hover events
        path.addEventListener('mouseenter', () => {
          path.classList.add('active');
          document.getElementById('erd_card_' + fk.source_table)?.classList.add('highlighted');
          document.getElementById('erd_card_' + fk.target_table)?.classList.add('highlighted');
          sourceEl.classList.add('highlighted');
          targetEl.classList.add('highlighted');
        });
        path.addEventListener('mouseleave', () => {
          path.classList.remove('active');
          document.getElementById('erd_card_' + fk.source_table)?.classList.remove('highlighted');
          document.getElementById('erd_card_' + fk.target_table)?.classList.remove('highlighted');
          sourceEl.classList.remove('highlighted');
          targetEl.classList.remove('highlighted');
        });

        svg.appendChild(path);

        // Source circle dot
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', startX);
        dot.setAttribute('cy', startY);
        dot.setAttribute('r', '3.5');
        dot.setAttribute('fill', '#3ecf8e');
        svg.appendChild(dot);
      });
    }

    // Re-draw ERD edges on resize or canvas scroll
    window.addEventListener('resize', () => {
      if (currentNav === 'schema') drawErdRelationships(erdCachedFks);
    });
    document.getElementById('erdCanvas')?.addEventListener('scroll', () => {
      if (currentNav === 'schema') drawErdRelationships(erdCachedFks);
    });

    // 5. Functions View
    async function loadFunctions() {
      const container = document.getElementById('functionsList');
      container.innerHTML = '<div style="color: var(--text-subtle);">Loading functions...</div>';

      try {
        const res = await fetch(META_API + '/functions');
        const functions = await res.json();

        if (!functions || functions.length === 0) {
          container.innerHTML = '<div style="padding: 24px; color: var(--text-subtle); text-align: center;">No custom PL/pgSQL functions found. Click "+ Create Function" to deploy one.</div>';
          return;
        }

        container.innerHTML = functions.map(fn => \`
          <div class="fn-card" id="card_fn_\${fn.name}">
            <div class="fn-header">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="fn-name">\${fn.name}(\${fn.arguments || ''})</span>
                <span class="type-tag">→ \${fn.return_type}</span>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-primary" style="padding: 3px 10px; font-size: 11px;" onclick="promptRunFunction('\${fn.name}')">▶ Test Run</button>
              </div>
            </div>
            <pre style="background: var(--bg-base); padding: 10px; border-radius: 4px; font-family: var(--font-mono); font-size: 11px; color: #a1a1aa; max-height: 120px; overflow-y: auto;">\${fn.definition || fn.source}</pre>
            <div class="fn-test-panel" id="fnTestResult_\${fn.name}" style="display: none;"></div>
          </div>
        \`).join('');
      } catch (err) {
        container.innerHTML = '<div style="color: var(--ruby-brand);">Error loading functions: ' + err.message + '</div>';
        showToast('Functions Load Error', err.message, 'error');
      }
    }

    function openCreateFunctionModal() {
      document.getElementById('createFunctionModal').style.display = 'flex';
    }

    function closeCreateFunctionModal() {
      document.getElementById('createFunctionModal').style.display = 'none';
    }

    async function handleCreateFunctionSubmit(e) {
      e.preventDefault();
      const sql = document.getElementById('functionSqlBody').value;
      try {
        const res = await fetch(META_API + '/functions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        const data = await res.json();
        if (data.error) {
          showToast('Deploy Failed', data.error, 'error');
        } else {
          showToast('Function Deployed', 'PL/pgSQL function saved successfully', 'success');
          closeCreateFunctionModal();
          loadFunctions();
        }
      } catch (err) {
        showToast('Deploy Error', err.message, 'error');
      }
    }

    async function promptRunFunction(fnName) {
      const panel = document.getElementById('fnTestResult_' + fnName);
      const argsPrompt = prompt('Enter comma-separated arguments for ' + fnName + ' (or leave blank if no args):');
      if (argsPrompt === null) return;
      const args = argsPrompt.trim() ? argsPrompt.split(',').map(s => s.trim()) : [];
      
      if (panel) {
        panel.style.display = 'block';
        panel.innerHTML = '<span style="color: var(--text-muted);">Executing function ' + fnName + '...</span>';
      }

      const start = performance.now();
      try {
        const res = await fetch(META_API + '/functions/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ functionName: fnName, args })
        });
        const duration = Math.round(performance.now() - start);
        const data = await res.json();
        if (data.error) {
          if (panel) {
            panel.innerHTML = \`<span style="color: var(--ruby-brand); font-weight: 600;">Error:</span> <span style="color: #fff;">\${data.error}</span>\`;
          }
          showToast('Function Execution Failed', data.error, 'error');
        } else {
          if (panel) {
            panel.innerHTML = \`
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: var(--emerald-brand); font-weight: 600;">Execution Result (200 OK)</span>
                <span style="color: var(--text-subtle);">\${duration}ms</span>
              </div>
              <div style="color: #fff; background: rgba(0,0,0,0.5); padding: 6px 8px; border-radius: 4px;">\${JSON.stringify(data.result, null, 2)}</div>
            \`;
          }
          showToast('Function Test Complete', \`Result: \${JSON.stringify(data.result)}\`, 'success');
        }
      } catch (err) {
        if (panel) {
          panel.innerHTML = \`<span style="color: var(--ruby-brand);">Execution error: \${err.message}</span>\`;
        }
        showToast('Execution Error', err.message, 'error');
      }
    }

    // Global Keydown
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (currentNav === 'sql') {
          e.preventDefault();
          executeSql();
        }
      }
    });

    // Boot
    window.onload = () => {
      loadTablesList();
      loadTableData('users');
    };
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.writeHead(200);
  res.end(HTML_CONTENT);
});

server.listen(PORT, () => {
  console.log(`[supabase-studio] Embedded Supabase Studio UI running at http://localhost:${PORT}`);
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
