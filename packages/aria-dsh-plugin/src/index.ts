import { AriaTelemetryService } from './telemetry.ts';
import { AriaOrchestrationService } from './orchestration.ts';
import { createAriaDesktopTools } from './tools.ts';

export interface AriaPluginConfig {
  terminal?: string;
  mode?: string;
  harnessSlots?: number;
}

export function apply(ctx: any, config: AriaPluginConfig = {}) {
  const telemetry = new AriaTelemetryService();
  const orchestration = new AriaOrchestrationService();

  ctx.ariaTelemetry = telemetry;
  ctx.ariaOrchestration = orchestration;

  console.log(`[ARIA_DSH_PLUGIN] Initialized for ${config.terminal || 'Aria'} in ${config.mode || 'desktop'} mode.`);

  if (ctx.tools && typeof ctx.tools.register === 'function') {
    const tools = createAriaDesktopTools(telemetry);
    for (const tool of tools) {
      ctx.tools.register(tool);
    }
  }

  if (ctx.on) {
    ctx.on('agent/pre-step', (_agent: any, next: any) => {
      telemetry.record({
        stageTitle: 'STEP_EXECUTION',
        status: 'running',
        message: 'Agent step started in DSH harness',
      });
      return typeof next === 'function' ? next() : undefined;
    });

    ctx.on('agent/turn-stopping', () => {
      telemetry.record({
        stageTitle: 'TURN_SETTLEMENT',
        status: 'completed',
        message: 'Agent turn completed and settled in DSH harness',
      });
    });
  }

  return () => {
    console.log('[ARIA_DSH_PLUGIN] Disposing Aria plugin.');
  };
}

export * from './telemetry.ts';
export * from './orchestration.ts';
export * from './tools.ts';
