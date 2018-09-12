import { readFile as _readFile, writeFile as _writeFile } from 'fs';
import { safeDump, safeLoad } from 'js-yaml';
import { promisify } from 'util';

const readFile = promisify(_readFile);
const writeFile = promisify(_writeFile);

export type Helmfile = {
  [key: string]: any;
  releases: Release[];
};

export type Release = {
  name: string;
  [key: string]: any;

  values: Array<{
    [key: string]: any;
  }>
};

/**
 * Parses a YAML file from disk using special handling defined in `parse`.
 */
export const parseFile = <T extends any>(path: string): Promise<T> =>
  readFile(path, 'utf8').then(safeLoad);

/**
 * Writes an Object to disk as a YAML file using any special handling defined in
 * `dump`.
 */
export const dumpFile = (path: string, obj: any) =>
  writeFile(path, safeDump(obj));
