import { useEffect } from 'react';
import { useI18n } from './src/i18n/index.js';
import { LocaleProvider, useLocale } from '../i18n/LocaleProvider.js';
import { AssurancePage } from '../pages/AssurancePage.js';
import { GithubWorkspacePage } from '../pages/GithubWorkspace.js';
import '../styles/tokens.css';
function SyncLocale(){const original=useI18n();const legacy=useLocale();useEffect(()=>{if(original.locale!==legacy.locale)legacy.setLocale(original.locale);},[original.locale,legacy]);return null;}
export default function Advanced({kind}:{kind:'assurance'|'github'}){return <LocaleProvider><SyncLocale/>{kind==='assurance'?<AssurancePage/>:<GithubWorkspacePage/>}</LocaleProvider>;}
