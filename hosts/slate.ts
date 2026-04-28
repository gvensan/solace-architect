import type { HostConfig } from '../scripts/host-config';

const slate: HostConfig = {
  name: 'slate',
  displayName: 'Slate',
  cliCommand: 'slate',
  cliAliases: [],

  globalRoot: '.slate/skills/solace-architect',
  localSkillRoot: '.slate/skills/solace-architect',
  hostSubdir: '.slate',
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
    { from: '~/.claude/skills/solace-architect', to: '~/.slate/skills/solace-architect' },
    { from: '.claude/skills/solace-architect', to: '.slate/skills/solace-architect' },
    { from: '.claude/skills', to: '.slate/skills' },
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

export default slate;
