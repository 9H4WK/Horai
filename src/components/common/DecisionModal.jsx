import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

/**
 * Shared Accept / Reject decision modal with applicant-visible HR comment.
 */
const DecisionModal = ({
  open,
  mode = "reject", // "accept" | "reject"
  candidateName = "candidate",
  jobTitle = "this role",
  onConfirm,
  onClose,
  loading = false,
}) => {
  const [comment, setComment] = useState("");
  const isAccept = mode === "accept";

  useEffect(() => {
    if (open) setComment("");
  }, [open, mode]);

  if (!open) return null;

  const title = isAccept ? "Accept application" : "Reject application";
  const confirmLabel = isAccept ? "Accept & notify" : "Reject & notify";
  const placeholder = isAccept
    ? "Optional message the applicant will see (e.g. next steps, start date, interview invite)…"
    : "Message the applicant will see (e.g. constructive feedback, encourage re-applying)…";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="decision-modal-title"
        className="w-full max-w-lg rounded-3xl border border-[#EFD7C9] bg-white p-6 shadow-[0_30px_80px_rgba(40,20,10,0.22)]"
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              isAccept ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
            }`}
          >
            {isAccept ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <h3 id="decision-modal-title" className="font-poppins-semibold text-lg text-[#1B1B1B]">
              {title}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {isAccept ? "You are accepting" : "You are rejecting"}{" "}
              <span className="font-poppins-semibold text-[#1B1B1B]">{candidateName}</span> for{" "}
              <span className="font-poppins-semibold text-[#1B1B1B]">{jobTitle}</span>.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-1.5 block text-xs font-poppins-semibold uppercase tracking-[0.14em] text-[#C26A42]">
            Comment to applicant
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            disabled={loading}
            placeholder={placeholder}
            className="w-full resize-none rounded-2xl border border-[#E7D9D0] bg-[#FFFBF8] px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#C26A42] focus:outline-none focus:ring-2 focus:ring-[#C26A42]/25"
          />
          <p className="mt-2 text-xs leading-5 text-gray-500">
            This comment is saved on the application and delivered to the candidate via notifications and their
            application details.
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(comment)}
            disabled={loading}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white transition disabled:opacity-60 ${
              isAccept ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecisionModal;
