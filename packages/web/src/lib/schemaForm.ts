import type { JsonSchema } from '@mcp-playground/shared';

export type FieldType = 'string' | 'number' | 'integer' | 'boolean' | 'enum' | 'json';

export interface FormField {
  name: string;
  type: FieldType;
  title: string;
  description?: string;
  required: boolean;
  default?: unknown;
  enumValues?: unknown[];
  placeholder?: string;
}

function normalizeType(schema: JsonSchema): FieldType {
  if (schema.enum && schema.enum.length > 0) return 'enum';
  const t = Array.isArray(schema.type) ? schema.type.find((x) => x !== 'null') : schema.type;
  switch (t) {
    case 'number':
      return 'number';
    case 'integer':
      return 'integer';
    case 'boolean':
      return 'boolean';
    case 'string':
      return 'string';
    case 'object':
    case 'array':
      return 'json';
    default:
      return 'string';
  }
}

/** 将对象型 inputSchema 拆解为扁平字段列表，用于渲染入参表单。 */
export function schemaToFields(schema?: JsonSchema): FormField[] {
  if (!schema || !schema.properties) return [];
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties).map(([name, prop]) => {
    const type = normalizeType(prop);
    return {
      name,
      type,
      title: prop.title ?? name,
      description: prop.description,
      required: required.has(name),
      default: prop.default,
      enumValues: prop.enum,
      placeholder: type === 'json' ? '{ }' : prop.format ? `${type} · ${prop.format}` : type,
    };
  });
}

/** 根据字段生成初始值。 */
export function initialValues(fields: FormField[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.default !== undefined) values[f.name] = f.default;
    else if (f.type === 'boolean') values[f.name] = false;
    else if (f.type === 'json') values[f.name] = '';
    else values[f.name] = '';
  }
  return values;
}

/** 将表单原始输入按类型强转为调用参数。 */
export function coerceValue(field: FormField, raw: unknown): unknown {
  if (raw === '' || raw === undefined || raw === null) return undefined;
  switch (field.type) {
    case 'number':
    case 'integer': {
      const n = Number(raw);
      return Number.isNaN(n) ? raw : n;
    }
    case 'boolean':
      return Boolean(raw);
    case 'json': {
      if (typeof raw !== 'string') return raw;
      const parsed = JSON.parse(raw);
      return parsed;
    }
    default:
      return raw;
  }
}

/** 组装最终调用参数，跳过空的可选字段；json 解析失败时抛错。 */
export function buildArguments(
  fields: FormField[],
  values: Record<string, unknown>,
): { args: Record<string, unknown>; errors: Record<string, string> } {
  const args: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const raw = values[f.name];
    if ((raw === '' || raw === undefined || raw === null) && !f.required) continue;
    if ((raw === '' || raw === undefined || raw === null) && f.required && f.type !== 'boolean') {
      errors[f.name] = 'Required';
      continue;
    }
    if (f.type === 'json' && typeof raw === 'string' && raw.trim()) {
      try {
        args[f.name] = JSON.parse(raw);
      } catch {
        errors[f.name] = 'Invalid JSON';
      }
      continue;
    }
    args[f.name] = coerceValue(f, raw);
  }
  return { args, errors };
}
