import { ALL_HOST_CONFIGS } from '../../hosts/index';

export type Host = (typeof ALL_HOST_CONFIGS)[number]['name'];

export interface HostPaths {
  skillRoot: string;
  localSkillRoot: string;
  binDir: string;
  groundingDir: string;
}

function buildHostPaths(): Record<string, HostPaths> {
  const paths: Record<string, HostPaths> = {};
  for (const config of ALL_HOST_CONFIGS) {
    const root = `~/${config.globalRoot}`;
    paths[config.name] = {
      skillRoot: root,
      localSkillRoot: config.localSkillRoot,
      binDir: `${root}/bin`,
      groundingDir: `${root}/solace-grounding`,
    };
  }
  return paths;
}

export const HOST_PATHS: Record<string, HostPaths> = buildHostPaths();

import type { Model } from '../models';
export type { Model } from '../models';

export interface TemplateContext {
  skillName: string;
  tmplPath: string;
  benefitsFrom?: string[];
  host: Host;
  paths: HostPaths;
  preambleTier?: number;
  model?: Model;
  interactive?: boolean;
}

export type ResolverFn = (ctx: TemplateContext, args?: string[]) => string;
