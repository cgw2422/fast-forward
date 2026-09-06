import { NextResponse } from 'next/server';
import { loadPhotoForRequester } from '@/lib/photos';
import { storage } from '@/lib/storage';
import { UnauthorizedError } from '@/lib/auth';
import { NotFoundError } from '@/lib/authz';

export const dynamic = 'force-dynamic';

/**
 * The only way photo bytes ever reach a browser.
 *
 * Authorization is re-evaluated on every single request — guessing or sharing
 * an id gets you a 404 unless you genuinely hold access. Nothing here is
 * cacheable by a shared cache, and the response never reveals whether the id
 * exists.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const { photo } = await loadPhotoForRequester(id);
    const bytes = await storage().get(photo.storageKey);

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': photo.mimeType,
        'Content-Length': String(bytes.length),
        // private: never let a proxy or CDN retain someone's progress photo.
        'Cache-Control': 'private, max-age=300, no-store',
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }
    if (error instanceof NotFoundError) {
      return new NextResponse(null, { status: 404 });
    }
    // A missing object on disk is also a 404 rather than a 500 leak.
    return new NextResponse(null, { status: 404 });
  }
}
