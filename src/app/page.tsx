"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Folder as FolderIcon,
  Globe,
  Lock,
  LogIn,
  LogOut,
  Pencil,
  Play,
  Plus,
  Shuffle,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type FolderRow = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  is_public: boolean;
};

type DeckRow = {
  id: string;
  folder_id: string;
  owner_id: string;
  title: string;
  description: string;
  is_public: boolean;
  cards: { count: number }[];
};

type CardRow = {
  id: string;
  deck_id: string;
  question: string;
  answer: string;
  position: number;
};

type SheetRow = { key: string; id?: string; question: string; answer: string };

type MetaForm = {
  kind: "folder" | "deck";
  id?: string;
  name: string;
  description: string;
  isPublic: boolean;
};

const PAGE_SIZE = 6;

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400 disabled:opacity-50";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-violet-400 hover:text-violet-200 disabled:opacity-40";
const iconBtn =
  "rounded-full border border-slate-700 p-2 text-slate-300 transition hover:border-violet-400 hover:text-violet-200 disabled:opacity-40";
const inputCls =
  "w-full rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div
        className={`flex max-h-[90vh] w-full flex-col rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl ${
          wide ? "max-w-4xl" : "max-w-lg"
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <button type="button" onClick={onClose} className={iconBtn} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export default function Home() {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [deckTotal, setDeckTotal] = useState(0);
  const [page, setPage] = useState(1);
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

  const [studyDeck, setStudyDeck] = useState<DeckRow | null>(null);
  const [studyCards, setStudyCards] = useState<CardRow[]>([]);
  const [studyOriginal, setStudyOriginal] = useState<CardRow[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [cardEdit, setCardEdit] = useState<CardRow | null>(null);

  const [sheetDeck, setSheetDeck] = useState<DeckRow | null>(null);
  const [sheetRows, setSheetRows] = useState<SheetRow[]>([]);
  const [sheetOriginalIds, setSheetOriginalIds] = useState<string[]>([]);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedFolder =
    folders.find((folder) => folder.id === selectedFolderId) ?? folders[0] ?? null;
  const selectedFolderKey = selectedFolder?.id ?? null;
  const totalPages = Math.max(1, Math.ceil(deckTotal / PAGE_SIZE));
  const reload = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    let active = true;
    supabase
      .from("folders")
      .select("id, owner_id, name, description, is_public")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setNotice(error.message);
        else setFolders((data as FolderRow[]) ?? []);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [supabase, user?.id, reloadKey]);

  useEffect(() => {
    if (!selectedFolderKey) return;
    let active = true;
    supabase
      .from("decks")
      .select("id, folder_id, owner_id, title, description, is_public, cards(count)", {
        count: "exact",
      })
      .eq("folder_id", selectedFolderKey)
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
      .then(({ data, count, error }) => {
        if (!active) return;
        if (error) setNotice(error.message);
        else {
          setDecks((data as DeckRow[]) ?? []);
          setDeckTotal(count ?? 0);
        }
      });
    return () => {
      active = false;
    };
  }, [supabase, selectedFolderKey, page, reloadKey, user?.id]);

  const isOwner = (ownerId: string) => user?.id === ownerId;

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
        setAuthMessage("Check your email to confirm your account, then sign in.");
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const openMeta = (form: MetaForm) => setMeta(form);

  const saveMeta = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!meta || !user || !meta.name.trim()) return;
    const name = meta.name.trim();
    let error;
    if (meta.kind === "folder") {
      const values = { name, description: meta.description, is_public: meta.isPublic };
      ({ error } = meta.id
        ? await supabase.from("folders").update(values).eq("id", meta.id)
        : await supabase.from("folders").insert({ ...values, owner_id: user.id }));
    } else {
      const values = { title: name, description: meta.description, is_public: meta.isPublic };
      ({ error } = meta.id
        ? await supabase.from("decks").update(values).eq("id", meta.id)
        : await supabase
            .from("decks")
            .insert({ ...values, owner_id: user.id, folder_id: selectedFolderKey }));
    }
    if (error) return setMetaError(error.message);
    setMeta(null);
    setMetaError(null);
    setNotice(null);
    reload();
  };

  const deleteFolder = async (folder: FolderRow) => {
    if (!confirm(`Delete folder "${folder.name}" and all its files?`)) return;
    const { error } = await supabase.from("folders").delete().eq("id", folder.id);
    if (error) return setNotice(error.message);
    setSelectedFolderId(null);
    setPage(1);
    reload();
  };

  const deleteDeck = async (deck: DeckRow) => {
    if (!confirm(`Delete "${deck.title}" and its cards?`)) return;
    const { error } = await supabase.from("decks").delete().eq("id", deck.id);
    if (error) return setNotice(error.message);
    reload();
  };

  const startStudy = async (deck: DeckRow) => {
    const { data, error } = await supabase
      .from("cards")
      .select("id, deck_id, question, answer, position")
      .eq("deck_id", deck.id)
      .order("position")
      .order("created_at");
    if (error) return setNotice(error.message);
    const cards = (data as CardRow[]) ?? [];
    if (!cards.length) return setNotice("This file has no cards yet.");
    setStudyDeck(deck);
    setStudyOriginal(cards);
    setStudyCards(cards);
    setStudyIndex(0);
    setShowAnswer(false);
    setShuffled(false);
  };

  const toggleShuffle = () => {
    if (shuffled) {
      setStudyCards(studyOriginal);
    } else {
      const copy = [...studyCards];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      setStudyCards(copy);
    }
    setShuffled(!shuffled);
    setStudyIndex(0);
    setShowAnswer(false);
  };

  const step = (delta: number) => {
    setStudyIndex((index) => (index + delta + studyCards.length) % studyCards.length);
    setShowAnswer(false);
  };

  const saveCardEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cardEdit || !cardEdit.question.trim() || !cardEdit.answer.trim()) return;
    const { error } = await supabase
      .from("cards")
      .update({ question: cardEdit.question.trim(), answer: cardEdit.answer.trim() })
      .eq("id", cardEdit.id);
    if (error) return setNotice(error.message);
    const apply = (cards: CardRow[]) =>
      cards.map((card) => (card.id === cardEdit.id ? { ...card, ...cardEdit } : card));
    setStudyCards(apply);
    setStudyOriginal(apply);
    setCardEdit(null);
  };

  const openSheet = async (deck: DeckRow) => {
    const { data, error } = await supabase
      .from("cards")
      .select("id, deck_id, question, answer, position")
      .eq("deck_id", deck.id)
      .order("position")
      .order("created_at");
    if (error) return setNotice(error.message);
    const cards = (data as CardRow[]) ?? [];
    setSheetDeck(deck);
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

  // Pasting tab/newline separated data (e.g. from Excel) fills rows like a spreadsheet.
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
    if (!sheetDeck || !user) return;
    const filled = sheetRows.filter((row) => row.question.trim() || row.answer.trim());
    if (filled.some((row) => !row.question.trim() || !row.answer.trim())) {
      return setSheetError("Every row needs both a question and an answer.");
    }
    setSaving(true);
    setSheetError(null);
    const keptIds = new Set(filled.filter((row) => row.id).map((row) => row.id));
    const removed = sheetOriginalIds.filter((id) => !keptIds.has(id));
    const base = (row: SheetRow, position: number) => ({
      deck_id: sheetDeck.id,
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
    setSheetDeck(null);
    reload();
  };

  const currentCard = studyCards[studyIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
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
                <LogOut className="h-4 w-4" /> Log out
              </button>
            ) : (
              <button type="button" onClick={() => setAuthOpen(true)} className={btnPrimary}>
                <LogIn className="h-4 w-4" /> Log in
              </button>
            )}
          </div>
        </div>
      </header>

      {notice && (
        <div className="mx-auto mt-4 flex w-full max-w-7xl items-center justify-between rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <main className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Folders
            </h2>
            {user && (
              <button
                type="button"
                className={iconBtn}
                aria-label="New folder"
                onClick={() => openMeta({ kind: "folder", name: "", description: "", isPublic: false })}
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="space-y-3">
            {loading && <p className="text-sm text-slate-500">Loading…</p>}
            {!loading && folders.length === 0 && (
              <p className="text-sm text-slate-500">
                No folders yet.{user ? "" : " Log in to create your own."}
              </p>
            )}
            {folders.map((folder) => (
              <button
                type="button"
                key={folder.id}
                onClick={() => {
                  setSelectedFolderId(folder.id);
                  setPage(1);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-2xl border p-3 text-left transition ${
                  selectedFolder?.id === folder.id
                    ? "border-violet-500 bg-violet-500/10"
                    : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <FolderIcon className="h-4 w-4 shrink-0 text-slate-300" />
                  <span className="truncate text-sm font-medium">{folder.name}</span>
                </span>
                {folder.is_public ? (
                  <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                ) : (
                  <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                )}
              </button>
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-violet-950/60 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-3xl font-semibold text-white">
                  {selectedFolder?.name ?? "Public library"}
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  {selectedFolder?.description ||
                    "Browse public folders and files, or log in to create your own."}
                </p>
              </div>
              {selectedFolder && isOwner(selectedFolder.owner_id) && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={() =>
                      openMeta({ kind: "deck", name: "", description: "", isPublic: false })
                    }
                  >
                    <Plus className="h-4 w-4" /> New file
                  </button>
                  <button
                    type="button"
                    className={iconBtn}
                    aria-label="Edit folder"
                    onClick={() =>
                      openMeta({
                        kind: "folder",
                        id: selectedFolder.id,
                        name: selectedFolder.name,
                        description: selectedFolder.description,
                        isPublic: selectedFolder.is_public,
                      })
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={iconBtn}
                    aria-label="Delete folder"
                    onClick={() => deleteFolder(selectedFolder)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </section>

          {selectedFolder && (
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Files</h3>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <button
                    type="button"
                    className={iconBtn}
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span>
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className={iconBtn}
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {decks.length === 0 && <p className="text-sm text-slate-500">No files in this folder.</p>}
              <div className="grid gap-4 md:grid-cols-2">
                {decks.map((deck) => {
                  const owned = isOwner(deck.owner_id);
                  return (
                    <div key={deck.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <h4 className="text-lg font-medium text-white">{deck.title}</h4>
                        {deck.is_public ? (
                          <Globe className="mt-1 h-4 w-4 text-emerald-400" aria-label="Public" />
                        ) : (
                          <Lock className="mt-1 h-4 w-4 text-slate-400" aria-label="Private" />
                        )}
                      </div>
                      <p className="min-h-10 text-sm text-slate-300">{deck.description}</p>
                      <p className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-400">
                        {deck.cards[0]?.count ?? 0} cards
                      </p>
                      <div className="mt-4 flex items-center gap-2">
                        <button
                          type="button"
                          className={`${btnPrimary} flex-1`}
                          onClick={() => startStudy(deck)}
                        >
                          <Play className="h-4 w-4" /> Play
                        </button>
                        {owned && (
                          <>
                            <button
                              type="button"
                              className={iconBtn}
                              aria-label="Edit cards as table"
                              onClick={() => openSheet(deck)}
                            >
                              <Table2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className={iconBtn}
                              aria-label="Edit file"
                              onClick={() =>
                                openMeta({
                                  kind: "deck",
                                  id: deck.id,
                                  name: deck.title,
                                  description: deck.description,
                                  isPublic: deck.is_public,
                                })
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className={iconBtn}
                              aria-label="Delete file"
                              onClick={() => deleteDeck(deck)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      {authOpen && (
        <Modal title={authMode === "signin" ? "Log in" : "Create account"} onClose={() => setAuthOpen(false)}>
          <form onSubmit={submitAuth} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              className={inputCls}
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className={inputCls}
            />
            {authMessage && <p className="text-sm text-amber-300">{authMessage}</p>}
            <button type="submit" className={`${btnPrimary} w-full`}>
              {authMode === "signin" ? "Log in" : "Sign up"}
            </button>
            <button
              type="button"
              className="w-full text-sm text-slate-400 hover:text-violet-300"
              onClick={() => {
                setAuthMode(authMode === "signin" ? "signup" : "signin");
                setAuthMessage(null);
              }}
            >
              {authMode === "signin" ? "No account? Sign up" : "Have an account? Log in"}
            </button>
          </form>
        </Modal>
      )}

      {meta && (
        <Modal
          title={`${meta.id ? "Edit" : "New"} ${meta.kind === "folder" ? "folder" : "file"}`}
          onClose={() => setMeta(null)}
        >
          <form onSubmit={saveMeta} className="space-y-4">
            <input
              required
              maxLength={meta.kind === "folder" ? 80 : 120}
              value={meta.name}
              onChange={(event) => setMeta({ ...meta, name: event.target.value })}
              placeholder="Name"
              className={inputCls}
            />
            <textarea
              rows={3}
              value={meta.description}
              onChange={(event) => setMeta({ ...meta, description: event.target.value })}
              placeholder="Description"
              className={inputCls}
            />
            <label className="flex items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={meta.isPublic}
                onChange={(event) => setMeta({ ...meta, isPublic: event.target.checked })}
                className="h-4 w-4 accent-violet-500"
              />
              Publish publicly
            </label>
            {metaError && <p className="text-sm text-amber-300">{metaError}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" className={btnGhost} onClick={() => setMeta(null)}>
                Cancel
              </button>
              <button type="submit" className={btnPrimary}>
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      {sheetDeck && (
        <Modal title={`Cards — ${sheetDeck.title}`} onClose={() => setSheetDeck(null)} wide>
          <p className="mb-3 text-xs text-slate-400">
            Edit like a spreadsheet. Paste tab-separated rows (question, answer) from Excel or
            Sheets into any cell to fill many rows at once.
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-left text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="w-10 px-3 py-2">#</th>
                  <th className="px-3 py-2">Question</th>
                  <th className="px-3 py-2">Answer</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {sheetRows.map((row, index) => (
                  <tr key={row.key} className="border-t border-slate-800">
                    <td className="px-3 text-slate-500">{index + 1}</td>
                    {(["question", "answer"] as const).map((field) => (
                      <td key={field} className="p-0">
                        <textarea
                          rows={1}
                          value={row[field]}
                          onChange={(event) => updateSheetRow(row.key, field, event.target.value)}
                          onPaste={(event) => pasteIntoSheet(event, index, field)}
                          className="block w-full resize-y bg-transparent px-3 py-2 text-slate-100 outline-none focus:bg-slate-800/60"
                        />
                      </td>
                    ))}
                    <td className="text-center">
                      <button
                        type="button"
                        aria-label="Remove row"
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
              <Plus className="h-4 w-4" /> Add row
            </button>
            <button type="button" className={btnPrimary} onClick={saveSheet} disabled={saving}>
              {saving ? "Saving…" : "Save cards"}
            </button>
          </div>
        </Modal>
      )}

      {studyDeck && currentCard && (
        <div className="fixed inset-0 z-40 flex flex-col bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3">
            <div className="flex items-center gap-2">
              <button type="button" className={iconBtn} onClick={() => setStudyDeck(null)} aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={`${iconBtn} ${shuffled ? "border-violet-400 text-violet-300" : ""}`}
                onClick={toggleShuffle}
                aria-label="Shuffle"
              >
                <Shuffle className="h-4 w-4" />
              </button>
              {isOwner(studyDeck.owner_id) && (
                <button
                  type="button"
                  className={iconBtn}
                  onClick={() => setCardEdit(currentCard)}
                  aria-label="Edit card"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white">{studyDeck.title}</p>
              <p className="text-xs text-slate-400">
                {studyIndex + 1} / {studyCards.length}
              </p>
            </div>
            <div className="w-24" />
          </div>

          <div className="grid flex-1 grid-rows-2 divide-y divide-slate-800">
            <div className="flex flex-col items-center justify-center overflow-y-auto p-8 text-center">
              <p className="mb-3 text-xs uppercase tracking-[0.22em] text-slate-500">Question</p>
              <p className="max-w-3xl whitespace-pre-wrap text-2xl leading-9">{currentCard.question}</p>
            </div>
            <div className="flex flex-col items-center justify-center overflow-y-auto bg-slate-900/50 p-8 text-center">
              <p className="mb-3 text-xs uppercase tracking-[0.22em] text-slate-500">Answer</p>
              {showAnswer ? (
                <p className="max-w-3xl whitespace-pre-wrap text-2xl leading-9 text-violet-100">
                  {currentCard.answer}
                </p>
              ) : (
                <p className="text-slate-600">Hidden</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 border-t border-slate-800 px-6 py-4">
            <button type="button" className={btnGhost} onClick={() => step(-1)}>
              <ArrowLeft className="h-4 w-4" /> Prev
            </button>
            <button type="button" className={btnPrimary} onClick={() => setShowAnswer((v) => !v)}>
              {showAnswer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showAnswer ? "Hide answer" : "Show answer"}
            </button>
            <button type="button" className={btnGhost} onClick={() => step(1)}>
              Next <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {cardEdit && (
        <Modal title="Edit card" onClose={() => setCardEdit(null)}>
          <form onSubmit={saveCardEdit} className="space-y-4">
            <textarea
              required
              rows={3}
              value={cardEdit.question}
              onChange={(event) => setCardEdit({ ...cardEdit, question: event.target.value })}
              placeholder="Question"
              className={inputCls}
            />
            <textarea
              required
              rows={3}
              value={cardEdit.answer}
              onChange={(event) => setCardEdit({ ...cardEdit, answer: event.target.value })}
              placeholder="Answer"
              className={inputCls}
            />
            <div className="flex justify-end gap-3">
              <button type="button" className={btnGhost} onClick={() => setCardEdit(null)}>
                Cancel
              </button>
              <button type="submit" className={btnPrimary}>
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
