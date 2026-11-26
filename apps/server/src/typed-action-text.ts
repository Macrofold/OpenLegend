export const cleanTypedActionText = (text: string) =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/\s+/gu, ' ')
    .replace(/[.!]+$/u, '')
    .trim();
