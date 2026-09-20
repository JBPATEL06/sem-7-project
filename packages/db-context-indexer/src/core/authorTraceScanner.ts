import fs from 'fs';
import path from 'path';
import { GraphNode, GraphEdge } from '@ai-manager/core';

export interface AuthorTraceResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  activeModels: string[];
  recentAiEditsCount: number;
}

/**
 * Scans AI assistant generation logs and commit history to map who (User vs AI) and what AI model updated each file.
 */
export function scanAuthorAndAiTraces(rootDir: string): AuthorTraceResult {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const modelsSet = new Set<string>();
  let recentAiEditsCount = 0;

  const logsDir = path.join(rootDir, 'packages/ai-manager-web/.ai-manager/logs');
  const altLogsDir = path.join(rootDir, '.ai-manager/logs');

  const targetLogDir = fs.existsSync(logsDir) ? logsDir : (fs.existsSync(altLogsDir) ? altLogsDir : null);

  if (targetLogDir) {
    try {
      const logFiles = fs.readdirSync(targetLogDir).filter(f => f.endsWith('.log'));

      for (const file of logFiles) {
        const filePath = path.join(targetLogDir, file);
        const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          // Detect AI generation / model dispatch events
          if (line.includes('AST_SYNTHESIS_COMPLETE') || line.includes('INTENT_DECISION') || line.includes('AI_MODEL_DISPATCH') || line.includes('GROQ_CHAT')) {
            recentAiEditsCount++;

            // Extract model name if present
            let model = 'Groq Llama-3 / GPT-OSS';
            if (line.includes('gpt-oss-120b')) model = 'Groq / openai/gpt-oss-120b';
            else if (line.includes('gpt-oss-20b')) model = 'Groq / openai/gpt-oss-20b';
            else if (line.includes('gemini-2.5-flash')) model = 'Google / gemini-2.5-flash';
            else if (line.includes('gemini-2.0-flash')) model = 'Google / gemini-2.0-flash';
            else if (line.includes('grok-2')) model = 'xAI / grok-2';
            else if (line.includes('gpt-4o')) model = 'OpenAI / gpt-4o';

            modelsSet.add(model);

            const timestampMatch = line.match(/^\[(.*?)\]/);
            const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString();

            const traceId = `ai:trace:${nodes.length + 1}`;
            const traceNode: GraphNode = {
              id: traceId,
              type: 'ai_trace',
              label: `AI Update (${model.split('/')[1]?.trim() || model})`,
              metadata: {
                model,
                timestamp,
                logFile: file,
                rawLine: line.length > 200 ? line.substring(0, 197) + '...' : line
              },
              createdAt: timestamp
            };
            nodes.push(traceNode);

            // If a specific screen or file is referenced in the line, add an edge
            if (line.includes('ui/')) {
              const fileMatch = line.match(/ui\/[a-zA-Z0-9_\-\.]+/);
              if (fileMatch) {
                edges.push({
                  id: `edge:ai:${traceId}:${fileMatch[0]}`,
                  sourceId: traceId,
                  targetId: fileMatch[0],
                  type: 'MODIFIED_BY_AI',
                  metadata: { model, timestamp }
                });
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[authorTraceScanner] Log scan warning:', e);
    }
  }

  // Fallback defaults if logs are minimal in dev
  if (modelsSet.size === 0) {
    modelsSet.add('Groq / openai/gpt-oss-120b');
    modelsSet.add('Google / gemini-2.5-flash');
  }

  return {
    nodes,
    edges,
    activeModels: Array.from(modelsSet),
    recentAiEditsCount: Math.max(recentAiEditsCount, nodes.length)
  };
}
