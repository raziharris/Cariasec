import { writeFileSync } from "node:fs";
const rate = 22050;
const cues = {
  draw: [
    [250, 0.11],
    [180, 0.07],
  ],
  pintas: [
    [440, 0.06],
    [0, 0.04],
    [440, 0.06],
  ],
  pusing: [
    [330, 0.1],
    [520, 0.13],
  ],
  beban: [[150, 0.18]],
  teduh: [
    [880, 0.12],
    [1174, 0.13],
  ],
  pair: [
    [523, 0.12],
    [784, 0.18],
  ],
  tick: [[650, 0.035]],
};
let seed = 17;
for (const [name, notes] of Object.entries(cues)) {
  const samples = [];
  for (const [frequency, duration] of notes) {
    const length = Math.floor(rate * duration);
    for (let i = 0; i < length; i++) {
      const envelope = Math.sin((Math.PI * i) / length) ** 2;
      let tone = frequency ? Math.sin((2 * Math.PI * frequency * i) / rate) : 0;
      seed = (1664525 * seed + 1013904223) >>> 0;
      if (name === "draw")
        tone = 0.6 * tone + 0.4 * ((seed / 0xffffffff) * 2 - 1);
      samples.push(Math.round(tone * envelope * 9000));
    }
  }
  const wav = Buffer.alloc(44 + samples.length * 2);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, i) => wav.writeInt16LE(sample, 44 + i * 2));
  writeFileSync(`public/sounds/rentak-${name}.wav`, wav);
}
console.log("Generated seven original Rentak cues.");
