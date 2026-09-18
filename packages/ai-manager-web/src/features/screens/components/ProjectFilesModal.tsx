import React, { useState } from 'react';
import { FolderOpen, Search, X, Trash2, Check, AlertTriangle } from 'lucide-react';

interface ProjectRootFile {
  name: string;
  sizeBytes: number;
  modifiedAt: string;
  type: string;
}

interface ProjectFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: ProjectRootFile[];
  isLoading: boolean;
  search: string;
  setSearch: (query: string) => void;
  onOpenFile: (filename: string) => void;
  onDeleteFile?: (filename: string) => Promise<void> | void;
}

export const ProjectFilesModal: React.FC<ProjectFilesModalProps> = ({
  isOpen,
  onClose,
  files,
  isLoading,
  search,
  setSearch,
  onOpenFile,
  onDeleteFile
}) => {
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDeleteFile) return;
    setIsDeleting(true);
    try {
      await onDeleteFile(filename);
      setConfirmDeleteFile(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#242424] border border-[#444444] rounded-xl shadow-2xl w-full max-w-lg p-5 space-y-4 text-slate-200">
        <div className="flex items-center justify-between border-b border-[#333333] pb-3">
          <div className="flex items-center space-x-2">
            <FolderOpen className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Open from Project Root (<code className="text-amber-300 font-mono">ui/</code>)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#333333] rounded text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search .fig and .json files in ui/..."
            className="w-full bg-[#1e1e1e] border border-[#383838] focus:border-[#0d99ff] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none"
            autoFocus
          />
        </div>

        <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 divide-y divide-[#2d2d2d]">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading project files...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No .fig or .json files found in ui/</div>
          ) : (
            filteredFiles.map(f => (
              <div
                key={f.name}
                onClick={() => onOpenFile(f.name)}
                className="pt-1.5 first:pt-0 flex items-center justify-between p-2 rounded-lg hover:bg-[#2e2e2e] transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                    f.type === 'fig' ? 'bg-[#9747FF]/20 text-[#c084fc] border border-[#9747FF]/40' : 'bg-[#0d99ff]/20 text-[#60a5fa] border border-[#0d99ff]/40'
                  }`}>
                    {f.type.toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                      {f.name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {(f.sizeBytes / 1024).toFixed(1)} KB • {new Date(f.modifiedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5" onClick={e => e.stopPropagation()}>
                  {confirmDeleteFile === f.name ? (
                    <div className="flex items-center space-x-1 bg-red-950/80 border border-red-500/50 rounded px-1.5 py-0.5 animate-in fade-in">
                      <span className="text-[10px] text-red-300 font-medium">Delete?</span>
                      <button
                        onClick={(e) => handleDelete(f.name, e)}
                        disabled={isDeleting}
                        className="p-1 bg-red-600 hover:bg-red-500 text-white rounded cursor-pointer transition"
                        title="Confirm Delete"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteFile(null);
                        }}
                        className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded cursor-pointer transition"
                        title="Cancel"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenFile(f.name);
                        }}
                        className="px-2.5 py-1 bg-[#333333] group-hover:bg-[#0d99ff] text-slate-300 group-hover:text-white text-xs font-medium rounded transition-colors cursor-pointer"
                      >
                        Open
                      </button>

                      {onDeleteFile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteFile(f.name);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded transition cursor-pointer"
                          title={`Delete ${f.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-2 flex justify-between items-center border-t border-[#333333] text-[11px] text-slate-400">
          <span>{files.length} files located in <code className="text-slate-300">ui/</code></span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[#333333] hover:bg-[#444444] text-white text-xs font-medium rounded-lg cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
