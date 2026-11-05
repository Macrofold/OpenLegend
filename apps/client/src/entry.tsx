/** Choose the developer workspace before loading the game's renderer or presence loop. */
if (location.pathname === '/cognition' || location.pathname.startsWith('/cognition/')) {
  const [{ createRoot }, { CognitionLabApp }] = await Promise.all([
    import('react-dom/client'),
    import('./cognition-lab/app'),
  ]);
  const root = document.getElementById('app');
  if (!root) throw new Error('Application root is unavailable.');
  document.title = 'Cognition Lab · Open Legend';
  createRoot(root).render(<CognitionLabApp />);
} else {
  await import('./main');
}

export {};
