import { JsonStore } from '../../shared/index.js';

export interface SemanticProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'elevated' | 'glassmorphic' | 'success' | 'warning' | 'info' | 'neutral' | string;
  size?: 'sm' | 'md' | 'lg';
  inputType?: 'text' | 'email' | 'password' | 'search' | 'number';
  chartType?: 'line' | 'bar' | 'donut' | 'waveform';
  scaleToken?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  weightToken?: 'regular' | 'medium' | 'semiBold' | 'bold';
  colorToken?: 'primary' | 'secondary' | 'muted' | 'accent' | 'danger';
  radiusToken?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  spacingToken?: number;
  states?: {
    default?: Record<string, any>;
    hover?: Record<string, any>;
    focus?: Record<string, any>;
    active?: Record<string, any>;
    disabled?: Record<string, any>;
  };
  meta?: Record<string, any>;
}

export interface DesignSystemTokens {
  id: string;
  projectId: string;
  name: string;
  themeName: 'violet' | 'emerald' | 'azure' | 'minimal-light' | string;
  colors: {
    primary: string;
    primaryHover: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    surfaceHover: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    danger: string;
    warning: string;
    success: string;
  };
  typography: {
    fontFamily: string;
    scale: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      '2xl': number;
      '3xl': number;
    };
    weights: {
      regular: string;
      medium: string;
      semiBold: string;
      bold: string;
    };
    lineHeights: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
  spacing: {
    scale: Record<string, number>;
    baseGrid: number;
  };
  radii: {
    none: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
    full: number;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    glow: string;
  };
}

export interface AstPropertyDiff {
  componentId: string;
  componentName: string;
  field: string;
  oldValue: any;
  newValue: any;
  description: string;
}

export interface LayoutComponent {
  id: string;
  name: string;
  type: 'frame' | 'rect' | 'circle' | 'text' | 'button' | 'input' | 'card' | 'table' | 'badge' | 'avatar' | 'chart' | 'navbar' | 'sidebar';
  semantic?: SemanticProps;
  x: number;
  y: number;
  width: number;
  height: number;
  fills?: Array<{ fillOpacity?: number; fillColor?: string }>;
  strokes?: Array<{ strokeColor?: string; strokeWidth?: number }>;
  borderRadius?: number;
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  layout?: 'flex' | 'grid' | 'none';
  flexDir?: 'row' | 'column';
  gap?: number;
  padding?: number;
  children?: LayoutComponent[];
  props?: Record<string, any>;
}

export interface LayoutBoard {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  background: string;
  components: LayoutComponent[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  stepsCount?: number;
  changesSummary?: string;
  metadata?: {
    mode?: string;
    intent?: string;
    theme?: string;
    dimensions?: { width: number; height: number };
  };
}

export interface ScreenLayoutSpec {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  description: string;
  board: LayoutBoard;
  theme: {
    primaryColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    accentColor: string;
    borderRadius: number;
  };
  designTokens?: DesignSystemTokens;
  chatHistory?: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export const localScreenStore = new JsonStore<ScreenLayoutSpec>('screens.json');
export const designTokensStore = new JsonStore<DesignSystemTokens>('design_tokens.json');

export const DEFAULT_SCREEN_THEME = {
  primaryColor: '#7c3aed',
  backgroundColor: '#090d16',
  surfaceColor: '#131b2e',
  textColor: '#f8fafc',
  accentColor: '#10b981',
  borderRadius: 12
};

export function getDefaultDesignTokens(themeName: string = 'violet', projectId: string = 'global'): DesignSystemTokens {
  const isLight = themeName === 'light' || themeName === 'minimal-light';
  const isEmerald = themeName === 'emerald';
  const isAzure = themeName === 'azure' || themeName === 'blue';

  let primary = '#7c3aed';
  let primaryHover = '#6d28d9';
  let secondary = '#3b82f6';
  let accent = '#10b981';

  if (isEmerald) {
    primary = '#10b981';
    primaryHover = '#059669';
    secondary = '#06b6d4';
    accent = '#8b5cf6';
  } else if (isAzure) {
    primary = '#2563eb';
    primaryHover = '#1d4ed8';
    secondary = '#0284c7';
    accent = '#f59e0b';
  }

  return {
    id: `tokens_${projectId}_${themeName}`,
    projectId,
    name: `${themeName.charAt(0).toUpperCase() + themeName.slice(1)} Design System`,
    themeName,
    colors: {
      primary,
      primaryHover,
      secondary,
      accent,
      background: isLight ? '#f8fafc' : '#090d16',
      surface: isLight ? '#ffffff' : '#131b2e',
      surfaceHover: isLight ? '#f1f5f9' : '#1e293b',
      border: isLight ? '#e2e8f0' : '#1e293b',
      textPrimary: isLight ? '#0f172a' : '#f8fafc',
      textSecondary: isLight ? '#475569' : '#94a3b8',
      textMuted: isLight ? '#94a3b8' : '#64748b',
      danger: '#ef4444',
      warning: '#f59e0b',
      success: '#10b981'
    },
    typography: {
      fontFamily: "'Inter', -apple-system, sans-serif",
      scale: {
        xs: 11,
        sm: 13,
        md: 15,
        lg: 18,
        xl: 22,
        '2xl': 28,
        '3xl': 36
      },
      weights: {
        regular: '400',
        medium: '500',
        semiBold: '600',
        bold: '700'
      },
      lineHeights: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75
      }
    },
    spacing: {
      scale: {
        0: 0,
        1: 4,
        2: 8,
        3: 12,
        4: 16,
        5: 20,
        6: 24,
        8: 32,
        10: 40,
        12: 48,
        16: 64
      },
      baseGrid: 4
    },
    radii: {
      none: 0,
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
      '2xl': 24,
      full: 9999
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
      glow: `0 0 20px ${primary}44`
    }
  };
}
