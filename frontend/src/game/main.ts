import { CANVAS, Game, Scale } from "phaser";
import { CardTableScene } from "./scenes/CardTableScene";

export function startGame(parent: string) {
  return new Game({
    // This board is sprite/text heavy rather than shader heavy. Canvas avoids
    // WebGL readback stalls during browser capture and on low-power devices.
    type: CANVAS,
    parent,
    backgroundColor: "#102d25",
    transparent: true,
    audio: { noAudio: true }, // React's shared SoundManager owns all kit audio.
    render: { antialias: true, roundPixels: true },
    fps: { target: 30, min: 15, forceSetTimeOut: true },
    scale: {
      mode: Scale.RESIZE,
      autoCenter: Scale.CENTER_BOTH,
      width: "100%",
      height: "100%",
    },
    scene: [CardTableScene],
  });
}
