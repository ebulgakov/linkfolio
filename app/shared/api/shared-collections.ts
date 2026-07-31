export interface SharedCollection {
  name: string;
  description: string | null;
  slug: string;
  hasPassword: boolean;
  unlocked: boolean;
}

export interface SharedLinkItem {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
}

export function getSharedCollection(
  slug: string,
  opts?: { headers?: HeadersInit }
): Promise<SharedCollection> {
  return $fetch<SharedCollection>(`/api/shared/${slug}`, { headers: opts?.headers });
}

export function listSharedLinks(
  slug: string,
  opts?: { headers?: HeadersInit }
): Promise<SharedLinkItem[]> {
  return $fetch<SharedLinkItem[]>(`/api/shared/${slug}/links`, { headers: opts?.headers });
}

export function unlockSharedCollection(slug: string, password: string): Promise<SharedLinkItem[]> {
  return $fetch<SharedLinkItem[]>(`/api/shared/${slug}/unlock`, {
    method: "POST",
    body: { password }
  });
}
