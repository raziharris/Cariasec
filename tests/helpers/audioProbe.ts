import type { Page } from "@playwright/test";

// Observe real decoded WAVs and Web Audio source starts; playback is not mocked.
export async function observeAudio(page: Page) {
  await page.addInitScript(() => {
    if (typeof AudioContext === "undefined") return;
    const probe = { starts: [] as { name: string; time: number; gain: number }[], gains: [] as GainNode[], decoded: [] as string[], active: new Set<AudioBufferSourceNode>(), maxActive: 0 };
    (window as any).__audioProbe = probe;
    const bytes = new WeakMap<ArrayBuffer, string>();
    const buffers = new WeakMap<AudioBuffer, string>();
    const nativeFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await nativeFetch(...args);
      if (response.url.includes("/sounds/")) {
        const original = response.arrayBuffer.bind(response);
        response.arrayBuffer = async () => {
          const data = await original();
          bytes.set(data, response.url.split("/").at(-1)!);
          return data;
        };
      }
      return response;
    };
    // SoundManager copies downloaded buffers before decoding.
    const slice = ArrayBuffer.prototype.slice;
    ArrayBuffer.prototype.slice = function (...args) {
      const copied = Reflect.apply(slice, this, args);
      const name = bytes.get(this);
      if (name) bytes.set(copied, name);
      return copied;
    };
    const decode = AudioContext.prototype.decodeAudioData;
    AudioContext.prototype.decodeAudioData = function (data) {
      return Reflect.apply(decode, this, [data]).then((buffer: AudioBuffer) => {
        const name = bytes.get(data) ?? "unknown";
        buffers.set(buffer, name);
        probe.decoded.push(name);
        return buffer;
      });
    };
    const gain = AudioContext.prototype.createGain;
    AudioContext.prototype.createGain = function () {
      const node = Reflect.apply(gain, this, []);
      probe.gains.push(node);
      return node;
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      probe.active.add(this);
      probe.maxActive = Math.max(probe.maxActive, probe.active.size);
      this.addEventListener("ended", () => probe.active.delete(this), { once: true });
      probe.starts.push({ name: this.buffer ? buffers.get(this.buffer) ?? "unknown" : "empty",
        time: performance.now(), gain: probe.gains[0]?.gain.value ?? -1 });
      return Reflect.apply(start, this, args);
    };
    const stop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.stop = function (...args) {
      probe.active.delete(this);
      return Reflect.apply(stop, this, args);
    };
  });
}

export const audioStarts = (page: Page) => page.evaluate(() => (window as any).__audioProbe.starts as { name: string; time: number; gain: number }[]);
export const resetAudio = (page: Page) => page.evaluate(() => { (window as any).__audioProbe.starts = []; });
