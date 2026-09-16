import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useProjects, ProjectItem } from '../hooks/useProjects';
import {
  Folder,
  Search,
  Plus,
  List,
  LayoutGrid,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface ProjectsPageProps {
  onSelectProject?: (projectId: string) => void;
  onOpenProject?: (projectId: string) => void;
  selectedProjectId?: string;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onSelectProject, onOpenProject, selectedProjectId }) => {
  const { projects, isLoading, error, createProject } = useProjects();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [rootDir, setRootDir] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setProjectName(val);
    if (!projectId || projectId === projectName.toLowerCase().replace(/[^a-z0-9-_]/g, '-')) {
      setProjectId(val.toLowerCase().replace(/[^a-z0-9-_]/g, '-'));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !projectId.trim()) {
      setFormError('Project Name and ID are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const result = await createProject({
      projectName: projectName.trim(),
      projectId: projectId.trim(),
      description: description.trim(),
      rootDir: rootDir.trim() || `~/dev/${projectId.trim()}`
    });

    setIsSubmitting(false);
    if (result.success) {
      setIsModalOpen(false);
      setProjectName('');
      setProjectId('');
      setDescription('');
      setRootDir('');
      if (onSelectProject && result.project) {
        onSelectProject(result.project.projectId);
      }
    } else {
      setFormError(result.error || 'Failed to create project');
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      (p.name || p.projectName || p.projectId).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || (p.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <main className="p-8 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        {/* Header & Controls */}
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-bold text-2xl tracking-tight text-foreground">Projects</h1>
            <p className="text-muted-foreground text-sm">
              {isLoading ? 'Loading projects...' : `${projects.length} project${projects.length === 1 ? '' : 's'} registered`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-56">
              <Search className="-translate-y-1/2 text-muted-foreground absolute top-1/2 left-3 size-4" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter} defaultValue="all">
              <SelectTrigger className="w-32 h-9 text-xs">
                <SelectValue placeholder="Status: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status: All</SelectItem>
                <SelectItem value="indexed">Indexed</SelectItem>
                <SelectItem value="syncing">Syncing</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-9 text-sm font-medium cursor-pointer shadow-sm"
            >
              <Plus className="size-4" />
              New Project
            </Button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground font-mono">
            {error ? (
              <span className="text-destructive flex items-center gap-1.5">
                <AlertCircle className="size-3.5" />
                {error}
              </span>
            ) : (
              <span>Workspace: Local First Mode</span>
            )}
          </div>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')} defaultValue="grid">
            <TabsList className="h-9">
              <TabsTrigger value="list" className="px-3 gap-2 text-xs">
                <List className="size-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="grid" className="px-3 gap-2 text-xs">
                <LayoutGrid className="size-4" />
                Grid
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3 border border-border border-dashed rounded-xl bg-card/30">
            <Loader2 className="size-7 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-mono">Loading projects from workspace...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center p-16 gap-4 border border-border border-dashed rounded-xl bg-card/30 text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Folder className="size-8" />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <h3 className="font-bold text-foreground text-base">No Projects Found</h3>
              <p className="text-xs text-muted-foreground">
                {searchQuery
                  ? `No projects match "${searchQuery}". Try a different filter or search term.`
                  : 'Get started by creating your first project workspace.'}
              </p>
            </div>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-primary-foreground gap-2 h-9 text-xs font-medium cursor-pointer"
            >
              <Plus className="size-4" />
              Create Project
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Projects Grid */
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => {
              const isSelected = selectedProjectId === project.projectId;
              return (
                <Card
                  key={project.projectId}
                  onClick={() => onSelectProject && onSelectProject(project.projectId)}
                  className={`transition-all p-6 gap-4 bg-card flex flex-col justify-between ${
                    onSelectProject ? 'cursor-pointer hover:border-primary/50' : ''
                  } ${isSelected ? 'border-primary ring-1 ring-primary' : 'hover:border-border-bright'}`}
                >
                  <CardHeader className="p-0 flex-row justify-between items-start gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Folder className="text-primary size-5 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-mono font-bold text-sm text-foreground truncate">
                          {project.projectName || project.name || project.projectId}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono truncate">
                          {project.rootDir || `~/dev/${project.projectId}`}
                        </span>
                      </div>
                    </div>
                    <Badge
                      className={`rounded-full gap-1.5 px-2 py-0.5 text-xs shrink-0 ${
                        project.statusVariant === 'destructive'
                          ? 'bg-destructive/15 text-destructive'
                          : project.statusVariant === 'warning'
                          ? 'bg-amber-500/15 text-amber-400'
                          : project.statusVariant === 'success'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}
                    >
                      <span
                        className={`rounded-full size-1.5 ${
                          project.statusVariant === 'destructive'
                            ? 'bg-destructive'
                            : project.statusVariant === 'warning'
                            ? 'bg-amber-400'
                            : project.statusVariant === 'success'
                            ? 'bg-emerald-400'
                            : 'bg-muted-foreground/60'
                        }`}
                      />
                      {project.status || 'Not indexed'}
                    </Badge>
                  </CardHeader>

                  <CardContent className="flex p-0 flex-col gap-1.5 my-2">
                    {project.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground mt-1">
                      <span>Files: {project.files || (project.filesCount ? String(project.filesCount) : '—')}</span>
                      <span>DB: {project.dbSize || '—'}</span>
                    </div>
                  </CardContent>


                  <CardFooter className="border-t border-border pt-3 p-0 flex justify-between items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground truncate">
                      {project.lastSynced || 'Recently synced'}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {isSelected && (
                        <span className="text-[10px] font-mono text-primary flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="size-3" />
                          Active
                        </span>
                      )}
                      {onOpenProject && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectProject) onSelectProject(project.projectId);
                            onOpenProject(project.projectId);
                          }}
                          className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1 font-medium"
                        >
                          Workspace →
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Projects List */
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
            {filteredProjects.map((project) => (
              <div
                key={project.projectId}
                onClick={() => onSelectProject && onSelectProject(project.projectId)}
                className={`flex items-center justify-between p-4 hover:bg-muted/20 transition-colors ${
                  onSelectProject ? 'cursor-pointer' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Folder className="text-primary size-5 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-mono font-bold text-sm text-foreground truncate">
                      {project.projectName || project.name || project.projectId}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono truncate">
                      {project.description || project.rootDir}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground shrink-0">
                  <span>Files: {project.files || (project.filesCount ? String(project.filesCount) : '—')}</span>
                  <span>Size: {project.dbSize || '—'}</span>
                  <Badge
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      project.statusVariant === 'destructive'
                        ? 'bg-destructive/15 text-destructive'
                        : project.statusVariant === 'warning'
                        ? 'bg-amber-500/15 text-amber-400'
                        : project.statusVariant === 'success'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}
                  >
                    {project.status || 'Not indexed'}
                  </Badge>
                  {onOpenProject && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectProject) onSelectProject(project.projectId);
                        onOpenProject(project.projectId);
                      }}
                      className="h-7 px-2.5 text-xs text-primary hover:bg-primary/10 border-primary/30 gap-1 font-medium"
                    >
                      Workspace →
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New Project Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-5 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-md bg-primary/10 p-1.5 text-primary">
                    <Folder className="size-5" />
                  </div>
                  <h2 className="font-bold text-base text-foreground">Create New Project</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-6 flex flex-col gap-4">
                {formError && (
                  <div className="p-3 bg-destructive/15 border border-destructive/30 rounded-lg text-xs text-destructive flex items-center gap-2 font-medium">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Project Name *</label>
                  <Input
                    placeholder="e.g. Payment Gateway"
                    value={projectName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    className="text-xs h-9"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Project Slug / ID *</label>
                  <Input
                    placeholder="e.g. payment-gateway"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                    required
                    className="text-xs font-mono h-9"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Description</label>
                  <Input
                    placeholder="e.g. Stripe checkout & webhook microservice"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Root Directory (Local Path)</label>
                  <Input
                    placeholder="e.g. ~/dev/payment-gateway"
                    value={rootDir}
                    onChange={(e) => setRootDir(e.target.value)}
                    className="text-xs font-mono h-9"
                  />
                </div>

                <div className="flex justify-end items-center gap-3 pt-4 border-t border-border mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    className="h-9 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 text-xs gap-2 font-semibold cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Register Project'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
