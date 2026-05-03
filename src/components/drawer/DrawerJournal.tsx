"use client";

import { useEffect, useState, useTransition } from "react";
import {
  addJournalEntry,
  deleteJournalEntry,
  updateJournalEntry,
} from "@/server/actions/journal";

export type DrawerEntry = { id: string; content: string; createdAt: string };

const HOME = -1; // pseudo-index for the "home"/compose-new view

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function DrawerJournal({
  userId,
  iso,
  initial,
}: {
  userId: string;
  iso: string;
  initial: DrawerEntry[];
}) {
  const [entries, setEntries] = useState<DrawerEntry[]>(initial);
  // index === HOME → compose-new view; otherwise → reading entries[index]
  const [index, setIndex] = useState<number>(HOME);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  // Re-sync from server data when the parent re-renders with new initial.
  // Avoids stale state when entries are added from outside the drawer
  // (e.g. the Mindfulness journal save on the page).
  useEffect(() => {
    setEntries(initial);
  }, [initial]);

  const total = entries.length;
  const atHome = index === HOME;
  const current = !atHome ? entries[index] : undefined;

  useEffect(() => {
    if (atHome) return;
    if (!current) {
      setIndex(HOME);
      setEditing(false);
      setDraft("");
    }
  }, [atHome, current]);

  const goHome = () => {
    setIndex(HOME);
    setEditing(false);
    setDraft("");
  };

  const goEntry = (i: number) => {
    setIndex(i);
    setEditing(false);
    setDraft(entries[i]?.content ?? "");
  };

  const startEdit = () => {
    if (!current) return;
    setDraft(current.content);
    setEditing(true);
  };

  const saveNew = () => {
    const text = draft.trim();
    if (!text) return;
    const optimistic: DrawerEntry = {
      id: `tmp_${Date.now()}`,
      content: text,
      createdAt: new Date().toISOString(),
    };
    setEntries((prev) => [optimistic, ...prev]);
    setDraft("");
    startTransition(async () => {
      try {
        await addJournalEntry({ userId, iso, page: "overview", content: text });
      } catch {
        setEntries((prev) => prev.filter((e) => e.id !== optimistic.id));
        setDraft(text);
      }
    });
  };

  const saveEdit = () => {
    if (!current) return;
    const text = draft.trim();
    if (!text || text === current.content) {
      setEditing(false);
      return;
    }
    const id = current.id;
    const prevContent = current.content;
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, content: text } : e)));
    setEditing(false);
    startTransition(async () => {
      try {
        await updateJournalEntry({ userId, id, content: text });
      } catch {
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, content: prevContent } : e)));
        setEditing(true);
      }
    });
  };

  const remove = () => {
    if (!current) return;
    const removedId = current.id;
    const removedIndex = index;
    const prev = entries;
    const nextEntries = entries.filter((e) => e.id !== removedId);
    setEntries(nextEntries);
    if (nextEntries.length === 0) {
      setIndex(HOME);
    } else {
      setIndex(Math.min(removedIndex, nextEntries.length - 1));
    }
    setEditing(false);
    setDraft("");
    startTransition(async () => {
      try {
        await deleteJournalEntry({ userId, id: removedId });
      } catch {
        setEntries(prev);
      }
    });
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (atHome) saveNew();
      else if (editing) saveEdit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (atHome) {
        setDraft("");
      } else if (editing) {
        setEditing(false);
        setDraft(current?.content ?? "");
      }
    }
  };

  // Pagination dots — keeps visible list reasonable; show all up to ~9, then condense.
  const pageButtons: Array<{ label: string; idx: number; key: string }> = [];
  if (total <= 9) {
    for (let i = 0; i < total; i++) {
      pageButtons.push({ label: String(i + 1), idx: i, key: `p${i}` });
    }
  } else {
    // condensed view: 1 ... index-1, index, index+1 ... last
    const seen = new Set<number>();
    const push = (i: number) => {
      if (i >= 0 && i < total && !seen.has(i)) {
        seen.add(i);
        pageButtons.push({ label: String(i + 1), idx: i, key: `p${i}` });
      }
    };
    push(0);
    push(Math.max(1, index - 1));
    push(index);
    push(Math.min(total - 2, index + 1));
    push(total - 1);
  }

  return (
    <section className="drawer-journal" aria-label="Today's journal">
      <header className="drawer-journal-head">
        <span className="drawer-journal-label">Journal</span>
        <span className="drawer-journal-meta">
          {atHome ? `New · ${total} ${total === 1 ? "entry" : "entries"}` : `${index + 1}/${total}`}
        </span>
      </header>

      {/* Persistent pagination row */}
      <nav className="drawer-journal-pager" aria-label="Journal pages">
        <button
          type="button"
          className={`drawer-journal-page home${atHome ? " active" : ""}`}
          onClick={goHome}
          aria-label="New entry"
          aria-current={atHome ? "page" : undefined}
          title="New entry"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        {pageButtons.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`drawer-journal-page${index === p.idx ? " active" : ""}`}
            onClick={() => goEntry(p.idx)}
            aria-label={`Entry ${p.label}`}
            aria-current={index === p.idx ? "page" : undefined}
          >
            {p.label}
          </button>
        ))}
      </nav>

      {atHome ? (
        <div className="drawer-journal-compose">
          <textarea
            className="drawer-journal-textarea"
            placeholder="A thought for today…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            rows={6}
          />
          <div className="drawer-journal-row">
            <span style={{ flex: 1 }} />
            <button
              type="button"
              className="drawer-journal-save"
              onClick={saveNew}
              disabled={pending || draft.trim().length === 0}
            >
              {pending ? "…" : "Save"}
            </button>
          </div>
        </div>
      ) : current ? (
        <div className="drawer-journal-view">
          <div className={`drawer-journal-textbox${editing ? " editing" : " readonly"}`}>
            {!editing && (
              <button
                type="button"
                className="drawer-journal-edit-pill"
                onClick={startEdit}
                aria-label="Edit entry"
              >
                Edit
              </button>
            )}
            <textarea
              className="drawer-journal-textarea"
              value={editing ? draft : current.content}
              onChange={(e) => editing && setDraft(e.target.value)}
              onDoubleClick={() => !editing && startEdit()}
              onKeyDown={onKey}
              readOnly={!editing}
              rows={6}
              title={editing ? undefined : "Double-click to edit"}
            />
          </div>
          <div className="drawer-journal-row">
            <span className="drawer-journal-time">{formatTime(current.createdAt)}</span>
            <span style={{ flex: 1 }} />
            {editing ? (
              <>
                <button
                  type="button"
                  className="drawer-journal-link"
                  onClick={() => {
                    setEditing(false);
                    setDraft(current.content);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="drawer-journal-save"
                  onClick={saveEdit}
                  disabled={pending || draft.trim().length === 0}
                >
                  {pending ? "…" : "Save"}
                </button>
              </>
            ) : (
              <button type="button" className="drawer-journal-link" onClick={remove}>
                Delete
              </button>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
