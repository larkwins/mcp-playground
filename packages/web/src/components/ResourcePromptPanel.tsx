import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Play, Loader2, FileText, MessageSquareText } from 'lucide-react';
import type {
  ResourceInfo,
  PromptInfo,
  ReadResourceResponse,
  GetPromptResponse,
  ApiError,
} from '@mcp-playground/shared';
import { SplitPane } from './SplitPane.js';
import { ResultViewer, type ResultTab } from './ResultViewer.js';
import { api } from '../api/client.js';
import { cn } from '../lib/cn.js';

type Props =
  | { kind: 'resource'; sessionId: string; resource: ResourceInfo }
  | { kind: 'prompt'; sessionId: string; prompt: PromptInfo };

export function ResourcePromptPanel(props: Props) {
  if (props.kind === 'resource') {
    return <ResourcePanel sessionId={props.sessionId} resource={props.resource} />;
  }
  return <PromptPanel sessionId={props.sessionId} prompt={props.prompt} />;
}

function ResourcePanel({ sessionId, resource }: { sessionId: string; resource: ResourceInfo }) {
  const mutation = useMutation<ReadResourceResponse, ApiError>({
    mutationFn: () => api.readResource(sessionId, resource.uri),
  });

  const tabs: ResultTab[] = useMemo(() => {
    const r = mutation.data;
    if (!r) return [];
    return [
      { id: 'contents', label: 'contents', value: r.contents },
      { id: 'raw', label: 'raw', value: r },
    ];
  }, [mutation.data]);

  const request = (
    <>
      <PaneBar label="RESOURCE" title={resource.name ?? resource.uri} icon={<FileText className="w-3.5 h-3.5" />}>
        <RunButton pending={mutation.isPending} onClick={() => mutation.mutate()} text="Read" />
      </PaneBar>
      <div className="flex-1 overflow-y-auto scroll-slim px-[18px] py-4 animate-fadeUp">
        {resource.description && (
          <div className="text-[12.5px] text-ink-1 leading-relaxed mb-4 px-3 py-2.5 bg-stone-50 border border-stone-200 border-l-[3px] border-l-teal-500 rounded-r-[9px]">
            {resource.description}
          </div>
        )}
        <MetaLine k="uri" v={resource.uri} />
        {resource.mimeType && <MetaLine k="mimeType" v={resource.mimeType} />}
      </div>
    </>
  );

  return (
    <SplitPane
      top={request}
      bottom={
        <ResultViewer
          loading={mutation.isPending}
          error={mutation.isError ? (mutation.error as ApiError)?.message : null}
          elapsedMs={mutation.data?.elapsedMs}
          tabs={tabs}
          idleHint="// Click “Read” to fetch this resource's contents"
        />
      }
    />
  );
}

function PromptPanel({ sessionId, prompt }: { sessionId: string; prompt: PromptInfo }) {
  const args = prompt.arguments ?? [];
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => setValues({}), [prompt.name]);

  const mutation = useMutation<GetPromptResponse, ApiError>({
    mutationFn: () => {
      const payload: Record<string, string> = {};
      for (const a of args) {
        const v = values[a.name];
        if (v !== undefined && v !== '') payload[a.name] = v;
      }
      return api.getPrompt(sessionId, prompt.name, payload);
    },
  });

  const tabs: ResultTab[] = useMemo(() => {
    const r = mutation.data;
    if (!r) return [];
    return [
      { id: 'messages', label: 'messages', value: r.messages },
      { id: 'raw', label: 'raw', value: r },
    ];
  }, [mutation.data]);

  const request = (
    <>
      <PaneBar label="PROMPT" title={prompt.name} icon={<MessageSquareText className="w-3.5 h-3.5" />}>
        <RunButton pending={mutation.isPending} onClick={() => mutation.mutate()} text="Render" />
      </PaneBar>
      <div className="flex-1 overflow-y-auto scroll-slim px-[18px] py-4 animate-fadeUp">
        {prompt.description && (
          <div className="text-[12.5px] text-ink-1 leading-relaxed mb-4 px-3 py-2.5 bg-stone-50 border border-stone-200 border-l-[3px] border-l-teal-500 rounded-r-[9px]">
            {prompt.description}
          </div>
        )}
        {args.length === 0 && <div className="text-[12.5px] text-ink-2 font-mono py-3">This prompt has no arguments.</div>}
        {args.map((a) => (
          <div key={a.name} className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[12.5px] font-semibold">{a.name}</span>
              {a.required ? (
                <span className="font-mono text-[10px] text-brand-red font-bold">required</span>
              ) : (
                <span className="font-mono text-[10px] text-ink-3">optional</span>
              )}
            </div>
            {a.description && <div className="text-[11px] text-ink-2 mb-1.5 leading-snug">{a.description}</div>}
            <input
              className="w-full h-[38px] border border-stone-300 rounded-lg bg-white px-3 font-mono text-[12.5px] text-ink-0 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15"
              spellCheck={false}
              value={values[a.name] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [a.name]: e.target.value }))}
            />
          </div>
        ))}
      </div>
    </>
  );

  return (
    <SplitPane
      top={request}
      bottom={
        <ResultViewer
          loading={mutation.isPending}
          error={mutation.isError ? (mutation.error as ApiError)?.message : null}
          elapsedMs={mutation.data?.elapsedMs}
          tabs={tabs}
          idleHint="// Fill in arguments, then click “Render” to get prompt messages"
        />
      }
    />
  );
}

function PaneBar({
  label,
  title,
  icon,
  children,
}: {
  label: string;
  title: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex-none h-[42px] flex items-center gap-2.5 px-[18px] border-b border-stone-200 bg-stone-50">
      <span className="font-mono text-[10.5px] font-bold tracking-[0.12em] text-ink-2">{label}</span>
      <span className="inline-flex items-center gap-1.5 font-mono text-[13.5px] font-semibold text-ink-0 min-w-0">
        <span className="text-teal-700 flex-none">{icon}</span>
        <span className="truncate">{title}</span>
      </span>
      {children}
    </div>
  );
}

function RunButton({ pending, onClick, text }: { pending: boolean; onClick: () => void; text: string }) {
  return (
    <button
      className="ml-auto inline-flex items-center gap-1.5 bg-ink-0 text-white text-[12.5px] font-semibold px-4 py-2 rounded-lg hover:bg-black transition active:translate-y-px disabled:opacity-60 flex-none"
      onClick={onClick}
      disabled={pending}
    >
      {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
      {text}
    </button>
  );
}

function MetaLine({ k, v }: { k: string; v: string }) {
  return (
    <div className={cn('flex justify-between gap-4 py-1.5 border-b border-dashed border-stone-200 text-[12px]')}>
      <span className="font-mono text-ink-2 flex-none">{k}</span>
      <span className="font-mono text-ink-0 font-medium truncate text-right">{v}</span>
    </div>
  );
}
