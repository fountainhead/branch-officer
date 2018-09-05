import Octokit, { GetAllResponseItem, GetCombinedStatusForRefResponse, Response } from '@octokit/rest';
import { Bar } from 'cli-progress';
import { safeLoadAll } from 'js-yaml';
import {
  all, allPass, always, any, converge, head, identity, ifElse, is, map, merge, mergeAll, objOf, path, pick, pipe, prop,
  tryCatch, unapply, whereEq
} from 'ramda';

export type PullRequest = {
  number: number;
  title: string;
  body: string;
  sha: string;
  branch: string;
  parsedMetadata: {
    [key: string]: any
  };
  buildSucceeded?: boolean;
};

export const extractLastPage = (link: string) => {
  const matches = link.match(/page=(\d+)>; rel="last"/);
  return matches ? parseInt(matches[1], 10) : 1;
};

export const getPrData: (resp: Response<GetAllResponseItem[]>) => PullRequest[] = pipe(
  prop('data'),
  map(
    converge(unapply(mergeAll), [
      (pick as any)(['number', 'title', 'body']),

      pipe(
        prop('body'),
        tryCatch(
          safeLoadAll,
          always([])
        ),
        head as any,
        ifElse(
          is(Object),
          identity,
          always({})
        ),
        objOf('parsedMetadata')
      ),

      pipe(
        path(['head', 'sha']),
        objOf('sha')
      ),

      pipe(
        path(['head', 'ref']),
        objOf('branch')
      )
    ])
  )
);

export const getBuildSucceeded = (requiredStatusChecks?: string[]) =>
  pipe(
    path(['data', 'statuses']),
    requiredStatusChecks ?
      allPass(requiredStatusChecks.map(name => any(whereEq({
        context: name,
        state: 'success'
      })))) as any :
      all(whereEq({
        state: 'success'
      })) as any
  ) as (response: Response<GetCombinedStatusForRefResponse>) => boolean;

type FetchAllOptions = {
  client: Octokit;
  owner: string;
  repo: string;
};

export const fetchAll = async ({ client, owner, repo }: FetchAllOptions) => {
  console.log(`Fetching all PRs for '${owner}/${repo}'`);

  const bar = new Bar({});
  bar.start(1, 0);

  let response = await client.pullRequests.getAll({
    per_page: 100,
    owner,
    repo,
  });

  let data: PullRequest[] = getPrData(response);

  bar.increment(1);

  if (client.hasNextPage(response as any)) {
    const lastPage = extractLastPage(response.headers.link);
    bar.setTotal(lastPage);
  }

  while (client.hasNextPage(response as any)) {
    response = await client.getNextPage(response as any);
    data = data.concat(getPrData(response));
    bar.increment(1);
  }

  bar.stop();
  return data;
};

type WithBuildStatusesOptions = {
  client: Octokit;
  owner: string;
  repo: string;
  pullRequests: PullRequest[];
  statusChecker: (response: Response<GetCombinedStatusForRefResponse>) => boolean;
};

export const withBuildStatuses =
  async ({ client, owner, repo, pullRequests, statusChecker }: WithBuildStatusesOptions) => {
    console.log('Fetching build status for open PRs');

    const bar = new Bar({});
    bar.start(pullRequests.length, 0);

    const buildStatuses = await Promise.all(pullRequests.map(async pr => {
      const response = await client.repos.getCombinedStatusForRef({
        ref: pr.sha,
        owner,
        repo
      });

      bar.increment(1);

      return merge(pr, {
        buildSucceeded: statusChecker(response)
      });
    }));

    bar.stop();

    return buildStatuses;
  };

type FetchOptions = {
  token: string;
  owner: string;
  repo: string;
  requiredStatusChecks?: string[];
};

export const fetch = async ({ token, owner, repo, requiredStatusChecks }: FetchOptions) => {
  const client = new Octokit();
  client.authenticate({ type: 'token', token });

  const pullRequests = await fetchAll({ client, owner, repo });

  return withBuildStatuses({
    statusChecker: getBuildSucceeded(requiredStatusChecks),
    client,
    owner,
    repo,
    pullRequests
  });
};
