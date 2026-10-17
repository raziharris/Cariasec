// Adapted from the provided CARIASEC Sound Kit. One decoded buffer per effect,
// one master gain, and one active voice prevent repeated taps from stacking.
export const SOUND_FILES = {
  click: "ui-click.wav",
  confirm: "ui-confirm.wav",
  back: "ui-back.wav",
  error: "ui-error.wav",
  card: "ui-card.wav",
  win: "ui-win.wav",
  draw: "rentak-draw.wav",
  pintas: "rentak-pintas.wav",
  pusing: "rentak-pusing.wav",
  beban: "rentak-beban.wav",
  teduh: "rentak-teduh.wav",
  rentak: "rentak-pair.wav",
  tick: "rentak-tick.wav",
} as const;
export type SoundName = keyof typeof SOUND_FILES;
export interface SoundCue {
  name: SoundName;
  key: string;
}
export interface SoundPreferences {
  volume: number;
  muted: boolean;
}
export const STORAGE_VOLUME = "cariasec:sfx-volume";
export const STORAGE_MUTED = "cariasec:sfx-muted";
const LEVELS: Record<SoundName, number> = {
  click: 0.8,
  confirm: 0.85,
  back: 0.8,
  error: 0.65,
  card: 0.8,
  win: 0.8,
  draw: 0.6,
  pintas: 0.7,
  pusing: 0.7,
  beban: 0.55,
  teduh: 0.7,
  rentak: 0.8,
  tick: 0.3,
};
const clamp = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.45;

export class SoundManager {
  private preferences: SoundPreferences = { volume: 0.45, muted: false };
  private listeners = new Set<() => void>();
  private context?: AudioContext;
  private resuming?: Promise<void>;
  private master?: GainNode;
  private buffers = new Map<SoundName, Promise<AudioBuffer | undefined>>();
  private files = new Map<SoundName, Promise<ArrayBuffer | undefined>>();
  private voice?: AudioBufferSourceNode;
  private serial = 0;
  private seen = new Set<string>();
  private lastName?: SoundName;
  private lastTime = -Infinity;

  readonly getSnapshot = () => this.preferences;
  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  hydrate() {
    try {
      const stored = localStorage.getItem(STORAGE_VOLUME);
      const number = stored === null || !stored.trim() ? 0.45 : Number(stored);
      this.preferences = {
        volume: clamp(number),
        muted: localStorage.getItem(STORAGE_MUTED) === "true",
      };
    } catch {
      /* Restricted storage must not prevent playing. */
    }
    if (this.preferences.muted || this.preferences.volume === 0) this.stop();
    if (this.context) this.configureSession();
    this.applyGain();
    this.listeners.forEach((listener) => listener());
  }

  readonly setVolume = (value: number) =>
    this.setPreferences({ volume: clamp(value) });
  readonly setMuted = (value: boolean) => this.setPreferences({ muted: value });

  private setPreferences(next: Partial<SoundPreferences>) {
    this.preferences = { ...this.preferences, ...next };
    if (this.preferences.muted || this.preferences.volume === 0) this.stop();
    if (this.context) this.configureSession();
    this.applyGain();
    try {
      localStorage.setItem(STORAGE_VOLUME, String(this.preferences.volume));
      localStorage.setItem(STORAGE_MUTED, String(this.preferences.muted));
    } catch {
      /* Keep browser-private settings usable in memory. */
    }
    this.listeners.forEach((listener) => listener());
  }

  preload() {
    for (const name of Object.keys(SOUND_FILES) as SoundName[]) {
      if (!this.files.has(name)) {
        this.files.set(
          name,
          fetch(`${import.meta.env.BASE_URL}sounds/${SOUND_FILES[name]}`)
            .then((response) =>
              response.ok ? response.arrayBuffer() : undefined,
            )
            .catch(() => undefined),
        );
      }
    }
  }

