"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownAnswer({ content }: { content: string }) {
  return (
    <div className="prose prose-slate max-w-none prose-p:my-1.5 prose-p:leading-6 prose-li:my-0.5 prose-li:leading-6 prose-strong:font-semibold prose-strong:text-slate-950 prose-blockquote:border-l-4 prose-blockquote:border-sun prose-blockquote:pl-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="mt-4 mb-2 text-[1.05rem] font-bold leading-tight text-slate-950">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 mb-1.5 text-[1rem] font-semibold leading-tight text-slate-900">
              {children}
            </h3>
          ),
          hr: () => <hr className="my-4 border-0 border-t border-slate-300/90" />,
          p: ({ children }) => <p className="text-[0.98rem] leading-6 text-slate-800">{children}</p>,
          ul: ({ children }) => <ul className="my-2 space-y-0.5 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 space-y-0.5 pl-5">{children}</ol>,
          li: ({ children }) => <li className="leading-6 text-slate-800">{children}</li>,
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full table-fixed border-collapse text-left text-sm leading-6">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-slate-200">{children}</tbody>,
          tr: ({ children }) => <tr className="align-top">{children}</tr>,
          th: ({ children }) => (
            <th className="w-1/3 border-b border-r border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-900 last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="w-1/3 border-r border-slate-200 px-4 py-3 align-top whitespace-pre-wrap break-words text-sm text-slate-700 last:border-r-0">
              {children}
            </td>
          ),
          code: ({ children }) => (
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.95em] text-slate-800">
              {children}
            </code>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
