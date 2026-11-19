import React, { createContext, useContext } from 'react';
import { it, type Dictionary } from './it';

const I18nContext = createContext<{ locale: 'it'; t: Dictionary }>({
  locale: 'it',
  t: it,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale: 'it', t: it }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
