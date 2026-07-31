import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_ZIP_PATH = 'public/web2wa-plugin.zip';
const PLUGIN_PHP_PATH = 'public/web2wa-plugin.php';

export interface PluginMeta {
  version: string;
  filename: string;
  zipPath: string;
  exists: boolean;
}

async function parseVersion(phpPath: string): Promise<string> {
  try {
    const src = await readFile(phpPath, 'utf8');
    const match = src.match(/^\s*\*\s*Version:\s*([0-9][0-9.a-zA-Z_-]*)/m);
    return match ? match[1] : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export async function getPluginMeta(): Promise<PluginMeta> {
  const zipPath = process.env.PLUGIN_ZIP_PATH || DEFAULT_ZIP_PATH;
  const absolute = path.join(process.cwd(), zipPath);
  const version = await parseVersion(path.join(process.cwd(), PLUGIN_PHP_PATH));
  return {
    version,
    filename: path.basename(zipPath),
    zipPath: absolute,
    exists: existsSync(absolute),
  };
}