  // Called synchronously from trusted pointer/keyboard gestures, including
  // muted gestures so later unmuting and asynchronous server events can work.
  readonly unlock = () => {
    try {
      this.configureSession();
      if (!this.context) {
        const AudioConstructor =
          window.AudioContext ??
          (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioConstructor) return;
        this.context = new AudioConstructor({ latencyHint: "interactive" });
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
        this.applyGain();
        this.preload();
      }
      // Safari can resume asynchronously, including after a call or tab switch.
      // Retry on each trusted gesture (touchend included), even if an earlier
      // resume is still pending because that gesture was not accepted.
      if (this.context.state !== "running") {
        this.resuming = this.context.resume().catch(() => undefined);
      }
      for (const name of Object.keys(SOUND_FILES) as SoundName[])
        this.loadBuffer(name);
    } catch {
      /* An unavailable audio device must not break the game. */
    }
  };

  private configureSession() {
    try {
      const session = (
        navigator as Navigator & {
          audioSession?: { type: string };
        }
      ).audioSession;
      if (session) {
        const type =
          this.preferences.muted ||
          this.preferences.volume === 0 ||
          document.hidden
            ? "auto"
            : "playback";
        if (session.type !== type) session.type = type;
      }
    } catch {
      /* Older Safari versions may not support audio session selection. */
    }
  }

  private loadBuffer(name: SoundName) {
    if (!this.buffers.has(name) && this.context) {
      const context = this.context;
      this.buffers.set(
        name,
        this.files
          .get(name)!
          .then((data) =>
            data ? context.decodeAudioData(data.slice(0)) : undefined,
          )
          .catch(() => undefined),
      );
    }
    return this.buffers.get(name);
  }

  readonly playSound = (name: SoundName = "click", key?: string) => {
    if (!Object.hasOwn(SOUND_FILES, name)) return;
    if (key) {
      if (this.seen.has(key)) return;
      this.seen.add(key);
      if (this.seen.size > 256)
        this.seen.delete(this.seen.values().next().value!);
    }
    const now = performance.now();
    if (this.lastName === name && now - this.lastTime < 65) return;
    this.lastName = name;
    this.lastTime = now;
    if (
      !this.context ||
      this.preferences.muted ||
      this.preferences.volume === 0 ||
      document.hidden
    )
      return;
    const ready = this.context.state === "running" ? undefined : this.resuming;
    if (this.context.state !== "running" && !ready) return;
    const ticket = ++this.serial;
    void Promise.all([this.loadBuffer(name), ready]).then(([buffer]) => {
      // Never queue stale sound across unlock, mute, tab switches, or downloads.
      if (
        !buffer ||
        ticket !== this.serial ||
        performance.now() - now > 250 ||
        this.preferences.muted ||
        this.preferences.volume === 0 ||
        document.hidden ||
        this.context?.state !== "running" ||
        !this.master
      )
        return;
      this.stopVoice();
      const voice = this.context.createBufferSource();
      const level = this.context.createGain();
      voice.buffer = buffer;
      level.gain.value = LEVELS[name];
      voice.connect(level).connect(this.master);
      voice.onended = () => {
        voice.disconnect();
        level.disconnect();
        if (this.voice === voice) this.voice = undefined;
      };
      this.voice = voice;
      voice.start();
    });
  };

  readonly stop = () => {
    ++this.serial;
    this.stopVoice();
    if (document.hidden && this.context) this.configureSession();
  };

  private stopVoice() {
    if (!this.voice) return;
    try {
      this.voice.stop();
    } catch {
      /* Already ended. */
    }
    this.voice = undefined;
  }

  private applyGain() {
    if (!this.context || !this.master) return;
    const gain = this.master.gain;
    gain.cancelScheduledValues(this.context.currentTime);
    gain.setTargetAtTime(
      this.preferences.muted ? 0 : this.preferences.volume,
      this.context.currentTime,
      0.005,
    );
  }
}

export const soundManager = new SoundManager();
