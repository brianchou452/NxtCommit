import { AlertTriangle, ArrowLeft, FileQuestion, RotateCcw } from "lucide-react";
import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { useI18n } from "../i18n/index.js";

export function NotFound() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-lg py-20 text-center">
      <FileQuestion size={42} className="mx-auto text-dim" aria-hidden="true" />
      <h1 className="mt-5 text-2xl font-extrabold">{t("route.notFound.title")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-mut">{t("route.notFound.body")}</p>
      <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-fund px-4 py-2 text-sm font-semibold text-bg0">
        <ArrowLeft size={15} aria-hidden="true" /> {t("route.home")}
      </Link>
    </section>
  );
}

export function RouteError() {
  const { t } = useI18n();
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  if (notFound) return <NotFound />;
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4 text-center">
      <section className="w-full rounded-2xl border border-danger/30 bg-bg1 p-8">
        <AlertTriangle size={42} className="mx-auto text-danger" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-extrabold">{t("route.error.title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-mut">{t("route.error.body")}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-fund px-4 py-2 text-sm font-semibold text-bg0"
        >
          <RotateCcw size={15} aria-hidden="true" /> {t("route.reload")}
        </button>
      </section>
    </main>
  );
}
