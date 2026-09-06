import { requireUser } from '@/lib/auth';
import { handler } from '@/lib/api';
import { sendToUser, pushConfigured } from '@/lib/push';

export async function POST() {
  return handler(async () => {
    const user = await requireUser();
    if (!(await pushConfigured())) {
      throw new Error('Push keys are unavailable — check the database connection');
    }
    const delivered = await sendToUser(user.id, {
      title: 'FAST FORWARD',
      body: 'Reminders are working. Small choices. Kept promises. More life. ⏩',
      url: '/today',
      tag: 'ff-test',
    });
    if (delivered === 0) throw new Error('No devices are registered for push yet');
    return { ok: true, delivered };
  });
}
