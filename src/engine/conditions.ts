import type { Condition, Operator } from "./types";

export function compare(actual: unknown, operator: Operator, expected: unknown): boolean {
  switch (operator) {
    case "equals":
      return actual === expected;
    case "notEquals":
      return actual !== expected;
    case "includes":
      if (Array.isArray(actual)) return actual.includes(expected);
      return String(actual ?? "").includes(String(expected));
    case "notIncludes":
      if (Array.isArray(actual)) return !actual.includes(expected);
      return !String(actual ?? "").includes(String(expected));
    case "greaterThan":
      return Number(actual) > Number(expected);
    case "lessThan":
      return Number(actual) < Number(expected);
  }
}

export interface ConditionContext {
  inventory: string[];
  selectedItemId: string | null;
  globalState: Record<string, unknown>;
  objectState: (objectId: string) => { visible: boolean; enabled: boolean; state: string } | undefined;
}

export function evaluateCondition(condition: Condition, ctx: ConditionContext): boolean {
  switch (condition.type) {
    case "hasItem":
      return compare(ctx.inventory.includes(condition.itemId), condition.operator, condition.value);
    case "selectedItem":
      return compare(ctx.selectedItemId, condition.operator, condition.value);
    case "objectState":
      return compare(ctx.objectState(condition.targetId)?.state, condition.operator, condition.value);
    case "globalState":
      return compare(ctx.globalState[condition.key], condition.operator, condition.value);
    case "visible":
      return compare(ctx.objectState(condition.targetId)?.visible, condition.operator, condition.value);
    case "enabled":
      return compare(ctx.objectState(condition.targetId)?.enabled, condition.operator, condition.value);
    case "inputValue":
      return compare(ctx.objectState(condition.targetId)?.state, condition.operator, condition.value);
  }
}

export function evaluateConditions(conditions: Condition[], ctx: ConditionContext): boolean {
  return conditions.every((condition) => evaluateCondition(condition, ctx));
}
