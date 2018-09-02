import { readFile as _readFile, writeFile as _writeFile } from 'fs';
import { safeDump, safeLoad } from 'js-yaml';
import { pipe, replace } from 'ramda';
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
 * Parses a YAML string, escaping any Go Template values as regular strings so
 * they don't get messed with by the YAML parser.
 */
export const parse: (yaml: string) => any = pipe(
  replace(/({{.*}})/g, `'$1'`),
  safeLoad
);

/**
 * Dumps an object to a YAML string, reverting any escaped Go Templates to their
 * original 'bare' form.
 */
export const dump: (obj: any) => string = pipe(
  obj => safeDump(obj),
  replace(/'({{.*}})'/g, '$1')
);

/**
 * Parses a YAML file from disk using special handling defined in `parse`.
 */
export const parseFile = async <T extends any>(path: string): Promise<T> => {
  const content = await readFile(path, 'utf8');
  return parse(content);
};

/**
 * Writes an Object to disk as a YAML file using any special handling defined in
 * `dump`.
 */
export const dumpFile = (path: string, obj: any) =>
  writeFile(path, dump(obj));
