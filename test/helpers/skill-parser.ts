/**
 * Parses generated SKILL.md files and validates their structure.
 * Used by skill-check.ts and the test suite.
 */

import * as fs from 'fs';

interface SkillCommand {
  line: number;
  command: string;
  args: string;
  raw: string;
}

interface SnapshotFlagError {
  command: SkillCommand;
  error: string;
}

export interface SkillValidation {
  valid: SkillCommand[];
  invalid: SkillCommand[];
  snapshotFlagErrors: SnapshotFlagError[];
  warnings: string[];
}

const KNOWN_COMMANDS = new Set([
  'cat', 'echo', 'ls', 'find', 'grep', 'mkdir', 'head', 'tail', 'wc',
  'stat', 'date', 'basename', 'dirname', 'pwd', 'cd', 'cp', 'mv',
  'git', 'bun', 'npm', 'npx', 'curl', 'wget',
  'if', 'then', 'else', 'elif', 'fi', 'for', 'do', 'done', 'while',
  'case', 'esac', 'set', 'export', 'local', 'readonly', 'unset',
  'true', 'false', 'test', '[', '[[',
  'read', 'printf', 'tee', 'sort', 'uniq', 'tr', 'cut', 'sed', 'awk',
  'touch', 'rm', 'rmdir', 'chmod', 'chown',
  'python3', 'python', 'node',
  'import', 'with', 'data', 'progress', 'break', 'continue', 'return',
  'slug', 'artifacts', 'modified',
  'PROJECT_SLUG', 'DISPLAY_NAME', '_BRANCH',
]);

export function validateSkill(filePath: string): SkillValidation {
  const result: SkillValidation = {
    valid: [],
    invalid: [],
    snapshotFlagErrors: [],
    warnings: [],
  };

  if (!fs.existsSync(filePath)) {
    result.warnings.push(`File not found: ${filePath}`);
    return result;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  let inBash = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^```bash/)) {
      inBash = true;
      continue;
    }
    if (line.match(/^```$/) && inBash) {
      inBash = false;
      continue;
    }
    if (!inBash) continue;

    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const cmdMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_-]*)(?:\s|=|$)/);
    if (!cmdMatch) continue;

    const command = cmdMatch[1];
    const cmd: SkillCommand = {
      line: i + 1,
      command,
      args: trimmed.slice(command.length).trim(),
      raw: trimmed,
    };

    if (KNOWN_COMMANDS.has(command) || command.startsWith('_') || /^[A-Z_]+$/.test(command) || cmd.args.startsWith('=')) {
      result.valid.push(cmd);
    } else {
      result.invalid.push(cmd);
    }
  }

  return result;
}

export interface SkillFrontmatter {
  name: string;
  description: string;
  preambleTier?: number;
  version?: string;
  allowedTools?: string[];
}

export function parseFrontmatter(filePath: string): SkillFrontmatter | null {
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf-8');
  const fmStart = content.indexOf('---\n');
  if (fmStart !== 0) return null;
  const fmEnd = content.indexOf('\n---', fmStart + 4);
  if (fmEnd === -1) return null;

  const fm = content.slice(fmStart + 4, fmEnd);

  const nameMatch = fm.match(/^name:\s*(.+)$/m);
  const tierMatch = fm.match(/^preamble-tier:\s*(\d+)$/m);
  const versionMatch = fm.match(/^version:\s*(.+)$/m);

  let description = '';
  const descMatch = fm.match(/^description:\s*\|?\s*\n([\s\S]*?)(?=^[a-z]|\n---)/m);
  if (descMatch) {
    description = descMatch[1].replace(/^  /gm, '').trim();
  } else {
    const inlineDesc = fm.match(/^description:\s*(\S.*)$/m);
    if (inlineDesc) description = inlineDesc[1].trim();
  }

  const tools: string[] = [];
  const toolsSection = fm.match(/^allowed-tools:\n((?:\s+-\s+\S+\n?)*)/m);
  if (toolsSection) {
    for (const toolLine of toolsSection[1].split('\n')) {
      const m = toolLine.match(/^\s+-\s+(\S+)/);
      if (m) tools.push(m[1]);
    }
  }

  return {
    name: nameMatch?.[1]?.trim() ?? '',
    description,
    preambleTier: tierMatch ? parseInt(tierMatch[1], 10) : undefined,
    version: versionMatch?.[1]?.trim(),
    allowedTools: tools.length > 0 ? tools : undefined,
  };
}

export function extractBashBlocks(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const blocks: string[] = [];
  const regex = /```bash\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}
