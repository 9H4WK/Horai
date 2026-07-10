import { useEffect, useState } from "react";
import { getEmployerAiStatus } from "../../utilities/api/interviewApi";

/**
 * Employer-only indicator: green when screening assistant is connected.
 * Tooltip shows model + API key initials — never full keys or public vendor marketing.
 */
const AiStatusBadge = () => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await getEmployerAiStatus({ probe: false });
        if (active) setStatus(data);
      } catch {
        if (active) {
          setStatus({
            connected: false,
            status: "offline",
            message: "Assistant status unavailable",
          });
        }
      }
    };

    load();
    const id = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const connected = Boolean(status?.connected);
  const model = status?.model || "—";
  const initials = status?.apiInitials || "—";
  const keyHint = status?.keyHint || "—";

  const tooltip = connected
    ? `Screening assistant online\nModel: ${model}\nAPI: ${initials} · ${keyHint}`
    : status?.message || "Screening assistant offline\nAdd OPENAI_API_KEY on the server";

  return (
    <div className="group relative flex items-center">
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-full border border-transparent px-2 py-1 transition hover:border-[#E7D9D0] hover:bg-[#FFF8F4]"
        aria-label={connected ? "Screening assistant connected" : "Screening assistant offline"}
        title={tooltip}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ring-2 ring-white ${
            connected
              ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]"
              : "bg-gray-300"
          }`}
          aria-hidden="true"
        />
        <span
          className={`hidden text-[11px] font-poppins-medium sm:inline ${
            connected ? "text-emerald-700" : "text-gray-400"
          }`}
        >
          {connected ? "AI" : "AI off"}
        </span>
      </button>

      {/* Rich hover card */}
      <div
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-56 translate-y-1 rounded-xl border border-[#E7D9D0] bg-white px-3 py-2.5 text-left opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100"
      >
        <p
          className={`text-xs font-poppins-semibold ${
            connected ? "text-emerald-700" : "text-gray-500"
          }`}
        >
          {connected ? "Screening assistant connected" : "Screening assistant offline"}
        </p>
        {connected ? (
          <dl className="mt-2 space-y-1 text-[11px] text-gray-600">
            <div className="flex justify-between gap-2">
              <dt className="text-gray-400">Model</dt>
              <dd className="font-medium text-gray-800">{model}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-400">API</dt>
              <dd className="font-medium text-gray-800">{initials}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-400">Key</dt>
              <dd className="font-mono text-gray-700">{keyHint}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-1.5 text-[11px] leading-4 text-gray-500">
            Set <span className="font-mono">OPENAI_API_KEY</span> in server{" "}
            <span className="font-mono">.env</span> and restart the API.
          </p>
        )}
      </div>
    </div>
  );
};

export default AiStatusBadge;
