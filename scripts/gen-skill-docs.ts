#!/usr/bin/env bun
/**
 * Generate SKILL.md files from .tmpl templates.
 *
 * Pipeline:
 *   read .tmpl → find {{PLACEHOLDERS}} → resolve from source → format → write .md
 *
 * Supports --dry-run: generate to memory, exit 1 if different from committed file.
 * Supports --host <name|all>: generate for a specific host or all hosts.
 */

import { discoverTemplates } from './discover-skills';
import * as fs from 'fs';
import * as path from 'path';
import type { Host, TemplateContext } from './resolvers/types';
import { HOST_PATHS } from './resolvers/types';
import { RESOLVERS } from './resolvers/index';
import { ALL_HOST_CONFIGS, ALL_HOST_NAMES, resolveHostArg, getHostConfig } from '../hosts/index';
import type { HostConfig } from './host-config';
import { validateAllConfigs } from './host-config';

const ROOT = path.resolve(import.meta.dir, '..');
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Host Detection (config-driven) ─────────────────────────

const HOST_ARG = process.argv.find(a => a.startsWith('--host'));
type HostArg = Host | 'all';
const HOST_ARG_VAL: HostArg = (() => {
  if (!HOST_ARG) return 'claude';
  const val = HOST_ARG.includes('=') ? HOST_ARG.split('=')[1] : process.argv[process.argv.indexOf(HOST_ARG) + 1];
  if (!val) throw new Error('--host requires a value');
  if (val === 'all') return 'all';
  try {
    return resolveHostArg(val) as Host;
  } catch {
    throw new Error(`Unknown host: ${val}. Use ${ALL_HOST_NAMES.join(', ')}, or all.`);
  }
})();

let HOST: Host = HOST_ARG_VAL === 'all' ? 'claude' : HOST_ARG_VAL;

// ─── Model Selection ────────────────────────────────────────
import { ALL_MODEL_NAMES, resolveModel, type Model } from './models';
const MODEL_ARG = process.argv.find(a => a.startsWith('--model'));
const MODEL_ARG_VAL: Model = (() => {
  if (!MODEL_ARG) return 'claude';
  const val = MODEL_ARG.includes('=') ? MODEL_ARG.split('=')[1] : process.argv[process.argv.indexOf(MODEL_ARG) + 1];
  if (!val) throw new Error('--model requires a value');
  const resolved = resolveModel(val);
  if (!resolved) {
    throw new Error(`Unknown model: ${val}. Use ${ALL_MODEL_NAMES.join(', ')}.`);
  }
  return resolved;
})();

// ─── External Host Helpers ───────────────────────────────────

function externalSkillName(skillDir: string, frontmatterName?: string): string {
  if (skillDir === '.' || skillDir === '') return 'solace-architect';
  const baseName = frontmatterName && frontmatterName !== skillDir ? frontmatterName : skillDir;
  if (baseName.startsWith('solace-')) return baseName;
  return `solace-${baseName}`;
}

function extractNameAndDescription(content: string): { name: string; description: string } {
  const fmStart = content.indexOf('---\n');
  if (fmStart !== 0) return { name: '', description: '' };
  const fmEnd = content.indexOf('\n---', fmStart + 4);
  if (fmEnd === -1) return { name: '', description: '' };

  const frontmatter = content.slice(fmStart + 4, fmEnd);
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : '';

  let description = '';
  const lines = frontmatter.split('\n');
  let inDescription = false;
  const descLines: string[] = [];
  for (const line of lines) {
    if (line.match(/^description:\s*\|?\s*$/)) {
      inDescription = true;
      continue;
    }
    if (line.match(/^description:\s*\S/)) {
      description = line.replace(/^description:\s*/, '').trim();
      break;
    }
    if (inDescription) {
      if (line === '' || line.match(/^\s/)) {
        descLines.push(line.replace(/^  /, ''));
      } else {
        break;
      }
    }
  }
  if (descLines.length > 0) {
    description = descLines.join('\n').trim();
  }

  return { name, description };
}

// ─── Voice Trigger Processing ────────────────────────────────

