import React from 'react';
import { Card, Button, Input } from '@/shared/ui';
import { MessageSquare, Sparkles, Send } from 'lucide-react';

export interface ChatPageProps {
  projectId?: string;
}

export const ChatPage: React.FC<ChatPageProps> = ({ projectId = 'acme-api' }) => {
  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground p-6">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">AI Manager Assistant</h1>
            <p className="text-xs text-muted-foreground">Unified MCP-driven workspace co-pilot with contextual memory</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
        <div className="size-16 rounded-2xl bg-muted/30 border border-border flex items-center justify-center text-muted-foreground mb-4">
          <MessageSquare className="size-8" />
        </div>
        <h2 className="text-lg font-semibold mb-1">Start a conversation</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Query databases, generate diagrams, edit screens, or inspect git branches using natural language.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg w-full text-left">
          <Card className="p-3.5 bg-card/50 hover:bg-card border-border cursor-pointer transition-colors">
            <span className="text-xs font-semibold text-violet-400">Database</span>
            <p className="text-xs text-muted-foreground mt-0.5">"Show tables in active database and check health"</p>
          </Card>
          <Card className="p-3.5 bg-card/50 hover:bg-card border-border cursor-pointer transition-colors">
            <span className="text-xs font-semibold text-emerald-400">QA & Safety</span>
            <p className="text-xs text-muted-foreground mt-0.5">"Run schema integrity audit and fix missing indexes"</p>
          </Card>
        </div>
      </div>

      <div className="pt-4 border-t border-border flex gap-2">
        <Input 
          placeholder="Ask AI Manager anything across your workspace..." 
          className="flex-1 bg-card border-border" 
        />
        <Button className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
          <Send className="size-4" />
          <span>Send</span>
        </Button>
      </div>
    </div>
  );
};
