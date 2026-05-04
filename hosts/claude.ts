import type { HostConfig } from '../scripts/host-config';

const claude: HostConfig = {
  name: 'claude',
  displayName: 'Claude Code',
  cliCommand: 'claude',
  cliAliases: [],

  globalRoot: '.claude/skills/solace-architect',
  localSkillRoot: '.claude/skills/solace-architect',
  hostSubdir: '.claude',
  usesEnvVars: false,

  frontmatter: {
    mode: 'denylist',
    stripFields: ['sensitive', 'voice-triggers'],
    descriptionLimit: null,
  },

  generation: {
    generateMetadata: false,
  },

  pathRewrites: [],
  toolRewrites: {},
  suppressedResolvers: [],

  runtimeRoot: {
    globalSymlinks: ['bin', 'solace-grounding', 'ETHOS.md'],
  },

  install: {
    prefixable: false,
    linkingStrategy: 'real-dir-symlink',
  },

  coAuthorTrailer: 'Co-Authored-By: Claude <noreply@anthropic.com>',
};

export default claude;
