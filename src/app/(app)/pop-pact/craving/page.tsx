import { getContext } from '@/lib/context';
import { getOrCreatePact } from '@/lib/poppact';
import { CravingView } from '@/components/pop/CravingView';

export const dynamic = 'force-dynamic';

export default async function CravingPage() {
  const ctx = await getContext();
  const pact = await getOrCreatePact(ctx.user.id);
  return <CravingView reason={pact.reason} />;
}
