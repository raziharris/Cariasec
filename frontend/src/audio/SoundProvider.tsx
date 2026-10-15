import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { SOUND_FILES, soundManager, type SoundName } from "./SoundManager";

const SoundContext = createContext<typeof soundManager | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    soundManager.hydrate();
    soundManager.preload();
    const unlock = (event: Event) => {
      if (event.isTrusted) soundManager.unlock();
    };
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.isTrusted) return;
      soundManager.unlock();
      const button = event.target.closest<HTMLButtonElement>('button, [role="button"], [role="tab"]');
      if (!button || button.matches(':disabled, [aria-disabled="true"]')) return;
      const name = button.getAttribute("data-sound");
      if (name === "none") return;
      soundManager.playSound(name && Object.hasOwn(SOUND_FILES, name) ? name as SoundName : "click");
    };
    const invalid = () => soundManager.playSound("error");
    const visibility = () => { if (document.hidden) soundManager.stop(); };
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith("cariasec:sfx-")) soundManager.hydrate();
    };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("touchend", unlock, { capture: true, passive: true });
    document.addEventListener("keydown", unlock, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("invalid", invalid, true);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("storage", storage);
    return () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("touchend", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("invalid", invalid, true);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("storage", storage);
      soundManager.stop();
    };
  }, []);
  return <SoundContext.Provider value={soundManager}>{children}</SoundContext.Provider>;
}

export function useSound() {
  const manager = useContext(SoundContext);
  if (!manager) throw new Error("useSound requires SoundProvider");
  const preferences = useSyncExternalStore(manager.subscribe, manager.getSnapshot);
  return { ...preferences, setVolume: manager.setVolume, setMuted: manager.setMuted, playSound: manager.playSound };
}
