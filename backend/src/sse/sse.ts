import { EventEmitter } from "events";

const emitter = new EventEmitter();

export function publish(channel: string, payload: any) {
  // payload should be { event: string, data: any }
  emitter.emit(channel, payload);
}

export function subscribe(channel: string, handler: (payload: any) => void) {
  emitter.on(channel, handler);
  return () => emitter.off(channel, handler);
}

// optional: simple heartbeat publisher to keep connections alive
setInterval(() => {
  // emit heartbeats if needed — subscribers may ignore
  emitter.emit("__heartbeat__", { time: Date.now() });
}, 30_000);
