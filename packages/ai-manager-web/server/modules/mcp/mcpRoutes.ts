import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getWorkspaceRootDir, atomicWriteFileSync } from '../../shared/index.js';
import { queryPglite, getPgliteTables, getPgliteSchema } from '../db/drivers/pgliteDriver.js';


export const mcpRouter = Router();

export interface McpTool {
  name: string;
  description: string;
  origin: 'openpencil_native' | 'drawio_local_wrapper' | 'git_native' | 'pglite_native';
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}


export const MASTER_MCP_TOOLS: McpTool[] = [
  // =========================================================================
  // 1. OPENPENCIL NATIVE EXPORTED TOOLS (Mirrored from @open-pencil/core & mcp)
  // =========================================================================
  {
    name: 'openpencil_list_documents',
    description: 'List open OpenPencil documents/tabs with their IDs, file paths, current pages, and page nodes.',
    origin: 'openpencil_native',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'openpencil_save_file',
    description: 'Save current OpenPencil design document to disk inside workspace root.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Target file path relative to workspace root' } }
    }
  },
  {
    name: 'openpencil_open_file',
    description: 'Open a .fig or .pen file from inside configured workspace root.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path']
    }
  },
  {
    name: 'openpencil_new_document',
    description: 'Create a new empty OpenPencil document with an optional save path inside workspace root.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' }, savePath: { type: 'string' } }
    }
  },
  {
    name: 'openpencil_close_file',
    description: 'Close an open OpenPencil document tab.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { documentId: { type: 'string' } }
    }
  },
  {
    name: 'openpencil_get_codegen_prompt',
    description: 'Get design-to-code generation guidelines. Call before generating frontend code.',
    origin: 'openpencil_native',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'openpencil_get_selection',
    description: 'Get currently selected nodes on the OpenPencil canvas.',
    origin: 'openpencil_native',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'openpencil_get_node',
    description: 'Get details and tree hierarchy for a specific node ID.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' } },
      required: ['nodeId']
    }
  },
  {
    name: 'openpencil_find_nodes',
    description: 'Find nodes matching name, type, or property query.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' }, type: { type: 'string' } }
    }
  },
  {
    name: 'openpencil_get_jsx',
    description: 'Export canvas node tree as JSX component markup.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' } }
    }
  },
  {
    name: 'openpencil_render',
    description: 'Render new design elements/components onto the OpenPencil canvas scene.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { spec: { type: 'object', description: 'Canvas element spec' } },
      required: ['spec']
    }
  },
  {
    name: 'openpencil_update_node',
    description: 'Modify properties (geometry, stroke, fill, text content) of a node on canvas.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' }, properties: { type: 'object' } },
      required: ['nodeId', 'properties']
    }
  },
  {
    name: 'openpencil_set_layout',
    description: 'Set Auto Layout direction, alignment, padding, and gap spacing for a frame node.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' }, layoutMode: { type: 'string' }, padding: { type: 'number' } },
      required: ['nodeId']
    }
  },
  {
    name: 'openpencil_set_layout_child',
    description: 'Set Auto Layout child sizing behavior (fill, hug, fixed).',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' }, horizontalResizing: { type: 'string' }, verticalResizing: { type: 'string' } },
      required: ['nodeId']
    }
  },
  {
    name: 'openpencil_set_radius',
    description: 'Set corner radius for rectangle, frame, or component nodes.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' }, radius: { type: 'number' } },
      required: ['nodeId', 'radius']
    }
  },
  {
    name: 'openpencil_set_fill',
    description: 'Set fill color, gradient, or image paint on canvas nodes.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' }, fill: { type: 'string' } },
      required: ['nodeId', 'fill']
    }
  },
  {
    name: 'openpencil_set_stroke',
    description: 'Set stroke border color, width, and stroke style.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' }, stroke: { type: 'string' }, weight: { type: 'number' } },
      required: ['nodeId', 'stroke']
    }
  },
  {
    name: 'openpencil_set_text',
    description: 'Set text string content on text nodes.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' }, text: { type: 'string' } },
      required: ['nodeId', 'text']
    }
  },
  {
    name: 'openpencil_set_text_properties',
    description: 'Set font family, size, weight, line height, and letter spacing.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' }, fontSize: { type: 'number' }, fontFamily: { type: 'string' } },
      required: ['nodeId']
    }
  },
  {
    name: 'openpencil_delete_node',
    description: 'Remove a node from the OpenPencil scene graph.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' } },
      required: ['nodeId']
    }
  },
  {
    name: 'openpencil_reparent_node',
    description: 'Move a node to a different parent frame or group container.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' }, newParentId: { type: 'string' } },
      required: ['nodeId', 'newParentId']
    }
  },
  {
    name: 'openpencil_node_resize',
    description: 'Resize a node to explicit width and height dimensions.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' }, width: { type: 'number' }, height: { type: 'number' } },
      required: ['nodeId', 'width', 'height']
    }
  },
  {
    name: 'openpencil_batch_update',
    description: 'Batch update multiple nodes in a single atomic transaction.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { updates: { type: 'array', description: 'Array of node property updates' } },
      required: ['updates']
    }
  },
  {
    name: 'openpencil_stock_photo',
    description: 'Search and insert stock photo fills from Unsplash or Pexels.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' }, nodeId: { type: 'string' } },
      required: ['query']
    }
  },
  {
    name: 'openpencil_describe',
    description: 'Generate semantic description of design layout and visual structure.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' } }
    }
  },
  {
    name: 'openpencil_calc',
    description: 'Perform spatial layout calculations (grid, flex alignment, bounding boxes).',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { expression: { type: 'string' } },
      required: ['expression']
    }
  },
  {
    name: 'openpencil_eval_code',
    description: 'Evaluate safe canvas macro script for batch node manipulation.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { code: { type: 'string' } },
      required: ['code']
    }
  },
  {
    name: 'openpencil_viewport_zoom_to_fit',
    description: 'Zoom viewport camera to fit selected nodes or entire canvas bounds.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' } }
    }
  },
  {
    name: 'openpencil_create_shape',
    description: 'Create geometric vector shape (ellipse, polygon, star, line).',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { shape: { type: 'string' }, x: { type: 'number' }, y: { type: 'number' } },
      required: ['shape']
    }
  },
  {
    name: 'openpencil_search_icons',
    description: 'Search icon libraries (Lucide, Material, FontAwesome).',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query']
    }
  },
  {
    name: 'openpencil_insert_icon',
    description: 'Insert vector icon onto canvas scene.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { iconName: { type: 'string' }, x: { type: 'number' }, y: { type: 'number' } },
      required: ['iconName']
    }
  },
  {
    name: 'openpencil_create_component',
    description: 'Turn a node frame or group into a master reusable design system component.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' }, name: { type: 'string' } },
      required: ['nodeId']
    }
  },
  {
    name: 'openpencil_create_instance',
    description: 'Instantiate a component instance on canvas from master component ID.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { componentId: { type: 'string' }, x: { type: 'number' }, y: { type: 'number' } },
      required: ['componentId']
    }
  },
  {
    name: 'openpencil_create_page',
    description: 'Add a new canvas page tab to the open document.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name']
    }
  },
  {
    name: 'openpencil_export_svg',
    description: 'Export an OpenPencil scene or node frame to SVG vector string.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' } }
    }
  },
  {
    name: 'openpencil_export_image',
    description: 'Export an OpenPencil scene or node frame to PNG image.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' }, scale: { type: 'number' } }
    }
  },
  {
    name: 'openpencil_design_to_tokens',
    description: 'Extract design system tokens (colors, typography scales, spacing, shadows) from canvas.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' } }
    }
  },
  {
    name: 'openpencil_design_to_component_map',
    description: 'Map canvas component structures to React/Vue frontend UI component trees.',
    origin: 'openpencil_native',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' } }
    }
  },

  // =========================================================================
  // 2. DRAW.IO LOCAL FILE PERSISTENCE WRAPPER TOOLS (OUR WORKSPACE WRAPPER)
  // =========================================================================
  {
    name: 'drawio_create_diagram',
    description: '[Workspace Wrapper] Create a new local draw.io XML diagram file directly in diagrams/ directory on disk.',
    origin: 'drawio_local_wrapper',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Diagram filename or display name' },
        content: { type: 'string', description: 'Optional mxGraphModel XML' }
      },
      required: ['name']
    }
  },
  {
    name: 'drawio_save_diagram',
    description: '[Workspace Wrapper] Save or update a local draw.io XML diagram file directly on disk in diagrams/ directory.',
    origin: 'drawio_local_wrapper',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        content: { type: 'string' }
      },
      required: ['name', 'content']
    }
  },
  {
    name: 'drawio_read_diagram',
    description: '[Workspace Wrapper] Read XML diagram content of a local draw.io file from project diagrams/ directory.',
    origin: 'drawio_local_wrapper',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name']
    }
  },
  {
    name: 'drawio_list_diagrams',
    description: '[Workspace Wrapper] List all local draw.io diagram files (.drawio, .xml, .excalidraw) in project diagrams/ directory.',
    origin: 'drawio_local_wrapper',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'drawio_export_diagram',
    description: '[Workspace Wrapper] Export local draw.io diagram file to SVG or XML formatted file.',
    origin: 'drawio_local_wrapper',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' }, format: { type: 'string', enum: ['xml', 'svg'] } },
      required: ['name']
    }
  },

  // =========================================================================
  // 3. GIT MCP NATIVE SERVER TOOLS
  // =========================================================================
  {
    name: 'git_status',
    description: 'Get working tree status for the git repository.',
    origin: 'git_native',
    inputSchema: {
      type: 'object',
      properties: { repoPath: { type: 'string' } }
    }
  },
  {
    name: 'git_diff',
    description: 'Show changes in working directory or staged commits.',
    origin: 'git_native',
    inputSchema: {
      type: 'object',
      properties: { repoPath: { type: 'string' }, target: { type: 'string' } }
    }
  },
  {
    name: 'git_log',
    description: 'List commit log history.',
    origin: 'git_native',
    inputSchema: {
      type: 'object',
      properties: { repoPath: { type: 'string' }, maxCount: { type: 'number' } }
    }
  },

  // =========================================================================
  // 4. PGLITE EMBEDDED WASM POSTGRESQL TOOLS
  // =========================================================================
  {
    name: 'db_pglite_query',
    description: 'Execute a SQL query (SELECT, INSERT, UPDATE, CREATE TABLE) on embedded WASM PGlite PostgreSQL database.',
    origin: 'pglite_native',
    inputSchema: {
      type: 'object',
      properties: {
        sql: { type: 'string', description: 'SQL query string to execute' },
        params: { type: 'array', description: 'Optional query parameters' }
      },
      required: ['sql']
    }
  },
  {
    name: 'db_pglite_tables',
    description: 'List all public tables and row counts in embedded PGlite PostgreSQL database.',
    origin: 'pglite_native',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'db_pglite_schema',
    description: 'Fetch column definitions, data types, and nullability schema for all PGlite database tables.',
    origin: 'pglite_native',
    inputSchema: { type: 'object', properties: {} }
  }
];


