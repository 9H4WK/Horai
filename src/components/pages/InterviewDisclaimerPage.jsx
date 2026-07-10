import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ShieldAlert, Sparkles } from "lucide-react";

const InterviewDisclaimerPage = () => {
  const { applicationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);

  const metadata = useMemo(
    () => ({
      applicationId: location.state?.applicationId || applicationId,
      jobTitle: location.state?.jobTitle || "Selected role",
      companyName: location.state?.companyName || "HORAI Labs",
      jobLocation: location.state?.jobLocation || "Location unavailable",
      jobSalary: location.state?.jobSalary || "Salary not provided",
    }),
    [applicationId, location.state],
  );

  const startInterview = () => {
    if (!metadata.applicationId || !accepted) {
      return;
    }

    sessionStorage.setItem(
      `interview_disclaimer_${metadata.applicationId}`,
      "accepted",
    );

    navigate(`/interview/${metadata.applicationId}`, {
      replace: true,
      state: {
        ...metadata,
        acknowledged: true,
      },
    });
  };

  return (
    <main className="min-h-[calc(100vh-8rem)] bg-[radial-gradient(circle_at_top_left,rgba(255,214,195,0.42),transparent_35%),linear-gradient(180deg,#FFF9F5_0%,#FFFFFF_42%)] px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-3xl border border-[#EFD7C9] bg-white p-7 shadow-[0_24px_70px_rgba(122,62,29,0.08)] sm:p-9">
        <p className="text-xs font-poppins-semibold uppercase tracking-[0.24em] text-[#C26A42]">
          Next step after your application
        </p>
        <h1 className="mt-3 text-3xl font-poppins-semibold text-[#1B1B1B] sm:text-4xl">
          Short assessment for this role
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Thank you for applying to <span className="font-medium text-gray-800">{metadata.jobTitle}</span> at{" "}
          <span className="font-medium text-gray-800">{metadata.companyName}</span>. Before the hiring
          team reviews you fully, you will complete a brief online assessment.
        </p>

        <div className="mt-5 rounded-2xl border border-[#E6DFFA] bg-[#FBF9FF] px-4 py-4 text-sm text-[#3A3454]">
          <div className="mb-1 inline-flex items-center gap-2 font-semibold text-[#6A4BC2]">
            <Sparkles className="h-4 w-4" />
            AI-assisted assessment
          </div>
          <p className="leading-6">
            This step uses a short <strong>AI-powered assessment</strong> built into the HORAI Labs
            hiring process. Your answers are reviewed together with the information you already
            shared — such as your profile, experience, and CV — so the hiring team gets a fair,
            structured summary of how you fit this role. Human recruiters still make the final
            decision.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <div className="mb-1 inline-flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-4 w-4" />
            Integrity rules
          </div>
          <p>
            Do not cheat during the assessment. Detected integrity violations end the session and may
            block you from applying to this same role again.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-[#EFD7C9] bg-[#FFF8F4] p-5 text-sm leading-6 text-gray-700">
          <h2 className="mb-2 text-base font-poppins-semibold text-[#1B1B1B]">What to expect</h2>
          <ul className="space-y-2">
            <li>1. A short set of role-related questions with a timer on each.</li>
            <li>2. Stay on this window — switching away may be treated as a violation.</li>
            <li>3. Pasting and drag-and-drop are disabled.</li>
            <li>4. When you finish, results are prepared for the HORAI Labs hiring team.</li>
            <li className="font-semibold text-red-700">
              5. Cheating ends the assessment and can block re-application to this role.
            </li>
          </ul>
        </div>

        <div className="mt-6 rounded-2xl border border-[#EFD7C9] bg-white p-5">
          <div className="flex items-start gap-3">
            <input
              id="acknowledgement"
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#D5BDAF] text-[#7A3E1D] focus:ring-[#D5BDAF]"
            />
            <label htmlFor="acknowledgement" className="text-sm text-gray-700">
              I understand this is a short AI-assisted assessment, I accept the integrity rules, and
              I consent to HORAI Labs using my assessment responses and profile information for
              hiring evaluation.
            </label>
          </div>
        </div>

        {!metadata.applicationId && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Missing application id. Please return to your applications and restart.
          </div>
        )}

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={startInterview}
            disabled={!accepted || !metadata.applicationId}
            className="inline-flex items-center gap-2 rounded-xl bg-[#7A3E1D] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <AlertTriangle className="h-4 w-4" />
            Start assessment
          </button>
          <Link
            to="/applications"
            className="rounded-xl border border-[#E7D9D0] bg-white px-5 py-3 text-sm font-medium text-[#7A3E1D] transition hover:bg-[#FFF6F1]"
          >
            Back to applications
          </Link>
        </div>

        <p className="mt-5 text-xs text-gray-500">
          Role: {metadata.jobTitle} · {metadata.companyName}
        </p>
      </section>
    </main>
  );
};

export default InterviewDisclaimerPage;
