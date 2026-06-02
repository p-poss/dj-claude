'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

interface TurnstileOptions {
  sitekey: string;
  callback: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  size?: 'normal' | 'compact' | 'invisible' | 'flexible';
  appearance?: 'always' | 'execute' | 'interaction-only';
  theme?: 'light' | 'dark' | 'auto';
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement | string, opts: TurnstileOptions) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptLoadPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Turnstile cannot load during SSR'));
  }
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Turnstile script failed to load')),
      );
      return;
    }
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Turnstile script failed to load'));
    document.head.appendChild(s);
  });
  return scriptLoadPromise;
}

export interface TurnstileWidgetAPI {
  reset: () => void;
}

interface Props {
  siteKey: string;
  onToken: (token: string) => void;
  onExpire?: () => void;
}

export const TurnstileWidget = forwardRef<TurnstileWidgetAPI, Props>(
  function TurnstileWidget({ siteKey, onToken, onExpire }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const onTokenRef = useRef(onToken);
    const onExpireRef = useRef(onExpire);
    onTokenRef.current = onToken;
    onExpireRef.current = onExpire;

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
          }
        },
      }),
      [],
    );

    useEffect(() => {
      let cancelled = false;
      loadScript()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile) {
            return;
          }
          widgetIdRef.current = window.turnstile.render(
            containerRef.current,
            {
              sitekey: siteKey,
              callback: (token) => onTokenRef.current(token),
              'expired-callback': () => onExpireRef.current?.(),
              appearance: 'interaction-only',
              size: 'flexible',
              theme: 'auto',
            },
          );
        })
        .catch((err) => console.warn('[turnstile] load failed', err));
      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }, [siteKey]);

    return <div ref={containerRef} />;
  },
);
