import { useEffect } from "react";
import { Loading, Page } from "../components/common";
import { enterDemo } from "../demo";
import { useLang } from "../i18n";

/** Builds the demo learner (fresh) and reloads into it; on the normal address it switches to ?demo first. */
export default function DemoStart() {
  const { t } = useLang();
  useEffect(() => {
    enterDemo().catch(() => alert(t("loadError")));
  }, [t]);
  return (
    <Page>
      <p className="center">{t("demoStarting")}</p>
      <Loading value={undefined} />
    </Page>
  );
}
