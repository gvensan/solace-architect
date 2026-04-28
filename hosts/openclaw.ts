import type { HostConfig } from '../scripts/host-config';

const openclaw: HostConfig = {
  name: 'openclaw',
  displayName: 'OpenClaw',
  cliCommand: 'openclaw',
  cliAliases: [],

  globalRoot: '.openclaw/skills/solace-architect',
  localSkillRoot: '.openclaw/skills/solace-architect',
  hostSubdir: '.openclaw',
  usesEnvVars: true,

  frontmatter: {
    mode: 'allowlist',
    keepFields: ['name', 'description'],
    descriptionLimit: null,
    extraFields: {
      version: '0.1.0',
    },
  },

  generation: {
    generateMetadata: false,
    includeSkills: [],
  },

  pathRewrites: [
    { from: '~/.claude/skills/solace-architect', to: '~/.openclaw/skills/solace-architect' },
    { from: '.claude/skills/solace-architect', to: '.openclaw/skills/solace-architect' },
    { from: '.claude/skills', to: '.openclaw/skills' },
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

  coAuthorTrailer: 'Co-Authored-By: OpenClaw Agent <agent@openclaw.ai>',
};

export default openclaw;