function extractVoiceTriggers(content: string): string[] {
  const fmStart = content.indexOf('---\n');
  if (fmStart !== 0) return [];
  const fmEnd = content.indexOf('\n---', fmStart + 4);
  if (fmEnd === -1) return [];
  const frontmatter = content.slice(fmStart + 4, fmEnd);

  const triggers: string[] = [];
  let inVoice = false;
  for (const line of frontmatter.split('\n')) {
    if (/^voice-triggers:/.test(line)) { inVoice = true; continue; }
    if (inVoice) {
      const m = line.match(/^\s+-\s+"(.+)"$/);
      if (m) triggers.push(m[1]);
      else if (!/^\s/.test(line)) break;
    }
  }
  return triggers;
}

function processVoiceTriggers(content: string): string {
  const triggers = extractVoiceTriggers(content);
  if (triggers.length === 0) return content;

  content = content.replace(/^voice-triggers:\n(?:\s+-\s+"[^"]*"\n?)*/m, '');

  const { description } = extractNameAndDescription(content);
  if (!description) return content;

  const voiceLine = `Voice triggers (speech-to-text aliases): ${triggers.map(t => `"${t}"`).join(', ')}.`;
  const newDescription = description + '\n' + voiceLine;

  const oldIndented = description.split('\n').map(l => `  ${l}`).join('\n');
  const newIndented = newDescription.split('\n').map(l => `  ${l}`).join('\n');
  content = content.replace(oldIndented, newIndented);

  return content;
}

export { extractVoiceTriggers, processVoiceTriggers };

const OPENAI_SHORT_DESCRIPTION_LIMIT = 120;

function condenseOpenAIShortDescription(description: string): string {
  const firstParagraph = description.split(/\n\s*\n/)[0] || description;
  const collapsed = firstParagraph.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= OPENAI_SHORT_DESCRIPTION_LIMIT) return collapsed;

  const truncated = collapsed.slice(0, OPENAI_SHORT_DESCRIPTION_LIMIT - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  const safe = lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated;
  return `${safe}...`;
}

function generateOpenAIYaml(displayName: string, shortDescription: string): string {
  return `interface:
  display_name: ${JSON.stringify(displayName)}
  short_description: ${JSON.stringify(shortDescription)}
  default_prompt: ${JSON.stringify(`Use ${displayName} for this task.`)}
policy:
  allow_implicit_invocation: true
`;
}

// ─── Frontmatter Transformation ─────────────────────────────

function transformFrontmatter(content: string, host: Host): string {
  const hostConfig = getHostConfig(host);
  const fm = hostConfig.frontmatter;

  if (fm.mode === 'denylist') {
    for (const field of fm.stripFields || []) {
      if (field === 'voice-triggers') {
        content = content.replace(/^voice-triggers:\n(?:\s+-\s+"[^"]*"\n?)*/m, '');
      } else {
        content = content.replace(new RegExp(`^${field}:\\s*.*\\n`, 'm'), '');
      }
    }
    return content;
  }

  // Allowlist mode: reconstruct frontmatter with only allowed fields
  const fmStart = content.indexOf('---\n');
  if (fmStart !== 0) return content;
  const fmEnd = content.indexOf('\n---', fmStart + 4);
  if (fmEnd === -1) return content;
  const frontmatter = content.slice(fmStart + 4, fmEnd);
  const body = content.slice(fmEnd + 4);
  const { name, description } = extractNameAndDescription(content);

  if (fm.descriptionLimit) {
    const behavior = fm.descriptionLimitBehavior || 'error';
    if (description.length > fm.descriptionLimit) {
      if (behavior === 'error') {
        throw new Error(
          `${hostConfig.displayName} description for "${name}" is ${description.length} chars (max ${fm.descriptionLimit}). ` +
          `Compress the description in the .tmpl file.`
        );
      } else if (behavior === 'truncate') {
        const limit = fm.descriptionLimit!;
        const truncated = description.slice(0, limit - 3);
        const lastSpace = truncated.lastIndexOf(' ');
        const safe = lastSpace > Math.floor(limit / 3) ? truncated.slice(0, lastSpace) : truncated;
        const newDesc = `${safe}...`;
        const oldIndented = description.split('\n').map(l => `  ${l}`).join('\n');
        const newIndented = newDesc.split('\n').map(l => `  ${l}`).join('\n');
        content = content.replace(oldIndented, newIndented);
      } else if (behavior === 'warn') {
        console.warn(`WARNING: ${hostConfig.displayName} description for "${name}" exceeds ${fm.descriptionLimit} chars`);
      }
    }
  }

  const indentedDesc = description.split('\n').map(l => `  ${l}`).join('\n');
  let newFm = `---\nname: ${name}\ndescription: |\n${indentedDesc}\n`;

  if (fm.extraFields) {
    for (const [key, value] of Object.entries(fm.extraFields)) {
      if (key !== 'name' && key !== 'description') {
        newFm += `${key}: ${value}\n`;
      }
    }
  }

  if (fm.conditionalFields) {
    for (const rule of fm.conditionalFields) {
      const match = Object.entries(rule.if).every(([k, v]) =>
        new RegExp(`^${k}:\\s*${v}`, 'm').test(frontmatter)
      );
      if (match) {
        for (const [key, value] of Object.entries(rule.add)) {
          newFm += `${key}: ${value}\n`;
        }
      }
    }
  }

  if (fm.keepFields) {
    for (const field of fm.keepFields) {
      if (field === 'name' || field === 'description') continue;
      const fieldMatch = frontmatter.match(new RegExp(`^${field}:(.*(?:\\n(?:[ \\t]+.+))*)`, 'm'));
      if (fieldMatch) {
        newFm += `${field}:${fieldMatch[1]}\n`;
      }
    }
  }

  if (fm.renameFields) {
    for (const [oldName, newName] of Object.entries(fm.renameFields)) {
      const fieldMatch = frontmatter.match(new RegExp(`^${oldName}:(.+(?:\\n(?:\\s+.+)*)?)`, 'm'));
      if (fieldMatch) {
        newFm += `${newName}:${fieldMatch[1]}\n`;
      }
    }
  }

  newFm += '---';
  return newFm + body;
}

// ─── Hook Safety Prose ──────────────────────────────────────

function extractHookSafetyProse(tmplContent: string): string | null {
  if (!tmplContent.match(/^hooks:/m)) return null;

  const matchers: string[] = [];
  const matcherRegex = /matcher:\s*"(\w+)"/g;
  let m;
  while ((m = matcherRegex.exec(tmplContent)) !== null) {
    if (!matchers.includes(m[1])) matchers.push(m[1]);
  }

  if (matchers.length === 0) return null;

  const toolDescriptions: Record<string, string> = {
    Bash: 'check bash commands for destructive operations before execution',
    Edit: 'verify file edits are within the allowed scope boundary before applying',
    Write: 'verify file writes are within the allowed scope boundary before applying',
  };

  const safetyChecks = matchers
    .map(t => toolDescriptions[t] || `check ${t} operations for safety`)
    .join(', and ');

  return `> **Safety Advisory:** This skill includes safety checks that ${safetyChecks}. When using this skill, always pause and verify before executing potentially destructive operations.`;
}

// ─── Template Processing ────────────────────────────────────

const GENERATED_HEADER = `<!-- AUTO-GENERATED from {{SOURCE}} — do not edit directly -->\n<!-- Regenerate: bun run gen:skill-docs -->\n`;

function processExternalHost(
  content: string,
  tmplContent: string,
  host: Host,
  skillDir: string,
  extractedDescription: string,
  ctx: TemplateContext,
  frontmatterName?: string,
): { content: string; outputPath: string; outputDir: string; symlinkLoop: boolean } {
  const hostConfig = getHostConfig(host);

  const name = externalSkillName(skillDir === '.' ? '' : skillDir, frontmatterName);
  const outputDir = path.join(ROOT, hostConfig.hostSubdir, 'skills', name);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'SKILL.md');

  let symlinkLoop = false;
  const claudePath = ctx.tmplPath.replace(/\.tmpl$/, '');
  try {
    const resolvedClaude = fs.realpathSync(claudePath);
    const resolvedExternal = fs.realpathSync(path.dirname(outputPath)) + '/' + path.basename(outputPath);
    if (resolvedClaude === resolvedExternal) {
      symlinkLoop = true;
    }
  } catch {
    // realpathSync fails if file doesn't exist yet
  }

  const safetyProse = extractHookSafetyProse(tmplContent);

  let result = transformFrontmatter(content, host);

  if (safetyProse) {
    const bodyStart = result.indexOf('\n---') + 4;
    result = result.slice(0, bodyStart) + '\n' + safetyProse + '\n' + result.slice(bodyStart);
  }

  for (const rewrite of hostConfig.pathRewrites) {
    result = result.replaceAll(rewrite.from, rewrite.to);
  }

  if (hostConfig.toolRewrites) {
    for (const [from, to] of Object.entries(hostConfig.toolRewrites)) {
      result = result.replaceAll(from, to);
    }
  }

  const invokePrefix = hostConfig.invokePrefix || '/';
  if (invokePrefix !== '/') {
    // Rewrite /solace-<skill> command references to use the host's invoke prefix.
    // Negative lookbehind excludes file paths and URLs (preceded by word chars, dots, or slashes).
    result = result.replace(/(?<![.\w/])\/solace-/g, `${invokePrefix}solace-`);
  }

  if (hostConfig.generation.generateMetadata && !symlinkLoop) {
    const agentsDir = path.join(outputDir, 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    const shortDescription = condenseOpenAIShortDescription(extractedDescription);
    fs.writeFileSync(path.join(agentsDir, 'openai.yaml'), generateOpenAIYaml(name, shortDescription));
  }

  return { content: result, outputPath, outputDir, symlinkLoop };
}

function processTemplate(tmplPath: string, host: Host = 'claude'): { outputPath: string; content: string; symlinkLoop?: boolean } {
  const tmplContent = fs.readFileSync(tmplPath, 'utf-8');
  const relTmplPath = path.relative(ROOT, tmplPath);
  let outputPath = tmplPath.replace(/\.tmpl$/, '');

  const skillDir = path.relative(ROOT, path.dirname(tmplPath));

  const { name: extractedName, description: extractedDescription } = extractNameAndDescription(tmplContent);
  const skillName = extractedName || path.basename(path.dirname(tmplPath));

  const tierMatch = tmplContent.match(/^preamble-tier:\s*(\d+)$/m);
  const preambleTier = tierMatch ? parseInt(tierMatch[1], 10) : undefined;

  const interactiveMatch = tmplContent.match(/^interactive:\s*(true|false)\s*$/m);
  const interactive = interactiveMatch ? interactiveMatch[1] === 'true' : undefined;

  const ctx: TemplateContext = { skillName, tmplPath, host, paths: HOST_PATHS[host], preambleTier, interactive };

  const currentHostConfig = getHostConfig(host);
  const suppressed = new Set(currentHostConfig.suppressedResolvers || []);
  let content = tmplContent.replace(/\{\{(\w+(?::[^}]+)?)\}\}/g, (_match, fullKey) => {
    const parts = fullKey.split(':');
    const resolverName = parts[0];
    const args = parts.slice(1);
    if (suppressed.has(resolverName)) return '';
    const resolver = RESOLVERS[resolverName];
    if (!resolver) throw new Error(`Unknown placeholder {{${resolverName}}} in ${relTmplPath}`);
    return args.length > 0 ? resolver(ctx, args) : resolver(ctx);
  });

  const remaining = content.match(/\{\{(\w+(?::[^}]+)?)\}\}/g);
  if (remaining) {
    throw new Error(`Unresolved placeholders in ${relTmplPath}: ${remaining.join(', ')}`);
  }

  content = processVoiceTriggers(content);

  const postProcessDescription = extractNameAndDescription(content).description;

  let symlinkLoop = false;
  if (host === 'claude') {
    content = transformFrontmatter(content, host);
  } else {
    const result = processExternalHost(content, tmplContent, host, skillDir, postProcessDescription, ctx, extractedName || undefined);
    content = result.content;
    outputPath = result.outputPath;
    symlinkLoop = result.symlinkLoop;
  }

  const header = GENERATED_HEADER.replace('{{SOURCE}}', path.basename(tmplPath));
  const fmEnd = content.indexOf('---', content.indexOf('---') + 3);
  if (fmEnd !== -1) {
    const insertAt = content.indexOf('\n', fmEnd) + 1;
    content = content.slice(0, insertAt) + header + content.slice(insertAt);
  } else {
    content = header + content;
  }

  return { outputPath, content, symlinkLoop };
}

