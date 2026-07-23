import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// ponytail: back-compat redirect for old /r/[owner]/[repo] bookmarks. Safe to remove after a
// few months if analytics show no hits. Static segment `r` wins over the dynamic [owner] route,
// so this is reached for /r/... paths and not shadowed.
export const GET: RequestHandler = ({ params }) => {
  throw redirect(307, `/${params.owner}/${params.repo}`);
};
