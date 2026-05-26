'use client';

import { useEffect } from 'react';

export function PlaceholderInjector() {
  useEffect(() => {
    // Create style element with placeholder rules
    const style = document.createElement('style');
    style.textContent = `
      input::placeholder,
      textarea::placeholder {
        color: rgb(75 85 99) !important;
        opacity: 1 !important;
        -webkit-text-fill-color: rgb(75 85 99) !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return null;
}