// ─── Main ───────────────────────────────────────────────────

function findTemplates(): string[] {
  return discoverTemplates(ROOT).map(t => path.join(ROOT, t.tmpl));
}

const configErrors = validateAllConfigs(ALL_HOST_CONFIGS);
if (configErrors.length > 0) {
  console.error('Host config validation errors:');
  for (const e of configErrors) console.error(`  ${e}`);
  process.exit(1);
}

const ALL_HOSTS: Host[] = ALL_HOST_NAMES as Host[];
const hostsToRun: Host[] = HOST_ARG_VAL === 'all' ? ALL_HOSTS : [HOST];
const failures: { host: string; error: Error }[] = [];

for (const currentHost of hostsToRun) {
  HOST = currentHost;

  try {
    let hasChanges = false;
    const tokenBudget: Array<{ skill: string; lines: number; tokens: number }> = [];

    const currentHostConfig = getHostConfig(currentHost);
    for (const tmplPath of findTemplates()) {
      const dir = path.basename(path.dirname(tmplPath));

      if (currentHostConfig.generation.includeSkills !== undefined) {
        if (!currentHostConfig.generation.includeSkills.includes(dir)) continue;
      }
      if (currentHostConfig.generation.skipSkills?.length) {
        if (currentHostConfig.generation.skipSkills.includes(dir)) continue;
      }

      let result: { outputPath: string; content: string; symlinkLoop?: boolean };
      try {
        result = processTemplate(tmplPath, currentHost);
      } catch (tmplErr) {
        console.error(`ERROR: Template ${path.relative(ROOT, tmplPath)} failed for ${currentHost}: ${(tmplErr as Error).message}`);
        hasChanges = true;
        continue;
      }
      const { outputPath, content, symlinkLoop } = result;
      const relOutput = path.relative(ROOT, outputPath);

      if (symlinkLoop) {
        console.log(`SKIPPED (symlink loop): ${relOutput}`);
      } else if (DRY_RUN) {
        const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf-8') : '';
        if (existing !== content) {
          console.log(`STALE: ${relOutput}`);
          hasChanges = true;
        } else {
          console.log(`FRESH: ${relOutput}`);
        }
      } else {
        fs.writeFileSync(outputPath, content);
        console.log(`GENERATED: ${relOutput}`);
      }

      const lines = content.split('\n').length;
      const tokens = Math.round(content.length / 4);
      tokenBudget.push({ skill: relOutput, lines, tokens });

      const BYTE_CEILING = 160_000;
      if (content.length > BYTE_CEILING) {
        console.warn(`WARNING: ${relOutput} is ${content.length} bytes (~${tokens} tokens), exceeds ceiling`);
      }
    }

    if (DRY_RUN && hasChanges) {
      console.error(`\nGenerated SKILL.md files are stale (${currentHost} host). Run: bun run gen:skill-docs --host ${currentHost}`);
      if (HOST_ARG_VAL !== 'all') process.exit(1);
      failures.push({ host: currentHost, error: new Error('Stale files detected') });
    }

    if (!DRY_RUN && tokenBudget.length > 0) {
      tokenBudget.sort((a, b) => b.lines - a.lines);
      const totalLines = tokenBudget.reduce((s, t) => s + t.lines, 0);
      const totalTokens = tokenBudget.reduce((s, t) => s + t.tokens, 0);

      console.log('');
      console.log(`Token Budget (${currentHost} host)`);
      console.log('═'.repeat(60));
      for (const t of tokenBudget) {
        const hostSubdirs = ALL_HOST_CONFIGS.map(c => c.hostSubdir.replace(/\./g, '\\.')).join('|');
        const name = t.skill.replace(/\/SKILL\.md$/, '').replace(new RegExp(`^\\.(${hostSubdirs})\\/skills\\/`), '');
        console.log(`  ${name.padEnd(30)} ${String(t.lines).padStart(5)} lines  ~${String(t.tokens).padStart(6)} tokens`);
      }
      console.log('─'.repeat(60));
      console.log(`  ${'TOTAL'.padEnd(30)} ${String(totalLines).padStart(5)} lines  ~${String(totalTokens).padStart(6)} tokens`);
      console.log('');
    }
  } catch (e) {
    failures.push({ host: currentHost, error: e as Error });
    console.error(`WARNING: ${currentHost} generation failed: ${(e as Error).message}`);
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} host(s) failed: ${failures.map(f => f.host).join(', ')}`);
  process.exit(1);
}
