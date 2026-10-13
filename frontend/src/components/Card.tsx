import { useI18n } from "../i18n";
import React from "react";
import { assetUrl, colors } from "../cards/presentation";
export function Card({
  id,
  small = false,
  onClick,
  selected = false,
}: {
  id: string;
  small?: boolean;
  onClick?: () => void;
  selected?: boolean;
}) {
  const { t, categories, cardById } = useI18n();
  const c = cardById[id];
  return (
    <button
      type="button"
      className={`career-card ${small ? "small" : ""} ${selected ? "selected" : ""}`}
      style={{ "--category": colors[c.category] } as React.CSSProperties}
      onClick={onClick}
      aria-label={`${c.title}, ${categories.find((x) => x.code === c.category)!.name}`}
    >
      <span className="card-category">
        <b>{c.category}</b>
        {categories.find((x) => x.code === c.category)!.name}
        <span>✦</span>
      </span>
      <img
        src={assetUrl(c.artwork)}
        alt={t("Ilustrasi {title}", { title: c.title })}
        loading="lazy"
      />
      <span className="card-title">{c.title}</span>
      <span className="card-source">
        {c.id} <span>CARIASEC</span>
      </span>
    </button>
  );
}
