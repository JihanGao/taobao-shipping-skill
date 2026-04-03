"use client";

export type VocabItem = {
  word: string;
  meaning?: string;
};

export function VocabList({ items }: { items: VocabItem[] }) {
  if (!items.length) return null;

  return (
    <div className="mt-3">
      <ul className="space-y-1 pl-5 text-sm text-slate-800">
        {items.map((it, idx) => (
          <li key={`${it.word}-${idx}`} className="list-disc">
            <span className="font-semibold">{it.word}</span>
            {it.meaning ? <span className="ml-3 text-xs font-normal text-slate-600">{it.meaning}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

