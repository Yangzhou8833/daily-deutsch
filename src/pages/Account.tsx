import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createClass, joinClass, signIn, signOut, signUp, updateProfile, useAccount } from "../account";
import { isDemo } from "../demo";
import { Loading, Page } from "../components/common";
import { LANGS, useLang, type UIKey } from "../i18n";
import type { Lang } from "../types";

/** Map known server errors to UI text; show anything else as-is. */
function useErrorText() {
  const { t } = useLang();
  return (err: string | null) => {
    if (!err) return null;
    const known: Record<string, UIKey> = { "invalid code": "invalidCode", CONFIRM_EMAIL: "confirmEmail" };
    return known[err] ? t(known[err]) : err;
  };
}

export function inviteUrl(code: string) {
  return `${location.origin}${location.pathname}#/join/${code}`;
}

export function CopyButton({ text }: { text: string }) {
  const { t } = useLang();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn small-btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          prompt("", text);
        }
      }}
    >
      {done ? t("copied") : t("copy")}
    </button>
  );
}

function AuthForm() {
  const { t, lang } = useLang();
  const errorText = useErrorText();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(await (mode === "up" ? signUp(email, password, name, lang) : signIn(email, password)));
    setBusy(false);
  };

  return (
    <form className="panel form" onSubmit={submit}>
      <h2>{mode === "up" ? t("signUp") : t("signIn")}</h2>
      {mode === "up" && (
        <label>
          {t("displayName")}
          <input required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
        </label>
      )}
      <label>
        {t("email")}
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      <label>
        {t("password")}
        <input
          required
          type="password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "up" ? "new-password" : "current-password"}
        />
      </label>
      {error && <p className="error">{errorText(error)}</p>}
      <button className="btn primary block" disabled={busy}>
        {mode === "up" ? t("signUp") : t("signIn")}
      </button>
      <button type="button" className="link-btn" onClick={() => (setMode(mode === "up" ? "in" : "up"), setError(null))}>
        {mode === "up" ? t("haveAccount") : t("noAccount")}
      </button>
    </form>
  );
}

function ProfileForm() {
  const { t } = useLang();
  const acc = useAccount();
  const [name, setName] = useState(acc.profile?.display_name ?? "");
  const [native, setNative] = useState<Lang>(acc.profile?.native_lang ?? "en");
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => {
    if (acc.profile) {
      setName(acc.profile.display_name);
      setNative(acc.profile.native_lang);
    }
  }, [acc.profile]);

  return (
    <form
      className="panel form"
      onSubmit={async (e) => {
        e.preventDefault();
        const err = await updateProfile({ display_name: name.trim(), native_lang: native });
        setStatus(err ?? t("saved"));
      }}
    >
      <h2>{t("profile")}</h2>
      <p className="muted small">{acc.email}</p>
      <label>
        {t("displayName")}
        <input required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        {t("nativeLang")}
        <select value={native} onChange={(e) => setNative(e.target.value as Lang)}>
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
      {status && <p className="muted small">{status}</p>}
      <button className="btn block">{t("save")}</button>
    </form>
  );
}

function ClassPanel({ inviteCode }: { inviteCode?: string }) {
  const { t } = useLang();
  const errorText = useErrorText();
  const acc = useAccount();
  const navigate = useNavigate();
  const [code, setCode] = useState(inviteCode ?? "");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const autoJoined = useRef(false);

  // Opened from an invite link: join right away, then show the leaderboard.
  useEffect(() => {
    if (!inviteCode || autoJoined.current) return;
    autoJoined.current = true;
    if (acc.klass?.code === inviteCode.toUpperCase()) {
      navigate("/class", { replace: true });
      return;
    }
    joinClass(inviteCode).then((err) => (err ? setError(err) : navigate("/class", { replace: true })));
  }, [inviteCode, acc.klass, navigate]);

  if (acc.klass)
    return (
      <section className="panel">
        <h2>{t("myClass")}</h2>
        <Link to="/class" className="lesson-card">
          <div className="lesson-top">
            <span className="lesson-title">🏆 {acc.klass.name}</span>
            <span className="muted">›</span>
          </div>
          <div className="muted small">
            {t("classCode")}: <b>{acc.klass.code}</b>
          </div>
        </Link>
      </section>
    );

  const act = async (fn: () => Promise<string | null>) => {
    const err = await fn();
    setError(err);
    if (!err) navigate("/class");
  };
  return (
    <section className="panel">
      <h2>{t("myClass")}</h2>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          act(() => joinClass(code));
        }}
      >
        <input required placeholder={t("classCode")} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} className="code-input" />
        <button className="btn primary">{t("join")}</button>
      </form>
      <details className="create-class">
        <summary>{t("createClass")}</summary>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            act(() => createClass(name));
          }}
        >
          <input required maxLength={60} placeholder={t("className")} value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn">{t("create")}</button>
        </form>
      </details>
      {error && <p className="error">{errorText(error)}</p>}
    </section>
  );
}

export default function AccountPage() {
  const { t } = useLang();
  const { code } = useParams();
  const acc = useAccount();

  return (
    <Page back="/" title={t("account")}>
      {acc.status === "off" && <p className="muted center">Login is not configured on this site yet.</p>}
      {acc.status === "loading" && <Loading value={undefined} />}
      {acc.status === "out" && (
        <>
          {code ? (
            <p className="notice">
              {t("invited")} · <b>{code.toUpperCase()}</b>
              <br />
              {t("signInToJoin")}
            </p>
          ) : (
            <p className="muted">{t("loginWhy")}</p>
          )}
          <AuthForm />
        </>
      )}
      {acc.status === "in" && (
        <>
          <p className="muted small">{isDemo ? t("demoBanner") : acc.syncing ? t("syncing") : acc.syncError ? `${t("syncFailed")} (${acc.syncError})` : `✓ ${t("synced")}`}</p>
          {acc.profile?.is_editor && (
            <Link to="/admin" className="btn primary block">
              ✨ {t("editor")}
            </Link>
          )}
          <ClassPanel inviteCode={code} />
          <ProfileForm />
          <button className="btn block" onClick={() => signOut()}>
            {isDemo ? t("exitDemo") : t("signOut")}
          </button>
        </>
      )}
    </Page>
  );
}
