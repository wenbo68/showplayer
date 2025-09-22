import { auth } from '~/server/auth';
import AdminControl from '../../_components/auth/AdminControl';
import { TRPCError } from '@trpc/server';

export default async function page() {
  const session = await auth();
  if (session?.user.role === 'admin') {
    return <AdminControl />;
  } else {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
}
