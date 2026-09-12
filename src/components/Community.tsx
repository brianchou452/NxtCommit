import { useState } from "react";
import type { FormEvent } from "react";
import { useLocale } from "../i18n/LocaleProvider.js";
import { localize } from "../i18n/locale.js";
import { postJSON, useSnapshot } from "../services/snapshots.js";
import type { Nominee, WallMessage } from "../../shared/home.js";
import { RequestState } from "./HomeComponents.js";
export function CommentWall({ missionId }: { missionId: string }) {
  const { text } = useLocale();
  const snapshot = useSnapshot<{ messages: WallMessage[] }>(
    `/api/missions/${encodeURIComponent(missionId)}/wall`,
  );
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [thread, setThread] = useState<WallMessage[] | undefined>();
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim() || [...body].length > 280 || pending) return;
    setPending(true);
    setError(false);
    try {
      const response = await postJSON<{ messages: WallMessage[] }>(
        `/api/missions/${encodeURIComponent(missionId)}/wall`,
        { body },
      );
      setThread(response.messages);
      setBody("");
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  const messages = thread ?? snapshot.data?.messages;
  return (
    <section className="panel comment-wall" data-testid="comment-wall">
      <h2>{text.wall_title}</h2>
      <p className="fine">{text.comment_wall_boundary}</p>
      <RequestState snapshot={snapshot} />
      {error && <p role="alert">{text.error_generic}</p>}
      {messages && (
        <ol>
          {!messages.length && <li className="empty">{text.wall_empty}</li>}
          {messages.map((m) => (
            <li key={m.id}>
              <p>
                @{m.handle} · {text.local_persona} ·{" "}
                <time dateTime={m.createdAt}>{m.createdAt}</time>
              </p>
              <div>{m.body}</div>
            </li>
          ))}
        </ol>
      )}
      <form onSubmit={(e) => void submit(e)}>
        <label htmlFor="comment-body">{text.wall_input}</label>
        <textarea
          id="comment-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="composer-actions">
          <span>{[...body].length}/280</span>
          <button disabled={pending || !body.trim() || [...body].length > 280}>
            {pending ? text.loading : text.wall_post}
          </button>
        </div>
        {[...body].length > 280 && <p role="alert">{text.wall_invalid}</p>}
      </form>
    </section>
  );
}
export function CommunityVotes() {
  const { text, locale } = useLocale();
  const snapshot = useSnapshot<{ nominees: Nominee[] }>("/api/mvp");
  const [updated, setUpdated] = useState<Nominee[] | undefined>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function vote(id: string) {
    setPending(true);
    setError(false);
    try {
      setUpdated(
        (await postJSON<{ nominees: Nominee[] }>(`/api/mvp/${id}/vote`, {}))
          .nominees,
      );
    } catch {
      setError(true);
      snapshot.reload();
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="panel">
      <h2>{text.community}</h2>
      <p>{text.demo_data}</p>
      <RequestState snapshot={snapshot} />
      {error && <p role="alert">{text.error_generic}</p>}
      {(updated ?? snapshot.data?.nominees)?.map((n) => (
        <div className="nominee" key={n.id}>
          <strong>{localize(n.title, locale)}</strong>
          <span>
            {n.votes} · {n.basis.totalPledged} {text.pledged}
          </span>
          <button
            disabled={pending || n.votedByYou}
            onClick={() => void vote(n.id)}
          >
            {n.votedByYou ? text.voted : text.vote}
          </button>
        </div>
      ))}
    </section>
  );
}
