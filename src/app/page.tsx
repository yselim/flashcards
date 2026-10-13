"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileQuestion,
  Globe,
  Layers,
  Link2,
  LogIn,
  LogOut,
  Pencil,
  Play,
  Plus,
  MoreVertical,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "y.selimdogan@gmail.com";
const SHARE_DENIED_MESSAGE =
  "Sadece Yavuz herkese açık quiz ekleyebilir. Quizi herkese yayımlamak için Yavuz ile iletişime geçebilirsiniz...";

type CategoryRow = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  is_public: boolean;
};

type QuizRow = {
  id: string;
  category_id: string;
  owner_id: string;
  title: string;
  description: string;
  is_public: boolean;
  cards: { count: number }[];
};

type CardRow = {
  id: string;
  quiz_id: string;
  question: string;
  answer: string;
  position: number;
};

type SheetRow = { key: string; id?: string; question: string; answer: string };

type MetaForm = {
  kind: "category" | "quiz";
  id?: string;
  categoryId?: string;
  name: string;
  description: string;
};

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400 disabled:opacity-50";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-violet-400 hover:text-violet-200 disabled:opacity-40";
const iconBtn =
  "rounded-full border border-slate-600 p-2 text-slate-300 transition hover:border-violet-400 hover:text-violet-200 disabled:opacity-40";
const miniBtn =
  "rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-violet-200";
const inputCls =
  "w-full rounded-xl border border-slate-600 bg-slate-900/80 p-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500";

