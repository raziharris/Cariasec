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
export function LearnPage({
  room,
  setPage,
  enter,
  setDetail,
  setFamily,
  family,
}: Props) {
  const { t, cards, categories } = useI18n();
  return (
    <section className="content-page">
      <button
        className="back-link"
        data-sound="back"
        onClick={() => setPage(room ? "room" : "home")}
      >
        <ArrowLeft size={16} />
        {t("Kembali")}
      </button>

      <h1>{t("Koleksi kerjaya")}</h1>

      <div
        className="family-tabs"
        role="tablist"
        aria-label={t("Keluarga RIASEC")}
      >
        {categories.map((c) => (
          <button
            role="tab"
            aria-selected={family === c.code}
            key={c.code}
            className={family === c.code ? "chosen" : ""}
            onClick={() => setFamily(c.code)}
            style={{ "--category": colors[c.code] } as React.CSSProperties}
          >
            {c.code} · {c.name}
          </button>
        ))}
      </div>
      {categories
        .filter((c) => c.code === family)
        .map((c) => (
          <div key={c.code}>
            <div className="learning-intro">
              <span
                className="big-letter"
                style={{ background: colors[c.code] }}
              >
                {c.code}
              </span>
              <div>
                <div className="eyebrow">
                  {t("SI")} {c.role.toUpperCase()}
                </div>
                <h2>{c.name}</h2>
                <p>{c.description}</p>
              </div>
            </div>
            <div className="learning-cards">
              {cards
                .filter((x) => x.category === family)
                .map((x) => (
                  <Card key={x.id} id={x.id} onClick={() => setDetail(x.id)} />
                ))}
            </div>
            <div className="challenge">
              <Sparkles />
              <div>
                <b>{t("Cuba lakonkan")}</b>
                <p>{c.challenge}.</p>
                <small>{t("Pilihan · tanpa mata")}</small>
              </div>
            </div>
          </div>
        ))}
    </section>
  );
}
