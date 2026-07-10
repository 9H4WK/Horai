import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  UserCheck,
  Sparkles,
  MapPin,
  Mail,
  Phone,
  ExternalLink,
  FileText,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import DecisionModal from "../common/DecisionModal";
import {
  getApplicationById,
  getInterviewResult,
  normalizeApplication,
  normalizeInterviewResult,
  acceptApplication,
  rejectApplication,
  rescreenApplication,
} from "../../utilities/api/interviewApi";

const statusStyles = {
  accepted: "bg-emerald-50 text-emerald-800 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  interview: "bg-violet-50 text-violet-800 border-violet-200",
  submitted: "bg-sky-50 text-sky-800 border-sky-200",
};

const getStatusClass = (status) => {
  const key = String(status || "").toLowerCase();
  if (key.includes("accept")) return statusStyles.accepted;
  if (key.includes("reject")) return statusStyles.rejected;
  if (key.includes("interview")) return statusStyles.interview;
  return statusStyles.submitted;
};

const scoreColor = (score) => {
  if (score == null) return "#9CA3AF";
  if (score >= 85) return "#1B4332";
  if (score >= 70) return "#2D6A4F";
  if (score >= 55) return "#C26A42";
  if (score >= 40) return "#D97706";
  return "#9CA3AF";
};

const MatchHero = ({ score, tier, label }) => {
  const value = score == null ? null : Math.max(0, Math.min(100, Number(score)));
  const size = 120;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = value == null ? c : c - (value / 100) * c;
  const color = scoreColor(value);

  return (
    <div className="flex flex-col items-center rounded-3xl border border-[#EFD7C9] bg-gradient-to-br from-[#FFF8F4] to-white p-6 text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1E4DC" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-poppins-semibold leading-none" style={{ color }}>
            {value == null ? "—" : Math.round(value)}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.16em] text-gray-400">match</span>
        </div>
      </div>
      <p className="mt-4 text-sm font-poppins-semibold capitalize text-[#1B1B1B]">
        {label || (tier ? `${tier} fit` : "Awaiting screen")}
      </p>
      <p className="mt-1 text-xs text-gray-500">AI screening vs role requirements</p>
    </div>
  );
};

const Section = ({ icon: Icon, title, children, className = "" }) => (
  <section className={`rounded-2xl border border-[#EFD7C9] bg-[#FFFBF8] p-5 ${className}`}>
    <div className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#7A3E1D]">
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {title}
    </div>
    {children}
  </section>
);