let rowCounter = 0;
const newKey = () => `row-${++rowCounter}`;
const blankRow = (): SheetRow => ({ key: newKey(), question: "", answer: "" });

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div
        className={`flex max-h-[90vh] w-full flex-col rounded-3xl border border-slate-700 bg-slate-800 p-6 shadow-2xl ${
          wide ? "max-w-4xl" : "max-w-lg"
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <button type="button" onClick={onClose} className={iconBtn} aria-label="Kapat">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

type MenuItem = { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean };

function RowMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        className={miniBtn}
        aria-label="Seçenekler"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Menüyü kapat"
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-xl border border-slate-600 bg-slate-800 p-1 shadow-xl">
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-700 ${
                  item.danger ? "text-red-300" : "text-slate-100"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Home() {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const [meta, setMetaState] = useState<MetaForm | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const setMeta = (value: MetaForm | null) => {
    setMetaState(value);
    setMetaError(null);
  };


  const [sheetQuiz, setSheetQuiz] = useState<QuizRow | null>(null);
  const [sheetRows, setSheetRows] = useState<SheetRow[]>([]);
  const [sheetOriginalIds, setSheetOriginalIds] = useState<string[]>([]);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;
  const reload = () => setReloadKey((key) => key + 1);
  const isOwner = (ownerId: string) => user?.id === ownerId;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase
        .from("categories")
        .select("id, owner_id, name, description, is_public")
        .order("created_at", { ascending: false }),
      supabase
        .from("quizzes")
        .select("id, category_id, owner_id, title, description, is_public, cards(count)")
        .order("created_at", { ascending: false }),
    ]).then(([categoryResult, quizResult]) => {
      if (!active) return;
      const error = categoryResult.error ?? quizResult.error;
      if (error) setNotice(error.message);
      else {
        setCategories((categoryResult.data as CategoryRow[]) ?? []);
        setQuizzes((quizResult.data as QuizRow[]) ?? []);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [supabase, user?.id, reloadKey]);

  const toggleExpanded = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthMessage(null);
    if (authMode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return setAuthMessage(error.message);
      setAuthOpen(false);
      setPassword("");
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return setAuthMessage(error.message);
      if (data.session) {
        setAuthOpen(false);
        setPassword("");
      } else {
        setAuthMessage("Hesabını onaylamak için e-postanı kontrol et, ardından giriş yap.");
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const saveMeta = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!meta || !user || !meta.name.trim()) return;
    const name = meta.name.trim();
    let error;
    if (meta.kind === "category") {
      const values = { name, description: meta.description };
      ({ error } = meta.id
        ? await supabase.from("categories").update(values).eq("id", meta.id)
        : await supabase.from("categories").insert({ ...values, owner_id: user.id }));
    } else {
      const values = { title: name, description: meta.description };
      ({ error } = meta.id
        ? await supabase.from("quizzes").update(values).eq("id", meta.id)
        : await supabase
            .from("quizzes")
            .insert({ ...values, owner_id: user.id, category_id: meta.categoryId }));
      if (!error && meta.categoryId) {
        setExpanded((current) => new Set(current).add(meta.categoryId!));
      }
    }
    if (error) return setMetaError(error.message);
    setMeta(null);
    setNotice(null);
    reload();
  };

  const togglePublic = async (table: "categories" | "quizzes", id: string, isPublic: boolean) => {
    if (!isAdmin) return alert(SHARE_DENIED_MESSAGE);
    const { error } = await supabase.from(table).update({ is_public: !isPublic }).eq("id", id);
    if (error) return setNotice(error.message);
    reload();
  };

  const deleteCategory = async (category: CategoryRow) => {
    if (!confirm(`"${category.name}" kategorisi ve içindeki tüm quizler silinsin mi?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", category.id);
    if (error) return setNotice(error.message);
    reload();
  };

  const deleteQuiz = async (quiz: QuizRow) => {
    if (!confirm(`"${quiz.title}" quizi ve kartları silinsin mi?`)) return;
    const { error } = await supabase.from("quizzes").delete().eq("id", quiz.id);
    if (error) return setNotice(error.message);
    reload();
  };

  const fetchCards = async (quiz: QuizRow) => {
    const { data, error } = await supabase
      .from("cards")
      .select("id, quiz_id, question, answer, position")
      .eq("quiz_id", quiz.id)
      .order("position")
      .order("created_at");
    if (error) {
      setNotice(error.message);
      return null;
    }
    return (data as CardRow[]) ?? [];
  };

  const openSheet = async (quiz: QuizRow) => {
    const cards = await fetchCards(quiz);
    if (!cards) return;
    setSheetQuiz(quiz);
    setSheetOriginalIds(cards.map((card) => card.id));
    setSheetRows([
      ...cards.map((card) => ({
        key: newKey(),
        id: card.id,
        question: card.question,
        answer: card.answer,
      })),
      blankRow(),
    ]);
    setSheetError(null);
  };

  const updateSheetRow = (key: string, field: "question" | "answer", value: string) =>
    setSheetRows((rows) => rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)));

  // Excel'den yapıştırılan sekme/satır ayrımlı veri tablo gibi doldurulur.
  const pasteIntoSheet = (
    event: React.ClipboardEvent,
    rowIndex: number,
    field: "question" | "answer",
  ) => {
    const text = event.clipboardData.getData("text");
    if (!/[\t\n]/.test(text)) return;
    event.preventDefault();
    const lines = text.replace(/\r/g, "").replace(/\n+$/, "").split("\n");
    setSheetRows((rows) => {
      const next = [...rows];
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

  const saveSheet = async () => {
    if (!sheetQuiz || !user) return;
    const filled = sheetRows.filter((row) => row.question.trim() || row.answer.trim());
    if (filled.some((row) => !row.question.trim() || !row.answer.trim())) {
      return setSheetError("Her satırda hem soru hem cevap olmalı.");
    }
    setSaving(true);
    setSheetError(null);
    const keptIds = new Set(filled.filter((row) => row.id).map((row) => row.id));
    const removed = sheetOriginalIds.filter((id) => !keptIds.has(id));
    const base = (row: SheetRow, position: number) => ({
      quiz_id: sheetQuiz.id,
      owner_id: user.id,
      question: row.question.trim(),
      answer: row.answer.trim(),
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
    if (failed?.error) return setSheetError(failed.error.message);
    setSheetQuiz(null);
    reload();
  };

  const visibilityIcon = (isPublic: boolean) => (
    <Globe
      className={`h-3.5 w-3.5 shrink-0 ${isPublic ? "text-emerald-400" : "text-slate-500"}`}
      aria-label={isPublic ? "Herkese açık" : "Sadece sen"}
    >
      <title>{isPublic ? "Herkese açık" : "Sadece sen"}</title>
    </Globe>
  );

  const copyQuizLink = async (quiz: QuizRow) => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const url = `${window.location.origin}${base}/quiz?id=${quiz.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Link kopyalandı.");
    } catch {
      prompt("Linki kopyala:", url);
    }
  };

  const shareItem = (table: "categories" | "quizzes", id: string, isPublic: boolean): MenuItem => ({
    label: isPublic ? "Paylaşımdan kaldır" : "Paylaşıma aç",
    icon: <Globe className="h-4 w-4" />,
    onClick: () => togglePublic(table, id, isPublic),
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      <header className="border-b border-slate-700 bg-slate-800/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
              <BookOpen className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-semibold text-white">Flashcard Studio</h1>
          </div>
          <div className="flex items-center gap-3">
            {user && <span className="hidden text-sm text-slate-400 sm:inline">{user.email}</span>}
            {user ? (
              <button type="button" onClick={signOut} className={btnGhost}>
                <LogOut className="h-4 w-4" /> Çıkış
              </button>
            ) : (
              <button type="button" onClick={() => setAuthOpen(true)} className={btnPrimary}>
                <LogIn className="h-4 w-4" /> Giriş yap
              </button>
            )}
          </div>
        </div>
      </header>

      {notice && (
        <div className="mx-auto mt-4 flex w-full max-w-3xl items-center justify-between rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Kapat">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <main className="mx-auto w-full max-w-3xl px-6 py-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
            Kategoriler / Quizler
          </h2>
          {user && (
            <button
              type="button"
              className={btnPrimary}
              onClick={() => setMeta({ kind: "category", name: "", description: "" })}
            >
              <Plus className="h-4 w-4" /> Kategori
            </button>
          )}
        </div>

        {loading && <p className="text-sm text-slate-500">Yükleniyor…</p>}
        {!loading && categories.length === 0 && (
          <p className="text-sm text-slate-500">
            Henüz kategori yok.{user ? "" : " Kendi kategorini oluşturmak için giriş yap."}
          </p>
        )}

        <ul className="space-y-2">
          {categories.map((category) => {
            const open = expanded.has(category.id);
            const owned = isOwner(category.owner_id);
            const items = quizzes.filter((quiz) => quiz.category_id === category.id);
            return (
              <li
                key={category.id}
                className="rounded-2xl border border-slate-700 bg-slate-800"
              >
                <div className="flex items-center gap-2 p-2 pr-3">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(category.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-xl p-2 text-left hover:bg-slate-700/60"
                    aria-expanded={open}
                  >
                    {open ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <Layers className="h-4 w-4 shrink-0 text-violet-300" />
                    <span className="truncate font-medium">{category.name}</span>
                    <span className="shrink-0 text-xs text-slate-500">{items.length}</span>
                    {visibilityIcon(category.is_public)}
                  </button>
                  {owned && (
                    <RowMenu
                      items={[
                        {
                          label: "Yeni quiz ekle",
                          icon: <Plus className="h-4 w-4" />,
                          onClick: () =>
                            setMeta({
                              kind: "quiz",
                              categoryId: category.id,
                              name: "",
                              description: "",
                            }),
                        },
                        shareItem("categories", category.id, category.is_public),
                        {
                          label: "Yeniden adlandır",
                          icon: <Pencil className="h-4 w-4" />,
                          onClick: () =>
                            setMeta({
                              kind: "category",
                              id: category.id,
                              name: category.name,
                              description: category.description,
                            }),
                        },
                        {
                          label: "Sil",
                          icon: <Trash2 className="h-4 w-4" />,
                          danger: true,
                          onClick: () => deleteCategory(category),
                        },
                      ]}
                    />
                  )}
                </div>

                {open && (
                  <ul className="mb-2 ml-6 space-y-1 border-l border-slate-700 pl-3 pr-3">
                    {items.length === 0 && (
                      <li className="px-2 py-2 text-sm text-slate-500">Bu kategoride quiz yok.</li>
                    )}
                    {items.map((quiz) => {
                      const quizOwned = isOwner(quiz.owner_id);
                      return (
                        <li key={quiz.id} className="flex items-center gap-2 rounded-xl hover:bg-slate-700/40">
                          <Link
                            href={`/quiz?id=${quiz.id}`}
                            className="flex min-w-0 flex-1 items-center gap-2 p-2 text-left"
                            title={quiz.description || "Quizi başlat"}
                          >
                            <Play className="h-3.5 w-3.5 shrink-0 text-violet-300" />
                            <FileQuestion className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="truncate text-sm">{quiz.title}</span>
                            <span className="shrink-0 text-xs text-slate-500">
                              {quiz.cards[0]?.count ?? 0} kart
                            </span>
                            {visibilityIcon(quiz.is_public)}
                          </Link>
                          <RowMenu
                            items={[
                              ...(quizOwned
                                ? [
                                    {
                                      label: "Soruları düzenle",
                                      icon: <Table2 className="h-4 w-4" />,
                                      onClick: () => openSheet(quiz),
                                    },
                                    shareItem("quizzes", quiz.id, quiz.is_public),
                                    {
                                      label: "Yeniden adlandır",
                                      icon: <Pencil className="h-4 w-4" />,
                                      onClick: () =>
                                        setMeta({
                                          kind: "quiz",
                                          id: quiz.id,
                                          categoryId: quiz.category_id,
                                          name: quiz.title,
                                          description: quiz.description,
                                        }),
                                    },
                                  ]
                                : []),
                              {
                                label: "Linki kopyala",
                                icon: <Link2 className="h-4 w-4" />,
                                onClick: () => copyQuizLink(quiz),
                              },
                              ...(quizOwned
                                ? [
                                    {
                                      label: "Sil",
                                      icon: <Trash2 className="h-4 w-4" />,
                                      danger: true,
                                      onClick: () => deleteQuiz(quiz),
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </main>

      {authOpen && (
        <Modal
          title={authMode === "signin" ? "Giriş yap" : "Hesap oluştur"}
          onClose={() => setAuthOpen(false)}
        >
          <form onSubmit={submitAuth} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="E-posta"
              className={inputCls}
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Şifre"
              className={inputCls}
            />
            {authMessage && <p className="text-sm text-amber-300">{authMessage}</p>}
            <button type="submit" className={`${btnPrimary} w-full`}>
              {authMode === "signin" ? "Giriş yap" : "Kayıt ol"}
            </button>
            <button
              type="button"
              className="w-full text-sm text-slate-400 hover:text-violet-300"
              onClick={() => {
                setAuthMode(authMode === "signin" ? "signup" : "signin");
                setAuthMessage(null);
              }}
            >
              {authMode === "signin" ? "Hesabın yok mu? Kayıt ol" : "Hesabın var mı? Giriş yap"}
            </button>
          </form>
        </Modal>
      )}

      {meta && (
        <Modal
          title={`${meta.kind === "category" ? "Kategori" : "Quiz"} ${meta.id ? "düzenle" : "ekle"}`}
          onClose={() => setMeta(null)}
        >
          <form onSubmit={saveMeta} className="space-y-4">
            <input
              required
              maxLength={meta.kind === "category" ? 80 : 120}
              value={meta.name}
              onChange={(event) => setMeta({ ...meta, name: event.target.value })}
              placeholder="Ad"
              className={inputCls}
            />
            <textarea
              rows={3}
              value={meta.description}
              onChange={(event) => setMeta({ ...meta, description: event.target.value })}
              placeholder="Açıklama"
              className={inputCls}
            />
            {metaError && <p className="text-sm text-amber-300">{metaError}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" className={btnGhost} onClick={() => setMeta(null)}>
                İptal
              </button>
              <button type="submit" className={btnPrimary}>
                Kaydet
              </button>
            </div>
          </form>
        </Modal>
      )}

      {sheetQuiz && (
        <Modal title={`Kartlar — ${sheetQuiz.title}`} onClose={() => setSheetQuiz(null)} wide>
          <p className="mb-3 text-xs text-slate-400">
            Tablo gibi düzenle. Excel veya Sheets&apos;ten sekme ile ayrılmış satırları (soru,
            cevap) herhangi bir hücreye yapıştırarak birçok satırı bir anda doldurabilirsin.
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-600">
            <table className="w-full text-sm">
              <thead className="bg-slate-700 text-left text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="w-10 px-3 py-2">#</th>
                  <th className="px-3 py-2">Soru</th>
                  <th className="px-3 py-2">Cevap</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {sheetRows.map((row, index) => (
                  <tr key={row.key} className="border-t border-slate-700">
                    <td className="px-3 text-slate-500">{index + 1}</td>
                    {(["question", "answer"] as const).map((field) => (
                      <td key={field} className="p-0">
                        <textarea
                          rows={1}
                          value={row[field]}
                          onChange={(event) => updateSheetRow(row.key, field, event.target.value)}
                          onPaste={(event) => pasteIntoSheet(event, index, field)}
                          className="block w-full resize-y bg-transparent px-3 py-2 text-slate-100 outline-none focus:bg-slate-700/60"
                        />
                      </td>
                    ))}
                    <td className="text-center">
                      <button
                        type="button"
                        aria-label="Satırı sil"
                        className="text-slate-500 hover:text-red-400"
                        onClick={() => setSheetRows((rows) => rows.filter((r) => r.key !== row.key))}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sheetError && <p className="mt-3 text-sm text-amber-300">{sheetError}</p>}
          <div className="mt-4 flex justify-between">
            <button
              type="button"
              className={btnGhost}
              onClick={() => setSheetRows((rows) => [...rows, blankRow()])}
            >
              <Plus className="h-4 w-4" /> Satır ekle
            </button>
            <button type="button" className={btnPrimary} onClick={saveSheet} disabled={saving}>
              {saving ? "Kaydediliyor…" : "Kartları kaydet"}
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}
