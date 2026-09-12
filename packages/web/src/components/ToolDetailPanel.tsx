import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Play, Loader2 } from 'lucide-react';
import type { ToolInfo, CallToolResponse, ApiError } from '@mcp-playground/shared';
import { SplitPane } from './SplitPane.js';
import { ResultViewer, type ResultTab } from './ResultViewer.js';
import { schemaToFields, initialValues, buildArguments, type FormField } from '../lib/schemaForm.js';
import { api } from '../api/client.js';
import { cn } from '../lib/cn.js';

interface Props {
  sessionId: string;
  tool: ToolInfo;
}

export function ToolDetailPanel({ sessionId, tool }: Props) {
  const fields = useMemo(() => schemaToFields(tool.inputSchema), [tool]);
  const [values, setValues] = useState<Record<string, unknown>>(() => initialValues(fields));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues(initialValues(fields));
    setErrors({});
  }, [tool.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation<CallToolResponse, ApiError>({
    mutationFn: () => {
      const { args, errors: errs } = buildArguments(fields, values);
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return Promise.reject({ code: 'VALIDATION', message: 'Please check required fields and argument formats' } as ApiError);
      }
      setErrors({});
      return api.callTool(sessionId, tool.name, args);
    },
  });

  const tabs: ResultTab[] = useMemo(() => {
    const r = mutation.data;
    if (!r) return [];
    const list: ResultTab[] = [];
    if (r.structuredContent !== undefined)
      list.push({ id: 'structured', label: 'structured', value: r.structuredContent });
    list.push({ id: 'content', label: 'content', value: r.content });
    list.push({ id: 'raw', label: 'raw', value: r });
    return list;
  }, [mutation.data]);

  const request = (
    <>
      <div className="flex-none h-[42px] flex items-center gap-2.5 px-[18px] border-b border-stone-200 bg-stone-50">
        <span className="font-mono text-[10.5px] font-bold tracking-[0.12em] text-ink-2">REQUEST</span>
        <span className="font-mono text-[13.5px] font-semibold text-ink-0">
          <span className="text-teal-700">{tool.name}</span>()
        </span>
        <button
          className="ml-auto inline-flex items-center gap-1.5 bg-ink-0 text-white text-[12.5px] font-semibold px-4 py-2 rounded-lg hover:bg-black transition active:translate-y-px disabled:opacity-60"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
          Run
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scroll-slim px-[18px] py-4 animate-fadeUp">
        {tool.description && (
          <div className="text-[12.5px] text-ink-1 leading-relaxed mb-4 px-3 py-2.5 bg-stone-50 border border-stone-200 border-l-[3px] border-l-teal-500 rounded-r-[9px]">
            {tool.description}
          </div>
        )}
        {fields.length === 0 && (
          <div className="text-[12.5px] text-ink-2 font-mono py-3">This tool has no input arguments.</div>
        )}
        {fields.map((f) => (
          <FieldControl
            key={f.name}
            field={f}
            value={values[f.name]}
            error={errors[f.name]}
            onChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))}
          />
        ))}
      </div>
    </>
  );

  const response = (
    <ResultViewer
      loading={mutation.isPending}
      error={mutation.isError ? (mutation.error as ApiError)?.message : null}
      isError={mutation.data?.isError}
      elapsedMs={mutation.data?.elapsedMs}
      tabs={tabs}
    />
  );

  return <SplitPane top={request} bottom={response} />;
}

function FieldControl({
  field,
  value,
  error,
  onChange,
}: {
  field: FormField;
  value: unknown;
  error?: string;
  onChange: (v: unknown) => void;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-mono text-[12.5px] font-semibold">{field.name}</span>
        <span className="font-mono text-[10px] px-1.5 py-px rounded bg-stone-150 text-ink-1">{field.type}</span>
        {field.required ? (
          <span className="font-mono text-[10px] text-brand-red font-bold">required</span>
        ) : (
          <span className="font-mono text-[10px] text-ink-3">optional</span>
        )}
        {error && <span className="ml-auto font-mono text-[10px] text-brand-red">{error}</span>}
      </div>
      {field.description && (
        <div className="text-[11px] text-ink-2 mb-1.5 leading-snug">{field.description}</div>
      )}
      {field.type === 'boolean' ? (
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="accent-teal-600 w-4 h-4 cursor-pointer"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="font-mono text-[12.5px] text-ink-1">{String(Boolean(value))}</span>
        </label>
      ) : field.type === 'enum' ? (
        <select
          className={inputCls(error)}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">(none selected)</option>
          {field.enumValues?.map((ev) => (
            <option key={String(ev)} value={String(ev)}>
              {String(ev)}
            </option>
          ))}
        </select>
      ) : field.type === 'json' ? (
        <textarea
          className={cn(inputCls(error), 'h-24 py-2 resize-y leading-relaxed')}
          placeholder={field.placeholder}
          spellCheck={false}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={inputCls(error)}
          placeholder={field.placeholder}
          spellCheck={false}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function inputCls(error?: string): string {
  return cn(
    'w-full h-[38px] border rounded-lg bg-white px-3 font-mono text-[12.5px] text-ink-0 outline-none transition',
    error
      ? 'border-brand-red focus:ring-4 focus:ring-brand-red/15'
      : 'border-stone-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15',
  );
}
