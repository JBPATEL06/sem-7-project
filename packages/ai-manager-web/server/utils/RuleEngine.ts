export interface Diagnostic {
  ruleId: string;
  severity: 'Critical' | 'Warning' | 'Minor';
  message: string;
  table?: string;
  column?: string;
}

export interface RuleContext {
  tables: string[];
  schemaDetails: Record<string, any[]>;
}

export interface Rule {
  id: string;
  evaluate(context: RuleContext): Diagnostic[];
}

export class RuleEngine {
  private rules: Rule[] = [];

  registerRule(rule: Rule) {
    this.rules.push(rule);
  }

  evaluateAll(context: RuleContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const rule of this.rules) {
      const results = rule.evaluate(context);
      diagnostics.push(...results);
    }
    return diagnostics;
  }
}
