import { useI18n } from "../i18n";
import React from "react";
import { ArrowRight, Users, Layers, CircleHelp, Trophy } from "lucide-react";
import { type View, type Category } from "../../../shared/game";
import { assetUrl, colors } from "../cards/presentation";
import { Card } from "../components/Card";

type Props = {
  room: View | null;
  setPage: (page: string) => void;
  enter: (mode: "create" | "join") => void;
  setDetail: (id: string) => void;
  setFamily: (code: Category) => void;
  family: Category;
};

export function HomePage({
  room,
  setPage,
  enter,
  setDetail,
  setFamily,
}: Props) {
  const { t, cards, categories } = useI18n();
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <Layers size={16} /> {t("PERMAINAN KAD RIASEC")}
          </div>
          <h1>
            {t("Kumpul.")}
            <br />
            <em>{t("Menang!")}</em>
          </h1>
          <div className="hero-meta">
            <span>
              <Users size={16} />
              {t("2–6 pemain")}
            </span>
            <span>
              <Layers size={16} />
              {t("36 kad")}
            </span>
          </div>
          <div className="hero-actions">
            <button
              className="primary"
              onClick={() => (room ? setPage("room") : enter("create"))}
              data-sound={room ? "back" : "click"}
            >
              {room ? t("Kembali") : t("Buka bilik")}
              <ArrowRight size={22} />
            </button>
            <button className="secondary" data-sound="back" onClick={() => setPage("rules")}>
              <CircleHelp size={20} />
              {t("Cara main")}
            </button>
          </div>
        </div>
        <div className="hero-art">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="game-token token-one" aria-hidden="true">
            <Trophy />
          </span>
          <span className="game-token token-two" aria-hidden="true">
            6
          </span>
          <span className="game-token token-three" aria-hidden="true">
            <Layers />
          </span>
          <div className="fan-card fan-left">
            <Card id="I2" onClick={() => setDetail("I2")} />
          </div>
          <div className="fan-card fan-right">
            <Card id="S1" onClick={() => setDetail("S1")} />
          </div>
          <div className="fan-card fan-center">
            <Card id="R1" onClick={() => setDetail("R1")} />
          </div>
          <span className="art-caption">{t("6 kad = 1 keluarga")}</span>
        </div>
      </section>
      <section className="family-section">
        <div className="section-title">
          <h2>{t("6 keluarga")}</h2>
          <button
            className="text-button"
            data-sound="back"
            onClick={() => {
              setFamily("R");
              setPage("learn");
            }}
          >
            {t("Lihat RIASEC")}
            <ArrowRight size={18} />
          </button>
        </div>
        <div className="category-grid">
          {categories.map((c) => {
            const preview = cards.find((card) => card.id === `${c.code}1`)!;
            return (
              <button
                key={c.code}
                className="category-tile"
                style={{ "--category": colors[c.code] } as React.CSSProperties}
                data-sound="back"
                onClick={() => {
                  setFamily(c.code);
                  setPage("learn");
                }}
              >
                <div className="category-portrait">
                  <img src={assetUrl(preview.artwork)} alt="" loading="lazy" />
                </div>
                <span>{c.code}</span>
                <b>{c.name}</b>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
