import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter } from 'node:events';

@Injectable()
export class SseService implements OnModuleInit, OnModuleDestroy {
  private readonly emitter = new EventEmitter();
  private heartbeatTimer?: NodeJS.Timeout;

  onModuleInit() {
    this.heartbeatTimer = setInterval(() => {
      this.emitter.emit('__heartbeat__', { time: Date.now() });
    }, 30_000);
  }

  onModuleDestroy() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
  }

  publish(channel: string, payload: unknown) {
    this.emitter.emit(channel, payload);
  }

  subscribe(channel: string, handler: (payload: unknown) => void) {
    this.emitter.on(channel, handler);
    return () => this.emitter.off(channel, handler);
  }
}