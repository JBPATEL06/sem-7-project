import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Check, Folder, HardDrive, Cloud, ArrowRight } from 'lucide-react';
import { Github } from '../components/ui/icons';

interface OnboardingPageProps {
  onContinue: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onContinue }) => {
  const [selectedSource, setSelectedSource] = useState<'github' | 'local'>('github');
  const [selectedMode, setSelectedMode] = useState<'local' | 'cloud'>('local');
  const [selectedTier, setSelectedTier] = useState<'tierA' | 'tierB'>('tierB');

  return (
    <div className="bg-background text-foreground w-full min-h-screen flex justify-center items-center py-12 px-6">
      {/* Background radial dot effect */}
      <div className="w-full flex justify-center items-center">
        <Card className="shadow-2xl rounded-xl bg-card border-border p-8 gap-6 w-full max-w-[560px]">
          <CardHeader className="p-0 gap-6">
            <div className="flex items-center gap-4">
              <div className="font-mono font-bold rounded-lg bg-primary text-primary-foreground text-lg flex justify-center items-center size-12 shadow-sm">
                {`>_`}
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="font-bold text-xl tracking-tight text-foreground">AI Manager</h1>
                <p className="text-muted-foreground text-sm leading-5">
                  Frontend for dbci — index your codebase into DB context for AI agents
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex p-0 flex-col gap-6 mt-6">
            {/* Step 1: Connect your source */}
            <section className="flex flex-col gap-3">
              <p className="font-semibold text-foreground text-sm">
                Step 1 of 3 — Connect your source
              </p>
              <div className="grid gap-4 grid-cols-2">
                {/* GitHub Option */}
                <div
                  onClick={() => setSelectedSource('github')}
                  className={`relative p-4 rounded-xl border transition-all cursor-pointer bg-card/60 ${
                    selectedSource === 'github'
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-border hover:border-border/80'
                  }`}
                >
                  {selectedSource === 'github' && (
                    <Check className="text-primary absolute top-3 right-3 size-4" />
                  )}
                  <div className="flex items-start gap-3 mb-3">
                    <Github className="text-foreground mt-0.5 size-5 shrink-0" />
                    <div className="flex flex-col gap-1">
                      <h2 className="font-semibold text-sm">Connect GitHub Repo</h2>
                      <p className="text-muted-foreground text-xs">
                        OAuth connect a repository
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Input
                      placeholder="github.com/org/repo"
                      className="bg-background text-xs border-input h-9 font-mono"
                      defaultValue=""
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground text-xs w-full h-9"
                    >
                      Connect
                    </Button>
                  </div>
                </div>

                {/* Local Project Path Option */}
                <div
                  onClick={() => setSelectedSource('local')}
                  className={`relative p-4 rounded-xl border transition-all cursor-pointer bg-card/60 ${
                    selectedSource === 'local'
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-border hover:border-border/80'
                  }`}
                >
                  {selectedSource === 'local' && (
                    <Check className="text-primary absolute top-3 right-3 size-4" />
                  )}
                  <div className="flex items-start gap-3 mb-3">
                    <Folder className="text-foreground mt-0.5 size-5 shrink-0" />
                    <div className="flex flex-col gap-1">
                      <h2 className="font-semibold text-sm">Local Project Path</h2>
                      <p className="text-muted-foreground text-xs">
                        Point dbci at a local directory
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Input
                      placeholder="/Users/dev/projects/acme-api"
                      className="font-mono bg-background text-xs border-input h-9"
                      defaultValue=""
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs w-full h-9"
                    >
                      Browse
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* Step 2: Choose mode */}
            <section className="flex flex-col gap-3">
              <p className="font-semibold text-foreground text-sm">
                Step 2 of 3 — Choose mode
              </p>
              <div className="grid gap-4 grid-cols-2">
                <div
                  onClick={() => setSelectedMode('local')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 bg-card/60 ${
                    selectedMode === 'local'
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-border hover:border-border/80'
                  }`}
                >
                  <HardDrive className="text-foreground mt-0.5 size-5 shrink-0" />
                  <div className="flex flex-col flex-1 gap-1">
                    <div className="flex justify-between items-center gap-2">
                      <h2 className="font-semibold text-sm">Local Mode</h2>
                      {selectedMode === 'local' && (
                        <div className="rounded-full bg-primary size-2" />
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs leading-5">
                      Runs fully on-device, no data leaves your machine
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setSelectedMode('cloud')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 bg-card/60 ${
                    selectedMode === 'cloud'
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-border hover:border-border/80'
                  }`}
                >
                  <Cloud className="text-foreground mt-0.5 size-5 shrink-0" />
                  <div className="flex flex-col flex-1 gap-1">
                    <div className="flex justify-between items-center gap-2">
                      <h2 className="font-semibold text-sm">Cloud Mode</h2>
                      {selectedMode === 'cloud' && (
                        <div className="rounded-full bg-primary size-2" />
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs leading-5">
                      Sync context to AI Manager cloud for team access
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Step 3: Account tier */}
            <section className="flex flex-col gap-3">
              <p className="font-semibold text-foreground text-sm">
                Step 3 of 3 — Account tier
              </p>
              <div className="grid gap-3 grid-cols-2">
                {/* Tier A */}
                <div
                  onClick={() => setSelectedTier('tierA')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer bg-card/60 ${
                    selectedTier === 'tierA'
                      ? 'border-2 border-primary'
                      : 'border-border hover:border-border/80'
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <h2 className="font-semibold text-sm">
                      Tier A — Solo Developer
                    </h2>
                    <p className="text-muted-foreground text-xs">
                      1 project, local only, free
                    </p>
                  </div>
                </div>

                {/* Tier B — Team (Highlighted + Recommended Pill inside card) */}
                <div
                  onClick={() => setSelectedTier('tierB')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative bg-card/60 ${
                    selectedTier === 'tierB'
                      ? 'border-primary'
                      : 'border-border hover:border-border/80'
                  }`}
                >
                  {/* Anchored Recommended Pill Badge in top-right of Tier B card */}
                  <span className="font-bold rounded-full bg-primary text-primary-foreground text-[10px] absolute top-2.5 right-3 px-2 py-0.5 shadow-sm">
                    Recommended
                  </span>
                  <div className="flex flex-col gap-1 pr-16">
                    <h2 className="font-semibold text-sm">Tier B — Team</h2>
                    <p className="text-muted-foreground text-xs">
                      Unlimited projects, cloud sync, priority support
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </CardContent>

          <CardFooter className="flex p-0 flex-col gap-3 mt-6">
            <Button
              onClick={onContinue}
              className="bg-primary text-primary-foreground w-full h-11 text-sm font-semibold gap-2 shadow-md hover:bg-primary/90"
            >
              Continue to Dashboard
              <ArrowRight className="size-4" />
            </Button>
            <p className="text-center text-muted-foreground text-xs">
              You can change these settings anytime
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
