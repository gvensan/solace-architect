import type { HostConfig } from '../scripts/host-config';

const gbrain: HostConfig = {
  name: 'gbrain',
  displayName: 'GBrain',
  cliCommand: 'gbrain',
  cliAliases: [],

  globalRoot: '.gbrain/skills/solace-architect',
  localSkillRoot: '.gbrain/skills/solace-architect',
  hostSubdir: '.gbrain',
  usesEnvVars: true,

  frontmatter: {
    mode: 'allowlist',
    keepFields: ['name', 'description', 'triggers'],
    descriptionLimit: null,
  },

  generation: {
    generateMetadata: false,
    includeSkills: [],
  },

  pathRewrites: [
    { from: '~/.claude/skills/solace-architect', to: '~/.gbrain/skills/solace-architect' },
    { from: '.claude/skills/solace-architect', to: '.gbrain/skills/solace-architect' },
    { from: '.claude/skills', to: '.gbrain/skills' },
    { from: 'CLAUDE.md', to: 'AGENTS.md' },
  ],
  toolRewrites: {
    'use the Bash tool': 'use the exec tool',
    'use the Write tool': 'use the write tool',
    'use the Read tool': 'use the read tool',
    'use the Edit tool': 'use the edit tool',
    'use the Agent tool': 'use sessions_spawn',
    'use the Grep tool': 'search for',
    'use the Glob tool': 'find files matching',
    'the Bash tool': 'the exec tool',
    'the Read tool': 'the read tool',
    'the Write tool': 'the write tool',
    'the Edit tool': 'the edit tool',
  },

  suppressedResolvers: [],

  runtimeRoot: {
    globalSymlinks: ['bin', 'sa-grounding'],
  },

  install: {
    prefixable: false,
    linkingStrategy: 'symlink-generated',
  },

  coAuthorTrailer: 'Co-Authored-By: GBrain Agent <agent@gbrain.dev>',
};

export default gbrain;
