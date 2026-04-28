import type { HostConfig } from '../scripts/host-config';

const kiro: HostConfig = {
  name: 'kiro',
  displayName: 'Kiro',
  cliCommand: 'kiro-cli',
  cliAliases: [],

  globalRoot: '.kiro/skills/solace-architect',
  localSkillRoot: '.kiro/skills/solace-architect',
  hostSubdir: '.kiro',
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
    { from: '~/.claude/skills/solace-architect', to: '~/.kiro/skills/solace-architect' },
    { from: '.claude/skills/solace-architect', to: '.kiro/skills/solace-architect' },
    { from: '.claude/skills', to: '.kiro/skills' },
  ],

  suppressedResolvers: [],

  runtimeRoot: {
    globalSymlinks: ['bin', 'solace-grounding'],
  },

  install: {
    prefixable: false,
    linkingStrategy: 'symlink-generated',
  },
};

export default kiro;
