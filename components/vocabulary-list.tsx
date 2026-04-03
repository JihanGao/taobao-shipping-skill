"use client";

import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Trash2, CheckSquare, Square, Star } from "lucide-react";
import { Locale } from "@/lib/types";
import { t } from "@/lib/i18n";
import {
  getVocabularyDisplayTerm,
  getVocabularySummary,
  extractVocabularyExample,
  getPartOfSpeechAbbrev,
  formatDateOnly,
  cn
} from "@/lib/utils";

type VocabItem = {
  id: number;
  language: string;
  term?: string | null;
  reading?: string | null;
  learnerPrompt?: string | null;
  aiAnswer: string | null;
  summaryJson?: string | null;
  chatTranscriptJson?: string | null;
  partOfSpeech?: string | null;
  partOfSpeech_zh?: string | null;
  partOfSpeech_en?: string | null;
  exampleSentence?: string | null;
  exampleTranslation?: string | null;
  createdAt?: Date | string | null;
  isFavorite?: boolean;
};

type VocabularyListProps = {
  initialItems: VocabItem[];
  locale: Locale;
  languageFilter?: string;
  filterKey?: string;
  favoritesActive?: boolean;
  onFavoritesFilterClick?: () => void;
};

export function VocabularyList({
  initialItems,
  locale,
  languageFilter,
  filterKey = "",
  favoritesActive = false,
  onFavoritesFilterClick
}: VocabularyListProps) {
  const copy = t(locale);
  const [items, setItems] = useState<VocabItem[]>(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [filterKey]);
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ count: number; deletedItems: VocabItem[] } | null>(null);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  }, [items, selectedIds.size]);

  const exitEditMode = useCallback(() => {
    setEditMode(false);
    setSelectedIds(new Set());
  }, []);

  const performDelete = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return;
      setDeleting(true);
      const toRemove = items.filter((i) => ids.includes(i.id));
      setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
      try {
        const res = await fetch("/api/library/vocabulary", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids })
        });
        if (res.ok) {
          setToast({ count: ids.length, deletedItems: toRemove });
          exitEditMode();
          setTimeout(() => setToast(null), 6000);
        } else {
          setItems((prev) => [...toRemove, ...prev].sort((a, b) => b.id - a.id));
        }
      } catch {
        setItems((prev) => [...toRemove, ...prev].sort((a, b) => b.id - a.id));
      } finally {
        setDeleting(false);
      }
    },
    [items, exitEditMode]
  );

  const handleUndo = useCallback(async () => {
    if (!toast) return;
    const ids = toast.deletedItems.map((i) => i.id);
    try {
      const res = await fetch("/api/library/vocabulary", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids })
      });
      if (res.ok) {
        setItems((prev) => [...toast.deletedItems, ...prev].sort((a, b) => b.id - a.id));
      }
    } catch {
      const params = new URLSearchParams();
      if (languageFilter) params.set("language", languageFilter);
      if (favoritesActive) params.set("favorites", "1");
      const listRes = await fetch(`/api/library/vocabulary?${params}`);
      if (listRes.ok) {
        const list = await listRes.json();
        setItems(list);
      }
    }
    setToast(null);
  }, [toast, languageFilter, favoritesActive]);

  const handleSingleDelete = useCallback(
    (e: React.MouseEvent, id: number) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.confirm(copy.vocabDeleteConfirm.replace("{count}", "1"))) {
        performDelete([id]);
      }
    },
    [copy.vocabDeleteConfirm, performDelete]
  );

  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (window.confirm(copy.vocabDeleteConfirm.replace("{count}", String(ids.length)))) {
      performDelete(ids);
    }
  }, [selectedIds, copy.vocabDeleteConfirm, performDelete]);

  const handleFavoriteToggle = useCallback(
    async (e: React.MouseEvent, id: number) => {
      e.preventDefault();
      e.stopPropagation();
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const next = !item.isFavorite;
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, isFavorite: next } : i))
      );
      try {
        await fetch(`/api/library/vocabulary/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isFavorite: next })
        });
      } catch {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, isFavorite: !next } : i))
        );
      }
    },
    [items]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm text-slate-500">
            {copy.vocabWordCount.replace("{count}", String(items.length))}
          </span>
          {onFavoritesFilterClick ? (
            <button
              type="button"
              onClick={onFavoritesFilterClick}
              className={cn(
                "flex items-center gap-1.5 text-sm transition rounded-lg px-2 py-1 -mx-2",
                favoritesActive
                  ? "text-amber-600 bg-amber-50"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              )}
            >
              <Star
                className={cn("size-4 shrink-0", favoritesActive && "fill-amber-500 text-amber-500")}
              />
              <span>{copy.vocabFavorites}</span>
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          className={cn(
            "text-sm font-medium transition shrink-0",
            editMode
              ? "text-ink"
              : "text-purple-600 hover:text-purple-700"
          )}
        >
          {editMode ? copy.cancel : copy.vocabEdit}
        </button>
      </div>

      {editMode && items.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-sm font-medium text-slate-700">
            {copy.vocabSelectedCount.replace("{count}", String(selectedIds.size))}
          </span>
          <button
            type="button"
            onClick={selectAll}
            className="text-sm font-semibold text-purple-600 hover:text-purple-700"
          >
            {copy.vocabSelectAll}
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0 || deleting}
            className="rounded-xl bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-200 disabled:opacity-50"
          >
            {copy.vocabDelete}
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((item, index) => {
          const selected = selectedIds.has(item.id);
          const posAbbrev =
            getPartOfSpeechAbbrev(item.partOfSpeech) ??
            getPartOfSpeechAbbrev(locale === "zh" ? item.partOfSpeech_zh : item.partOfSpeech_en);
          const example =
            item.exampleSentence && item.exampleTranslation
              ? { sentence: item.exampleSentence, translation: item.exampleTranslation }
              : extractVocabularyExample(item.aiAnswer ?? "");
          const dateStr =
            item.createdAt != null ? formatDateOnly(item.createdAt, locale) : null;

          const cardContent = (
            <>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="text-xl font-bold text-gray-900">
                      {getVocabularyDisplayTerm({ ...item, aiAnswer: item.aiAnswer ?? "" })}
                    </h3>
                    {posAbbrev && posAbbrev !== "other" ? (
                      <span className="text-sm text-gray-400">{posAbbrev}</span>
                    ) : null}
                    <span className="text-sm font-medium text-purple-600">
                      {item.language}
                    </span>
                  </div>
                </div>
                {!editMode ? (
                  <button
                    type="button"
                    onClick={(e) => handleFavoriteToggle(e, item.id)}
                    className={cn(
                      "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                      item.isFavorite
                        ? "bg-amber-50 text-amber-500"
                        : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-500"
                    )}
                    aria-label={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Star
                      className={cn("size-5", item.isFavorite && "fill-amber-500 text-amber-500")}
                    />
                  </button>
                ) : null}
              </div>

              <p className="text-base text-gray-800 mb-4 line-clamp-2">
                {getVocabularySummary({ ...item, aiAnswer: item.aiAnswer ?? "" }, locale)}
              </p>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mb-4">
                {example ? (
                  <>
                    <p className="text-sm text-gray-700 italic mb-1">
                      &quot;{example.sentence}&quot;
                    </p>
                    <p className="text-sm text-gray-500">
                      {example.translation}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 italic">{copy.vocabNoExample}</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                {dateStr ? (
                  <p className="text-xs text-gray-400">{dateStr}</p>
                ) : (
                  <span />
                )}
                {!editMode ? (
                  <button
                    type="button"
                    onClick={(e) => handleSingleDelete(e, item.id)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg px-2 py-1 -mr-2 transition-colors"
                    aria-label={copy.vocabDelete}
                  >
                    <Trash2 className="size-3.5" />
                    <span>{copy.vocabDelete}</span>
                  </button>
                ) : null}
              </div>
            </>
          );

          const cardClassName = cn(
            "bg-white rounded-xl p-5 shadow-sm border transition-all block h-full flex flex-col",
            selected ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:shadow-md"
          );

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.3) }}
              className="relative flex items-stretch"
            >
              {editMode ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleSelect(item.id);
                  }}
                  className="mt-5 shrink-0 mr-3 text-slate-400 hover:text-ink"
                  aria-label={selected ? "Deselect" : "Select"}
                >
                  {selected ? (
                    <CheckSquare className="size-5" />
                  ) : (
                    <Square className="size-5" />
                  )}
                </button>
              ) : null}
              {editMode ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    toggleSelect(item.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleSelect(item.id);
                    }
                  }}
                  className={cn(cardClassName, editMode ? "flex-1 min-w-0 cursor-pointer" : "")}
                >
                  {cardContent}
                </div>
              ) : (
                <Link
                  href={`/vocabulary/${item.id}`}
                  className={cn(cardClassName, "flex-1 min-w-0 hover:border-gray-300")}
                >
                  {cardContent}
                </Link>
              )}
            </motion.div>
          );
        })}
      </div>

      {toast ? (
        <div
          className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-lg"
          role="status"
        >
          <span className="text-sm font-medium text-slate-800">
            {copy.vocabDeletedToast.replace("{count}", String(toast.count))}
          </span>
          <button
            type="button"
            onClick={handleUndo}
            className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-200"
          >
            {copy.vocabUndo}
          </button>
        </div>
      ) : null}
    </div>
  );
}
