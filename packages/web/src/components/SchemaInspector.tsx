import { useState } from 'react';
import { FileCode2, PanelRightClose, PanelRightOpen } from 'lucide-react';
import type { ToolInfo, ResourceInfo, PromptInfo, JsonSchema } from '@mcp-playground/shared';
import { cn } from '../lib/cn.js';

type Props =
  | { kind: 'tool'; tool: ToolInfo }
  | { kind: 'resource'; resource: ResourceInfo }
  | { kind: 'prompt'; prompt: PromptInfo }
  | { kind: 'none' };

const STORAGE_KEY = 'mcp-playground.inspector.collapsed';

export function SchemaInspector(props: Props) {
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY) === '1',
  );

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  };

  // Collapsed state: narrow vertical bar, click to expand
  if (collapsed) {
    return (
      <aside className="w-[42px] flex-none bg-stone-0 border-l border-stone-200 flex flex-col items-center min-h-0">
        <button
          className="flex-none w-full h-[42px] grid place-items-center border-b border-stone-200 text-ink-2 hover:text-teal-700 hover:bg-stone-50 transition"
          onClick={toggle}
          title="Expand Schema Inspector"
          aria-label="Expand Schema Inspector"
        >
          <PanelRightOpen className="w-[18px] h-[18px]" />
        </button>
        <button
          className="flex-1 w-full flex flex-col items-center gap-3 pt-4 text-ink-2 hover:text-teal-700 transition"
          onClick={toggle}
          aria-label="Expand Schema Inspector"
        >
          <FileCode2 className="w-4 h-4 text-teal-700" />
          <span
            className="font-mono text-[11px] font-bold tracking-[0.14em] uppercase"
            style={{ writingMode: 'vertical-rl' }}
          >
            Schema Inspector
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-[290px] flex-none bg-stone-0 border-l border-stone-200 flex flex-col min-h-0">
      <div className="flex-none h-[42px] flex items-center gap-2 px-4 border-b border-stone-200">
        <FileCode2 className="w-4 h-4 text-teal-700" />
        <h3 className="font-display text-[12.5px] font-bold">Schema Inspector</h3>
        <button
          className="ml-auto w-7 h-7 rounded-lg grid place-items-center text-ink-2 hover:text-teal-700 hover:bg-stone-100 transition"
          onClick={toggle}
          title="Collapse panel"
          aria-label="Collapse Schema Inspector"
        >
          <PanelRightClose className="w-[17px] h-[17px]" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scroll-slim p-4">
        {props.kind === 'none' && (
          <div className="text-[12px] text-ink-3 leading-relaxed pt-6 text-center">
            Select a capability to view its metadata and schema.
          </div>
        )}
        {props.kind === 'tool' && <ToolInspect tool={props.tool} />}
        {props.kind === 'resource' && <ResourceInspect resource={props.resource} />}
        {props.kind === 'prompt' && <PromptInspect prompt={props.prompt} />}
      </div>
    </aside>
  );
}

function ToolInspect({ tool }: { tool: ToolInfo }) {
  const ann = tool.annotations ?? {};
  return (
    <div className="animate-fadeUp">
      <Section title="Metadata">
        <MetaRow k="name" v={tool.name} teal />
        {tool.title && <MetaRow k="title" v={tool.title} />}
        {Object.entries(ann).map(([k, v]) => (
          <MetaRow key={k} k={k} v={String(v)} />
        ))}
      </Section>
      <Section title="Input Schema">
        <SchemaTree schema={tool.inputSchema} />
      </Section>
      {tool.outputSchema && (
        <Section title="Output Schema">
          <SchemaTree schema={tool.outputSchema} />
        </Section>
      )}
    </div>
  );
}

function ResourceInspect({ resource }: { resource: ResourceInfo }) {
  return (
    <div className="animate-fadeUp">
      <Section title="Metadata">
        <MetaRow k="uri" v={resource.uri} teal />
        {resource.name && <MetaRow k="name" v={resource.name} />}
        {resource.title && <MetaRow k="title" v={resource.title} />}
        {resource.mimeType && <MetaRow k="mimeType" v={resource.mimeType} />}
      </Section>
      {resource.description && (
        <Section title="Description">
          <p className="text-[12px] text-ink-1 leading-relaxed">{resource.description}</p>
        </Section>
      )}
    </div>
  );
}

function PromptInspect({ prompt }: { prompt: PromptInfo }) {
  return (
    <div className="animate-fadeUp">
      <Section title="Metadata">
        <MetaRow k="name" v={prompt.name} teal />
        {prompt.title && <MetaRow k="title" v={prompt.title} />}
        <MetaRow k="arguments" v={String(prompt.arguments?.length ?? 0)} />
      </Section>
      <Section title="Arguments">
        {(prompt.arguments ?? []).length === 0 && (
          <div className="font-mono text-[12px] text-ink-3">No arguments</div>
        )}
        {(prompt.arguments ?? []).map((a) => (
          <div key={a.name} className="tnode-line">
            <div className="pl-3.5 border-l-[1.5px] border-stone-200 ml-1 py-1.5 relative">
              <span className="absolute -left-[1.5px] top-3.5 w-2.5 h-[1.5px] bg-stone-200" />
              <span className="font-mono text-[12px] font-semibold text-ink-0">{a.name}</span>
              {a.required && <span className="font-mono text-[9.5px] text-brand-red ml-1">required</span>}
              {a.description && (
                <span className="block text-[11px] text-ink-2 mt-0.5 leading-snug">{a.description}</span>
              )}
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="font-mono text-[10px] font-bold tracking-[0.09em] uppercase text-ink-2 mb-2.5 flex items-center gap-2">
        {title}
        <span className="flex-1 h-px bg-stone-200" />
      </div>
      {children}
    </div>
  );
}

function MetaRow({ k, v, teal }: { k: string; v: string; teal?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-dashed border-stone-200 text-[12px]">
      <span className="font-mono text-ink-2 flex-none">{k}</span>
      <span className={cn('font-mono font-medium truncate text-right', teal ? 'text-teal-700' : 'text-ink-0')}>
        {v}
      </span>
    </div>
  );
}

function SchemaTree({ schema }: { schema?: JsonSchema }) {
  if (!schema || !schema.properties) {
    return <div className="font-mono text-[12px] text-ink-3">No schema defined</div>;
  }
  const required = new Set(schema.required ?? []);
  return (
    <div className="font-mono text-[12px] leading-normal">
      <div className="text-ink-2">object {'{'}</div>
      {Object.entries(schema.properties).map(([name, prop]) => (
        <div key={name} className="pl-3.5 border-l-[1.5px] border-stone-200 ml-1 py-1.5 relative">
          <span className="absolute -left-[1.5px] top-3.5 w-2.5 h-[1.5px] bg-stone-200" />
          <span className="font-semibold text-ink-0">{name}</span>
          <span className="text-teal-700">: {typeLabel(prop)}</span>
          {required.has(name) && <span className="text-[9.5px] text-brand-red ml-1">required</span>}
          {prop.description && (
            <span className="block font-sans text-[11px] text-ink-2 mt-0.5 leading-snug">
              {prop.description}
            </span>
          )}
        </div>
      ))}
      <div className="text-ink-2">{'}'}</div>
    </div>
  );
}

function typeLabel(schema: JsonSchema): string {
  if (schema.enum) return `enum(${schema.enum.map(String).join(' | ')})`;
  if (Array.isArray(schema.type)) return schema.type.join(' | ');
  return schema.type ?? 'any';
}
