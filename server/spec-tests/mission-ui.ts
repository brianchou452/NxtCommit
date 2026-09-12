import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../../src/i18n/LocaleProvider.js';
export const renderMissionComponent = (component: ReactElement) => renderToStaticMarkup(createElement(LocaleProvider, { children: component }));
