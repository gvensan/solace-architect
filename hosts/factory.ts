import type { HostConfig } from '../scripts/host-config';

const factory: HostConfig = {
  name: 'factory',
  displayName: 'Factory Droid',
  cliCommand: 'droid',
  cliAliases: [],

  globalRoot: '.factory/skills/solace-architect',
  localSkillRoot: '.factory/skills/solace-architect',
  hostSubdir: '.factory',
  usesEnvVars: true,

  frontmatter: {
    mode: 'allowlist',
    keepFields: ['name', 'description', 'user-invocable'],
    descriptionLimit: null,
    extraFields: {
      'user-invocable': true,
    },
    conditionalFields: [
      { if: { sensitive: true }, add: { 'disable-model-invocation': true } },
    ],
  },

  generation: {
    generateMetadata: false,
  },

  pathRewrites: [
    { from: '~/.claude/skills/solace-architect', to: '$SOLACE_ARCHITECT_ROOT' },
    { from: '.claude/skills/solace-architect', to: '.factory/skills/solace-architect' },
    { from: '.claude/skills', to: '.factory/skills' },
  ],
  toolRewrites: {
    'use the Bash tool': 'run this command',
    'use the Write tool': 'create this file',
    'use the Read tool': 'read the file',
    'use the Agent tool': 'dispatch a subagent',
    'use the Grep tool': 'search for',
    'use the Glob tool': 'find files matching',
  },

  suppressedResolvers: [],

  runtimeRoot: {
    globalSymlinks: ['bin', 'solace-grounding'],
  },

  install: {
    prefixable: false,
    linkingStrategy: 'symlink-generated',
  },

  coAuthorTrailer: 'Co-Authored-By: Factory Droid <droid@users.noreply.github.com>',
};

export default factory;
