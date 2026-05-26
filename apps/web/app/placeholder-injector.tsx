'use client';

import { useEffect } from 'react';

export function PlaceholderInjector() {
  useEffect(() => {
    // Create style element with placeholder rules
    const style = document.createElement('style');
    style.textContent = `
      input::placeholder,
      textarea::placeholder {
        color: rgb(55 65 81) !important;
        opacity: 1 !important;
        -webkit-text-fill-color: rgb(55 65 81) !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return null;
}
