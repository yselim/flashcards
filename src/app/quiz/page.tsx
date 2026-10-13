"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, ArrowRight, Pencil, Shuffle, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type QuizInfo = { id: string; owner_id: string; title: string };
type CardRow = { id: string; question: string; answer: string };

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400 disabled:opacity-50";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-violet-400 hover:text-violet-200 disabled:opacity-40";
const iconBtn =
  "rounded-full border border-slate-600 p-2 text-slate-300 transition hover:border-violet-400 hover:text-violet-200 disabled:opacity-40";
const inputCls =
  "w-full rounded-xl border border-slate-600 bg-slate-900/80 p-3 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-violet-500";

function QuizScreen() {
  const id = useSearchParams().get("id");
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [user, setUser] = useState<User | null>(null);
  const [quiz, setQuiz] = useState<QuizInfo | null>(null);
  const [original, setOriginal] = useState<CardRow[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [cardEdit, setCardEdit] = useState<CardRow | null>(null);
  const [status, setStatus] = useState<string | null>("Yükleniyor…");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    Promise.all([
      supabase.from("quizzes").select("id, owner_id, title").eq("id", id).maybeSingle(),
      supabase
        .from("cards")
        .select("id, question, answer")
        .eq("quiz_id", id)
        .order("position")
        .order("created_at"),
    ]).then(([quizResult, cardResult]) => {
      if (!active) return;
      if (quizResult.error || cardResult.error) {
        return setStatus((quizResult.error ?? cardResult.error)!.message);
      }
      if (!quizResult.data) return setStatus("Quiz bulunamadı veya erişimin yok.");
      const list = (cardResult.data as CardRow[]) ?? [];
      setQuiz(quizResult.data as QuizInfo);
      setOriginal(list);
      setCards(list);
      setStatus(list.length ? null : "Bu quizde henüz kart yok.");
    });
    return () => {
      active = false;
    };
  }, [supabase, id, user?.id]);

  const toggleShuffle = () => {
    if (shuffled) {
      setCards(original);
    } else {
      const copy = [...cards];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      setCards(copy);
    }
    setShuffled(!shuffled);
    setIndex(0);
    setShowAnswer(false);
  };

  const step = (delta: number) => {
    setIndex((current) => (current + delta + cards.length) % cards.length);
    setShowAnswer(false);
  };

  const saveCardEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cardEdit || !cardEdit.question.trim() || !cardEdit.answer.trim()) return;
    const { error } = await supabase
      .from("cards")
      .update({ question: cardEdit.question.trim(), answer: cardEdit.answer.trim() })
      .eq("id", cardEdit.id);
    if (error) return alert(error.message);
    const apply = (list: CardRow[]) =>
      list.map((card) => (card.id === cardEdit.id ? { ...card, ...cardEdit } : card));
    setCards(apply);
    setOriginal(apply);
    setCardEdit(null);
  };

  const current = cards[index];

  const message = !id ? "Quiz bağlantısı geçersiz." : status;

  if (message || !quiz || !current) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900 p-6 text-slate-200">
        <p>{message}</p>
        <Link href="/" className={btnGhost}>
          <ArrowLeft className="h-4 w-4" /> Ana sayfa
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-900 text-slate-50">
      <div className="flex items-center justify-between border-b border-slate-700 px-6 py-3">
        <div className="flex items-center gap-2">
          <Link href="/" className={iconBtn} aria-label="Geri">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <button
            type="button"
            className={`${iconBtn} ${shuffled ? "border-violet-400 text-violet-300" : ""}`}
            onClick={toggleShuffle}
            aria-label="Karıştır"
          >
            <Shuffle className="h-4 w-4" />
          </button>
          {user?.id === quiz.owner_id && (
            <button
              type="button"
              className={iconBtn}
              onClick={() => setCardEdit(current)}
              aria-label="Kartı düzenle"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-white">{quiz.title}</p>
          <p className="text-xs text-slate-400">
            {index + 1} / {cards.length}
          </p>
        </div>
        <div className="w-24" />
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-2 divide-y divide-slate-600">
        <div className="flex min-h-0 overflow-y-auto p-6 sm:p-8">
          <p className="m-auto max-w-3xl whitespace-pre-wrap text-center text-2xl leading-9">
            {current.question}
          </p>
        </div>
        <div className="flex min-h-0 overflow-y-auto bg-slate-800/60 p-6 sm:p-8">
          {showAnswer && (
            <p className="m-auto max-w-3xl whitespace-pre-wrap text-center text-base leading-7 text-violet-100">
              {current.answer}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-center gap-3 border-t border-slate-700 px-6 py-4">
        <button type="button" className={btnGhost} onClick={() => step(-1)}>
          <ArrowLeft className="h-4 w-4" /> Önceki
        </button>
        <button type="button" className={btnPrimary} onClick={() => setShowAnswer((v) => !v)}>
          {showAnswer ? "Cevabı gizle" : "Cevabı göster"}
        </button>
        <button type="button" className={btnGhost} onClick={() => step(1)}>
          Sonraki <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {cardEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-800 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Kartı düzenle</h3>
              <button
                type="button"
                onClick={() => setCardEdit(null)}
                className={iconBtn}
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={saveCardEdit} className="space-y-4">
              <textarea
                required
                rows={3}
                value={cardEdit.question}
                onChange={(event) => setCardEdit({ ...cardEdit, question: event.target.value })}
                placeholder="Soru"
                className={inputCls}
              />
              <textarea
                required
                rows={3}
                value={cardEdit.answer}
                onChange={(event) => setCardEdit({ ...cardEdit, answer: event.target.value })}
                placeholder="Cevap"
                className={inputCls}
              />
              <div className="flex justify-end gap-3">
                <button type="button" className={btnGhost} onClick={() => setCardEdit(null)}>
                  İptal
                </button>
                <button type="submit" className={btnPrimary}>
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense>
      <QuizScreen />
    </Suspense>
  );
}
