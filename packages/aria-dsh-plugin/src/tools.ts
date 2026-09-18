import type { AriaTelemetryService } from './telemetry.ts';

export interface AriaToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export function createAriaDesktopTools(telemetry: AriaTelemetryService): AriaToolDefinition[] {
  return [
    {
      name: 'aria_desktop_status',
      description: 'Query Aria Desktop Terminal status, memory metrics, and active slot telemetry.',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        return {
          terminal: 'Atrium // 智役中庭',
          arch: process.arch,
          platform: process.platform,
          uptimeSecs: Math.floor(process.uptime()),
          memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          telemetryCount: telemetry.getSnapshot().length,
        };
      },
    },
    {
      name: 'aria_emit_telemetry',
      description: 'Emit a milestone checkpoint into the Aria Brutalist telemetry log.',
      parameters: {
        type: 'object',
        properties: {
          milestone: { type: 'string', description: 'Checkpoint milestone description' },
          stageTitle: { type: 'string', description: 'Associated stage or node name' },
        },
        required: ['milestone'],
      },
      execute: async (args: any) => {
        const evt = telemetry.record({
          stageTitle: args.stageTitle || 'OPERATOR_TOOL',
          status: 'completed',
          message: String(args.milestone),
        });
        return { recorded: true, id: evt.id, timestamp: evt.timestamp };
      },
    },
  ];
}
