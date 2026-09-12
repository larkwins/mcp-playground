import type { ReactNode } from 'react';

/** 将任意 JSON 值渲染为带语法高亮的 React 片段。 */
export function JsonHighlight({ value }: { value: unknown }) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return <>{highlight(text)}</>;
}

function highlight(json: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // 匹配字符串(含 key)、数字、布尔/null、标点
  const regex =
    /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],])/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(json)) !== null) {
    if (m.index > lastIndex) nodes.push(json.slice(lastIndex, m.index));
    if (m[1]) {
      // 字符串；若后接冒号则为 key
      if (m[2]) {
        nodes.push(
          <span key={i++} className="text-sky-300">
            {m[1]}
          </span>,
        );
        nodes.push(
          <span key={i++} className="text-[#4b6b67]">
            {m[2]}
          </span>,
        );
      } else {
        nodes.push(
          <span key={i++} className="text-emerald-300">
            {m[1]}
          </span>,
        );
      }
    } else if (m[3]) {
      nodes.push(
        <span key={i++} className="text-orange-300">
          {m[3]}
        </span>,
      );
    } else if (m[4]) {
      nodes.push(
        <span key={i++} className="text-violet-300">
          {m[4]}
        </span>,
      );
    } else if (m[5]) {
      nodes.push(
        <span key={i++} className="text-[#4b6b67]">
          {m[5]}
        </span>,
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < json.length) nodes.push(json.slice(lastIndex));
  return nodes;
}
