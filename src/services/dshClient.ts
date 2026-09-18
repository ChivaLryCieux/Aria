import { invoke } from '@tauri-apps/api/core';

export interface HarnessConnectionInfo {
  status: 'standby' | 'ready' | 'connected' | 'stopped' | 'error';
  url: string;
  port: number;
  token?: string;
  pid?: number;
  message?: string;
}

export interface DshStreamChunk {
  type: 'chunk' | 'start' | 'end' | 'error';
  content?: string;
  stageId?: string;
  speakerName?: string;
}

export type StreamListener = (chunk: DshStreamChunk) => void;
export type TelemetryListener = (event: any) => void;

class DshClient {
  private connection: HarnessConnectionInfo = {
    status: 'standby',
    url: 'http://127.0.0.1:19387',
    port: 19387,
  };
  private ws: WebSocket | null = null;
  private streamListeners: Set<StreamListener> = new Set();
  private telemetryListeners: Set<TelemetryListener> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  async init(): Promise<HarnessConnectionInfo> {
    try {
      let conn = await invoke<HarnessConnectionInfo>('get_harness_connection');
      if (conn.status !== 'ready') {
        conn = await invoke<HarnessConnectionInfo>('start_harness_daemon');
      }
      this.connection = conn;
      this.connectWebSocket();
      return this.connection;
    } catch (error) {
      console.warn('[DshClient] Native daemon not accessible, running in fallback mode:', error);
      this.connection.status = 'standby';
      return this.connection;
    }
  }

  private connectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    const wsUrl = this.connection.url.replace(/^http/, 'ws') + '/events';
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connection.status = 'connected';
        console.log('[DshClient] WebSocket connected to DSH Core Host:', wsUrl);
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'assistant-stream') {
            this.streamListeners.forEach((fn) => fn(payload));
          } else if (payload.type === 'telemetry') {
            this.telemetryListeners.forEach((fn) => fn(payload));
          }
        } catch (e) {
          console.error('[DshClient] Failed to parse message:', e);
        }
      };

      this.ws.onclose = () => {
        if (this.connection.status === 'connected') {
          this.connection.status = 'ready';
        }
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connectWebSocket();
          }, 3000);
        }
      };

      this.ws.onerror = (e) => {
        console.warn('[DshClient] WS error (normal during daemon startup):', e);
      };
    } catch (err) {
      console.warn('[DshClient] Could not establish WS connection:', err);
    }
  }

  onStream(listener: StreamListener): () => void {
    this.streamListeners.add(listener);
    return () => this.streamListeners.delete(listener);
  }

  onTelemetry(listener: TelemetryListener): () => void {
    this.telemetryListeners.add(listener);
    return () => this.telemetryListeners.delete(listener);
  }

  getConnection(): HarnessConnectionInfo {
    return this.connection;
  }
}

export const dshClient = new DshClient();
