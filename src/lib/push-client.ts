'use client';

/** Browser-side push registration. Kept out of components so the rules live in one place. */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export type PushSupport = {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  /** iOS only delivers push to a PWA installed on the Home Screen. */
  requiresInstall: boolean;
  isStandalone: boolean;
};

export function inspectPushSupport(): PushSupport {
  if (typeof window === 'undefined') {
    return { supported: false, permission: 'unsupported', requiresInstall: false, isStandalone: false };
  }

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  return {
    supported,
    permission: supported ? Notification.permission : 'unsupported',
    requiresInstall: isIOS && !isStandalone,
    isStandalone,
  };
}

export async function enablePush(vapidPublicKey: string): Promise<{ ok: boolean; error?: string }> {
  const support = inspectPushSupport();
  if (!support.supported) {
    return { ok: false, error: 'This browser does not support push notifications.' };
  }
  if (support.requiresInstall) {
    return {
      ok: false,
      error: 'On iPhone, add Fast Forward to your Home Screen first — Safari can only deliver push to an installed app.',
    };
  }
  if (!vapidPublicKey) {
    return { ok: false, error: 'Push is not configured on the server yet.' };
  }

  // Asked only on an explicit tap — never on page load.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, error: 'Notifications are blocked. You can turn them on in your browser settings.' };
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    }));

  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error ?? 'Could not save the subscription.' };
  }
  return { ok: true };
}

export async function disablePush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, { method: 'DELETE' });
  await subscription.unsubscribe();
}
