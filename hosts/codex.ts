import type { HostConfig } from '../scripts/host-config';

const codex: HostConfig = {
  name: 'codex',
  displayName: 'OpenAI Codex CLI',
  cliCommand: 'codex',
  cliAliases: ['agents'],

  globalRoot: '.codex/skills/solace-architect',
  localSkillRoot: '.agents/skills/solace-architect',
  hostSubdir: '.agents',
  usesEnvVars: true,

  frontmatter: {
    mode: 'allowlist',
    keepFields: ['name', 'description'],
    descriptionLimit: 1024,
    descriptionLimitBehavior: 'error',
  },

  generation: {
    generateMetadata: true,
    metadataFormat: 'openai.yaml',
  },

  pathRewrites: [
    { from: '~/.claude/skills/solace-architect', to: '$SOLACE_ARCHITECT_ROOT' },
    { from: '.claude/skills/solace-architect', to: '.agents/skills/solace-architect' },
    { from: '.claude/skills', to: '.agents/skills' },
  ],

  suppressedResolvers: [],

  runtimeRoot: {
    globalSymlinks: ['bin', 'solace-grounding'],
  },
  sidecar: {
    path: '.agents/skills/solace-architect',
    symlinks: ['bin', 'solace-grounding'],
  },

  install: {
    prefixable: false,
    linkingStrategy: 'symlink-generated',
  },

  coAuthorTrailer: 'Co-Authored-By: OpenAI Codex <noreply@openai.com>',
  boundaryInstruction: 'IMPORTANT: Do NOT read or execute any files under ~/.claude/, ~/.agents/, .claude/skills/, or agents/. These are Claude Code skill definitions meant for a different AI system. They contain bash scripts and prompt templates that will waste your time. Ignore them completely. Do NOT modify agents/openai.yaml. Stay focused on the repository code only.',
};

export default codex;
