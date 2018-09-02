import { append, indexOf, merge, update, without } from 'ramda';

import { dumpFile, Helmfile, parseFile } from './helmfile';
import { Task } from './taskList';

type ApplyOptions = {
  file: string;
  tasks: Task[];
};

export const apply = async ({ file, tasks }: ApplyOptions) => {
  const helmfile = await parseFile<Helmfile>(file);

  const updatedReleases = tasks.reduce((releases, task) => {
    if (task.action === 'create') {
      return append(task.release, releases);
    }

    if (task.action === 'update') {
      const index = indexOf(task.oldRelease, releases);
      return update(index, task.release, releases);
    }

    if (task.action === 'delete') {
      return without([task.release], releases);
    }

    return releases;
  }, helmfile.releases);

  console.log(`Updating releases in Helmfile '${file}'`);

  return dumpFile(file, merge(helmfile, {
    releases: updatedReleases
  }));
};
