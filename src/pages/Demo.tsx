import { useEffect } from "react";
import { Loading, Page } from "../components/common";
import { enterDemo } from "../demo";
import { useLang } from "../i18n";

/** #/demo: builds the demo learner (a fresh copy each time) and reloads into it. */
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
