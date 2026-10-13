"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { AlignCenter, AlignLeft, ArrowLeft, Plus, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Align = "left" | "center";
type Field = "question" | "answer";
type Row = {
  key: string;
  id?: string;
  question: string;
  answer: string;
  question_align: Align;
  answer_align: Align;
};
type CardDb = Omit<Row, "key"> & { id: string };

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400 disabled:opacity-50";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-full border border-slate-500 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-violet-300 hover:text-violet-200 disabled:opacity-40";

let rowCounter = 0;
const blankRow = (): Row => ({
  key: `row-${++rowCounter}`,
  question: "",
  answer: "",
  question_align: "center",
  answer_align: "center",
});

function EditScreen() {
  const id = useSearchParams().get("id");
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [originalIds, setOriginalIds] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>("Yükleniyor…");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthReady(true);
    });
  }, [supabase]);

  useEffect(() => {
    if (!id || !authReady) return;
    let active = true;
    Promise.all([
      supabase.from("quizzes").select("owner_id, title").eq("id", id).maybeSingle(),
      supabase
        .from("cards")
        .select("id, question, answer, question_align, answer_align")
        .eq("quiz_id", id)
        .order("position")
        .order("created_at"),
    ]).then(([quizResult, cardResult]) => {
      if (!active) return;
      const failure = quizResult.error ?? cardResult.error;
      if (failure) return setStatus(failure.message);
      if (!quizResult.data) return setStatus("Quiz bulunamadı veya erişimin yok.");
      const cards = (cardResult.data as CardDb[]) ?? [];
      setTitle(quizResult.data.title);
      setOwnerId(quizResult.data.owner_id);
      setOriginalIds(cards.map((card) => card.id));
      setRows([...cards.map((card) => ({ ...card, key: `row-${++rowCounter}` })), blankRow()]);
      setStatus(null);
    });
    return () => {
      active = false;
    };
  }, [supabase, id, authReady]);

  const patchRow = (key: string, patch: Partial<Row>) => {
    setSaved(false);
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  // Excel'den yapıştırılan sekme/satır ayrımlı veri tablo gibi doldurulur.
  const paste = (event: React.ClipboardEvent, rowIndex: number, field: Field) => {
    const text = event.clipboardData.getData("text");
    if (!/[\t\n]/.test(text)) return;
    event.preventDefault();
    setSaved(false);
    const lines = text.replace(/\r/g, "").replace(/\n+$/, "").split("\n");
    setRows((current) => {
      const next = [...current];
      lines.forEach((line, offset) => {
        const cells = line.split("\t");
        const index = rowIndex + offset;
        if (!next[index]) next[index] = blankRow();
        const row = { ...next[index] };
        if (field === "question") {
          row.question = cells[0] ?? row.question;
          if (cells.length > 1) row.answer = cells[1];
        } else {
          row.answer = cells[0] ?? row.answer;
        }
        next[index] = row;
      });
      return [...next, blankRow()];
    });
  };

  const save = async () => {
    if (!id || !user) return;
    const filled = rows.filter((row) => row.question.trim() || row.answer.trim());
    if (filled.some((row) => !row.question.trim() || !row.answer.trim())) {
      return setError("Her satırda hem soru hem cevap olmalı.");
    }
    setSaving(true);
    setError(null);
    const keptIds = new Set(filled.filter((row) => row.id).map((row) => row.id));
    const removed = originalIds.filter((cardId) => !keptIds.has(cardId));
    const base = (row: Row, position: number) => ({
      quiz_id: id,
      owner_id: user.id,
      question: row.question.trim(),
      answer: row.answer.trim(),
      question_align: row.question_align,
      answer_align: row.answer_align,
      position,
    });
    const existing = filled.flatMap((row, position) =>
      row.id ? [{ id: row.id, ...base(row, position) }] : [],
    );
    const added = filled.flatMap((row, position) => (row.id ? [] : [base(row, position)]));

    const results = await Promise.all([
      removed.length ? supabase.from("cards").delete().in("id", removed) : null,
      existing.length ? supabase.from("cards").upsert(existing) : null,
      added.length ? supabase.from("cards").insert(added) : null,
    ]);
    setSaving(false);
    const failed = results.find((result) => result?.error);
    if (failed?.error) return setError(failed.error.message);

    // Yeni satırların id'lerini almak için yeniden yükle.
    const { data } = await supabase
      .from("cards")
      .select("id, question, answer, question_align, answer_align")
      .eq("quiz_id", id)
      .order("position")
      .order("created_at");
    const cards = (data as CardDb[]) ?? [];
    setOriginalIds(cards.map((card) => card.id));
    setRows([...cards.map((card) => ({ ...card, key: `row-${++rowCounter}` })), blankRow()]);
    setSaved(true);
  };

  const message = !id
    ? "Quiz bağlantısı geçersiz."
    : status ?? (user && user.id === ownerId ? null : "Bu quizi düzenleme yetkin yok.");

  if (message) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-700 p-6 text-slate-100">
        <p>{message}</p>
        <Link href="/" className={btnGhost}>
          <ArrowLeft className="h-4 w-4" /> Ana sayfa
        </Link>
      </div>
    );
  }

  const alignBtn = (row: Row, field: Field, value: Align, label: string, icon: React.ReactNode) => {
    const key = `${field}_align` as const;
    const active = row[key] === value;
    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => patchRow(row.key, { [key]: value })}
        className={`rounded-md p-1 transition ${
          active ? "bg-violet-500 text-white" : "text-slate-300 hover:bg-slate-500"
        }`}
      >
        {icon}
      </button>
    );
  };

  const cell = (row: Row, index: number, field: Field) => (
    <td className="border-l border-slate-500 p-0 align-top">
      <div className="flex items-stretch">
        <textarea
          rows={2}
          value={row[field]}
          onChange={(event) => patchRow(row.key, { [field]: event.target.value })}
          onPaste={(event) => paste(event, index, field)}
          style={{ textAlign: row[`${field}_align`] }}
          className="block min-w-0 flex-1 resize-y bg-transparent px-3 py-2 text-slate-50 outline-none focus:bg-slate-600/60"
        />
        <div className="flex flex-col gap-1 p-1">
          {alignBtn(row, field, "left", "Sola yasla", <AlignLeft className="h-4 w-4" />)}
          {alignBtn(row, field, "center", "Ortala", <AlignCenter className="h-4 w-4" />)}
        </div>
      </div>
    </td>
  );

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-700 text-slate-50">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-500 px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="rounded-full border border-slate-500 p-2 text-slate-200 hover:border-violet-300"
            aria-label="Geri"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{title}</p>
            <p className="text-xs text-slate-300">
              Excel&apos;den sekme ile ayrılmış satırları (soru, cevap) bir hücreye yapıştırabilirsin.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {error && <span className="text-sm text-amber-300">{error}</span>}
          {saved && !error && <span className="text-sm text-emerald-300">Kaydedildi</span>}
          <button type="button" className={btnPrimary} onClick={save} disabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-600 text-left text-xs uppercase tracking-wider text-slate-200">
            <tr>
              <th className="w-12 px-3 py-2">#</th>
              <th className="px-3 py-2">Soru</th>
              <th className="px-3 py-2">Cevap</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.key} className="border-t border-slate-500">
                <td className="px-3 py-2 align-top text-slate-300">{index + 1}</td>
                {cell(row, index, "question")}
                {cell(row, index, "answer")}
                <td className="border-l border-slate-500 text-center align-top">
                  <button
                    type="button"
                    aria-label="Satırı sil"
                    className="mt-2 text-slate-300 hover:text-red-300"
                    onClick={() => {
                      setSaved(false);
                      setRows((current) => current.filter((r) => r.key !== row.key));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="shrink-0 border-t border-slate-500 px-6 py-3">
        <button type="button" className={btnGhost} onClick={() => setRows((r) => [...r, blankRow()])}>
          <Plus className="h-4 w-4" /> Satır ekle
        </button>
      </div>
    </div>
  );
}

export default function EditQuizPage() {
  return (
    <Suspense>
      <EditScreen />
    </Suspense>
  );
}
