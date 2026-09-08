import React, { useState, createContext, useContext } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectContextType {
  value: string;
  onValueChange: (val: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextType | null>(null);

export interface SelectProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ defaultValue = '', value: controlledValue, onValueChange, children }) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const handleValueChange = (val: string) => {
    if (controlledValue === undefined) setInternalValue(val);
    onValueChange?.(val);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ value, onValueChange: handleValueChange, open, setOpen }}>
      <div className="relative inline-block text-left">{children}</div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className = '', children, ...props }, ref) => {
    const ctx = useContext(SelectContext);
    return (
      <button
        ref={ref}
        type="button"
        onClick={() => ctx?.setOpen(!ctx.open)}
        className={`flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground cursor-pointer ${className}`}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50 ml-2 shrink-0" />
      </button>
    );
  }
);
SelectTrigger.displayName = 'SelectTrigger';

export const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
  const ctx = useContext(SelectContext);
  return <span>{ctx?.value || placeholder || 'Select...'}</span>;
};

export const SelectContent: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = '',
  children
}) => {
  const ctx = useContext(SelectContext);
  if (!ctx?.open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => ctx.setOpen(false)} />
      <div
        className={`absolute left-0 mt-1 w-full min-w-[8rem] overflow-hidden rounded-md border border-border bg-card p-1 text-foreground shadow-md z-50 animate-in fade-in-80 ${className}`}
      >
        {children}
      </div>
    </>
  );
};

export const SelectItem: React.FC<{ value: string; className?: string; children: React.ReactNode }> = ({
  value,
  className = '',
  children
}) => {
  const ctx = useContext(SelectContext);
  const isSelected = ctx?.value === value;

  return (
    <div
      onClick={() => ctx?.onValueChange(value)}
      className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-primary/20 hover:text-primary ${
        isSelected ? 'bg-primary/15 text-primary font-medium' : 'text-foreground'
      } ${className}`}
    >
      {children}
    </div>
  );
};
