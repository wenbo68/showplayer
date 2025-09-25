import { auth } from '~/server/auth';
import IdSubmitter from '../_components/request/IdSubmitter';
import SubmissionHistory from '../_components/request/SubmissionHistory';
import { api } from '~/trpc/server';
import { TRPCError } from '@trpc/server';

export default async function page() {
  const session = await auth();
  if (session?.user) {
    api.user.getUserSubmissions.prefetch();
  } else {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return (
    <>
      <IdSubmitter />
      <SubmissionHistory />
    </>
  );
}
