/** Trusted local symbols remain usable while an invented action awaits artwork. */
export function actionSymbol(label: string): string {
  const text = label.toLowerCase();
  const gather = /gather|harvest/.test(text);
  let path = '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>';
  if (/rest|sleep/.test(text)) path = '<path d="M7 5h7l-7 9h7m3-11h4l-4 5h4M3 19h18"/>';
  else if (/recover|camp/.test(text))
    path = '<path d="M9 16c-7-5 2-9 2-13 6 5 8 9 4 13M5 18l14 4M19 18 5 22"/>';
  else if (/talk/.test(text))
    path =
      '<path d="M20 11a8 7 0 0 1-8 7H8l-5 3 1-7a7 7 0 0 1-1-3 8 7 0 0 1 17 0Z"/><path d="M7 10h10M7 13h6"/>';
  else if (/branch|wood/.test(text)) path = '<path d="m5 21 13-18M11 13l-6-3m9-1 5 1M8 17l-1-5"/>';
  else if (/fiber|plant|herb/.test(text))
    path = '<path d="M12 22V10M12 15C3 15 3 6 3 6s9 0 9 9Zm0-4c0-8 8-9 8-9s1 9-8 9Z"/>';
  else if (/stone|flint/.test(text))
    path = '<path d="m3 16 4-11 10-2 5 13-7 5-10-1Zm4-11 8 6 7 5m-7-5v10"/>';
  else if (/eat|berr|food/.test(text))
    path =
      '<circle cx="9" cy="14" r="5"/><circle cx="16" cy="14" r="5"/><path d="M12 9V3m0 4 5-3"/>';
  else if (/craft|make|prepare/.test(text))
    path = '<path d="m5 3 16 18M19 3 3 19l2 2L21 5ZM3 3l4 1-3 3Z"/>';
  else if (/set action/.test(text)) path = '<path d="M12 5v14M5 12h14"/>';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>${gather ? '<svg class="gather-badge" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M5 8V3a1 1 0 0 1 2 0v4-5a1 1 0 0 1 2 0v5-4a1 1 0 0 1 2 0v5-3a1 1 0 0 1 2 0v6c0 5-6 5-8 2L2 9c-1-2 1-3 3-1Z"/></svg>' : ''}`;
}
export function renderActionSymbol(button: HTMLButtonElement, label: string): void {
  button.classList.add('round-tool');
  button.innerHTML = actionSymbol(label);
  button.setAttribute('aria-label', label);
  const tooltip = document.createElement('span');
  tooltip.className = 'icon-label';
  tooltip.textContent = label;
  button.append(tooltip);
}
