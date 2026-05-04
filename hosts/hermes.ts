import type { HostConfig } from '../scripts/host-config';

const hermes: HostConfig = {
  name: 'hermes',
  displayName: 'Hermes',
  cliCommand: 'hermes',
  cliAliases: [],

  globalRoot: '.hermes/skills/solace-architect',
  localSkillRoot: '.hermes/skills/solace-architect',
  hostSubdir: '.hermes',
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
    { from: '~/.claude/skills/solace-architect', to: '~/.hermes/skills/solace-architect' },
    { from: '.claude/skills/solace-architect', to: '.hermes/skills/solace-architect' },
    { from: '.claude/skills', to: '.hermes/skills' },
    { from: 'CLAUDE.md', to: 'AGENTS.md' },
  ],
  toolRewrites: {
    'use the Bash tool': 'use the terminal tool',
    'use the Write tool': 'use the patch tool',
    'use the Read tool': 'use the read_file tool',
    'use the Edit tool': 'use the patch tool',
    'use the Agent tool': 'use delegate_task',
    'use the Grep tool': 'search for',
    'use the Glob tool': 'find files matching',
    'the Bash tool': 'the terminal tool',
    'the Read tool': 'the read_file tool',
    'the Write tool': 'the patch tool',
    'the Edit tool': 'the patch tool',
  },

  suppressedResolvers: [],

  runtimeRoot: {
    globalSymlinks: ['bin', 'solace-grounding'],
  },

  install: {
    prefixable: false,
    linkingStrategy: 'symlink-generated',
  },

  coAuthorTrailer: 'Co-Authored-By: Hermes Agent <agent@nousresearch.com>',
};

export default hermes;
