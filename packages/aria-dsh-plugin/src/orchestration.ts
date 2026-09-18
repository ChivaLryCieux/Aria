export interface DagStage {
  id: string;
  index: number;
  nodeTitle: string;
  role: string;
  instruction: string;
  dependsOn: string[];
}

export interface PipelineExecutionResult {
  pipelineId: string;
  mode: 'dag' | 'parallel';
  stages: DagStage[];
  completedCount: number;
  status: 'idle' | 'running' | 'completed' | 'error';
  outputs: Array<{ stageId: string; content: string; durationMs: number }>;
}

export class AriaOrchestrationService {
  private activePipelines: Map<string, PipelineExecutionResult> = new Map();

  createStages(slotCount: number): DagStage[] {
    const defaultTemplates = [
      {
        nodeTitle: 'Node-01 // 探针解析',
        role: '探针解析算子 (Probe)',
        instruction: '进行首轮结构化拆解与直接回应，明确关键结论、核心论据与基线。',
      },
      {
        nodeTitle: 'Node-02 // 深度拓展',
        role: '拓展综合算子 (Synthesis)',
        instruction: '基于前序节点分析结果进行纵深拓展，补齐架构背景、技术边界与边缘条件。',
      },
      {
        nodeTitle: 'Node-03 // 审校评判',
        role: '评判校验算子 (Critique)',
        instruction: '客观审校前序输出，指出潜在逻辑漏洞与实现风险，收敛终极工程建议。',
      },
    ];

    const stages: DagStage[] = [];
    for (let i = 0; i < slotCount; i++) {
      const tpl = i < defaultTemplates.length
        ? defaultTemplates[i]
        : {
            nodeTitle: `Node-${String(i + 1).padStart(2, '0')} // 专项算子`,
            role: '专项处理算子 (Specialist)',
            instruction: '结合前序算子输出，针对专精维度提供增量技术洞察与补充推演。',
          };

      stages.push({
        id: `dag-stage-${i}`,
        index: i,
        nodeTitle: tpl.nodeTitle,
        role: tpl.role,
        instruction: tpl.instruction,
        dependsOn: i === 0 ? [] : [`dag-stage-${i - 1}`],
      });
    }

    return stages;
  }

  buildStagePrompt(basePrompt: string, stage: DagStage): string {
    const harnessInstructions = [
      `[ARIA_HARNESS_DISPATCH // ${stage.nodeTitle}]`,
      `- 算子角色: ${stage.role}`,
      `- 调度执行指令: ${stage.instruction}`,
      `- 交互准则: 保持冷静、理性、高度结构化与工业级严谨，直接输出工程与技术解析。`,
    ].join('\n');

    return basePrompt.trim()
      ? `${basePrompt}\n\n${harnessInstructions}`
      : harnessInstructions;
  }

  recordStageOutput(pipelineId: string, stageId: string, content: string, durationMs: number) {
    const pipeline = this.activePipelines.get(pipelineId);
    if (pipeline) {
      pipeline.outputs.push({ stageId, content, durationMs });
      pipeline.completedCount++;
      if (pipeline.completedCount >= pipeline.stages.length) {
        pipeline.status = 'completed';
      }
    }
  }

  getPipeline(pipelineId: string): PipelineExecutionResult | undefined {
    return this.activePipelines.get(pipelineId);
  }
}
