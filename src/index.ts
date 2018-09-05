import * as env from 'env-var';
import { join } from 'path';
import { tap } from 'ramda';
import untildify from 'untildify';
import yargs from 'yargs';

import { fetch as fetchReleases } from './helmfileReleaseEnumerator';
import { apply } from './helmfileUpdater';
import { fetch as fetchPrs } from './pullRequestEnumerator';
import { defaultMapper, PullRequestMapper } from './pullRequestMapper';
import { generate, printTable } from './taskList';

type Args = {
  file: string;
  repo: string;
  owner: string;
  apply: boolean;
  mapper?: string;
};

const args = yargs(process.argv)
  .options({
    file: {
      describe: 'Path to the Helmfile to create, update or remove Releases from.',
      demandOption: true
    },
    repo: {
      describe: 'The name of the GitHub repository to fetch Pull Requests from.',
      demandOption: true
    },
    owner: {
      describe: 'The owner of the GitHub repository to fetch Pull Requests from.',
      demandOption: true
    },
    mapper: {
      describe: `Path to JavaScript 'mapper' file.`
    },
    apply: {
      describe: 'By default, this tool will display proposed changes to a Helmfile but will not modify it. '
        + 'To apply changes to a Helmfile, specify this flag.',
      default: false
    }
  })
  .argv as any as Args;

const gitHub = {
  token: env.get('GITHUB_TOKEN').required().asString(),
  repo: args.repo,
  owner: args.owner
};

const helmfile = {
  file: untildify(args.file)
};

const main = async () => {
  const tasks = generate({
    pullRequests: await fetchPrs(gitHub),

    releases: await fetchReleases(helmfile),

    pullRequestMapper: args.mapper ?
      require(args.mapper) as PullRequestMapper :
      defaultMapper({
        repo: args.repo,
        owner: args.owner
      })
  });

  console.log(printTable(tasks));

  args.apply ?
    await apply({
      file: untildify(args.file),
      tasks
    }) :
    console.log(`To apply these changes to your Helmfile, re-run with the '--apply' flag`);
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
