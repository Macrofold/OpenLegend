export type RetainedRequest<T> =
  | { status: 'empty' }
  | { status: 'pending'; request: T }
  | { status: 'unreadable' };

/** This is a browser recovery description, never an executable queue or proof of success.
 * Only an explicit read of the original server outcome can settle an uncertain request.
 * docs/projects/game-interaction-redesign-completion.md */
export function readRetainedRequest<T>(
  key: string | undefined,
  valid: (value: unknown) => value is T,
): RetainedRequest<T> {
  if (!key) return { status: 'unreadable' };
  try {
    const text = sessionStorage.getItem(key);
    if (text === null) return { status: 'empty' };
    if (text.length > 8192) return { status: 'unreadable' };
    const value: unknown = JSON.parse(text);
    return valid(value) ? { status: 'pending', request: value } : { status: 'unreadable' };
  } catch {
    return { status: 'unreadable' };
  }
}

export function retainRequest<T extends { requestId: string }>(
  key: string | undefined,
  request: T,
): void {
  if (!key) throw new Error('Refresh your access before sending. Nothing was sent.');
  // Check before writing: a remounted component cannot replace an earlier unknown request.
  if (sessionStorage.getItem(key) !== null)
    throw new Error('Check the original request before sending another one. Nothing was sent.');
  const text = JSON.stringify(request);
  if (text.length > 8192) throw new Error('The recovery description is too large. Nothing was sent.');
  sessionStorage.setItem(key, text);
  if (sessionStorage.getItem(key) !== text)
    throw new Error('This browser could not retain the request. Nothing was sent.');
}

export function releaseRequest(key: string | undefined, requestId: string): void {
  if (!key) throw new Error('The original request cannot be cleared before access is refreshed.');
  const text = sessionStorage.getItem(key);
  if (text !== null) {
    const value: unknown = JSON.parse(text);
    if (
      !value ||
      typeof value !== 'object' ||
      !('requestId' in value) ||
      value.requestId !== requestId
    )
      throw new Error('The retained request changed. Its original result must be checked.');
    sessionStorage.removeItem(key);
  }
  if (sessionStorage.getItem(key) !== null)
    throw new Error('The confirmed request could not be cleared. Check its result again.');
}

export function boundedText(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maximum;
}
