import { useEffect, useState } from "react";
import { Loader2, Pencil, X } from "lucide-react";
import { getAllCategories, updateJob } from "../../utilities/api/jobsApi";

const JOB_TYPES = [
  { value: "1", label: "Full-time" },
  { value: "2", label: "Part-time" },
  { value: "3", label: "Contract" },
  { value: "4", label: "Internship" },
  { value: "5", label: "Remote" },
];

const emptyForm = {
  title: "",
  summary: "",
  description: "",
  jobType: "1",
  salaryRange: "",
  location: "",
  deadline: "",
  categoryId: "",
};

const Field = ({ label, children, error }) => (
  <div>
    <label className="mb-1.5 block text-xs font-poppins-semibold uppercase tracking-wide text-gray-500">
      {label}
    </label>
    {children}
    {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
  </div>
);

const inputClass =
  "w-full rounded-xl border border-[#E7D9D0] bg-[#FFFBF8] px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#C26A42] focus:outline-none focus:ring-2 focus:ring-[#C26A42]/20";

const EditJobModal = ({ open, job, onClose, onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    if (!open || !job) return;

    const description =
      job.descriptionText ||
      (Array.isArray(job.description) ? job.description.join("\n\n") : "") ||
      "";
    const summary = job.summaryText || "";

    // If description paragraphs were built as summary + description, prefer raw fields
    let descriptionOnly = description;
    if (summary && description.startsWith(summary)) {
      descriptionOnly = description.slice(summary.length).replace(/^\n+/, "");
    }

    const rawType = job.jobType != null ? String(job.jobType) : "1";
    const deadlineRaw = job.deadline ? String(job.deadline).slice(0, 10) : "";

    setForm({
      title: job.title || "",
      summary,
      description: job.descriptionText || descriptionOnly || description,
      jobType: rawType || "1",
      salaryRange: job.salary && job.salary !== "Salary not provided" ? job.salary : "",
      location: job.location || "",
      deadline: deadlineRaw,
      categoryId: job.categoryId != null ? String(job.categoryId) : "",
    });
    setErrors({});
    setApiError("");
  }, [open, job]);

  useEffect(() => {
    if (!open) return;

    let active = true;
    (async () => {
      setLoadingCategories(true);
      try {
        const list = await getAllCategories();
        if (!active) return;
        setCategories(list);
      } catch {
        if (!active) return;
        setCategories([]);
      } finally {
        if (active) setLoadingCategories(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [open]);

  if (!open || !job) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = "Title is required";
    if (!form.description.trim()) next.description = "Description is required";
    if (!form.jobType) next.jobType = "Job type is required";
    if (!form.salaryRange.trim()) next.salaryRange = "Salary range is required";
    if (!form.location.trim()) next.location = "Location is required";
    if (!form.deadline) next.deadline = "Deadline is required";
    if (!form.categoryId) next.categoryId = "Category is required";
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = validate();
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setSaving(true);
    setApiError("");
    setErrors({});

    try {
      const updated = await updateJob(job.id, {
        categoryId: form.categoryId,
        title: form.title.trim(),
        description: form.description.trim(),
        summary: form.summary.trim(),
        jobType: form.jobType,
        salaryRange: form.salaryRange.trim(),
        location: form.location.trim(),
        deadline: form.deadline,
      });

      onSaved?.(updated);
      onClose?.();
    } catch (err) {
      setApiError(
        err?.response?.data?.message ||
          err?.response?.data?.title ||
          err?.message ||
          "Failed to save job posting.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Merge known types with current value if not in list
  const typeOptions = [...JOB_TYPES];
  if (form.jobType && !typeOptions.some((t) => t.value === form.jobType)) {
    typeOptions.unshift({ value: form.jobType, label: form.jobType });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-job-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#EFD7C9] bg-white shadow-[0_30px_80px_rgba(40,20,10,0.22)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#F1DED3] px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF2EA] text-[#C26A42]">
              <Pencil className="h-4 w-4" />
            </div>
            <div>
              <h2 id="edit-job-title" className="font-poppins-semibold text-lg text-[#1B1B1B]">
                Edit job posting
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Changes save immediately for all candidates searching or applying.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
            <Field label="Job title" error={errors.title}>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g. Senior Data Engineer"
                disabled={saving}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" error={errors.categoryId}>
                <select
                  name="categoryId"
                  value={form.categoryId}
                  onChange={handleChange}
                  className={inputClass}
                  disabled={saving || loadingCategories}
                >
                  <option value="">{loadingCategories ? "Loading…" : "Select category"}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={String(cat.id)}>
                      {cat.categoryName}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Job type" error={errors.jobType}>
                <select
                  name="jobType"
                  value={form.jobType}
                  onChange={handleChange}
                  className={inputClass}
                  disabled={saving}
                >
                  {typeOptions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Location" error={errors.location}>
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Nairobi · Remote"
                  disabled={saving}
                />
              </Field>

              <Field label="Salary range" error={errors.salaryRange}>
                <input
                  name="salaryRange"
                  value={form.salaryRange}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="KES 150k – 250k"
                  disabled={saving}
                />
              </Field>
            </div>

            <Field label="Application deadline" error={errors.deadline}>
              <input
                type="date"
                name="deadline"
                value={form.deadline}
                onChange={handleChange}
                className={inputClass}
                disabled={saving}
              />
            </Field>

            <Field label="Short summary (optional)">
              <textarea
                name="summary"
                value={form.summary}
                onChange={handleChange}
                rows={2}
                className={`${inputClass} resize-none`}
                placeholder="One-line highlight for the listing card…"
                disabled={saving}
              />
            </Field>

            <Field label="Full description" error={errors.description}>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={8}
                className={`${inputClass} resize-y min-h-[140px]`}
                placeholder="Responsibilities, requirements, benefits…"
                disabled={saving}
              />
            </Field>

            {apiError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {apiError}
              </div>
            )}
          </div>

          <div className="flex gap-3 border-t border-[#F1DED3] px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#7A3E1D] py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditJobModal;
