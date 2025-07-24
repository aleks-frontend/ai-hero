import ReactMarkdown, { type Components } from "react-markdown";
import type { Message } from "ai";

export type MessagePart = NonNullable<
  Message["parts"]
>[number];

interface ChatMessageProps {
  parts: MessagePart[];
  role: string;
  userName: string;
}

const components: Components = {
  // Override default elements with custom styling
  p: ({ children }) => <p className="mb-4 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ className, children, ...props }) => (
    <code className={`${className ?? ""}`} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-700 p-4">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-blue-400 underline inline-block max-w-full truncate align-bottom"
      style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', verticalAlign: 'bottom' }}
      target="_blank"
      rel="noopener noreferrer"
      title={props.href?.toString()}
      {...props}
    >
      {children}
    </a>
  ),
};

const Markdown = ({ children }: { children: string }) => {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
};

function ToolInvocationPart({ part }: { part: MessagePart }) {
  if (part.type !== "tool-invocation") return null;
  const { toolInvocation } = part;
  return (
    <div className="my-2 rounded bg-gray-700 p-3 text-sm text-gray-200">
      <div className="mb-4">
        <div className="mb-2">
          <span className="font-bold text-gray-300">Tool Call:</span>
          <span className="ml-2 text-gray-200">{toolInvocation.toolName}</span>
        </div>
        <div className="mb-2">
          <span className="font-bold text-gray-300">State:</span>
          <span className="ml-2 text-gray-200">{toolInvocation.state}</span>
        </div>
        <div>
          <span className="font-bold text-gray-300">Args:</span>
          <span className="ml-2 text-gray-200">{JSON.stringify(toolInvocation.args, null, 2)}</span>
        </div>
      </div>
      {"result" in toolInvocation && toolInvocation.result !== undefined && (
        <div className="mt-1 text-green-300">Result: <pre className="block whitespace-pre-wrap">{JSON.stringify(toolInvocation.result, null, 2)}</pre></div>
      )}
    </div>
  );
}

export const ChatMessage = ({ parts, role, userName }: ChatMessageProps) => {
  const isAI = role === "assistant";

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg p-4 ${
          isAI ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-300"
        }`}
      >
        <p className="mb-2 text-sm font-semibold text-gray-400">
          {isAI ? "AI" : userName}
        </p>
        <div className="prose prose-invert max-w-none break-words">
          {parts.map((part, idx) => {
            if (part.type === "text") {
              return <Markdown key={idx}>{part.text}</Markdown>;
            }
            if (part.type === "tool-invocation") {
              return <ToolInvocationPart key={idx} part={part} />;
            }
            // Encourage the user to hover or inspect for more types
            return null;
          })}
        </div>
      </div>
    </div>
  );
};
