import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Play, Copy, Save, FileCode2, Check } from 'lucide-react';

export const ValidatorPage: React.FC = () => {
  const [query, setQuery] = useState(
    'What functions handle order refunds, and which DB tables do they touch?'
  );
  const [model, setModel] = useState('groq/llama3-70b');
  const [contextScope, setContextScope] = useState('full-project');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <main className="p-8 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="font-bold text-2xl tracking-tight text-foreground">
            Prototype Validator
          </h1>
          <p className="text-muted-foreground text-sm">
            Test AI context queries against your indexed database
          </p>
        </div>

        {/* 2-Column Grid */}
        <div className="grid items-start gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Left Column: Query Input & Recent Queries */}
          <div className="flex flex-col gap-6">
            <Card className="p-6 gap-4 bg-card">
              <CardHeader className="p-0 mb-3">
                <CardTitle className="text-base">Query Input</CardTitle>
              </CardHeader>
              <CardContent className="flex p-0 flex-col gap-4">
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="font-mono resize-none text-sm leading-6 min-h-[180px] bg-background border-border"
                  placeholder="Enter a context query..."
                />
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <Select value={model} onValueChange={setModel} defaultValue="groq/llama3-70b">
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="groq/llama3-70b">Model: Groq · llama3-70b</SelectItem>
                      <SelectItem value="groq/mixtral-8x7b">Model: Groq · mixtral-8x7b</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={contextScope} onValueChange={setContextScope} defaultValue="full-project">
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Context scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-project">Context scope: Full project</SelectItem>
                      <SelectItem value="current-module">Context scope: Current module</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button className="bg-primary text-primary-foreground gap-2 font-medium text-sm">
                    <Play className="size-4" />
                    Run Query
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setQuery('')}
                    className="text-muted-foreground hover:text-foreground text-sm"
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="p-6 gap-4 bg-card">
              <CardHeader className="p-0 mb-3">
                <CardTitle className="text-base">Recent Queries</CardTitle>
              </CardHeader>
              <CardContent className="flex p-0 flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setQuery('Which files import stripe-sdk?')}
                  className="text-left flex justify-between items-center gap-4 hover:bg-muted/40 p-2 rounded transition-colors cursor-pointer"
                >
                  <span className="font-mono text-ellipsis whitespace-nowrap text-foreground text-xs overflow-hidden">
                    Which files import stripe-sdk?
                  </span>
                  <span className="text-muted-foreground text-xs shrink-0 font-mono">
                    12m ago
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuery('How are failed payments retried?')}
                  className="text-left flex justify-between items-center gap-4 hover:bg-muted/40 p-2 rounded transition-colors cursor-pointer"
                >
                  <span className="font-mono text-ellipsis whitespace-nowrap text-foreground text-xs overflow-hidden">
                    How are failed payments retried?
                  </span>
                  <span className="text-muted-foreground text-xs shrink-0 font-mono">
                    28m ago
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuery('Where is the customer webhook handled?')}
                  className="text-left flex justify-between items-center gap-4 hover:bg-muted/40 p-2 rounded transition-colors cursor-pointer"
                >
                  <span className="font-mono text-ellipsis whitespace-nowrap text-foreground text-xs overflow-hidden">
                    Where is the customer webhook handled?
                  </span>
                  <span className="text-muted-foreground text-xs shrink-0 font-mono">
                    1h ago
                  </span>
                </button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Response Preview */}
          <Card className="p-6 gap-4 bg-card">
            <CardHeader className="p-0 mb-4 flex-row justify-between items-center gap-4">
              <CardTitle className="text-base">Response Preview</CardTitle>
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-500/15 text-emerald-400 font-mono text-xs">
                  Success · 1.8s
                </Badge>
                <span className="font-mono text-muted-foreground text-xs">
                  {model}
                </span>
              </div>
            </CardHeader>

            <CardContent className="flex p-0 flex-col gap-6 max-h-[440px] overflow-y-auto pr-1">
              <div className="text-muted-foreground text-sm leading-6 flex flex-col gap-4">
                <p>
                  The order refund flow is handled primarily by the{' '}
                  <span className="font-mono text-foreground font-medium px-1 py-0.5 bg-muted rounded">
                    createRefund
                  </span>{' '}
                  and{' '}
                  <span className="font-mono text-foreground font-medium px-1 py-0.5 bg-muted rounded">
                    processRefund
                  </span>{' '}
                  functions in{' '}
                  <span className="font-mono text-foreground font-medium px-1 py-0.5 bg-muted rounded">
                    src/services/refund.ts
                  </span>
                  . The service validates the refund amount, calls the payment provider, and records the resulting transaction.
                </p>
                <p>
                  These functions touch the{' '}
                  <span className="font-mono text-foreground font-medium px-1 py-0.5 bg-muted rounded">orders</span>,{' '}
                  <span className="font-mono text-foreground font-medium px-1 py-0.5 bg-muted rounded">refunds</span>, and{' '}
                  <span className="font-mono text-foreground font-medium px-1 py-0.5 bg-muted rounded">
                    order_events
                  </span>{' '}
                  tables through the order repository. The refund record is created before the order status is updated and an audit event is appended.
                </p>
              </div>

              <div className="border-t border-border flex pt-4 flex-col gap-3">
                <h3 className="font-semibold text-foreground text-sm">
                  Context Sources
                </h3>
                <div className="flex flex-col gap-2">
                  <div className="rounded-md bg-muted/40 border border-border flex py-2 px-3 items-center gap-2">
                    <FileCode2 className="text-primary size-4 shrink-0" />
                    <span className="font-mono text-foreground text-xs">
                      src/services/refund.ts
                    </span>
                  </div>
                  <div className="rounded-md bg-muted/40 border border-border flex py-2 px-3 items-center gap-2">
                    <FileCode2 className="text-primary size-4 shrink-0" />
                    <span className="font-mono text-foreground text-xs">
                      src/db/orders.repo.ts
                    </span>
                  </div>
                  <div className="rounded-md bg-muted/40 border border-border flex py-2 px-3 items-center gap-2">
                    <FileCode2 className="text-primary size-4 shrink-0" />
                    <span className="font-mono text-foreground text-xs">
                      src/models/order.ts
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="border-t border-border pt-4 p-0 gap-2">
              <Button
                variant="ghost"
                onClick={handleCopy}
                className="gap-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                {copied ? 'Copied!' : 'Copy Response'}
              </Button>
              <Button
                variant="ghost"
                onClick={handleSave}
                className="gap-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {saved ? <Check className="size-4 text-emerald-400" /> : <Save className="size-4" />}
                {saved ? 'Saved!' : 'Save as Test Case'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
};
