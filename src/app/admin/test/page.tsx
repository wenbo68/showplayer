import { TRPCError } from '@trpc/server';
import AdminTest from '~/app/_components/auth/AdminTest';
import { auth } from '~/server/auth';

export default async function page() {
  const session = await auth();
  if (session?.user.role === 'admin') {
    return <AdminTest />;
  } else {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
}
