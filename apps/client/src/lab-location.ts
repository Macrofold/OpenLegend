/** The Lab is a separate Rust world. Shared controls must never fall back to the playable world. */
export const inCognitionLab =
  typeof location !== 'undefined' &&
  (location.pathname === '/cognition' || location.pathname.startsWith('/cognition/'));

export const workspaceStoragePrefix = inCognitionLab ? 'open-legend:lab:' : 'open-legend:';
