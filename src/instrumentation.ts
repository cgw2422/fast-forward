/**
 * Boots the reminder scheduler inside the Next server so Railway stays a single
 * service. Set ENABLE_IN_PROCESS_CRON=false and drive /api/cron/tick from
 * Railway Cron instead if you ever scale to more than one instance.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.ENABLE_IN_PROCESS_CRON !== 'true') return;

  const cron = (await import('node-cron')).default;
  const { runReminderTick } = await import('@/lib/reminders');

  let running = false;

  cron.schedule('*/5 * * * *', async () => {
    if (running) return; // A slow tick must not stack on the next one.
    running = true;
    try {
      const result = await runReminderTick();
      if (result.sent > 0) {
        console.log(`[reminders] checked ${result.checked} users, sent ${result.sent}`);
      }
    } catch (error) {
      console.error('[reminders] tick failed', error);
    } finally {
      running = false;
    }
  });

  console.log('[reminders] in-process scheduler started (every 5 minutes)');
}
