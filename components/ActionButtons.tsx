"use client";

import { useMemo, useState } from "react";
import { Check, PlusSquare, Sparkles } from "lucide-react";

import type { VocabItem } from "@/components/VocabList";

type ActionButtonsProps = {
  items: VocabItem[];
  saveWordsToNotebook: (items: VocabItem[]) => Promise<void> | void;
  onSelectWords?: () => void;
};

export function ActionButtons({ items, saveWordsToNotebook, onSelectWords }: ActionButtonsProps) {
  const count = useMemo(() => items.length, [items.length]);
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleAddAll() {
    if (!count || saving) return;
    setSaving(true);
    try {
      await saveWordsToNotebook(items);
      setAdded(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Sparkles className="size-3 text-slate-400" />
        {count} words detected
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleAddAll}
          disabled={!count || saving}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            added
              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
              : "bg-amber-100 text-amber-800 hover:-translate-y-0.5 hover:bg-amber-200"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {added ? <Check className="size-4" /> : <PlusSquare className="size-4" />}
          {added ? "Added to notebook" : saving ? "Adding..." : "Add all to notebook"}
        </button>

        <button
          type="button"
          onClick={onSelectWords}
          disabled={!onSelectWords}
          className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
            onSelectWords
              ? "border-amber-200 bg-white/80 text-amber-800 hover:-translate-y-0.5 hover:bg-white"
              : "cursor-not-allowed border-slate-200 bg-white/40 text-slate-400"
          }`}
        >
          {onSelectWords ? "Select words" : "Select words"}
        </button>
      </div>

      {added ? <p className="text-xs text-emerald-700">Saved successfully.</p> : null}
    </div>
  );
}

