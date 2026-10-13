import { Events } from "phaser";

// Shared bridge between React/Colyseus state and the Phaser play surface.
export const EventBus = new Events.EventEmitter();
