import { readFileSync } from 'node:fs';
const version = readFileSync(new URL('../Makefile', import.meta.url), 'utf8').match(/^VERSION\s*:?=\s*(\S+)/m)?.[1];
const overlay = readFileSync(new URL('../k8s/overlays/nonprod/kustomization.yaml', import.meta.url), 'utf8').match(/newTag:\s*(\S+)/)?.[1];
const changelog = readFileSync(new URL('../docs/CHANGELOG.md', import.meta.url), 'utf8').match(/^## v(\S+)/m)?.[1];
const translatedChangelog = readFileSync(new URL('../docs/CHANGELOG.zh-TW.md', import.meta.url), 'utf8').match(/^## v(\S+)/m)?.[1];
const packageVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const pythonVersion = readFileSync(new URL('../pyproject.toml', import.meta.url), 'utf8').match(/^version = "([^"]+)"$/m)?.[1];
const lockVersion = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8')).packages[''].version;
if (!version || [overlay, changelog, translatedChangelog].some(value => value !== version)) {
  throw new Error('Makefile VERSION, nonprod newTag and bilingual changelog versions must agree');
}
if (packageVersion !== lockVersion || packageVersion !== pythonVersion) throw new Error('Foundation package and lock metadata must agree');
console.log(`Source version consistent: ${version}; private package/tooling version: ${packageVersion}`);