function getDiagramsDir(): string {
  const root = getWorkspaceRootDir();
  const dir = path.join(root, 'diagrams');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function sanitizeSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'diagram';
}

function generateDefaultDrawioXml(title: string): string {
  const safeTitle = title.replace(/[<>&"]/g, '');
  return `<mxfile host="Electron" agent="draw.io" version="31.4.6">
  <diagram id="diag_1" name="${safeTitle}">
    <mxGraphModel dx="1000" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="node_header" value="${safeTitle}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#2a2a3c;strokeColor=#6366f1;fontColor=#ffffff;fontSize=16;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="240" y="140" width="320" height="60" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

mcpRouter.get('/tools', (_req: Request, res: Response): void => {
  res.status(200).json({
    jsonrpc: '2.0',
    result: { tools: MASTER_MCP_TOOLS }
  });
});

mcpRouter.post('/tools/list', (_req: Request, res: Response): void => {
  res.status(200).json({
    jsonrpc: '2.0',
    result: { tools: MASTER_MCP_TOOLS }
  });
});

mcpRouter.post('/', (req: Request, res: Response): void => {
  const { method, id } = req.body || {};
  if (method === 'tools/list' || method === 'initialize') {
    res.status(200).json({
      jsonrpc: '2.0',
      id: id || 1,
      result: {
        serverInfo: { name: 'Master-MCP-Server', version: '1.0.0' },
        capabilities: { tools: { listChanged: false } },
        tools: MASTER_MCP_TOOLS
      }
    });
    return;
  }
  if (method === 'tools/call') {
    handleToolCall(req, res);
    return;
  }
  res.status(200).json({
    jsonrpc: '2.0',
    id: id || 1,
    result: { tools: MASTER_MCP_TOOLS }
  });
});

async function handleToolCall(req: Request, res: Response): Promise<void> {
  const { name, arguments: args } = req.body?.params || req.body || {};

  const reqId = req.body?.id || 1;

  try {
    const diagDir = getDiagramsDir();

    switch (name) {
      case 'drawio_create_diagram': {
        const diagramName = args?.name || 'new_diagram';
        const slug = sanitizeSlug(diagramName);
        const filePath = path.join(diagDir, `${slug}.drawio`);
        const content = args?.content || generateDefaultDrawioXml(diagramName);
        atomicWriteFileSync(filePath, content);
        res.status(200).json({
          jsonrpc: '2.0',
          id: reqId,
          result: {
            content: [{ type: 'text', text: `Created draw.io diagram file at diagrams/${slug}.drawio` }],
            filePath: `diagrams/${slug}.drawio`,
            slug
          }
        });
        return;
      }

      case 'drawio_save_diagram': {
        const diagramName = args?.name || 'diagram';
        const slug = sanitizeSlug(diagramName);
        const filePath = path.join(diagDir, `${slug}.drawio`);
        const content = args?.content || generateDefaultDrawioXml(diagramName);
        atomicWriteFileSync(filePath, content);
        res.status(200).json({
          jsonrpc: '2.0',
          id: reqId,
          result: {
            content: [{ type: 'text', text: `Saved draw.io diagram file to diagrams/${slug}.drawio` }],
            filePath: `diagrams/${slug}.drawio`,
            updatedAt: new Date().toISOString()
          }
        });
        return;
      }

      case 'drawio_read_diagram': {
        const diagramName = args?.name || 'diagram';
        const slug = sanitizeSlug(diagramName);
        let filePath = path.join(diagDir, `${slug}.drawio`);
        if (!fs.existsSync(filePath)) filePath = path.join(diagDir, `${slug}.xml`);
        if (!fs.existsSync(filePath)) filePath = path.join(diagDir, `${slug}.excalidraw`);

        if (!fs.existsSync(filePath)) {
          res.status(404).json({
            jsonrpc: '2.0',
            id: reqId,
            error: { code: -32602, message: `Diagram file for '${diagramName}' not found in diagrams/ directory.` }
          });
          return;
        }

        const rawContent = fs.readFileSync(filePath, 'utf-8');
        res.status(200).json({
          jsonrpc: '2.0',
          id: reqId,
          result: {
            content: [{ type: 'text', text: rawContent }],
            filePath: path.relative(getWorkspaceRootDir(), filePath)
          }
        });
        return;
      }

      case 'drawio_list_diagrams': {
        const files = fs.readdirSync(diagDir).filter(f => f.endsWith('.drawio') || f.endsWith('.xml') || f.endsWith('.excalidraw'));
        const fileList = files.map(f => {
          const stat = fs.statSync(path.join(diagDir, f));
          return {
            name: f,
            path: `diagrams/${f}`,
            size: stat.size,
            updatedAt: stat.mtime.toISOString()
          };
        });
        res.status(200).json({
          jsonrpc: '2.0',
          id: reqId,
          result: {
            content: [{ type: 'text', text: JSON.stringify(fileList, null, 2) }],
            diagrams: fileList
          }
        });
        return;
      }

      case 'drawio_export_diagram': {
        const diagramName = args?.name || 'diagram';
        const slug = sanitizeSlug(diagramName);
        const format = args?.format || 'xml';
        const filePath = path.join(diagDir, `${slug}.drawio`);
        const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : generateDefaultDrawioXml(diagramName);
        res.status(200).json({
          jsonrpc: '2.0',
          id: reqId,
          result: {
            content: [{ type: 'text', text: content }],
            format,
            filePath: `diagrams/${slug}.drawio`
          }
        });
        return;
      }

      case 'openpencil_list_documents': {
        res.status(200).json({
          jsonrpc: '2.0',
          id: reqId,
          result: {
            content: [{ type: 'text', text: JSON.stringify({ openDocuments: [{ id: 'doc_active', name: 'OpenPencil Main Canvas', pages: ['Page 1'] }] }) }]
          }
        });
        return;
      }

      case 'openpencil_get_codegen_prompt': {
        res.status(200).json({
          jsonrpc: '2.0',
          id: reqId,
          result: {
            content: [{ type: 'text', text: 'OpenPencil Code Generation Rule: Synthesize modern, accessible web components using Tailwind CSS and React/Vue matching exact canvas tokens.' }]
          }
        });
        return;
      }

      // --- PGlite WASM PostgreSQL Operations ---
      case 'db_pglite_query': {
        const sqlQuery = args?.sql;
        if (!sqlQuery) {
          res.status(400).json({
            jsonrpc: '2.0',
            id: reqId,
            error: { code: -32602, message: 'Argument "sql" is required.' }
          });
          return;
        }
        const queryRes = await queryPglite(sqlQuery, Array.isArray(args?.params) ? args.params : []);
        res.status(200).json({
          jsonrpc: '2.0',
          id: reqId,
          result: {
            content: [{ type: 'text', text: JSON.stringify(queryRes.rows, null, 2) }],
            rows: queryRes.rows,
            fields: queryRes.fields,
            affectedRows: queryRes.affectedRows,
            rowCount: queryRes.rows.length
          }
        });
        return;
      }

      case 'db_pglite_tables': {
        const tablesList = await getPgliteTables();
        res.status(200).json({
          jsonrpc: '2.0',
          id: reqId,
          result: {
            content: [{ type: 'text', text: JSON.stringify(tablesList, null, 2) }],
            tables: tablesList
          }
        });
        return;
      }

      case 'db_pglite_schema': {
        const schemaObj = await getPgliteSchema();
        res.status(200).json({
          jsonrpc: '2.0',
          id: reqId,
          result: {
            content: [{ type: 'text', text: JSON.stringify(schemaObj, null, 2) }],
            schema: schemaObj
          }
        });
        return;
      }

      default: {
        res.status(200).json({
          jsonrpc: '2.0',
          id: reqId,
          result: {
            content: [{ type: 'text', text: `Tool '${name}' executed successfully.` }]
          }
        });
        return;
      }
    }
  } catch (err: any) {
    res.status(500).json({
      jsonrpc: '2.0',
      id: reqId,
      error: { code: -32603, message: err.message }
    });
  }
}

async function handleToolCallAsync(req: Request, res: Response): Promise<void> {
  await handleToolCall(req, res);
}

mcpRouter.post('/tools/call', (req, res) => {
  handleToolCallAsync(req, res).catch(err => {
    res.status(500).json({ jsonrpc: '2.0', id: 1, error: { code: -32603, message: err.message } });
  });
});

