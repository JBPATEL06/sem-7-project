import { LayoutComponent, ScreenLayoutSpec } from './screenTypes.js';
import { loadDecryptedCredentials, getDefaultOpenPencilModels, getDefaultAiAssignments, OpenPencilModelConfig } from '../settings/settingsRoutes.js';

/**
 * Calls User's Configured LLM (Groq / xAI Grok / OpenAI / Custom) to generate arbitrary, customized AST trees
 */
export async function callLlmForScreenAst(
  prompt: string,
  mode: string,
  existingComponents: LayoutComponent[],
  isDark: boolean,
  selectedCompIds: string[] = []
): Promise<any | null> {
  const creds = loadDecryptedCredentials();
  const modelsConfig = (creds.aiModels && creds.aiModels.length > 0) ? creds.aiModels : getDefaultOpenPencilModels();
  const assignments = creds.aiAssignments || getDefaultAiAssignments();

  // 1. Resolve assigned model for Design Agent
  const assignedModelId = assignments.designAgent;
  const targetModel = modelsConfig.find((m: OpenPencilModelConfig) => m.id === assignedModelId) || modelsConfig[0];

  // 2. Resolve credentials and endpoint
  let endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  let apiKey = creds.groq || process.env.GROQ_API_KEY || '';
  let modelCandidates = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'groq/compound-mini'];

  if (targetModel) {
    if (targetModel.provider === 'grok') {
      endpoint = 'https://api.x.ai/v1/chat/completions';
      apiKey = targetModel.apiKey || creds.grok || process.env.GROK_API_KEY || process.env.XAI_API_KEY || '';
      modelCandidates = [targetModel.modelId || 'grok-2', 'grok-beta'];
    } else if (targetModel.provider === 'openai') {
      endpoint = 'https://api.openai.com/v1/chat/completions';
      apiKey = targetModel.apiKey || creds.openai || process.env.OPENAI_API_KEY || '';
      modelCandidates = [targetModel.modelId || 'gpt-4o', 'gpt-4o-mini'];
    } else if (targetModel.provider === 'openai-compatible' || targetModel.provider === 'custom') {
      endpoint = `${(targetModel.baseUrl || 'http://localhost:11434/v1').replace(/\/+$/, '')}/chat/completions`;
      apiKey = targetModel.apiKey || 'local';
      modelCandidates = [targetModel.modelId || 'default'];
    } else {
      // Groq default
      endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      apiKey = targetModel.apiKey || creds.groq || process.env.GROQ_API_KEY || '';
      modelCandidates = [targetModel.modelId || 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'groq/compound-mini'];
    }
  }

  // Fallback to OpenAI if Groq key missing
  if (!apiKey && creds.openai) {
    endpoint = 'https://api.openai.com/v1/chat/completions';
    apiKey = creds.openai || process.env.OPENAI_API_KEY || '';
    modelCandidates = ['gpt-4o', 'gpt-4o-mini'];
  }

  if (!apiKey) {
    throw new Error('No AI API key found. Please configure your Groq, Grok, or OpenAI API key in Settings -> AI & agents.');
  }

  const isTargetedEdit = mode === 'modify' && selectedCompIds.length > 0;
  const targetedNodes = isTargetedEdit
    ? existingComponents.filter(c => selectedCompIds.includes(c.id))
    : existingComponents;

  const systemPrompt = `You are an elite vector design AI engine synthesizing Figma/OpenPencil SceneGraph layouts from user prompts.
Given a user prompt and design context, generate a complete, custom UI layout strictly conforming to the prompt instructions.

Do NOT use generic boilerplate if the user asks for specific structures. Follow the user's explicit quantities, layouts, dimensions, hierarchies, and themes.

Output a valid JSON object strictly matching this schema:
{
  "title": "Concise Descriptive Title",
  "description": "Short explanation of the generated design",
  "theme": {
    "primaryColor": "#hex",
    "backgroundColor": "#hex",
    "surfaceColor": "#hex",
    "textColor": "#hex",
    "accentColor": "#hex",
    "borderRadius": number
  },
  "boardWidth": 1440,
  "boardHeight": 900,
  "components": [
    {
      "id": "unique_string_id",
      "name": "Descriptive Name",
      "type": "frame",
      "x": number,
      "y": number,
      "width": number,
      "height": number,
      "fills": [{ "fillColor": "#hex", "opacity": 1 }],
      "strokes": [{ "strokeColor": "#hex", "strokeWidth": 1 }],
      "borderRadius": number,
      "text": "optional text content",
      "fontSize": number,
      "fontWeight": "normal",
      "color": "#hex",
      "children": [
        // nested child components (e.g. text, buttons, sub-frames, inputs)
      ]
    }
  ]
}

Layout & Coordinate Rules:
- If isDark is true: background="#0a0e17" or "#0f172a", surfaces="#131b2e", text="#f8fafc" or "#e2e8f0", muted text="#94a3b8", accent="#7c3aed" or "#10b981".
- If isDark is false: background="#f8fafc", surfaces="#ffffff", text="#0f172a", muted text="#64748b", accent="#7c3aed" or "#0284c7".
- When user asks for multiple containers/cards/elements (e.g. "5 containers", "3 pricing tiers", "4 KPI cards"):
  Emit each container DIRECTLY in the top-level "components" array with clean non-overlapping coordinates (e.g. padding 24, staggered x/y coordinates: x: 40 + (i % 3) * 320, y: 120 + Math.floor(i / 3) * 260).
  Do NOT wrap them inside an extra full-screen bounding frame.
- When creating child elements inside a container, give them relative x and y coordinates within that container so they fit inside nicely.
- When user asks for specific counts (e.g. "5 containers with each 10 text", "3 pricing tiers", "4 KPI cards"), create EXACTLY that number of elements with rich, readable sample content matching the theme.
${isTargetedEdit ? 'TARGETED EDIT MODE: Modify ONLY the selected components provided in targetedNodes according to the user instruction, keeping the rest of the canvas structure intact.' : 'ZERO TEMPLATES: Generate every component dynamically from scratch according to the user prompt.'}
Return valid JSON only.`;

  let lastError: any = null;
  for (const model of modelCandidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: JSON.stringify({
                prompt,
                mode,
                isDark,
                selectedCompIds,
                targetedNodes: targetedNodes.slice(0, 10),
                totalExisting: existingComponents.length
              })
            }
          ],
          temperature: 0.3,
          max_tokens: 4000,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          try {
            const parsed = JSON.parse(content);
            if (parsed && Array.isArray(parsed.components) && parsed.components.length > 0) {
              console.log(`[Stitch AI LLM] Successfully synthesized AST using model: ${model} (${parsed.components.length} components)`);
              return {
                ...parsed,
                modelUsed: `${targetModel?.name || targetModel?.provider || 'AI'} (${model})`
              };
            }
          } catch (jsonErr: any) {
            console.warn(`[Stitch AI LLM] Model "${model}" JSON parse error (length ${content.length}):`, jsonErr.message);
          }
        }
      } else {
        const errText = await res.text();
        lastError = new Error(`Model ${model} error (HTTP ${res.status}): ${errText.slice(0, 200)}`);
        console.warn(`[Stitch AI LLM] Model "${model}" failed with HTTP ${res.status}: ${errText.slice(0, 300)}`);
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Stitch AI LLM] Model "${model}" network/timeout error:`, err.message);
    }
  }

  throw lastError || new Error('Failed to synthesize layout with LLM. Check API key or prompt.');
}

/**
 * Intelligent Stitch AST Layout Synthesis Engine
 */
export async function synthesizeStitchLayout(options: {
  prompt: string;
  mode: 'create' | 'modify';
  baseComponents: LayoutComponent[];
  boardWidth: number;
  boardHeight: number;
  isDark: boolean;
  category?: string;
  existingName?: string;
  selectedCompIds?: string[];
}) {
  const { prompt, mode, baseComponents, boardWidth, boardHeight, isDark, existingName, selectedCompIds = [] } = options;

  const bg = isDark ? '#090d16' : '#f8fafc';
  const surface = isDark ? '#131b2e' : '#ffffff';
  const textPrimary = isDark ? '#f8fafc' : '#0f172a';
  const primaryAccent = '#7c3aed';
  const emeraldAccent = '#10b981';

  const theme = {
    primaryColor: primaryAccent,
    backgroundColor: bg,
    surfaceColor: surface,
    textColor: textPrimary,
    accentColor: emeraldAccent,
    borderRadius: 12
  };

  const rawWords = prompt.replace(/[^a-zA-Z0-9\s-_]/g, '').split(/\s+/).filter(Boolean);
  const derivedTitle = rawWords.length > 0
    ? rawWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).slice(0, 4).join(' ')
    : 'Custom Interface';

  // Try LLM generation first
  const llmResult = await callLlmForScreenAst(prompt, mode, baseComponents, isDark, selectedCompIds);
  if (llmResult && Array.isArray(llmResult.components) && llmResult.components.length > 0) {
    const finalTitle = existingName || llmResult.title || derivedTitle;
    let components = llmResult.components;

    // IF in MODIFY mode on an existing screen:
    if (mode === 'modify' && baseComponents.length > 0) {
      if (selectedCompIds && selectedCompIds.length > 0) {
        // Targeted mutation: update ONLY selected components in baseComponents
        const updatedBase: LayoutComponent[] = JSON.parse(JSON.stringify(baseComponents));
        const mutateMatching = (list: LayoutComponent[]) => {
          for (let i = 0; i < list.length; i++) {
            if (selectedCompIds.includes(list[i].id)) {
              const matchedNew = llmResult.components.find((c: any) => c.id === list[i].id) || llmResult.components[0];
              if (matchedNew) {
                list[i] = {
                  ...list[i],
                  ...matchedNew,
                  id: list[i].id,
                  x: matchedNew.x !== undefined ? matchedNew.x : list[i].x,
                  y: matchedNew.y !== undefined ? matchedNew.y : list[i].y
                };
              }
            }
            if (list[i] && list[i].children && list[i].children!.length > 0) {
              mutateMatching(list[i].children!);
            }
          }
        };
        mutateMatching(updatedBase);
        components = updatedBase;
      } else {
        // Non-targeted modify: Preserve baseComponents and append newly generated elements
        const isExplicitRedesign = /\b(redesign from scratch|start over|clear and replace|wipe canvas|brand new screen)\b/i.test(prompt);
        if (!isExplicitRedesign) {
          const updatedBase: LayoutComponent[] = JSON.parse(JSON.stringify(baseComponents));
          const isAdditive = /\b(add|insert|append|put|attach|include|place|create\s+\d+|add\s+\d+)\b/i.test(prompt);
          
          if (isAdditive) {
            const maxY = updatedBase.reduce((max, c) => Math.max(max, (c.y || 0) + (c.height || 0)), 0);
            const offsetNew = components.map((c: any, idx: number) => ({
              ...c,
              id: c.id && !updatedBase.some(bc => bc.id === c.id) ? c.id : `comp_added_${Date.now()}_${idx}`,
              y: (maxY > 100 && (c.y || 0) < 60) ? (maxY + 40 + (c.y || 0)) : (c.y || 0)
            }));
            components = [...updatedBase, ...offsetNew];
          } else {
            const newComps = components.filter((c: any) => !updatedBase.some(bc => bc.id === c.id || bc.name === c.name));
            components = [...updatedBase, ...newComps];
          }
        }
      }
    }

    const steps = components.map((c: any, idx: number) => ({
      step: idx + 1,
      name: c.name || `Component ${idx + 1}`,
      type: c.type || 'frame',
      x: c.x || 0,
      y: c.y || 0,
      width: c.width || 100,
      height: c.height || 40,
      action: `AI Synthesizing ${c.name || 'Component'}`
    }));

    return {
      components,
      title: finalTitle,
      description: llmResult.description || `AI Synthesized: ${prompt}`,
      theme: llmResult.theme || theme,
      steps,
      changesSummary: `Synthesized ${components.length} components using ${llmResult.modelUsed || 'AI'}`,
      assistantExplanation: llmResult.description || `AI Synthesized layout for: ${prompt}`
    };
  }

  // Fallback if LLM call fails or returns empty
  const defaultCard: LayoutComponent = {
    id: `comp_card_${Date.now()}`,
    type: 'card',
    name: `${derivedTitle} Card`,
    x: 80,
    y: 80,
    width: Math.min(boardWidth - 160, 600),
    height: 380,
    borderRadius: 16,
    children: [
      {
        id: `comp_title_${Date.now()}`,
        type: 'text',
        name: derivedTitle,
        text: derivedTitle,
        x: 104,
        y: 104,
        width: 400,
        height: 36,
        fontSize: 22,
        fontWeight: 'bold',
        color: textPrimary
      },
      {
        id: `comp_desc_${Date.now()}`,
        type: 'text',
        name: 'Description',
        text: prompt,
        x: 104,
        y: 148,
        width: 500,
        height: 50,
        fontSize: 14,
        fontWeight: 'normal',
        color: isDark ? '#94a3b8' : '#64748b'
      },
      {
        id: `comp_btn_${Date.now()}`,
        type: 'button',
        name: 'Action Button',
        text: 'Get Started',
        x: 104,
        y: 220,
        width: 140,
        height: 42,
        borderRadius: 8,
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold'
      }
    ]
  };

  const comps = mode === 'modify' && baseComponents.length > 0 ? [...baseComponents, defaultCard] : [defaultCard];
  return {
    components: comps,
    title: existingName || derivedTitle,
    description: `Generated layout for: ${prompt}`,
    theme,
    steps: [{ step: 1, name: derivedTitle, type: 'card', x: 80, y: 80, width: 600, height: 380, action: 'Created layout card' }],
    changesSummary: `Created layout with 1 container and child components`,
    assistantExplanation: `Generated layout for: ${prompt}`
  };
}

/**
 * Intent Classifier: Determines whether user prompt is GENERATE or DISCUSS
 */
export async function detectIntent(prompt: string, hasExplicitSelection = false): Promise<'GENERATE' | 'DISCUSS'> {
  const p = prompt.trim().toLowerCase();

  // Explicit creation/modification triggers
  const hasCreationKeyword = /\b(make|create|build|generate|design|draw|render|add|place|insert|update|change|restyle|modify|fix|convert|turn into|glassmorphic|pricing|kpi|hero|footer|navbar|table|chart|card|input|button|form|screen|page|layout|dashboard|theme|dark|light|violet|emerald|blue|auth|portal|dialog|modal|login|signup|view|app)\b/i.test(p);
  const isPureDiscussion = /^(what|how|why|can you explain|tell me about|who are you|hello|hey|hi|help|critique|review this|thoughts on)\b/i.test(p) && !hasCreationKeyword;

  if (hasExplicitSelection || hasCreationKeyword) return 'GENERATE';
  if (isPureDiscussion) return 'DISCUSS';

  const creds = loadDecryptedCredentials();
  const groqKey = creds.groq || process.env.GROQ_API_KEY;
  const openaiKey = creds.openai || process.env.OPENAI_API_KEY;
  if (!groqKey && !openaiKey) return hasCreationKeyword ? 'GENERATE' : 'DISCUSS';

  const endpoint = groqKey ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
  const apiKey = groqKey || openaiKey;
  const models = groqKey
    ? ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'groq/compound-mini']
    : ['gpt-4o-mini', 'gpt-3.5-turbo'];

  for (const model of models) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'Classify the user message for a UI design studio as either GENERATE or DISCUSS. Output only the single word GENERATE (if user wants to create/modify/render UI or diagrams) or DISCUSS (if asking questions, greeting, or seeking advice/critique).'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0,
          max_tokens: 10
        })
      });

      if (res.ok) {
        const data: any = await res.json();
        const text = (data.choices?.[0]?.message?.content || '').trim().toUpperCase();
        if (text.includes('DISCUSS')) return 'DISCUSS';
        if (text.includes('GENERATE')) return 'GENERATE';
      }
    } catch {}
  }
  return hasCreationKeyword ? 'GENERATE' : 'DISCUSS';
}

/**
 * Conversational Chat Reply for DISCUSS intent
 */
export async function callLlmForChatReply(
  prompt: string,
  context?: {
    screenName?: string;
    compCount?: number;
    componentsSummary?: string;
  }
): Promise<string> {
  const creds = loadDecryptedCredentials();
  const groqKey = creds.groq || process.env.GROQ_API_KEY;
  const openaiKey = creds.openai || process.env.OPENAI_API_KEY;

  if (!groqKey && !openaiKey) {
    if (/^(hey|hello|hi)\b/i.test(prompt)) {
      return "Hello! I'm your Stitch AI design assistant. How can I help you refine or design your screens today?";
    }
    return `Regarding "${prompt}": I am here to help you review, refine, or design your layouts. Let me know if you'd like me to generate or modify any components!`;
  }

  const endpoint = groqKey ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
  const apiKey = groqKey || openaiKey;
  const models = groqKey
    ? ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'groq/compound-mini']
    : ['gpt-4o-mini', 'gpt-3.5-turbo'];

  const contextStr = context?.screenName
    ? `Current active screen: "${context.screenName}" with ${context.compCount || 0} components.${context.componentsSummary ? ` Elements present: ${context.componentsSummary}` : ''}`
    : 'No active screen selected on canvas.';

  for (const model of models) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: `You are Stitch AI, a world-class UI/UX design assistant and architecture expert.
The user is in a visual design studio discussing their UI / diagrams.
${contextStr}
Provide a helpful, thoughtful, concise conversational reply (2-4 sentences max). Offer constructive UI/UX suggestions, answer questions directly, or warmly greet the user. Do NOT output raw JSON or code unless asked.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 300
        })
      });

      if (res.ok) {
        const data: any = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      }
    } catch (err: any) {
      console.warn(`[Stitch AI Chat] Network error on model "${model}":`, err.message);
    }
  }

  return `I'm here to help with your UI design. What specific changes or ideas would you like to explore?`;
}


/**
 * Dynamic AI Layout Spec Generator from user prompt
 */
export async function generateLayoutFromPrompt(prompt: string, _projectName: string = 'Workspace'): Promise<ScreenLayoutSpec> {
  const result = await synthesizeStitchLayout({
    prompt,
    mode: 'create',
    baseComponents: [],
    boardWidth: 1440,
    boardHeight: 900,
    isDark: true
  });
  const id = `screen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    projectId: 'global',
    userId: 'system',
    name: result.title,
    description: result.description,
    board: {
      id: `board_${Date.now()}`,
      name: `${result.title} Artboard`,
      x: 0,
      y: 0,
      width: 1440,
      height: 900,
      background: result.theme.backgroundColor,
      components: result.components
    },
    theme: result.theme,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
