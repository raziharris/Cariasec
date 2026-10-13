import React, { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useI18n } from "../i18n";
import { assetUrl } from "../cards/presentation";
import { useSound } from "../audio/SoundProvider";

export function Welcome() {
  const { playSound } = useSound();
  const { profile, language, setLanguage, finishSetup, t } = useI18n();
  const [name, setName] = useState(profile.name);
  const [invalid, setInvalid] = useState(false);
  return (
    <main className="welcome-screen">
      <section className="welcome-card" aria-labelledby="welcome-title">
        <img
          className="welcome-logo"
          src={assetUrl("icons/cariasec-careers-512.png")}
          alt="Cariasec"
          width="180"
          height="180"
        />
        <h1 id="welcome-title">{t("Jom main!")}</h1>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const valid = finishSetup(name);
            setInvalid(!valid);
            playSound(valid ? "confirm" : "error");
          }}
          noValidate
        >
          <label htmlFor="player-name">{t("Nama anda")}</label>
          <input
            id="player-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setInvalid(false);
            }}
            autoComplete="nickname"
            maxLength={20}
            required
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? "name-error" : undefined}
            placeholder={t("Contoh: Aina")}
          />
          {invalid && (
            <p id="name-error" role="alert">
              {t("2–20 aksara: huruf, nombor, ruang, titik, _ atau -.")}
            </p>
          )}
          <fieldset className="language-options">
            <legend>
              {language === "ms" ? "Bahasa / Language" : "Language / Bahasa"}
            </legend>
            {(
              [
                ["ms", "Bahasa Malaysia", "BM"],
                ["en", "English", "EN"],
              ] as const
            ).map(([code, label, symbol]) => (
              <label key={code} className={language === code ? "chosen" : ""}>
                <input
                  type="radio"
                  name="language"
                  value={code}
                  checked={language === code}
                  onChange={() => setLanguage(code)}
                />
                <b aria-hidden="true">{symbol}</b>
                <span lang={code}>{label}</span>
                {language === code && <Check size={16} aria-hidden="true" />}
              </label>
            ))}
          </fieldset>
          <button className="primary full" type="submit" data-sound="none">
            {t("Teruskan")}
            <ArrowRight size={20} />
          </button>
        </form>
      </section>
    </main>
  );
}
