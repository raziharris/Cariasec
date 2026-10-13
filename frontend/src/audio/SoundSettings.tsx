import { Volume2, VolumeX } from "lucide-react";
import { useI18n } from "../i18n";
import { useSound } from "./SoundProvider";
import "./SoundSettings.css";

export function SoundSettings() {
  const { t } = useI18n();
  const { volume, muted, setVolume, setMuted, playSound } = useSound();
  const percent = Math.round(volume * 100);
  return (
    <section className="cariasec-sound-settings" aria-label={t("Tetapan bunyi")}>
      <h3>{t("Kesan bunyi")}</h3>
      <div className="cariasec-sound-row">
        <button type="button" className="secondary" data-sound="none"
          aria-pressed={muted} aria-label={muted ? t("Hidupkan bunyi") : t("Senyapkan bunyi")}
          onClick={() => {
            setMuted(!muted);
            if (muted) playSound("click");
          }}>
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          {muted ? t("Bunyi dimatikan") : t("Bunyi dihidupkan")}
        </button>
        <output htmlFor="cariasec-sfx-volume">{percent}%</output>
      </div>
      <label htmlFor="cariasec-sfx-volume">{t("Volume kesan bunyi")}</label>
      <input id="cariasec-sfx-volume" type="range" min="0" max="100" step="1"
        value={percent} aria-valuetext={`${percent}%`}
        onChange={(event) => setVolume(Number(event.target.value) / 100)}
        onPointerUp={() => playSound("click")}
        onKeyUp={(event) => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) playSound("click"); }} />
      <button type="button" className="secondary full" data-sound="none"
        onClick={() => playSound("confirm")} disabled={muted || volume === 0}>
        <Volume2 size={18} />{t("Cuba bunyi")}
      </button>
    </section>
  );
}
