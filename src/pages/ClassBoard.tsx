import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { leaderboard, leaveClass, removeMember, useAccount, type LeaderRow } from "../account";
import { Loading, Page } from "../components/common";
import { useLang } from "../i18n";
import { CopyButton, inviteUrl } from "./Account";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function ClassBoard() {
  const { t } = useLang();
  const acc = useAccount();
  const navigate = useNavigate();
  const [rows, setRows] = useState<LeaderRow[] | null | undefined>(undefined);
  const klass = acc.klass;
  const isOwner = !!klass && klass.owner_id === acc.userId;

  const load = useCallback(() => {
    if (!klass) return;
    leaderboard().then(setRows, () => setRows(null));
  }, [klass]);
  useEffect(load, [load]);

  if (acc.status !== "in" || !klass)
    return (
      <Page back="/" title={t("leaderboard")}>
        {acc.status === "loading" ? (
          <Loading value={undefined} />
        ) : (
          <div className="done">
            <div className="done-emoji">🏆</div>
            <p>{t("boardWhy")}</p>
            <Link to="/account" className="btn primary">
              {acc.status === "in" ? t("joinClass") : t("signIn")}
            </Link>
          </div>
        )}
      </Page>
    );

  const link = inviteUrl(klass.code);
  return (
    <Page back="/" title={t("leaderboard")}>
      <h1>{klass.name}</h1>
      <p className="muted small">
        {rows?.length ?? "…"} {t("members")} · {t("weekStarts")}
      </p>

      {!rows ? (
        <Loading value={rows} />
      ) : (
        <ol className="board">
          {rows.map((r, i) => {
            const me = r.user_id === acc.userId;
            return (
              <li key={r.user_id} className={me ? "me" : ""}>
                <span className="rank">{MEDALS[i] ?? i + 1}</span>
                <span className="who">
                  <span className="who-name">
                    {r.display_name}
                    {me && <span className="tag">{t("you")}</span>}
                    {r.role === "owner" && <span className="tag">{t("owner")}</span>}
                  </span>
                  <span className="muted small">
                    🔥 {r.streak} · {r.words_learned} {t("learnedWords")}
                    {r.week_answers > 0 && ` · ${Math.round((r.week_correct / r.week_answers) * 100)}% ${t("accuracy")}`}
                  </span>
                </span>
                <span className="score">
                  {r.week_answers}
                  <small>{t("thisWeek")}</small>
                </span>
                {isOwner && !me && (
                  <button
                    className="link-btn danger"
                    onClick={async () => {
                      if (!confirm(t("confirmRemove").replace("{name}", r.display_name))) return;
                      const err = await removeMember(r.user_id);
                      if (err) alert(err);
                      else load();
                    }}
                  >
                    {t("remove")}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <section className="panel">
        <h2>{t("inviteLink")}</h2>
        <p className="muted small">{t("inviteHint")}</p>
        <div className="invite">
          <code>{link}</code>
          <CopyButton text={link} />
        </div>
        <p className="muted small">
          {t("classCode")}: <b className="code">{klass.code}</b>
        </p>
      </section>

      {!isOwner && (
        <button
          className="btn block"
          onClick={async () => {
            if (!confirm(t("confirmLeave"))) return;
            const err = await leaveClass();
            if (err) alert(err);
            else navigate("/");
          }}
        >
          {t("leaveClass")}
        </button>
      )}
    </Page>
  );
}
