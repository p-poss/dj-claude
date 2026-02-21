'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeDisplayProps {
  code: string;
  isStreaming: boolean;
  previousCode?: string;
}

// Custom dark theme overrides
const customStyle = {
  ...vscDarkPlus,
  'pre[class*="language-"]': {
    ...vscDarkPlus['pre[class*="language-"]'],
    background: 'transparent',
    margin: 0,
    padding: 0,
    fontSize: '14px',
    lineHeight: '1.6',
  },
  'code[class*="language-"]': {
    ...vscDarkPlus['code[class*="language-"]'],
    background: 'transparent',
    fontSize: '14px',
  },
};

export function CodeDisplay({ code, isStreaming, previousCode }: CodeDisplayProps) {
  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col font-mono">
      {/* Previous code - dimmed */}
      {previousCode && (
        <div className="opacity-30 mb-6 pb-6 border-b border-neutral-700/50">
          <div className="text-neutral-500 text-xs mb-2">// previous pattern</div>
          <SyntaxHighlighter
            language="javascript"
            style={customStyle}
            customStyle={{ background: 'transparent' }}
          >
            {previousCode}
          </SyntaxHighlighter>
        </div>
      )}

      {/* Current/streaming code */}
      <div className="flex-1">
        {code ? (
          <>
            <SyntaxHighlighter
              language="javascript"
              style={customStyle}
              customStyle={{ background: 'transparent' }}
            >
              {code}
            </SyntaxHighlighter>
            {isStreaming && <span className="cursor" />}
          </>
        ) : (
          <div className="text-neutral-500 text-sm">
            {isStreaming ? (
              <span className="cursor" />
            ) : (
              'Give DJ Claude a prompt above to start coding music!'
            )}
          </div>
        )}
      </div>
    </div>
  );
}
