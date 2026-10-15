import { forwardRef, useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';

export const AutoTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function AutoTextarea({ value, onInput, ...props }, forwardedRef) {
  const element = useRef<HTMLTextAreaElement | null>(null);

  function resize(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  useLayoutEffect(() => {
    if (element.current) resize(element.current);
  }, [value]);

  useLayoutEffect(() => {
    const textarea = element.current;
    if (!textarea || typeof ResizeObserver === 'undefined') return;
    let width = textarea.clientWidth;
    let frame: number | null = null;
    const observer = new ResizeObserver(() => {
      if (textarea.clientWidth === width) return;
      width = textarea.clientWidth;
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      // Resizing the observed box during delivery produces a ResizeObserver loop.
      // Keep hidden drafts intact, and measure once after this layout delivery finishes.
      if (!width) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        resize(textarea);
      });
    });
    observer.observe(textarea);
    return () => {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <textarea
      {...props}
      rows={1}
      value={value}
      ref={(textarea) => {
        element.current = textarea;
        if (typeof forwardedRef === 'function') forwardedRef(textarea);
        else if (forwardedRef) forwardedRef.current = textarea;
      }}
      onInput={(event) => {
        resize(event.currentTarget);
        onInput?.(event);
      }}
    />
  );
});
