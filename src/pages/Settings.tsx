import { useState } from "react";
import { useAccount } from "../account";
import { Page } from "../components/common";
import { isDemo } from "../demo";
import { useLang } from "../i18n";
import { DEFAULT_SETTINGS, RETENTION_CHOICES, updateSettings, useSettings, type StudySettings } from "../settings";

/** Whole-number option with − / + buttons; saved when the value is valid. */
function NumberOption({ label, hint, field, step }: { label: string; hint: string; field: "newPerDay" | "maxReviews"; step: number }) {
  const settings = useSettings();
  const [draft, setDraft] = useState<string | null>(null);
  const value = settings[field];
  const set = (n: number) => updateSettings({ [field]: Math.max(0, n) } as Partial<StudySettings>);
  return (
    <div className="option">
      <label className="option-label" htmlFor={field}>
        {label}
      </label>
      <div className="stepper">
        <button type="button" className="btn" aria-label="−" onClick={() => set(value - step)} disabled={value <= 0}>
          −
        </button>
        <input
          id={field}
          type="number"
          inputMode="numeric"
          min={0}
          value={draft ?? value}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value !== "" && Number.isInteger(n) && n >= 0) set(n);
          }}
          onBlur={() => setDraft(null)}
        />
        <button type="button" className="btn" aria-label="+" onClick={() => set(value + step)}>
          +
        </button>
      </div>
      <p className="muted small">{hint}</p>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useLang();
  const settings = useSettings();
  const acc = useAccount();
  return (
    <Page back="/" title={t("options")}>
      <NumberOption label={t("newPerDay")} hint={t("newPerDayHint")} field="newPerDay" step={5} />
      <NumberOption label={t("maxReviews")} hint={t("maxReviewsHint")} field="maxReviews" step={50} />
      <div className="option">
        <label className="option-label" htmlFor="retention">
          {t("retention")}
        </label>
        <select id="retention" value={settings.retention} onChange={(e) => updateSettings({ retention: Number(e.target.value) })}>
          {RETENTION_CHOICES.map((r) => (
            <option key={r} value={r}>
              {Math.round(r * 100)}%
            </option>
          ))}
        </select>
        <p className="muted small">{t("retentionHint")}</p>
      </div>
      <button type="button" className="btn" onClick={() => updateSettings(DEFAULT_SETTINGS)}>
        {t("resetDefaults")}
      </button>
      <p className="muted small center">{isDemo ? t("demoBanner") : acc.status === "in" ? t("settingsSynced") : t("settingsLocal")}</p>
    </Page>
  );
}
