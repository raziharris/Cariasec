import { CANVAS, Game, Scale } from "phaser";
import { CardTableScene } from "./scenes/CardTableScene";

export function startGame(parent: string) {
  const element = document.getElementById(parent)!;
  const density = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const game = new Game({
    // This board is sprite/text heavy rather than shader heavy. Canvas avoids
    // WebGL readback stalls during browser capture and on low-power devices.
    type: CANVAS,
    parent,
    backgroundColor: "#102d25",
    transparent: true,
    audio: { noAudio: true }, // React's shared SoundManager owns all kit audio.
    input: { touch: { capture: false } },
    render: { antialias: true, roundPixels: true },
    fps: { target: 30, min: 15, forceSetTimeOut: true },
    scale: {
      mode: Scale.NONE,
      zoom: 1 / density,
      width: Math.max(1, element.clientWidth) * density,
      height: Math.max(1, element.clientHeight) * density,
    },
    scene: [CardTableScene],
  });
  // Phaser 4 has no renderer-resolution option: size the backing canvas at DPR
  // and keep scene coordinates in CSS pixels with the camera's zoom.
  game.registry.set('pixel-density', density);
  const resize = () => {
    if (!game.isBooted || !element.isConnected || element.clientWidth < 1 || element.clientHeight < 1) return;
    game.scale.resize(Math.round(element.clientWidth * density), Math.round(element.clientHeight * density));
    game.loop.wake();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(element);
  game.events.once('ready', resize);
  game.events.once('destroy', () => observer.disconnect());
  return game;
}
