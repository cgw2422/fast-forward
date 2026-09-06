import { destroyCurrentSession } from '@/lib/auth';
import { handler } from '@/lib/api';

export async function POST() {
  return handler(async () => {
    await destroyCurrentSession();
    return { ok: true };
  });
}
