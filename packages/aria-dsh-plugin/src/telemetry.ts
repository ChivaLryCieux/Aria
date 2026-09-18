export interface TelemetryEvent {
  id: string;
  timestamp: number;
  stageId?: string;
  stageTitle?: string;
  slotIndex?: number;
  agentName?: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  durationMs?: number;
  message?: string;
}

export class AriaTelemetryService {
  private events: TelemetryEvent[] = [];
  private listeners: Set<(event: TelemetryEvent) => void> = new Set();

  record(event: Omit<TelemetryEvent, 'id' | 'timestamp'>): TelemetryEvent {
    const fullEvent: TelemetryEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      ...event,
    };
    this.events.push(fullEvent);
    if (this.events.length > 200) {
      this.events.shift();
    }
    for (const listener of this.listeners) {
      try {
        listener(fullEvent);
      } catch (err) {
        console.error('[AriaTelemetry] Listener error:', err);
      }
    }
    return fullEvent;
  }

  subscribe(listener: (event: TelemetryEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): readonly TelemetryEvent[] {
    return this.events;
  }
}
