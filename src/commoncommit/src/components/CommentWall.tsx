import { useCallback, useEffect, useId, useRef, useState } from "react";
import { FlaskConical, MessagesSquare, Send } from "lucide-react";
import { useI18n } from "../i18n/index.js";
import { api } from "../lib/api.js";
import { apiErrorText } from "../lib/errors.js";
import { timeAgo } from "../lib/format.js";
import { Avatar, Btn, EmptyState, Skeleton } from "./ui.js";
import type { WallMessage } from "../../shared/types.js";

/** Mirrors `WALL_MAX_CHARS` in server/impact.ts so the counter and the API agree. */
const MAX = 280;

/**
 * Counted the way the server counts (`[...typed].length`), in code points rather
 * than UTF-16 units. `"👋".length` is 2, so `body.length` would refuse a note of
 * 141 emoji that the API accepts — a rejection the author cannot diagnose from
 * a counter that disagrees with the visible text.
 */
const chars = (s: string) => [...s].length;

/**
 * Project comment wall.
 *
 * Everyone on this wall is a LOCAL DEMO IDENTITY. There is no authentication in
 * this prototype, so the role chip is styling over seeded data and nothing here
 * may look like a verified maintainer reply — no check marks, no verification
 * iconography, and `wall.localNote` is rendered unconditionally next to the
 * thread rather than tucked into a tooltip.
 */
export function CommentWall({ missionId }: { missionId: string }) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<WallMessage[] | null>(null);
  const [body, setBody] = useState("");
  /**
   * Kept apart from `postError` on purpose. A thread we FAILED to read is not an
   * empty thread, and the two failures belong in different places: one replaces
   * the thread, the other sits under the composer that caused it.
   */
  const [loadError, setLoadError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fieldId = useId();
  const countId = useId();
  const errId = useId();
  const aliveRef = useRef(true);
  // Read at throw time, so the failure message is in the locale the reader is
  // in, without a locale switch counting as "a different thread to load".
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    setMessages(null);
    // A previous mission's failure must not survive into this thread.
    setLoadError(null);
    setPostError(null);
    void api
      .wall(missionId)
      .then((res) => {
        if (aliveRef.current) setMessages(res.messages);
      })
      .catch((e: unknown) => {
        if (!aliveRef.current) return;
        setLoadError(apiErrorText(e, tRef.current));
        setMessages([]);
      });
  }, [missionId]);

  const trimmed = body.trim();
  // Counter and gate read the same number, and it is the number the server will
  // check: the trimmed body in code points. Counting anything else means the
  // control can disagree with the API about whether a note is postable.
  const count = chars(trimmed);
  const tooLong = count > MAX;
  const canSend = trimmed.length > 0 && !tooLong && !posting;

  const submit = useCallback(async () => {
    // Client-side guards for the same two rules the server enforces: an empty
    // note is not a note, and an over-length one is rejected rather than
    // silently truncated into something the author did not write.
    if (!canSend) return;
    setPosting(true);
    setPostError(null);
    try {
      const res = await api.postWall(missionId, trimmed);
      if (!aliveRef.current) return;
      // The POST returns the whole refreshed thread, so a successful post is also
      // a successful read: a stale load failure must stop hiding it.
      setMessages(res.messages);
      setLoadError(null);
      setBody("");
    } catch (e) {
      if (!aliveRef.current) return;
      setPostError(apiErrorText(e, t));
    } finally {
      if (aliveRef.current) setPosting(false);
    }
  }, [canSend, missionId, t, trimmed]);

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="inline-flex items-center gap-2 text-base font-bold tracking-tight">
          <MessagesSquare size={15} className="shrink-0 text-dim" aria-hidden />
          {t("wall.title")}
        </h2>
        <p className="text-sm text-dim">{t("wall.sub")}</p>
      </div>

      <p className="mb-4 inline-flex items-start gap-1.5 text-xs leading-relaxed text-dim">
        <FlaskConical size={12} className="mt-0.5 shrink-0 text-warn" aria-hidden />
        {t("wall.localNote")}
      </p>

      {messages === null ? (
        <div className="space-y-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : loadError !== null ? (
        // NOT the empty state. "No notes yet. Be the first." asserts that the
        // thread was read and found empty; here it was never read at all.
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {loadError}
        </div>
      ) : messages.length === 0 ? (
        <EmptyState icon={<MessagesSquare size={22} />} title={t("wall.empty")} />
      ) : (
        <ol className="space-y-2.5">
          {messages.map((m) => {
            const maintainer = m.authorRole === "maintainer";
            return (
              <li
                key={m.id}
                className={`cc-event-in min-w-0 rounded-xl border px-3.5 py-3 ${
                  maintainer ? "border-adopt/30 bg-adopt/5" : "border-line bg-bg2"
                }`}
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Avatar name={m.authorHandle.replace(/^@/, "")} color={m.authorColor} size={22} />
                  <span className="min-w-0 truncate font-mono text-xs font-semibold text-ink">{m.authorHandle}</span>
                  {/*
                    A plain word, not a badge with a check mark: the role is
                    seeded demo metadata and must not read as an identity that
                    somebody verified.
                  */}
                  <span
                    className={`shrink-0 rounded border px-1.5 py-0.5 text-[14px] font-semibold ${
                      maintainer ? "border-adopt/40 text-adopt" : "border-line2 text-mut"
                    }`}
                  >
                    {t(maintainer ? "wall.roleMaintainer" : "wall.roleSponsor")}
                  </span>
                  <span className="ml-auto shrink-0 font-mono text-[14px] text-dim">
                    {timeAgo(m.createdAt, t)}
                  </span>
                </div>
                <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-mut">{m.body}</p>
              </li>
            );
          })}
        </ol>
      )}

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {/* Visually hidden, but a real label: the placeholder disappears the
            moment anyone types, which leaves a screen reader with an unnamed
            field. */}
        <label htmlFor={fieldId} className="sr-only">
          {t("wall.placeholder")}
        </label>
        <textarea
          id={fieldId}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("wall.placeholder")}
          rows={3}
          aria-invalid={tooLong}
          aria-describedby={tooLong ? `${countId} ${errId}` : countId}
          className="w-full resize-y rounded-xl border border-line2 bg-bg2 px-3.5 py-2.5 text-sm leading-relaxed text-ink placeholder:text-dim focus:border-brand/60 focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span
            id={countId}
            className={`font-mono text-xs ${tooLong ? "font-semibold text-danger" : "text-dim"}`}
          >
            {count}/{MAX}
          </span>
          {tooLong && (
            <span id={errId} role="alert" className="text-xs font-semibold text-danger">
              {t("wall.tooLong")}
            </span>
          )}
          <Btn type="submit" disabled={!canSend} className="ml-auto min-h-11" kind="primary">
            <Send size={13} aria-hidden />
            {t("wall.send")}
          </Btn>
        </div>
        {postError !== null && (
          <p role="alert" className="mt-2 text-xs font-semibold text-danger">
            {postError}
          </p>
        )}
      </form>
    </div>
  );
}
