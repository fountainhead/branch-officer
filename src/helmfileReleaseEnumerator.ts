import { Helmfile, parseFile } from './helmfile';

type FetchOptions = {
  file: string
};

export const fetch = async ({ file }: FetchOptions) => {
  console.log(`Fetching releases from Helmfile '${file}'`);

  return (await parseFile<Helmfile>(file)).releases;
};
