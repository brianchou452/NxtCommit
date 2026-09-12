import type { RunArtifact, TestSummary } from '../../shared/types.js';
import { useLocale } from '../i18n/LocaleProvider.js';
function TestObservation({ result }: { result: TestSummary }) {
  const { text } = useLocale();
  return <div><code>{result.command}</code><p>exit: {result.exitCode ?? text.c_unknown} · passed: {result.passed ?? text.c_unknown} · failed: {result.failed ?? text.c_unknown} · total: {result.total ?? text.c_unknown}</p>{result.limitation && <p>{result.limitation}</p>}</div>;
}
export function VerificationDossier({ artifact }: { artifact: RunArtifact }) {
  const { text } = useLocale();
  return <section className="c-card" data-testid="dossier"><h2>{text.c_dossier}</h2><p className="c-boundary">{artifact.testEvidenceSource === 'engine' ? text.c_engine : text.c_seed}</p><p>{text.c_residual}</p>
    <h3>{text.c_baseline}</h3><TestObservation result={artifact.dossier.baseline} />
    <h3>{text.c_experiments}</h3>{artifact.dossier.experiments.length === 0 && <p>{text.c_unknown}</p>}{artifact.dossier.experiments.map((experiment, index) => <details key={index}><summary>{text.c_experiments} {index + 1}</summary><TestObservation result={experiment} /></details>)}
    <h3>{text.c_gates}</h3>{artifact.dossier.qualityGates.length === 0 && <p>{text.c_unknown}</p>}{artifact.dossier.qualityGates.map(gate => <details key={gate.id}><summary>{gate.id} · {gate.status}</summary><p>{gate.reason}</p></details>)}
    <h3>{text.c_criterion}</h3>{artifact.dossier.criterionEvidence.map((criterion, index) => <p key={index}>{criterion.criterion} · {criterion.status}: {criterion.explanation}</p>)}
  </section>;
}
export function DiffViewer({ artifact }: { artifact: RunArtifact }) {
  const { text } = useLocale();
  return <section className="c-card" data-testid="diff"><h2>{text.c_diff}</h2><p>{text.c_diff_boundary}</p>{!artifact.files.length && <p>{text.c_no_diff}</p>}{artifact.files.map((file, index) => <details key={file.path} open={index === 0}><summary>{file.path} · +{file.added} −{file.deleted}</summary><pre>{file.diff}</pre></details>)}</section>;
}
