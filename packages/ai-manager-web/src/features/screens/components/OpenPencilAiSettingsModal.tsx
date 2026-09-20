import React, { useState, useEffect } from 'react';
import { Sparkles, Image, Cloud, Plus, ChevronRight, X, Bot, Check, Trash2, ArrowLeft, Key, Cpu, ShieldCheck } from 'lucide-react';
import { ApiClient } from '@/shared/api';

export interface ModelItem {
  id: string;
  name: string;
  provider: 'openai-compatible' | 'groq' | 'grok' | 'openai' | 'anthropic' | 'custom';
  baseUrl?: string;
  apiKey?: string;
  modelId: string;
  enableTools?: boolean;
  hasKey?: boolean;
  maskedKey?: string;
}

export interface AiAssignments {
  designAgent: string;
  review: string;
  fastTasks: string;
  vision: string;
}

interface OpenPencilAiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

export const OpenPencilAiSettingsModal: React.FC<OpenPencilAiSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'media' | 'cloud'>('ai');
  const [models, setModels] = useState<ModelItem[]>([]);
  const [assignments, setAssignments] = useState<AiAssignments>({
    designAgent: 'model_groq_primary',
    review: 'same-as-design',
    fastTasks: 'model_groq_fast',
    vision: 'none'
  });
  const [rememberInBrowser, setRememberInBrowser] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Model Editor Drawer State
  const [editingModel, setEditingModel] = useState<ModelItem | null>(null);
  const [isNewModel, setIsNewModel] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const res = await ApiClient.get<{
        success: boolean;
        models: ModelItem[];
        assignments: AiAssignments;
        rememberInBrowser: boolean;
      }>('/api/settings/ai-config');

      if (res.success && res.models) {
        setModels(res.models);
        if (res.assignments) setAssignments(res.assignments);
        if (res.rememberInBrowser !== undefined) setRememberInBrowser(res.rememberInBrowser);
      }
    } catch (err: any) {
      console.error('Failed to load AI config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveStatus('Saving settings...');
    try {
      const res = await ApiClient.post<{ success: boolean; message: string }>('/api/settings/ai-config', {
        models,
        assignments,
        rememberInBrowser
      });

      if (res.success) {
        setSaveStatus('Saved successfully!');
        setTimeout(() => {
          setSaveStatus(null);
          onSaveSuccess?.();
          onClose();
        }, 800);
      }
    } catch (err: any) {
      setSaveStatus(`❌ Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddModel = () => {
    const newId = `model_${Date.now()}`;
    const newM: ModelItem = {
      id: newId,
      name: 'New AI Model',
      provider: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      modelId: 'openai/gpt-oss-120b',
      enableTools: true,
      apiKey: '',
      hasKey: false
    };
    setEditingModel(newM);
    setIsNewModel(true);
  };

  const handleSaveModel = (model: ModelItem) => {
    if (isNewModel) {
      setModels(prev => [...prev, model]);
    } else {
      setModels(prev => prev.map(m => m.id === model.id ? model : m));
    }
    setEditingModel(null);
    setIsNewModel(false);
  };

  const handleDeleteModel = (id: string) => {
    setModels(prev => prev.filter(m => m.id !== id));
    if (assignments.designAgent === id) {
      setAssignments(prev => ({ ...prev, designAgent: models[0]?.id || '' }));
    }
    setEditingModel(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-sans text-slate-200 select-none">
      <div className="w-full max-w-4xl bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#2d2d2d] flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Settings</h2>
            <p className="text-xs text-slate-400 mt-0.5">Manage integrations and app preferences.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2a2a2a] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-1 min-h-[460px] overflow-hidden">
          {/* Left Tab Sidebar */}
          <div className="w-52 border-r border-[#2d2d2d] p-3 space-y-1 bg-[#191919] shrink-0">
            <button
              onClick={() => { setActiveTab('ai'); setEditingModel(null); }}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-[#2a2a2a] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#222222]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#3b82f6]" />
              <span>AI & agents</span>
            </button>

            <button
              onClick={() => { setActiveTab('media'); setEditingModel(null); }}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'media'
                  ? 'bg-[#2a2a2a] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#222222]'
              }`}
            >
              <Image className="w-4 h-4 text-slate-400" />
              <span>Media</span>
            </button>

            <button
              onClick={() => { setActiveTab('cloud'); setEditingModel(null); }}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'cloud'
                  ? 'bg-[#2a2a2a] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#222222]'
              }`}
            >
              <Cloud className="w-4 h-4 text-slate-400" />
              <span>Cloud storage</span>
            </button>
          </div>

          {/* Right Main Content Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-[#1e1e1e]">
            {activeTab === 'ai' && !editingModel && (
              <div className="space-y-8">
                {/* 1. Models Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Models</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Configure reusable models and their provider connections.</p>
                    </div>
                    <button
                      onClick={handleAddModel}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add model</span>
                    </button>
                  </div>

                  {/* Models List */}
                  <div className="space-y-2">
                    {models.map(m => {
                      const isAssigned = Object.values(assignments).includes(m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => { setEditingModel(m); setIsNewModel(false); }}
                          className="flex items-center justify-between p-3 rounded-lg bg-[#242424] hover:bg-[#2b2b2b] border border-[#333333] transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center border border-[#333]">
                              <Bot className="w-4 h-4 text-[#3b82f6]" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-semibold text-white">{m.name}</span>
                                {isAssigned && (
                                  <span className="text-[10px] px-1.5 py-0.2 bg-[#3b82f6]/20 text-[#60a5fa] border border-[#3b82f6]/30 rounded">
                                    Assigned
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 capitalize">
                                {m.provider} • {m.modelId}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${m.hasKey ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                              <span className="text-[11px] text-slate-400">
                                {m.hasKey ? 'Configured' : 'Needs key'}
                              </span>
                            </div>

                            {m.enableTools && (
                              <span className="text-[10px] px-2 py-0.5 bg-[#333] text-slate-300 rounded font-mono">
                                Tools
                              </span>
                            )}

                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Assignments Section */}
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-white">Assignments</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Choose which configured model handles each type of work.</p>
                  </div>

                  <div className="space-y-3">
                    {/* Design agent */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#242424] border border-[#333]">
                      <div>
                        <div className="text-xs font-semibold text-white">Design agent</div>
                        <div className="text-[11px] text-slate-400">AI chat and canvas edits</div>
                      </div>
                      <select
                        value={assignments.designAgent}
                        onChange={(e) => setAssignments(prev => ({ ...prev, designAgent: e.target.value }))}
                        className="bg-[#191919] text-xs text-slate-200 border border-[#3d3d3d] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#3b82f6] cursor-pointer min-w-[200px]"
                      >
                        {models.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Review */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#242424] border border-[#333]">
                      <div>
                        <div className="text-xs font-semibold text-white">Review</div>
                        <div className="text-[11px] text-slate-400">Explicit plan and design reviews</div>
                      </div>
                      <select
                        value={assignments.review}
                        onChange={(e) => setAssignments(prev => ({ ...prev, review: e.target.value }))}
                        className="bg-[#191919] text-xs text-slate-200 border border-[#3d3d3d] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#3b82f6] cursor-pointer min-w-[200px]"
                      >
                        <option value="same-as-design">Same as Design</option>
                        {models.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Fast tasks */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#242424] border border-[#333]">
                      <div>
                        <div className="text-xs font-semibold text-white">Fast tasks</div>
                        <div className="text-[11px] text-slate-400">Low-cost background work</div>
                      </div>
                      <select
                        value={assignments.fastTasks}
                        onChange={(e) => setAssignments(prev => ({ ...prev, fastTasks: e.target.value }))}
                        className="bg-[#191919] text-xs text-slate-200 border border-[#3d3d3d] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#3b82f6] cursor-pointer min-w-[200px]"
                      >
                        <option value="same-as-design">Same as Design</option>
                        {models.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Vision */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#242424] border border-[#333]">
                      <div>
                        <div className="text-xs font-semibold text-white">Vision</div>
                        <div className="text-[11px] text-slate-400">Screenshots and image references</div>
                      </div>
                      <select
                        value={assignments.vision}
                        onChange={(e) => setAssignments(prev => ({ ...prev, vision: e.target.value }))}
                        className="bg-[#191919] text-xs text-slate-200 border border-[#3d3d3d] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#3b82f6] cursor-pointer min-w-[200px]"
                      >
                        <option value="none">None</option>
                        <option value="same-as-design">Same as Design</option>
                        {models.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Model Editor Drawer (When editing or adding a model) */}
            {activeTab === 'ai' && editingModel && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#2d2d2d]">
                  <button
                    onClick={() => setEditingModel(null)}
                    className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Models</span>
                  </button>

                  {!isNewModel && (
                    <button
                      onClick={() => handleDeleteModel(editingModel.id)}
                      className="flex items-center space-x-1 text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Model Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Model Name</label>
                    <input
                      type="text"
                      value={editingModel.name}
                      onChange={(e) => setEditingModel({ ...editingModel, name: e.target.value })}
                      placeholder="e.g. Design model"
                      className="w-full bg-[#191919] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#3b82f6]"
                    />
                  </div>

                  {/* Provider */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Provider Connection</label>
                    <select
                      value={editingModel.provider}
                      onChange={(e) => {
                        const p = e.target.value as any;
                        let baseUrl = '';
                        let modelId = editingModel.modelId;
                        if (p === 'groq') {
                          baseUrl = 'https://api.groq.com/openai/v1';
                          modelId = 'openai/gpt-oss-120b';
                        } else if (p === 'grok') {
                          baseUrl = 'https://api.x.ai/v1';
                          modelId = 'grok-2';
                        } else if (p === 'openai') {
                          baseUrl = 'https://api.openai.com/v1';
                          modelId = 'gpt-4o';
                        }
                        setEditingModel({ ...editingModel, provider: p, baseUrl, modelId });
                      }}
                      className="w-full bg-[#191919] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#3b82f6]"
                    >
                      <option value="groq">Groq (Ultra-Fast)</option>
                      <option value="grok">xAI Grok (Grok-2)</option>
                      <option value="openai">OpenAI (GPT-4o)</option>
                      <option value="openai-compatible">OpenAI-compatible</option>
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="custom">Custom Endpoint / Ollama</option>
                    </select>
                  </div>

                  {/* Base URL */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Base URL</label>
                    <input
                      type="text"
                      value={editingModel.baseUrl || ''}
                      onChange={(e) => setEditingModel({ ...editingModel, baseUrl: e.target.value })}
                      placeholder="https://api.groq.com/openai/v1"
                      className="w-full bg-[#191919] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#3b82f6]"
                    />
                  </div>

                  {/* Model ID */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Model ID</label>
                    <input
                      type="text"
                      value={editingModel.modelId}
                      onChange={(e) => setEditingModel({ ...editingModel, modelId: e.target.value })}
                      placeholder="e.g. openai/gpt-oss-120b or grok-2"
                      className="w-full bg-[#191919] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#3b82f6]"
                    />
                  </div>

                  {/* API Key */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">API Key</label>
                    <div className="relative">
                      <input
                        type="password"
                        value={editingModel.apiKey || ''}
                        onChange={(e) => setEditingModel({ ...editingModel, apiKey: e.target.value })}
                        placeholder={editingModel.hasKey ? (editingModel.maskedKey || '••••••••••••••••') : 'Enter API Key (gsk_..., xai-..., sk-...)'}
                        className="w-full bg-[#191919] border border-[#333] rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#3b82f6]"
                      />
                      <Key className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    </div>
                  </div>

                  {/* Enable Tools */}
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <div className="text-xs font-semibold text-white">Enable Tool Calling</div>
                      <div className="text-[11px] text-slate-400">Allows the model to invoke structured layout tools</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={editingModel.enableTools !== false}
                      onChange={(e) => setEditingModel({ ...editingModel, enableTools: e.target.checked })}
                      className="w-4 h-4 accent-[#3b82f6] cursor-pointer"
                    />
                  </div>

                  <div className="pt-4 flex justify-end space-x-2">
                    <button
                      onClick={() => setEditingModel(null)}
                      className="px-4 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-[#262626] hover:bg-[#333] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveModel(editingModel)}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#3b82f6] hover:bg-[#2563eb] cursor-pointer"
                    >
                      Apply Model
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Media Tab Placeholder */}
            {activeTab === 'media' && (
              <div className="py-12 text-center text-slate-400">
                <Image className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <h3 className="text-sm font-semibold text-slate-300">Media Assets Library</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Local image assets and SVGs for direct drag-and-drop vector placement on canvas.
                </p>
              </div>
            )}

            {/* Cloud Storage Tab Placeholder */}
            {activeTab === 'cloud' && (
              <div className="py-12 text-center text-slate-400">
                <Cloud className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <h3 className="text-sm font-semibold text-slate-300">Cloud Storage & Backups</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Synchronize design files with Kankali Drive, GitHub, and local `.fig` disk backups.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#2d2d2d] bg-[#1a1a1a] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setRememberInBrowser(!rememberInBrowser)}
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                rememberInBrowser ? 'bg-[#3b82f6]' : 'bg-[#3d3d3d]'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 ${
                  rememberInBrowser ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <div>
              <span className="text-xs text-slate-300 font-medium">Remember credentials on this browser</span>
              <span className="block text-[10px] text-slate-500">Credentials: encrypted browser storage</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {saveStatus && (
              <span className="text-xs text-emerald-400 font-medium">{saveStatus}</span>
            )}
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-5 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {isSaving ? 'Saving...' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