const EmployerApplicationReviewPage = () => {
  const { applicationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [application, setApplication] = useState(
    location.state?.application
      ? normalizeApplication(location.state.application.raw ?? location.state.application)
      : null,
  );
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [decisionMode, setDecisionMode] = useState(null); // 'accept' | 'reject' | null

  const sessionId = useMemo(
    () => application?.sessionId || location.state?.application?.sessionId || null,
    [application, location.state?.application?.sessionId],
  );

  const isDecided = useMemo(() => {
    const s = String(application?.status || "").toLowerCase();
    return s.includes("accept") || s.includes("reject");
  }, [application?.status]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        let resolvedApplication = null;

        if (applicationId) {
          const found = await getApplicationById(applicationId);
          resolvedApplication = found ? normalizeApplication(found.raw ?? found) : null;
        }

        if (!resolvedApplication && location.state?.application) {
          resolvedApplication = normalizeApplication(
            location.state.application.raw ?? location.state.application,
          );
        }

        if (!mounted) return;

        if (!resolvedApplication) {
          setError("Application not found.");
          setLoading(false);
          return;
        }

        setApplication(resolvedApplication);

        const sid = resolvedApplication.sessionId;
        if (sid) {
          try {
            const resultPayload = await getInterviewResult(sid);
            if (!mounted) return;
            setResult(normalizeInterviewResult(resultPayload));
          } catch {
            if (mounted) setResult(null);
          }
        }
      } catch (err) {
        if (!mounted) return;
        setError(
          err?.response?.data?.message ||
            err?.response?.data?.title ||
            err?.message ||
            "Unable to load candidate review details.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per applicationId
  }, [applicationId]);

  const handleDecision = async (mode, comment) => {
    const id = application?.applicationId || application?.id;
    if (!id) {
      setActionError("Missing application id.");
      return;
    }

    setActionLoading(true);
    setActionError("");

    try {
      if (mode === "accept") {
        await acceptApplication(id, comment || "");
        navigate("/employer/applications", {
          state: {
            updatedApplication: {
              ...(application.raw ?? application),
              status: "Accepted",
              hrComment: comment || null,
            },
          },
        });
      } else {
        await rejectApplication(id, comment || "");
        navigate("/employer/applications", {
          state: {
            updatedApplication: {
              ...(application.raw ?? application),
              status: "Rejected",
              hrComment: comment || null,
            },
          },
        });
      }
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        `Failed to ${mode} application.`;
      setActionError(message);
      console.error(`${mode} application failed:`, err);
    } finally {
      setActionLoading(false);
      setDecisionMode(null);
    }
  };

  const handleRescreen = async () => {
    const id = application?.applicationId || application?.id;
    if (!id) return;

    setActionLoading(true);
    setActionError("");
    try {
      await rescreenApplication(id);
      const refreshed = await getApplicationById(id);
      if (refreshed) setApplication(normalizeApplication(refreshed.raw ?? refreshed));
    } catch (err) {
      setActionError(err?.response?.data?.message || err?.message || "Failed to re-run screening.");
    } finally {
      setActionLoading(false);
    }
  };

  const skillMatches = application?.skillMatches || [];
  const strengths = application?.strengths || [];
  const gaps = application?.gaps || [];
  const experience = application?.experience || [];
  const education = application?.education || [];

  return (
    <main className="min-h-[calc(100vh-8rem)] bg-[radial-gradient(circle_at_top_left,rgba(255,214,195,0.42),transparent_35%),linear-gradient(180deg,#FFF9F5_0%,#FFFFFF_42%)] px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <Link
          to="/employer/applications"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#7A3E1D] transition hover:text-[#5E2F15]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to screening desk
        </Link>

        {loading ? (
          <div className="mt-6 flex items-center gap-3 rounded-3xl border border-[#EFD7C9] bg-white px-5 py-8 text-sm text-gray-700 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-[#C26A42]" />
            Loading candidate dossier…
          </div>
        ) : error ? (
          <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : application ? (
          <div className="mt-6 space-y-5">
            {/* Header */}
            <header className="rounded-3xl border border-[#F1DED3] bg-white p-6 shadow-[0_20px_70px_rgba(122,62,29,0.08)] sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-poppins-semibold uppercase tracking-[0.22em] text-[#C26A42]">
                    Candidate dossier
                  </p>
                  <h1 className="mt-2 text-3xl font-poppins-semibold text-[#1B1B1B] sm:text-4xl">
                    {application.applicantName || "Candidate"}
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    {application.jobTitle || "Untitled role"}
                    <span className="mx-1.5 text-gray-300">·</span>
                    {application.companyName || "Company"}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusClass(
                        application.status,
                      )}`}
                    >
                      {application.status || "Submitted"}
                    </span>
                    {application.rankInJob != null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF2EA] px-2.5 py-0.5 text-xs font-medium text-[#C26A42]">
                        <Trophy className="h-3 w-3" />
                        Rank #{application.rankInJob}
                        {application.totalInJob ? ` / ${application.totalInJob}` : ""} for this role
                      </span>
                    )}
                    {application.fitLabel && (
                      <span className="rounded-full bg-[#1B4332] px-2.5 py-0.5 text-xs font-medium text-white">
                        {application.fitLabel}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600">
                    {application.applicantEmail && (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-[#C26A42]" />
                        {application.applicantEmail}
                      </span>
                    )}
                    {application.applicantLocation && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#C26A42]" />
                        {application.applicantLocation}
                      </span>
                    )}
                    {application.applicantPhone && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-[#C26A42]" />
                        {application.applicantPhone}
                      </span>
                    )}
                    {application.applicantLinkedIn && (
                      <a
                        href={application.applicantLinkedIn}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#7A3E1D] hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        LinkedIn
                      </a>
                    )}
                    {application.cvDownloadUrl && (
                      <a
                        href={application.cvDownloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#7A3E1D] hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {application.cvFileName || "Download CV"}
                      </a>
                    )}
                  </div>
                </div>

                <MatchHero
                  score={application.matchScore}
                  tier={application.fitTier}
                  label={application.fitLabel}
                />
              </div>
            </header>

            <div className="grid gap-5 lg:grid-cols-3">
              <div className="space-y-5 lg:col-span-2">
                <Section icon={Sparkles} title="AI screening brief">
                  <p className="text-sm leading-6 text-gray-700">
                    {application.summary || "No screening summary available yet."}
                  </p>
                  {application.recommendation && (
                    <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-medium text-[#7A3E1D] ring-1 ring-[#EFD7C9]">
                      Recommendation: {application.recommendation}
                    </p>
                  )}
                  {application.reasoning && (
                    <p className="mt-3 text-xs leading-5 text-gray-500">{application.reasoning}</p>
                  )}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white p-3 ring-1 ring-[#EFD7C9]">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                        Experience fit
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        {application.screening?.experienceFit || "Not assessed"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-[#EFD7C9]">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                        Education fit
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        {application.screening?.educationFit || "Not assessed"}
                      </p>
                    </div>
                  </div>
                </Section>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Section icon={CheckCircle2} title="Strengths">
                    {strengths.length ? (
                      <ul className="space-y-2">
                        {strengths.map((item, i) => (
                          <li key={i} className="flex gap-2 text-sm text-gray-700">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No strengths extracted yet.</p>
                    )}
                  </Section>

                  <Section icon={AlertTriangle} title="Gaps & risks">
                    {gaps.length ? (
                      <ul className="space-y-2">
                        {gaps.map((item, i) => (
                          <li key={i} className="flex gap-2 text-sm text-gray-700">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No material gaps flagged.</p>
                    )}
                  </Section>
                </div>

                {skillMatches.length > 0 && (
                  <Section icon={UserCheck} title="Skill match matrix">
                    <div className="flex flex-wrap gap-2">
                      {skillMatches.map((item, i) => {
                        const skill = typeof item === "string" ? item : item.skill;
                        const matched = typeof item === "string" ? true : Boolean(item.matched);
                        return (
                          <span
                            key={`${skill}-${i}`}
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              matched
                                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                                : "bg-red-50 text-red-700 ring-1 ring-red-200"
                            }`}
                          >
                            {matched ? "✓ " : "✗ "}
                            {skill}
                          </span>
                        );
                      })}
                    </div>
                  </Section>
                )}

                {(application.skills || []).length > 0 && skillMatches.length === 0 && (
                  <Section icon={UserCheck} title="Candidate skills">
                    <div className="flex flex-wrap gap-2">
                      {application.skills.map((skill, i) => (
                        <span
                          key={`${skill}-${i}`}
                          className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-[#EFD7C9]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <Section icon={Briefcase} title="Experience">
                    {experience.length ? (
                      <ul className="space-y-3">
                        {experience.slice(0, 5).map((exp, i) => (
                          <li key={i} className="text-sm">
                            <p className="font-medium text-gray-800">
                              {exp.title || exp.role || exp.position || "Role"}
                            </p>
                            <p className="text-gray-500">
                              {[exp.company, exp.duration || exp.years].filter(Boolean).join(" · ")}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No experience listed.</p>
                    )}
                  </Section>

                  <Section icon={GraduationCap} title="Education">
                    {education.length ? (
                      <ul className="space-y-3">
                        {education.slice(0, 5).map((ed, i) => (
                          <li key={i} className="text-sm">
                            <p className="font-medium text-gray-800">
                              {ed.degree || ed.field || "Qualification"}
                            </p>
                            <p className="text-gray-500">
                              {[ed.institution || ed.school, ed.year].filter(Boolean).join(" · ")}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No education listed.</p>
                    )}
                  </Section>
                </div>

                {result && (
                  <Section icon={Sparkles} title="Interview session result">
                    <div className="grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                      <p>Status: {result.status || "Completed"}</p>
                      <p>Score: {result.score ?? "N/A"}</p>
                      <p className="sm:col-span-2">Summary: {result.summary || "—"}</p>
                      <p className="sm:col-span-2">Feedback: {result.feedback || "—"}</p>
                      <p className="sm:col-span-2">Recommendation: {result.recommendation || "—"}</p>
                    </div>
                  </Section>
                )}
              </div>

              {/* Decision rail */}
              <aside className="space-y-5">
                <div className="rounded-3xl border border-[#F1DED3] bg-white p-5 shadow-sm">
                  <p className="text-xs font-poppins-semibold uppercase tracking-[0.18em] text-[#C26A42]">
                    HR decision
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Accept or reject with a comment the applicant will see on their application and in
                    notifications.
                  </p>

                  {application.hrComment && (
                    <div className="mt-4 rounded-xl bg-[#FFF8F4] p-3 ring-1 ring-[#EFD7C9]">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                        Saved comment
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{application.hrComment}</p>
                    </div>
                  )}

                  {actionError && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {actionError}
                    </div>
                  )}

                  {!isDecided ? (
                    <div className="mt-5 flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => setDecisionMode("accept")}
                        className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
                      >
                        Accept candidate
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => setDecisionMode("reject")}
                        className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                      >
                        Reject candidate
                      </button>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-600">
                      Decision already recorded as{" "}
                      <span className="font-medium text-gray-900">{application.status}</span>.
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleRescreen}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E7D9D0] px-4 py-2.5 text-sm font-medium text-[#7A3E1D] transition hover:bg-[#FFF6F1] disabled:opacity-60"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Re-run AI screening
                  </button>

                  <Link
                    to="/employer/applications"
                    className="mt-3 block text-center text-sm font-medium text-gray-500 hover:text-[#7A3E1D]"
                  >
                    Back to queue
                  </Link>
                </div>

                <Section icon={UserCheck} title="Application meta">
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500">Application ID</dt>
                      <dd className="font-medium text-gray-800">
                        {application.applicationId || application.id}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500">Session</dt>
                      <dd className="font-medium text-gray-800">{sessionId || "Not started"}</dd>
                    </div>
                    {application.screening?.source && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-gray-500">Evaluation</dt>
                        <dd className="font-medium capitalize text-gray-800">
                          {application.screening.source === "assisted"
                            ? "Assisted analysis"
                            : application.screening.source === "profile"
                              ? "Profile analysis"
                              : "Standard"}
                        </dd>
                      </div>
                    )}
                  </dl>
                </Section>
              </aside>
            </div>
          </div>
        ) : null}
      </section>

      <DecisionModal
        open={decisionMode != null}
        mode={decisionMode || "reject"}
        candidateName={application?.applicantName || "candidate"}
        jobTitle={application?.jobTitle || "this role"}
        loading={actionLoading}
        onClose={() => !actionLoading && setDecisionMode(null)}
        onConfirm={(comment) => handleDecision(decisionMode, comment)}
      />
    </main>
  );
};

export default EmployerApplicationReviewPage;
