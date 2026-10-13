import { useI18n } from "../i18n";
import React from "react";
import {
  ArrowRight,
  ArrowLeft,
  Users,
  Layers,
  CircleHelp,
  ChevronRight,
  Sparkles,
  Clock3,
} from "lucide-react";
import { type View, type Category } from "../../../shared/game";
import { colors } from "../cards/presentation";
import { Card } from "../components/Card";
type Props = {
  room: View | null;
  setPage: (page: string) => void;
  enter: (mode: "create" | "join") => void;
  setDetail: (id: string) => void;
  setFamily: (code: Category) => void;
  family: Category;
};
export function RulesPage({
  room,
  setPage,
  enter,
  setDetail,
  setFamily,
  family,
}: Props) {
  const { t, cards, categories } = useI18n();
  return (
    <section className="content-page rules">
      <button
        className="back-link"
        data-sound="back"
        onClick={() => setPage(room ? "room" : "home")}
      >
        <ArrowLeft size={16} />
        {t("Kembali")}
      </button>

      <h1>{t("Cara main")}</h1>

      <div className="rule-grid">
        {[
          ["01", t("Masuk bilik"), t("2–6 pemain. Semua sedia, hos mula.")],
          ["02", t("Terima kad"), t("2 pemain: 7 kad. 3–6 pemain: 5 kad.")],
          [
            "03",
            t("Minta kad"),
            t("Minta kad daripada keluarga di tangan anda."),
          ],
          [
            "04",
            t("Dapat? Teruskan"),
            t(
              "Dapat kad: main lagi. Tiada: ambil satu; giliran bertukar kecuali kad itu tepat.",
            ),
          ],
          ["05", t("Lengkapkan"), t("6 kad satu keluarga = 1 mata.")],
          [
            "06",
            t("Menang"),
            t(
              "Tamat apabila 6 keluarga lengkap atau had dicapai. Mata terbanyak menang; kad tangan memecah seri.",
            ),
          ],
        ].map(([n, title, text]) => (
          <article key={n}>
            <span>{n}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <details className="rule-foot">
        <summary>{t("Masa & sambungan")}</summary>
        <div>
          <p>
            {t(
              "Giliran: 30, 60 atau 90 saat. Tamat masa mengambil satu kad dan menukar giliran.",
            )}
          </p>
          <p>
            {t(
              "Tiada sasaran? Ambil kad. Sambungan terputus menjeda permainan sehingga 90 saat.",
            )}
          </p>
          <p>
            {t(
              "Bilik tamat selepas 2 jam tanpa aktiviti. Cabaran lakonan tidak memberi mata.",
            )}
          </p>
        </div>
      </details>
      <button
        className="primary"
        onClick={() => (room ? setPage("room") : enter("create"))}
        data-sound={room ? "back" : "click"}
      >
        {t("Jom bermain")} <ArrowRight size={18} />
      </button>
    </section>
  );
}
