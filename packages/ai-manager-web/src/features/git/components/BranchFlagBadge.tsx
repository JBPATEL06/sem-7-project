import React, { useState } from 'react';
import { Badge, Button } from '@/shared/ui';
import { Flag, AlertTriangle, CheckCircle, ShieldAlert, Sparkles, MessageSquare, ChevronDown } from 'lucide-react';
import { BranchFlagItem } from '../hooks/useGit';

interface BranchFlagBadgeProps {
  branch: string;
  flag?: BranchFlagItem;
  onUpdateFlag: (status: 'green' | 'red' | 'problem' | 'neutral', note?: string) => Promise<any>;
  readOnly?: boolean;
  align?: 'left' | 'right';
}

export const BranchFlagBadge: React.FC<BranchFlagBadgeProps> = ({
  branch,
  flag,
  onUpdateFlag,
  readOnly = false,
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'green' | 'red' | 'problem' | 'neutral'>(
    flag?.status || 'neutral'
  );
  const [note, setNote] = useState(flag?.note || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const status = flag?.status || 'neutral';

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await onUpdateFlag(selectedStatus, note);
      setIsOpen(false);
    } catch (e) {
      console.error('Failed to update flag', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusConfig = (st: string) => {
    switch (st) {
      case 'green':
        return {
          label: 'Green Flag',
          desc: 'Ready to Merge / Clean / Verified',
          badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25',
          dotClass: 'bg-emerald-400',
          icon: CheckCircle
        };
      case 'red':
        return {
          label: 'Red Flag',
          desc: 'Blocking / Schema Breaking / Do Not Merge',
          badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25',
          dotClass: 'bg-rose-400',
          icon: ShieldAlert
        };
      case 'problem':
        return {
          label: 'Problem Flag',
          desc: 'Merge Conflicts / Active Warning / Needs Review',
          badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25',
          dotClass: 'bg-amber-400',
          icon: AlertTriangle
        };
      default:
        return {
          label: 'No Flag',
          desc: 'Default / In Development',
          badgeClass: 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
          dotClass: 'bg-muted-foreground',
          icon: Flag
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        disabled={readOnly}
        onClick={() => {
          setSelectedStatus(flag?.status || 'neutral');
          setNote(flag?.note || '');
          setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${config.badgeClass}`}
        title={flag?.note ? `${config.label}: "${flag.note}"` : config.label}
      >
        <span className={`size-2 rounded-full ${config.dotClass} animate-pulse`} />
        <Icon className="size-3.5" />
        <span>{config.label}</span>
        {!readOnly && <ChevronDown className="size-3 opacity-60 ml-0.5" />}
      </button>

      {/* Popover */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 w-72 bg-popover text-popover-foreground border border-border shadow-2xl rounded-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-3`}>
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-semibold">Set Branch Status Flag</span>
              <span className="text-[10px] font-mono text-muted-foreground">{branch}</span>
            </div>

            {/* Status Options */}
            <div className="grid grid-cols-1 gap-1.5">
              {[
                { st: 'green', label: '🟢 Green Flag (Ready to Merge)', desc: 'Clean, verified & safe' },
                { st: 'problem', label: '🟡 Problem (Needs Review)', desc: 'Conflicts or pending migrations' },
                { st: 'red', label: '🔴 Red Flag (Blocking)', desc: 'Schema breaking or critical issue' },
                { st: 'neutral', label: '⚪ Neutral (Standard)', desc: 'No special flag' }
              ].map((opt) => (
                <button
                  key={opt.st}
                  type="button"
                  onClick={() => setSelectedStatus(opt.st as any)}
                  className={`flex flex-col text-left p-2 rounded-lg text-xs transition-colors cursor-pointer border ${
                    selectedStatus === opt.st
                      ? 'bg-primary/10 border-primary/40 text-primary font-medium'
                      : 'border-transparent hover:bg-muted/60 text-foreground'
                  }`}
                >
                  <span className="text-xs">{opt.label}</span>
                  <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>

            {/* Note input */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <MessageSquare className="size-3" /> Note / Reason (Optional)
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Verified auth tables, no schema breaks"
                className="w-full text-xs bg-background border border-border rounded-md p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2.5"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isSubmitting}
                onClick={handleSave}
                className="text-xs h-7 px-3 bg-primary text-primary-foreground font-medium cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Save Flag'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
