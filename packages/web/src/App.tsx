import { useMemo } from 'react';
import { Boxes, MousePointerClick } from 'lucide-react';
import { ConnectionBar } from './components/ConnectionBar.js';
import { ConnectionSidebar } from './components/ConnectionSidebar.js';
import { CapabilityList } from './components/CapabilityList.js';
import { ToolDetailPanel } from './components/ToolDetailPanel.js';
import { ResourcePromptPanel } from './components/ResourcePromptPanel.js';
import { SchemaInspector } from './components/SchemaInspector.js';
import { ErrorToast } from './components/ErrorToast.js';
import { useAppStore } from './store/appStore.js';
import { useCapabilities } from './hooks/useCapabilities.js';

export default function App() {
  const sessionId = useAppStore((s) => s.sessionId);
  const selection = useAppStore((s) => s.selection);
  const { data } = useCapabilities(sessionId);

  const selected = useMemo(() => {
    if (!selection || !data) return null;
    if (selection.kind === 'tool') {
      const tool = data.tools.find((t) => t.name === selection.key);
      return tool ? { kind: 'tool' as const, tool } : null;
    }
    if (selection.kind === 'resource') {
      const resource = data.resources.find((r) => r.uri === selection.key);
      return resource ? { kind: 'resource' as const, resource } : null;
    }
    const prompt = data.prompts.find((p) => p.name === selection.key);
    return prompt ? { kind: 'prompt' as const, prompt } : null;
  }, [selection, data]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <ConnectionBar />
      <div className="flex-1 flex min-h-0">
        <ConnectionSidebar />
        {sessionId && <CapabilityList />}

        <section className="relative flex-1 flex flex-col min-w-0 min-h-0 bg-stone-100">
          {!sessionId ? (
            <CenterEmpty
              icon={<Boxes className="w-9 h-9" />}
              title="Not connected to an MCP Server"
              hint="Enter the Server URL and Headers above, then click “Connect” — or pick a saved connection on the left."
            />
          ) : !selected ? (
            <CenterEmpty
              icon={<MousePointerClick className="w-9 h-9" />}
              title="Select a capability"
              hint="Pick a Tool / Resource / Prompt on the left, then fill in arguments and run it here."
            />
          ) : selected.kind === 'tool' ? (
            <ToolDetailPanel key={selected.tool.name} sessionId={sessionId} tool={selected.tool} />
          ) : selected.kind === 'resource' ? (
            <ResourcePromptPanel
              key={selected.resource.uri}
              kind="resource"
              sessionId={sessionId}
              resource={selected.resource}
            />
          ) : (
            <ResourcePromptPanel
              key={selected.prompt.name}
              kind="prompt"
              sessionId={sessionId}
              prompt={selected.prompt}
            />
          )}

          <ErrorToast />
        </section>

        <SchemaInspector {...(selected ?? { kind: 'none' })} />
      </div>
    </div>
  );
}

function CenterEmpty({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 animate-fadeUp">
      <div className="w-16 h-16 rounded-2xl bg-stone-0 border border-stone-200 grid place-items-center text-teal-700 shadow-sm mb-4">
        {icon}
      </div>
      <h2 className="font-display text-[17px] font-bold text-ink-0 mb-1.5">{title}</h2>
      <p className="text-[13px] text-ink-2 max-w-[340px] leading-relaxed">{hint}</p>
    </div>
  );
}
