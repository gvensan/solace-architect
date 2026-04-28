import type { HostConfig } from '../scripts/host-config';

const opencode: HostConfig = {
  name: 'opencode',
  displayName: 'OpenCode',
  cliCommand: 'opencode',
  cliAliases: [],

  globalRoot: '.config/opencode/skills/solace-architect',
  localSkillRoot: '.opencode/skills/solace-architect',
  hostSubdir: '.opencode',
  usesEnvVars: true,

  frontmatter: {
    mode: 'allowlist',
    keepFields: ['name', 'description'],
    descriptionLimit: null,
  },

  generation: {
    generateMetadata: false,
  },

  pathRewrites: [
    { from: '~/.claude/skills/solace-architect', to: '~/.config/opencode/skills/solace-architect' },
    { from: '.claude/skills/solace-architect', to: '.opencode/skills/solace-architect' },
    { from: '.claude/skills', to: '.opencode/skills' },
  ],

  suppressedResolvers: [],

  runtimeRoot: {
    globalSymlinks: ['bin', 'sa-grounding'],
  },

  install: {
    prefixable: false,
    linkingStrategy: 'symlink-generated',
  },
};

export default opencode;
