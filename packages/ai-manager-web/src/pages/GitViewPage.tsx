import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import {
  GitCommitHorizontal,
  FolderOpen,
  Folder,
  FileCode2,
  RefreshCw
} from 'lucide-react';

interface GitViewPageProps {
  initialEmpty?: boolean;
}

export const GitViewPage: React.FC<GitViewPageProps> = ({ initialEmpty = false }) => {
  const [isEmpty, setIsEmpty] = useState(initialEmpty);
  const [branch, setBranch] = useState('main');

  const commits = [
    {
      sha: 'a3f291c',
      message: 'Fix Groq auth header on retry',
      tag: 'Indexed HEAD',
      author: 'JD',
      authorColor: 'bg-primary/20 text-primary',
      time: '2h ago',
      isHead: true
    },
    {
      sha: 'f912ab0',
      message: 'Reindex context after schema migration',
      author: 'JD',
      authorColor: 'bg-primary/20 text-primary',
      time: '5h ago'
    },
    {
      sha: 'c02e77d',
      message: 'Add order refund service',
      author: 'AK',
      authorColor: 'bg-secondary text-secondary-foreground',
      time: '1d ago'
    },
    {
      sha: '88bb14e',
      message: 'Update ts-morph parser config',
      author: 'JD',
      authorColor: 'bg-primary/20 text-primary',
      time: '2d ago'
    },
    {
      sha: '1d4f620',
      message: 'Merge branch feature/auth-gateway',
      author: 'AK',
      authorColor: 'bg-secondary text-secondary-foreground',
      time: '3d ago'
    },
    {
      sha: '77aa903',
      message: 'Initial indexer scaffold',
      author: 'JD',
      authorColor: 'bg-primary/20 text-primary',
      time: '5d ago',
      isLast: true
    }
  ];

  return (
    <main className="p-8 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        {/* Header & Controls */}
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-foreground text-2xl tracking-tight">
                Git Visualizer
              </h1>
              {/* Quick toggle for Demo / Screen 11 testing */}
              <button
                type="button"
                onClick={() => setIsEmpty(!isEmpty)}
                className="text-[11px] font-mono text-muted-foreground border border-border px-2 py-0.5 rounded hover:bg-muted cursor-pointer"
                title="Toggle empty state view (Screen 11)"
              >
                {isEmpty ? 'View Populated State' : 'View Empty State'}
              </button>
            </div>
            <p className="text-muted-foreground text-sm">
              Commit graph and file tree linked to indexed context
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={branch} onValueChange={setBranch} defaultValue="main">
              <SelectTrigger className="w-[150px] text-xs">
                <SelectValue placeholder="Branch: main" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="main">Branch: main</SelectItem>
                <SelectItem value="develop">Branch: develop</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" className="gap-2 text-xs text-muted-foreground hover:text-foreground">
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* 2-Column Section */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
          {/* Left Column: Commit Graph or Empty State */}
          <Card className="p-6 gap-4 bg-card">
            <CardHeader className="p-0 mb-3">
              <CardTitle className="text-base">Commit Graph</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isEmpty ? (
                <div className="text-center flex flex-col justify-center items-center gap-4 min-h-[440px]">
                  <div className="rounded-full bg-primary/10 flex justify-center items-center size-14 shadow-inner">
                    <GitCommitHorizontal className="text-primary size-7" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h2 className="font-semibold text-foreground text-base">
                      No commits indexed yet
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-[300px]">
                      Commits will appear here after the repository is indexed.
                    </p>
                  </div>
                  <Button className="bg-primary text-primary-foreground font-medium text-sm mt-2">
                    Index repository
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col">
                  {commits.map((c, idx) => (
                    <div key={c.sha} className="flex relative py-3 items-center gap-4 hover:bg-muted/20 px-2 rounded transition-colors">
                      {/* Graph Line & Node */}
                      <div className="flex relative self-stretch justify-center w-4">
                        {!c.isLast && (
                          <span className="bg-border absolute top-4 bottom-[-16px] w-px" />
                        )}
                        {idx > 0 && (
                          <span className="bg-border absolute top-[-16px] h-5 w-px" />
                        )}
                        <span
                          className={`ring-4 ring-card rounded-full relative z-10 mt-1 size-3 ${
                            c.isHead ? 'bg-primary' : 'bg-accent'
                          }`}
                        />
                      </div>

                      <span className="font-mono text-muted-foreground text-xs w-16 shrink-0">
                        {c.sha}
                      </span>
                      <span className="text-foreground text-sm flex-1 truncate">
                        {c.message}
                      </span>
                      {c.tag && (
                        <span className="font-medium rounded-full bg-primary/15 text-primary text-[10px] py-0.5 px-2 shrink-0">
                          {c.tag}
                        </span>
                      )}
                      <span
                        className={`font-semibold rounded-full text-[10px] flex justify-center items-center size-7 shrink-0 ${c.authorColor}`}
                      >
                        {c.author}
                      </span>
                      <span className="text-right text-muted-foreground text-xs w-14 shrink-0 font-mono">
                        {c.time}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column: File Tree or Empty State */}
          <Card className="p-6 gap-4 bg-card">
            <CardHeader className="p-0 mb-3">
              <CardTitle className="text-base">File Tree</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isEmpty ? (
                <div className="text-center flex flex-col justify-center items-center gap-4 min-h-[440px]">
                  <div className="rounded-full bg-muted flex justify-center items-center size-14 shadow-inner">
                    <Folder className="text-muted-foreground size-7" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h2 className="font-semibold text-foreground text-base">
                      No files available
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-[260px]">
                      The file tree will appear here after the repository is indexed.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="font-mono text-sm flex flex-col select-none">
                  {/* src/ */}
                  <div className="text-foreground flex py-2 items-center gap-2">
                    <FolderOpen className="text-primary size-4" />
                    <span>src/</span>
                  </div>

                  {/* routes/ */}
                  <div className="text-foreground flex py-2 pl-6 items-center gap-2">
                    <FolderOpen className="text-primary size-4" />
                    <span>routes/</span>
                  </div>
                  <div className="text-muted-foreground flex py-1.5 pl-12 items-center gap-2 hover:text-foreground cursor-pointer">
                    <FileCode2 className="size-4" />
                    <span>orders.ts</span>
                  </div>
                  <div className="text-muted-foreground flex py-1.5 pl-12 items-center gap-2 hover:text-foreground cursor-pointer">
                    <FileCode2 className="size-4" />
                    <span>auth.ts</span>
                  </div>

                  {/* services/ */}
                  <div className="text-foreground flex py-2 pl-6 items-center gap-2">
                    <FolderOpen className="text-primary size-4" />
                    <span>services/</span>
                  </div>
                  {/* Linked file refund.ts */}
                  <div className="rounded-lg bg-primary/10 text-primary flex py-1.5 pl-12 pr-3 items-center gap-2 my-0.5">
                    <FileCode2 className="size-4 shrink-0" />
                    <span>refund.ts</span>
                    <span className="font-sans font-medium rounded-full bg-primary/15 text-[10px] flex ml-auto py-0.5 px-2 items-center gap-1">
                      <span className="rounded-full bg-primary size-1.5" />
                      linked
                    </span>
                  </div>
                  <div className="text-muted-foreground flex py-1.5 pl-12 items-center gap-2 hover:text-foreground cursor-pointer">
                    <FileCode2 className="size-4" />
                    <span>notify.ts</span>
                  </div>

                  {/* Collapsed Folders */}
                  <div className="text-muted-foreground flex py-1.5 pl-6 items-center gap-2 hover:text-foreground cursor-pointer">
                    <Folder className="size-4" />
                    <span>db/</span>
                  </div>
                  <div className="text-muted-foreground flex py-1.5 pl-6 items-center gap-2 hover:text-foreground cursor-pointer">
                    <Folder className="size-4" />
                    <span>models/</span>
                  </div>
                  <div className="text-muted-foreground flex py-1.5 pl-6 items-center gap-2 hover:text-foreground cursor-pointer">
                    <Folder className="size-4" />
                    <span>utils/</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};
