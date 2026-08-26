import React, { useState, useEffect, useCallback } from "react";
import {
  getPendingCompanies,
  getPendingJobs,
  getPendingJobById,
  getAllCategories,
  approveCompany,
  rejectCompany,
  approveJob,
  rejectJob,
  addCategory,
  updateCategory,
  deleteCategory,
  getAllUsers,
  getUserDetails,
  updateUser,
  deleteUser,
  lockUnlockUser,
  getAllEmployers,
  getAllJobSeekers,
  registerAdmin,
  getAdminDashboardStats,
  getEmploymentRate,
  getApplicationsDistribution,
  getApplicationsOverTime,
  getUsersGrowth,
  getScreeningFunnel,
  getJobTypeDistribution,
  getTopJobs,
  getScreeningQuality,
  getTopSkills,
} from "../../utilities/api/adminApi";
import { getAllSkills, addSkill, deleteSkill } from "../../utilities/api/skillsApi";

// ── helpers ────────────────────────────────────────────────────────────────
const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const initialsOf = (name = "", email = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (email || "?").slice(0, 2).toUpperCase();
};
const Badge = ({ children, color = "orange" }) => {
  const colors = {
    orange: "bg-[#FFECE3] text-[#D3571F] border-[#E46E39]/30",
    green:  "bg-green-50   text-green-700 border-green-200",
    red:    "bg-red-50     text-red-600   border-red-200",
    gray:   "bg-gray-100   text-gray-600  border-gray-200",
    blue:   "bg-blue-50    text-blue-600  border-blue-200",
    purple: "bg-purple-50  text-purple-600 border-purple-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-poppins-medium border ${colors[color] || colors.orange}`}>
      {children}
    </span>
  );
};

const applicationStatusColor = (status) => {
  const map = {
    Accepted: "green",
    Hired: "green",
    Rejected: "red",
    Submitted: "blue",
    UnderReview: "orange",
    Shortlisted: "purple",
    Interviewed: "purple",
  };
  return map[status] ?? "gray";
};

const StatCard = ({ icon, label, value, sub, accent = false }) => (
  <div className={`rounded-2xl border p-5 flex items-center gap-4 transition-all hover:shadow-md ${accent ? "bg-[#D3571F] border-[#B8461A] text-white" : "bg-white border-[#4242425C]/20"}`}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${accent ? "bg-white/20" : "bg-[#FFECE3]"}`}>
      {icon}
    </div>
    <div>
      <p className={`text-xs font-poppins ${accent ? "text-white/75" : "text-gray-500"}`}>{label}</p>
      <p className={`text-2xl font-poppins-bold leading-tight ${accent ? "text-white" : "text-[#1a1a1a]"}`}>{value}</p>
      {sub && <p className={`text-xs font-poppins mt-0.5 ${accent ? "text-white/65" : "text-gray-400"}`}>{sub}</p>}
    </div>
  </div>
);

const SectionHeader = ({ title, count }) => (
  <div className="flex items-center gap-3 mb-5">
    <h2 className="font-poppins-semibold text-[#1a1a1a] text-lg">{title}</h2>
    {count !== undefined && (
      <span className="bg-[#FFECE3] text-[#D3571F] text-xs font-poppins-medium px-2 py-0.5 rounded-full border border-[#E46E39]/30">
        {count}
      </span>
    )}
  </div>
);

// ── Reject Modal ───────────────────────────────────────────────────────────
const RejectModal = ({ type, item, onConfirm, onClose }) => {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-500 text-lg">✕</div>
          <div>
            <h3 className="font-poppins-semibold text-[#1a1a1a]">Reject {type}</h3>
            <p className="text-xs text-gray-500 font-poppins">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm font-poppins text-gray-700 mb-4">
          You're about to reject <span className="font-poppins-semibold text-[#1a1a1a]">{item}</span>. Please provide a reason (optional):
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={type === "Job" ? "e.g. Incomplete description..." : "e.g. Missing documentation..."}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-poppins placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D3571F]/40 resize-none"
        />
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-poppins-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={() => onConfirm(reason)} className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-poppins-medium text-white hover:bg-red-600 transition-colors">
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Job Details Modal ───────────────────────────────────────────────────────
const jobTypeLabel = (type) => {
  const map = { 0: "Full-time", 1: "Part-time", 2: "Contract", 3: "Internship", 4: "Remote" };
  return map[type] ?? `Type ${type}`;
};

const JobDetailsModal = ({ jobId, fallback, onClose, onApprove, onReject, actionLoading }) => {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    getPendingJobById(jobId)
      .then((data) => { if (active) setJob(data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [jobId]);

  const data = job ?? fallback ?? {};
  const isLoading = actionLoading === jobId;

  const stats = [
    data.location && { icon: "📍", label: "Location", value: data.location },
    data.salaryRange && { icon: "💰", label: "Salary", value: data.salaryRange },
    data.jobType !== undefined && { icon: "⏱", label: "Type", value: jobTypeLabel(data.jobType) },
    data.deadline && { icon: "📅", label: "Deadline", value: new Date(data.deadline).toLocaleDateString() },
    data.categoryName && { icon: "🏷️", label: "Category", value: data.categoryName },
    data.companyName && { icon: "🏢", label: "Company", value: data.companyName },
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col animate-fade-in overflow-hidden">

        {/* Header */}
        <div className="flex items-start gap-4 px-6 py-5 border-b border-[#4242425C]/10 flex-shrink-0">
          <div className="w-11 h-11 rounded-xl bg-[#FFECE3] flex items-center justify-center text-xl flex-shrink-0">💼</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-poppins-semibold text-[#1a1a1a] text-base break-words">{data.title ?? "Job details"}</h3>
              <Badge color="orange">Pending</Badge>
            </div>
            {data.companyName && (
              <p className="text-xs text-gray-400 font-poppins mt-0.5 truncate">{data.companyName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-base leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
          {loading && (
            <div className="py-10 text-center text-sm font-poppins text-gray-400">Loading details…</div>
          )}

          {!loading && error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-poppins text-red-500">
              Couldn't load full details. Showing what's available.
            </div>
          )}

          {!loading && (
            <>
              {stats.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {stats.map((stat, i) => (
                    <div key={i} className="rounded-xl bg-[#F9F6F3] px-3.5 py-2.5 min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-poppins-medium">{stat.label}</p>
                      <p className="text-sm font-poppins-medium text-[#1a1a1a] mt-0.5 break-words">
                        {stat.icon} {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {data.summary && (
                <div>
                  <p className="text-xs font-poppins-semibold text-gray-500 mb-1.5">Summary</p>
                  <p className="text-sm font-poppins text-gray-700 leading-relaxed whitespace-pre-line break-words">{data.summary}</p>
                </div>
              )}

              {data.description && (
                <div>
                  <p className="text-xs font-poppins-semibold text-gray-500 mb-1.5">Description</p>
                  <p className="text-sm font-poppins text-gray-700 leading-relaxed whitespace-pre-line break-words">{data.description}</p>
                </div>
              )}

              {Array.isArray(data.skills) && data.skills.length > 0 && (
                <div>
                  <p className="text-xs font-poppins-semibold text-gray-500 mb-1.5">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.skills.map((skill, i) => (
                      <Badge key={skill.id ?? skill.skillId ?? i} color="gray">
                        {skill.skillName ?? skill.name ?? skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[#4242425C]/10 flex-shrink-0">
          <button
            disabled={isLoading}
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-poppins-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            disabled={isLoading}
            onClick={() => onReject()}
            className="flex-1 rounded-xl bg-red-100 hover:bg-red-500 hover:text-white text-red-500 py-2.5 text-sm font-poppins-medium transition-colors disabled:opacity-50"
          >
            Reject
          </button>
          <button
            disabled={isLoading}
            onClick={() => onApprove()}
            className="flex-1 rounded-xl bg-green-500 hover:bg-green-600 text-white py-2.5 text-sm font-poppins-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? "…" : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
};


const CategoryModal = ({ category, onConfirm, onClose }) => {
  const [name, setName] = useState(
    category?.categoryName ?? category?.CategoryName ?? "",
  );
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-poppins-semibold text-[#1a1a1a] mb-4">{category ? "Edit Category" : "Add Category"}</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name"
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-poppins focus:outline-none focus:ring-2 focus:ring-[#D3571F]/40"
        />
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-poppins-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => name.trim().length >= 3 && onConfirm(name.trim())}
            disabled={name.trim().length < 3}
            className="flex-1 rounded-xl bg-[#D3571F] py-2.5 text-sm font-poppins-medium text-white hover:bg-[#B8461A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {category ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
};

const SkillModal = ({ onConfirm, onClose }) => {
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-poppins-semibold text-[#1a1a1a] mb-4">Add Skill</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Skill name"
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-poppins focus:outline-none focus:ring-2 focus:ring-[#D3571F]/40"
        />
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-poppins-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => name.trim().length >= 2 && onConfirm(name.trim())}
            disabled={name.trim().length < 2}
            className="flex-1 rounded-xl bg-[#D3571F] py-2.5 text-sm font-poppins-medium text-white hover:bg-[#B8461A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Chart primitives ────────────────────────────────────────────────────────
const MiniBarChart = ({ data, valueKey = "value", color = "#D3571F", suffix = "" }) => {
  if (!data.length) {
    return <div className="h-40 flex items-center justify-center text-xs font-poppins text-gray-300">No data yet</div>;
  }
  const maxVal = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div className="h-44 flex items-end gap-3 px-1">
      {data.map((item, idx) => {
        const heightPct = ((Number(item[valueKey]) || 0) / maxVal) * 100;
        return (
          <div key={idx} className="flex-1 flex flex-col items-center group relative min-w-0 h-full justify-end">
            <div className="absolute -top-8 scale-0 group-hover:scale-100 transition-all bg-[#1a1a1a] text-white text-[10px] font-poppins px-2 py-1 rounded shadow-md pointer-events-none z-10 whitespace-nowrap">
              {item[valueKey]}{suffix}
            </div>
            <span className={`text-xs font-poppins-semibold mb-1 ${Number(item[valueKey]) ? "text-gray-600" : "text-gray-300"}`}>
              {item[valueKey]}
            </span>
            <div
              className="w-full rounded-t-lg border-t-2 transition-all duration-500"
              style={{
                height: `${Math.max(heightPct * 0.82, 2)}%`,
                backgroundColor: `${color}18`,
                borderTopColor: color,
              }}
            />
            <span className="text-[9px] font-poppins text-gray-400 mt-2 truncate w-full text-center" title={item.label}>
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const FunnelBars = ({ data }) => {
  if (!data.length) {
    return <p className="text-xs text-gray-300 font-poppins text-center py-6">No pipeline data</p>;
  }
  const topValue = Math.max(...data.map((d) => d.value), 1);
  const stageColors = ["#94a3b8", "#8B7CF6", "#E46E39", "#D3571F", "#16a34a"];
  return (
    <div className="space-y-3">
      {data.map((stage, idx) => {
        const widthPct = Math.max((stage.value / topValue) * 100, 4);
        const dropoff = idx > 0 && data[idx - 1].value > 0
          ? Math.round(((data[idx - 1].value - stage.value) / data[idx - 1].value) * 100)
          : null;
        return (
          <div key={stage.label} className="group">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs font-poppins-medium text-gray-600">{stage.label}</span>
              <span className="text-xs font-poppins-semibold text-[#1a1a1a]">
                {stage.value}
                {dropoff !== null && dropoff > 0 && (
                  <span className="ml-1.5 text-[10px] text-red-400 font-poppins">-{dropoff}%</span>
                )}
              </span>
            </div>
            <div className="h-5 w-full bg-[#F9F6F3] rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${widthPct}%`, backgroundColor: stageColors[idx % stageColors.length] }}
              >
                <span className="text-[9px] font-poppins-bold text-white/90">{Math.round(widthPct)}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DonutChart = ({ data, size = 150, thickness = 22 }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const palette = ["#D3571F", "#FF9768", "#8B7CF6", "#38bdf8", "#34d399", "#fbbf24"];

  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F9F6F3" strokeWidth={thickness} />
          {total > 0 && data.map((d, i) => {
            const fraction = d.value / total;
            const dash = fraction * circumference;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={palette[i % palette.length]}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                className="transition-all duration-500"
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-poppins-bold text-[#1a1a1a]">{total}</span>
          <span className="text-[10px] text-gray-400 font-poppins">total</span>
        </div>
      </div>
      <div className="space-y-2 min-w-0">
        {data.length === 0 && <p className="text-xs text-gray-300 font-poppins">No data</p>}
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs font-poppins">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: palette[i % palette.length] }} />
            <span className="text-gray-600 truncate max-w-[110px]" title={d.label}>{d.label}</span>
            <span className="text-gray-400 font-poppins-semibold ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── User Details / Edit Modal ───────────────────────────────────────────────
const EMPTY_EDIT_FORM = {
  firstName: "", lastName: "", phone: "", location: "",
  headline: "", bio: "", linkedInURL: "", gitHubURL: "", websiteURL: "", role: "JobSeeker",
};

const DetailField = ({ label, value, icon }) => (
  <div className="rounded-xl bg-[#F9F6F3] px-3.5 py-2.5 min-w-0">
    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-poppins-medium">{label}</p>
    <p className="text-sm font-poppins-medium text-[#1a1a1a] mt-0.5 break-words">
      {icon ? `${icon} ` : ""}{value || <span className="text-gray-300 italic">Not provided</span>}
    </p>
  </div>
);

const ProfileSection = ({ title, children }) => (
  <div>
    <p className="text-xs font-poppins-semibold text-gray-500 mb-2">{title}</p>
    {children}
  </div>
);

const UserDetailsModal = ({ userId, onClose, onChanged, showToast }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(EMPTY_EDIT_FORM);

  useEffect(() => {
    let active = true;
    getUserDetails(userId)
      .then((data) => {
        if (!active) return;
        setDetails(data);
        setForm({
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          phone: data.phone ?? "",
          location: data.location ?? "",
          headline: data.headline ?? "",
          bio: data.bio ?? "",
          linkedInURL: data.linkedin_url ?? "",
          gitHubURL: data.github_url ?? "",
          websiteURL: data.portfolio_url ?? "",
          role: data.role ?? "JobSeeker",
        });
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUser(userId, form);
      showToast("User updated successfully ✓");
      setEditing(false);
      const refreshed = await getUserDetails(userId);
      setDetails(refreshed);
      onChanged?.();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to update user", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLock = async () => {
    try {
      await lockUnlockUser(userId);
      const refreshed = await getUserDetails(userId);
      setDetails(refreshed);
      showToast(details?.isLocked ? "User unlocked ✓" : "User locked ✓");
      onChanged?.();
    } catch {
      showToast("Failed to change lock status", "error");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteUser(userId);
      showToast("User deleted with all related records");
      onChanged?.();
      onClose();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to delete user", "error");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const name = details
    ? `${details.firstName ?? ""} ${details.lastName ?? ""}`.trim() || details.userName || details.email
    : "";
  const profile = details?.profile ?? {};
  const applications = details?.applications ?? [];
  const interviews = details?.interviewStats ?? {};

  const editInput = (label, key, type = "text") => (
    <div key={key}>
      <label className="block text-xs font-poppins-medium text-gray-500 mb-1.5">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-poppins focus:outline-none focus:ring-2 focus:ring-[#D3571F]/40"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col animate-fade-in overflow-hidden">

        {/* Header */}
        <div className="flex items-start gap-4 px-6 py-5 border-b border-[#4242425C]/10 flex-shrink-0">
          {details?.photoUrl ? (
            <img src={details.photoUrl} alt={name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-100" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-[#FFECE3] flex items-center justify-center text-base font-poppins-bold text-[#D3571F] flex-shrink-0">
              {initialsOf(name, details?.email)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-poppins-semibold text-[#1a1a1a] text-base break-words">{name || "User details"}</h3>
              <Badge color={details?.role === "Admin" ? "purple" : details?.role === "Employer" ? "blue" : "orange"}>
                {details?.role ?? "…"}
              </Badge>
              {details?.isLocked ? <Badge color="red">Locked</Badge> : <Badge color="green">Active</Badge>}
            </div>
            <p className="text-xs text-gray-400 font-poppins mt-0.5 truncate">{details?.headline || details?.email}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-base leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-6">
          {loading && (
            <div className="py-14 text-center text-sm font-poppins text-gray-400">
              <div className="w-8 h-8 mx-auto mb-3 border-4 border-[#FFECE3] border-t-[#D3571F] rounded-full animate-spin" />
              Loading full details…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-poppins text-red-500">
              Couldn't load user details.
            </div>
          )}

          {!loading && !error && details && editing ? (
            /* ── Edit form ── */
            <div className="space-y-4">
              <h4 className="font-poppins-semibold text-sm text-[#1a1a1a]">Edit user account</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {editInput("First Name", "firstName")}
                {editInput("Last Name", "lastName")}
                {editInput("Phone", "phone")}
                {editInput("Location", "location")}
                {editInput("Headline", "headline")}
                <div>
                  <label className="block text-xs font-poppins-medium text-gray-500 mb-1.5">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-poppins bg-white focus:outline-none focus:ring-2 focus:ring-[#D3571F]/40"
                  >
                    <option value="JobSeeker">JobSeeker</option>
                    <option value="Employer">Employer</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                {editInput("LinkedIn URL", "linkedInURL")}
                {editInput("GitHub URL", "gitHubURL")}
                {editInput("Portfolio URL", "websiteURL")}
              </div>
              <div>
                <label className="block text-xs font-poppins-medium text-gray-500 mb-1.5">Bio</label>
                <textarea
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-poppins resize-none focus:outline-none focus:ring-2 focus:ring-[#D3571F]/40"
                />
              </div>
            </div>
          ) : (
            !loading && !error && details && (
              <>
                {/* ── Account metrics ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Applications", value: details.applicationCount ?? 0, sub: `${details.acceptedCount ?? 0} accepted` },
                    { label: "Interviews", value: interviews.completed ?? 0, sub: interviews.averageScore != null ? `avg ${interviews.averageScore}` : "no scores" },
                    { label: "Avg Match Score", value: details.averageMatchScore != null ? `${details.averageMatchScore}%` : "—", sub: "AI screening" },
                    { label: "Profile Complete", value: `${details.profileCompletion ?? 0}%`, sub: details.hasCV ? "CV on file" : "no CV yet" },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl bg-[#F9F6F3] px-3.5 py-3">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-poppins-medium">{m.label}</p>
                      <p className="text-lg font-poppins-bold text-[#1a1a1a] leading-tight">{m.value}</p>
                      <p className="text-[10px] text-gray-400 font-poppins">{m.sub}</p>
                    </div>
                  ))}
                </div>

                {/* ── Contact & account info ── */}
                <ProfileSection title="Account Information">
                  <div className="grid grid-cols-2 gap-3">
                    <DetailField label="Email" value={details.email} icon="✉" />
                    <DetailField label="Phone" value={details.phone} icon="📞" />
                    <DetailField label="Location" value={details.location} icon="📍" />
                    <DetailField label="Joined" value={formatDate(details.createdAt)} icon="📅" />
                    <DetailField label="Last Login" value={details.lastLoginAt ? formatDate(details.lastLoginAt) : "Never"} icon="🔑" />
                    <DetailField label="Last Activity" value={formatDate(details.lastActivityAt)} icon="⚡" />
                  </div>
                  {(details.linkedin_url || details.github_url || details.portfolio_url) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {details.linkedin_url && <a href={details.linkedin_url} target="_blank" rel="noreferrer" className="text-xs font-poppins-medium text-[#D3571F] bg-[#FFECE3] px-3 py-1 rounded-full hover:bg-[#FFDCC8] transition-colors">LinkedIn ↗</a>}
                      {details.github_url && <a href={details.github_url} target="_blank" rel="noreferrer" className="text-xs font-poppins-medium text-[#D3571F] bg-[#FFECE3] px-3 py-1 rounded-full hover:bg-[#FFDCC8] transition-colors">GitHub ↗</a>}
                      {details.portfolio_url && <a href={details.portfolio_url} target="_blank" rel="noreferrer" className="text-xs font-poppins-medium text-[#D3571F] bg-[#FFECE3] px-3 py-1 rounded-full hover:bg-[#FFDCC8] transition-colors">Portfolio ↗</a>}
                    </div>
                  )}
                  {details.bio && (
                    <p className="text-sm font-poppins text-gray-700 leading-relaxed mt-3 whitespace-pre-line">{details.bio}</p>
                  )}
                </ProfileSection>

                {/* ── CV ── */}
                {details.cv && (
                  <ProfileSection title="CV / Resume">
                    <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
                      <div className="w-9 h-9 rounded-lg bg-[#FFECE3] flex items-center justify-center flex-shrink-0">📄</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-poppins-medium text-[#1a1a1a] truncate">{details.cv.fileName ?? "CV"}</p>
                        <p className="text-[11px] text-gray-400 font-poppins">Uploaded {formatDate(details.cv.uploadedAt)}</p>
                      </div>
                      {details.cv.url && (
                        <a href={details.cv.url} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg text-xs font-poppins-medium bg-[#FFECE3] text-[#D3571F] hover:bg-[#FFDCC8] transition-colors flex-shrink-0">
                          Download
                        </a>
                      )}
                    </div>
                    {details.cv.analysis?.summary && (
                      <p className="text-xs font-poppins text-gray-600 leading-relaxed mt-2 rounded-xl bg-[#F9F6F3] px-4 py-3">
                        <span className="font-poppins-semibold text-gray-500">CV summary: </span>{details.cv.analysis.summary}
                      </p>
                    )}
                  </ProfileSection>
                )}

                {/* ── Skills ── */}
                {(profile.skills?.length ?? 0) > 0 && (
                  <ProfileSection title={`Skills (${profile.skills.length})`}>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.map((skill, i) => (
                        <Badge key={i} color="gray">{typeof skill === "string" ? skill : skill.skillName ?? skill.name}</Badge>
                      ))}
                    </div>
                  </ProfileSection>
                )}

                {/* ── Experience ── */}
                {(profile.experience?.length ?? 0) > 0 && (
                  <ProfileSection title={`Experience (${profile.experience.length})`}>
                    <div className="space-y-2">
                      {profile.experience.map((exp, i) => (
                        <div key={i} className="rounded-xl border border-gray-100 px-4 py-3">
                          <div className="flex items-baseline justify-between gap-3 flex-wrap">
                            <p className="text-sm font-poppins-medium text-[#1a1a1a]">{exp.title ?? exp.role ?? "Role"}</p>
                            <span className="text-[11px] text-gray-400 font-poppins">{exp.duration ?? exp.period ?? ""}</span>
                          </div>
                          <p className="text-xs text-gray-500 font-poppins">{exp.company ?? exp.employer ?? ""}</p>
                          {exp.description && <p className="text-xs text-gray-600 font-poppins mt-1 leading-relaxed">{exp.description}</p>}
                        </div>
                      ))}
                    </div>
                  </ProfileSection>
                )}

                {/* ── Education ── */}
                {(profile.education?.length ?? 0) > 0 && (
                  <ProfileSection title={`Education (${profile.education.length})`}>
                    <div className="space-y-2">
                      {profile.education.map((edu, i) => (
                        <div key={i} className="rounded-xl border border-gray-100 px-4 py-3 flex items-baseline justify-between gap-3 flex-wrap">
                          <div>
                            <p className="text-sm font-poppins-medium text-[#1a1a1a]">{edu.degree ?? edu.program ?? "Degree"}</p>
                            <p className="text-xs text-gray-500 font-poppins">{edu.institution ?? edu.school ?? ""}</p>
                          </div>
                          <span className="text-[11px] text-gray-400 font-poppins">{edu.year ?? edu.graduationYear ?? ""}</span>
                        </div>
                      ))}
                    </div>
                  </ProfileSection>
                )}

                {/* ── Projects ── */}
                {(profile.projects?.length ?? 0) > 0 && (
                  <ProfileSection title={`Projects (${profile.projects.length})`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {profile.projects.map((proj, i) => (
                        <div key={i} className="rounded-xl border border-gray-100 px-4 py-3">
                          <p className="text-sm font-poppins-medium text-[#1a1a1a]">{proj.name ?? proj.title ?? "Project"}</p>
                          {proj.description && <p className="text-xs text-gray-500 font-poppins mt-0.5 leading-relaxed">{proj.description}</p>}
                        </div>
                      ))}
                    </div>
                  </ProfileSection>
                )}

                {/* ── Applications history ── */}
                <ProfileSection title={`Application History (${applications.length})`}>
                  {applications.length === 0 ? (
                    <p className="text-xs text-gray-300 font-poppins italic">No applications submitted.</p>
                  ) : (
                    <div className="rounded-xl border border-gray-100 overflow-x-auto">
                      <table className="w-full text-left min-w-[480px]">
                        <thead>
                          <tr className="border-b border-gray-100 text-[10px] font-poppins-semibold uppercase tracking-wider text-gray-400 bg-gray-50/50">
                            <th className="px-4 py-2.5">Job</th>
                            <th className="px-4 py-2.5">Status</th>
                            <th className="px-4 py-2.5">Match</th>
                            <th className="px-4 py-2.5">Applied</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm font-poppins">
                          {applications.map((app) => (
                            <tr key={app.id}>
                              <td className="px-4 py-2.5">
                                <p className="font-poppins-medium text-[#1a1a1a] text-xs">{app.job_title ?? "—"}</p>
                                <p className="text-[10px] text-gray-400">{app.company_name ?? ""}</p>
                              </td>
                              <td className="px-4 py-2.5"><Badge color={applicationStatusColor(app.status)}>{app.status ?? "—"}</Badge></td>
                              <td className="px-4 py-2.5">
                                {app.matchScore != null ? (
                                  <span className="text-xs font-poppins-semibold text-[#D3571F]">{app.matchScore}%</span>
                                ) : (
                                  <span className="text-gray-300 text-xs">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">{formatDate(app.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </ProfileSection>

                {/* ── Notifications snapshot ── */}
                {(details.notifications?.length ?? 0) > 0 && (
                  <ProfileSection title={`Recent Notifications (${details.notificationCount} unread)`}>
                    <div className="space-y-1.5">
                      {details.notifications.slice(0, 3).map((n) => (
                        <div key={n.id} className="flex items-center gap-2 text-xs font-poppins text-gray-600 rounded-lg bg-[#F9F6F3] px-3 py-2">
                          <span className={n.is_read ? "opacity-40" : ""}>{n.is_read ? "○" : "●"}</span>
                          <span className="truncate">{n.message}</span>
                          <span className="ml-auto text-[10px] text-gray-300 flex-shrink-0">{formatDate(n.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </ProfileSection>
                )}
              </>
            )
          )}
        </div>

        {/* Footer */}
        {!loading && !error && details && (
          <div className="flex flex-wrap gap-2 px-6 py-4 border-t border-[#4242425C]/10 flex-shrink-0">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} disabled={saving} className="flex-1 min-w-[90px] rounded-xl border border-gray-200 py-2.5 text-sm font-poppins-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="flex-1 min-w-[120px] rounded-xl bg-[#D3571F] py-2.5 text-sm font-poppins-medium text-white hover:bg-[#B8461A] transition-colors disabled:opacity-50">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleToggleLock}
                  className={`px-4 py-2.5 rounded-xl text-xs font-poppins-medium transition-colors ${details.isLocked
                    ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                    : "bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200"}`}
                >
                  {details.isLocked ? "🔓 Unlock User" : "🔒 Lock User"}
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-poppins-medium bg-[#FFECE3] text-[#D3571F] hover:bg-[#FFDCC8] transition-colors"
                >
                  ✏️ Edit Details
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className={`px-4 py-2.5 rounded-xl text-xs font-poppins-medium transition-colors ml-auto disabled:opacity-50 ${confirmDelete
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"}`}
                >
                  {deleting ? "Deleting…" : confirmDelete ? `Confirm delete ${name.split(" ")[0]}?` : "🗑 Delete"}
                </button>
                <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-poppins-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                  Close
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Tabs ───────────────────────────────────────────────────────────────────
const tabs = [
  { id: "overview",   label: "Overview",   icon: "⊞" },
  { id: "jobs",       label: "Pending Jobs",       icon: "💼" },
  { id: "companies",  label: "Pending Companies",  icon: "🏢" },
  { id: "categories", label: "Categories",  icon: "🏷️" },
  { id: "skills",     label: "Skills",             icon: "✨" },
  { id: "users",      label: "Manage Users",      icon: "👤" },
  { id: "analytics",  label: "Analytics",          icon: "📊" },
];

// ── Main Component ─────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [pendingJobs, setPendingJobs] = useState([]);
  const [pendingCompanies, setPendingCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);
  const [rejectModal, setRejectModal] = useState(null); // { type, id, name }
  const [jobDetailsModal, setJobDetailsModal] = useState(null); // { id, fallback }
  const [categoryModal, setCategoryModal] = useState(null); // null | { category? }
  const [skillModal, setSkillModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // New states for users list, employers, job seekers, and admin creation
  const [users, setUsers] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [jobSeekers, setJobSeekers] = useState([]);
  const [userSubTab, setUserSubTab] = useState("accounts");
  const [adminForm, setAdminForm] = useState({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "" });
  const [adminFormLoading, setAdminFormLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("All");
  const [userDetailsModalId, setUserDetailsModalId] = useState(null);

  // Analytics metrics state
  const [employmentRate, setEmploymentRateState] = useState(null);
  const [applicationsDistribution, setApplicationsDistributionState] = useState([]);
  const [topSkillsList, setTopSkillsList] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [appsOverTime, setAppsOverTime] = useState([]);
  const [usersGrowth, setUsersGrowth] = useState([]);
  const [screeningFunnel, setScreeningFunnel] = useState([]);
  const [jobTypeDist, setJobTypeDist] = useState([]);
  const [topJobs, setTopJobs] = useState([]);
  const [screeningQuality, setScreeningQuality] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        pJobs,
        pCompanies,
        cats,
        skillsResult,
        allUsersRes,
        employersRes,
        seekersRes,
        empRateRes,
        appDistRes,
        topSkillsRes,
        statsRes,
        overTimeRes,
        growthRes,
        funnelRes,
        jobTypeRes,
        topJobsRes,
        qualityRes
      ] = await Promise.allSettled([
        getPendingJobs(),
        getPendingCompanies(),
        getAllCategories(),
        getAllSkills(),
        getAllUsers(),
        getAllEmployers(),
        getAllJobSeekers(),
        getEmploymentRate(),
        getApplicationsDistribution(),
        getTopSkills(),
        getAdminDashboardStats(),
        getApplicationsOverTime(),
        getUsersGrowth(),
        getScreeningFunnel(),
        getJobTypeDistribution(),
        getTopJobs(),
        getScreeningQuality(),
      ]);

      if (pJobs.status === "fulfilled") setPendingJobs(Array.isArray(pJobs.value) ? pJobs.value : []);
      if (pCompanies.status === "fulfilled") setPendingCompanies(Array.isArray(pCompanies.value) ? pCompanies.value : []);
      if (cats.status === "fulfilled") setCategories(Array.isArray(cats.value) ? cats.value : []);
      if (skillsResult.status === "fulfilled") setSkills(Array.isArray(skillsResult.value) ? skillsResult.value : []);

      const toCollection = (res, setter) => {
        if (res.status === "fulfilled" && Array.isArray(res.value)) {
          setter(res.value);
          return true;
        }
        return false;
      };

      if (allUsersRes.status === "fulfilled") setUsers(Array.isArray(allUsersRes.value) ? allUsersRes.value : []);
      if (employersRes.status === "fulfilled") setEmployers(Array.isArray(employersRes.value) ? employersRes.value : []);
      if (seekersRes.status === "fulfilled") setJobSeekers(Array.isArray(seekersRes.value) ? seekersRes.value : []);

      // Analytics mapping with fallback support
      if (empRateRes.status === "fulfilled" && empRateRes.value !== undefined && empRateRes.value !== null) {
        const val = empRateRes.value;
        let rate = typeof val === "number"
          ? val
          : (val?.rate ?? val?.employmentRate ?? 0);
        if (rate > 0 && rate <= 1) rate = rate * 100;
        setEmploymentRateState(Math.round(rate));
      } else {
        setEmploymentRateState(0);
      }

      if (!toCollection(appDistRes, setApplicationsDistributionState)) {
        setApplicationsDistributionState([]);
      }

      if (!toCollection(topSkillsRes, setTopSkillsList)) {
        setTopSkillsList([]);
      }

      if (statsRes.status === "fulfilled" && statsRes.value && typeof statsRes.value === "object") {
        setDashboardStats(statsRes.value);
      }

      toCollection(overTimeRes, setAppsOverTime);
      toCollection(growthRes, setUsersGrowth);
      toCollection(funnelRes, setScreeningFunnel);
      toCollection(jobTypeRes, setJobTypeDist);
      toCollection(topJobsRes, setTopJobs);

      if (qualityRes.status === "fulfilled" && qualityRes.value && typeof qualityRes.value === "object") {
        setScreeningQuality(qualityRes.value);
      }
    } catch {
      showToast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Job actions ────────────────────────────────────────────────────────
  const handleApproveJob = async (id) => {
    setActionLoading(id);
    try {
      await approveJob(id);
      setPendingJobs((prev) => prev.filter((j) => (j.id ?? j.jobId) !== id));
      showToast("Job approved successfully ✓");
    } catch { showToast("Failed to approve job", "error"); }
    finally { setActionLoading(null); }
  };

  const handleRejectJob = async (id, summary) => {
    setActionLoading(id);
    setRejectModal(null);
    try {
      await rejectJob(id, summary);
      setPendingJobs((prev) => prev.filter((j) => (j.id ?? j.jobId) !== id));
      showToast("Job rejected");
    } catch { showToast("Failed to reject job", "error"); }
    finally { setActionLoading(null); }
  };

  // ── Company actions ────────────────────────────────────────────────────
  const handleApproveCompany = async (id) => {
    setActionLoading(id);
    try {
      await approveCompany(id);
      setPendingCompanies((prev) => prev.filter((c) => (c.id ?? c.companyId) !== id));
      showToast("Company approved successfully ✓");
    } catch { showToast("Failed to approve company", "error"); }
    finally { setActionLoading(null); }
  };

  const handleRejectCompany = async (id, reason) => {
    setActionLoading(id);
    setRejectModal(null);
    try {
      await rejectCompany(id, reason);
      setPendingCompanies((prev) => prev.filter((c) => (c.id ?? c.companyId) !== id));
      showToast("Company rejected");
    } catch { showToast("Failed to reject company", "error"); }
    finally { setActionLoading(null); }
  };

  // ── Category actions ───────────────────────────────────────────────────
  const handleAddCategory = async (name) => {
    setCategoryModal(null);
    try {
      await addCategory(name);
      await loadData();
      showToast("Category added ✓");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.title ||
        "Failed to add category";
      showToast(message, "error");
    }
  };

  const handleEditCategory = async (id, name) => {
    setCategoryModal(null);
    try {
      await updateCategory(id, name);
      await loadData();
      showToast("Category updated ✓");
    } catch { showToast("Failed to update category", "error"); }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => (c.id ?? c.categoryId) !== id));
      showToast("Category deleted");
    } catch { showToast("Failed to delete category", "error"); }
  };

  const handleAddSkill = async (name) => {
    setSkillModal(false);
    try {
      await addSkill(name);
      const updatedSkills = await getAllSkills();
      setSkills(Array.isArray(updatedSkills) ? updatedSkills : []);
      showToast("Skill added ✓");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.title ||
        "Failed to add skill";
      showToast(message, "error");
    }
  };

  const handleDeleteSkill = async (id) => {
    if (!id) {
      return;
    }

    try {
      await deleteSkill(id);
      setSkills((prev) => prev.filter((skill) => (skill.id ?? skill.skillId) !== id));
      showToast("Skill deleted");
    } catch {
      showToast("Failed to delete skill", "error");
    }
  };

  const getIsUserLocked = (userId) => {
    if (!Array.isArray(users)) return false;
    const u = users.find((x) => x.id === userId);
    return u ? (u.isLocked ?? u.lockoutEnabled ?? false) : false;
  };

  const handleLockUnlock = async (userId) => {
    try {
      await lockUnlockUser(userId);
      const wasLocked = getIsUserLocked(userId);
      showToast(wasLocked ? "User unlocked — they can sign in again ✓" : "User locked — sign-in blocked ✓");
      const updatedUsers = await getAllUsers();
      setUsers(Array.isArray(updatedUsers) ? updatedUsers : []);
    } catch {
      showToast("Failed to change lock status", "error");
    }
  };

  const filteredUsers = React.useMemo(() => {
    const search = userSearch.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = userRoleFilter === "All" || (user.userType ?? user.role) === userRoleFilter;
      if (!matchesRole) return false;
      if (!search) return true;
      const haystack = [
        user.firstName, user.lastName, user.userName, user.email,
        user.headline, user.location,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(search);
    });
  }, [users, userSearch, userRoleFilter]);

  const userMetrics = React.useMemo(() => ({
    total: users.length,
    seekers: users.filter((u) => (u.userType ?? u.role) === "JobSeeker").length,
    employers: users.filter((u) => (u.userType ?? u.role) === "Employer").length,
    admins: users.filter((u) => (u.userType ?? u.role) === "Admin").length,
    locked: users.filter((u) => u.isLocked ?? u.lockoutEnabled ?? false).length,
    withCV: users.filter((u) => u.hasCV).length,
    avgProfileCompletion: users.length
      ? Math.round(users.reduce((sum, u) => sum + (u.profileCompletion ?? 0), 0) / users.length)
      : 0,
  }), [users]);

  const handleRegisterAdmin = async (e) => {
    e.preventDefault();
    if (adminForm.password !== adminForm.confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    setAdminFormLoading(true);
    try {
      await registerAdmin({
        firstName: adminForm.firstName,
        lastName: adminForm.lastName,
        email: adminForm.email,
        password: adminForm.password,
        confirmPassword: adminForm.confirmPassword,
      });
      showToast("Admin account registered successfully ✓");
      setAdminForm({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "" });
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || "Failed to register admin";
      showToast(msg, "error");
    } finally {
      setAdminFormLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F9F6F3] flex">
      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#4242425C]/20 flex flex-col transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:flex`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[#4242425C]/20 flex-shrink-0">
          <span className="text-[22px] text-[#D3571F] font-alatsi tracking-widest">SEARCHERA</span>
          <span className="ml-2 text-[10px] font-poppins-semibold text-[#D3571F]/60 uppercase tracking-widest mt-1">Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-poppins-medium transition-all text-left
                ${activeTab === tab.id
                  ? "bg-[#FFECE3] text-[#D3571F]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-[#D3571F]"}`}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.id === "jobs" && pendingJobs.length > 0 && (
                <span className="ml-auto bg-[#D3571F] text-white text-[10px] font-poppins-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {pendingJobs.length}
                </span>
              )}
              {tab.id === "companies" && pendingCompanies.length > 0 && (
                <span className="ml-auto bg-[#D3571F] text-white text-[10px] font-poppins-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {pendingCompanies.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-[#4242425C]/20">
          <button
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("role");
              localStorage.removeItem("userType");
              localStorage.removeItem("isAdmin");
              window.location.href = "/login";
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-poppins-medium text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <span>⇠</span> Logout
          </button>
        </div>
      </aside>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-[#4242425C]/20 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden text-gray-500 hover:text-[#D3571F] transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="font-poppins-semibold text-[#1a1a1a] text-base leading-tight">
                {tabs.find((t) => t.id === activeTab)?.label}
              </h1>
              <p className="text-xs text-gray-400 font-poppins">Admin Dashboard</p>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-poppins-medium text-gray-500 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <span className={loading ? "animate-spin" : ""}>⟳</span>
            Refresh
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-[#FFECE3] border-t-[#D3571F] rounded-full animate-spin" />
                <p className="text-sm font-poppins text-gray-400">Loading data…</p>
              </div>
            </div>
          ) : (
            <>
              {/* ── OVERVIEW ── */}
              {activeTab === "overview" && (
                <div className="space-y-8">
                  <div>
                    <SectionHeader title="Platform Pulse" />
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                      <StatCard icon="👥" label="Total Users" value={dashboardStats?.totalUsers ?? users.length} sub={`${userMetrics.seekers} seekers · ${userMetrics.employers} employers`} />
                      <StatCard icon="📋" label="Applications" value={dashboardStats?.totalApplications ?? "—"} sub={`${dashboardStats?.applicationsByStatus?.pendingReview ?? 0} awaiting review`} />
                      <StatCard icon="🎤" label="Interviews Done" value={dashboardStats?.interviewsCompleted ?? "—"} sub="AI sessions completed" />
                      <StatCard icon="🎯" label="Avg Match Score" value={dashboardStats?.averageMatchScore != null ? `${dashboardStats.averageMatchScore}%` : "—"} sub="Across screened apps" />
                      <StatCard icon="📈" label="New This Week" value={dashboardStats?.newUsers7d ?? "—"} sub={`${dashboardStats?.newUsers30d ?? 0} in last 30 days`} />
                      <StatCard icon="📄" label="CVs Uploaded" value={dashboardStats?.usersWithCV ?? userMetrics.withCV} sub={`of ${users.length} users`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <StatCard icon="💼" label="Pending Jobs"      value={pendingJobs.length}      sub="Awaiting review"   accent />
                    <StatCard icon="🏢" label="Pending Companies" value={pendingCompanies.length} sub="Awaiting review" />
                    <StatCard icon="🚫" label="Locked Users"      value={userMetrics.locked}      sub="Blocked from login" />
                    <StatCard icon="🏷️" label="Categories"        value={categories.length}       sub="Active categories" />
                    <StatCard icon="✨" label="Skills"             value={skills.length}           sub="Available skills" />
                  </div>

                  {/* Quick action tiles */}
                  <div>
                    <SectionHeader title="Quick Actions" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: "Review Pending Jobs",       sub: `${pendingJobs.length} jobs need attention`,       tab: "jobs",       icon: "💼", urgent: pendingJobs.length > 0 },
                        { label: "Review Pending Companies",  sub: `${pendingCompanies.length} companies need review`, tab: "companies",  icon: "🏢", urgent: pendingCompanies.length > 0 },
                        { label: "Manage Categories",         sub: `${categories.length} categories active`,           tab: "categories", icon: "🏷️", urgent: false },
                        { label: "Manage Skills",             sub: `${skills.length} skills available`,                tab: "skills",     icon: "✨", urgent: false },
                      ].map((action) => (
                        <button
                          key={action.tab}
                          onClick={() => setActiveTab(action.tab)}
                          className={`text-left p-5 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5 group
                            ${action.urgent ? "bg-white border-[#E46E39]/30" : "bg-white border-[#4242425C]/20"}`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-2xl">{action.icon}</span>
                            {action.urgent && (
                              <span className="w-2 h-2 bg-[#D3571F] rounded-full mt-1 animate-pulse" />
                            )}
                          </div>
                          <p className="font-poppins-semibold text-[#1a1a1a] mt-3 text-sm">{action.label}</p>
                          <p className="text-xs text-gray-500 font-poppins mt-1">{action.sub}</p>
                          <div className="mt-3 text-[#D3571F] text-xs font-poppins-medium group-hover:underline">View →</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Analytics Section on Overview */}
                  <div className="space-y-6">
                    <SectionHeader title="Analytics Overview" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Donut Chart: Employment Rate */}
                      <div className="flex flex-col items-center justify-center p-6 bg-white border border-[#4242425C]/20 rounded-2xl shadow-sm">
                        <h3 className="font-poppins-semibold text-[#1a1a1a] text-sm mb-4">Employment Rate</h3>
                        <div className="relative w-36 h-36 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="72" cy="72" r="40" className="stroke-[#FFECE3] fill-transparent" strokeWidth="10" />
                            <circle cx="72" cy="72" r="40" className="stroke-[#D3571F] fill-transparent transition-all duration-500" strokeWidth="10" strokeDasharray={2 * Math.PI * 40} strokeDashoffset={2 * Math.PI * 40 - (employmentRate / 100) * (2 * Math.PI * 40)} strokeLinecap="round" />
                          </svg>
                          <span className="absolute text-2xl font-poppins-bold text-[#1a1a1a]">{employmentRate}%</span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-poppins mt-4 text-center">Job seekers placed via accepted applications.</p>
                      </div>

                      {/* Applications Distribution Bar Chart */}
                      <div className="p-6 bg-white border border-[#4242425C]/20 rounded-2xl shadow-sm md:col-span-2 flex flex-col justify-between">
                        <h3 className="font-poppins-semibold text-[#1a1a1a] text-sm mb-4">Applications Distribution</h3>
                        {applicationsDistribution.length === 0 ? (
                          <div className="h-40 flex items-center justify-center text-xs font-poppins text-gray-300">No applications data</div>
                        ) : (
                          <div className="h-40 flex items-end gap-4 px-2">
                            {applicationsDistribution.map((item, idx) => {
                              const maxVal = Math.max(...applicationsDistribution.map(d => d.value), 1);
                              const heightPct = (item.value / maxVal) * 100;
                              return (
                                <div key={idx} className="flex-1 flex flex-col items-center group relative min-w-0">
                                  {/* Tooltip */}
                                  <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all bg-[#1a1a1a] text-white text-[10px] font-poppins px-2 py-1 rounded shadow-md pointer-events-none z-10 whitespace-nowrap">
                                    {item.value} apps
                                  </div>
                                  <div 
                                    className="w-full rounded-t-lg bg-[#FFECE3] group-hover:bg-[#FFDCC8] border-t-2 border-[#D3571F] transition-all duration-500"
                                    style={{ height: `${heightPct}%` }}
                                  />
                                  <span className="text-[9px] font-poppins text-gray-400 mt-2 truncate w-full text-center" title={item.label}>
                                    {item.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Top Required Skills Comparison Chart */}
                    <div className="p-6 bg-white border border-[#4242425C]/20 rounded-2xl shadow-sm space-y-4">
                      <h3 className="font-poppins-semibold text-[#1a1a1a] text-sm">Top Required Skills</h3>
                      {topSkillsList.length === 0 ? (
                        <p className="text-xs text-gray-300 font-poppins text-center py-4">No skills data available</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                          {topSkillsList.slice(0, 8).map((item, idx) => {
                            const maxVal = Math.max(...topSkillsList.map(d => d.count), 1);
                            const widthPct = (item.count / maxVal) * 100;
                            return (
                              <div key={idx} className="space-y-1.5">
                                <div className="flex justify-between text-xs font-poppins">
                                  <span className="font-poppins-medium text-gray-700">{item.name}</span>
                                  <span className="text-gray-400 font-poppins-semibold">{item.count} jobs</span>
                                </div>
                                <div className="h-2.5 w-full bg-[#F9F6F3] rounded-full overflow-hidden border border-gray-100">
                                  <div 
                                    className="h-full bg-gradient-to-r from-[#FF9768] to-[#D3571F] rounded-full transition-all duration-500"
                                    style={{ width: `${widthPct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent signups */}
                  {(dashboardStats?.recentSignups?.length ?? 0) > 0 && (
                    <div>
                      <SectionHeader title="Newest Members" count={dashboardStats.recentSignups.length} />
                      <div className="bg-white border border-[#4242425C]/20 rounded-2xl divide-y divide-[#4242425C]/10 overflow-hidden">
                        {dashboardStats.recentSignups.map((signup) => (
                          <button
                            key={signup.id}
                            onClick={() => setActiveTab("users")}
                            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 bg-[#FFECE3] rounded-full flex items-center justify-center text-[11px] font-poppins-bold text-[#D3571F] flex-shrink-0">
                                {initialsOf(signup.name, signup.email)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-poppins-medium text-[#1a1a1a] truncate">{signup.name}</p>
                                <p className="text-xs text-gray-400 font-poppins truncate">{signup.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="hidden sm:block text-xs text-gray-400 font-poppins">{formatDate(signup.createdAt)}</span>
                              <Badge color={signup.role === "Admin" ? "purple" : signup.role === "Employer" ? "blue" : "orange"}>{signup.role}</Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent pending snapshot */}
                  {(pendingJobs.length > 0 || pendingCompanies.length > 0) && (
                    <div>
                      <SectionHeader title="Needs Attention" />
                      <div className="bg-white border border-[#4242425C]/20 rounded-2xl divide-y divide-[#4242425C]/10 overflow-hidden">
                        {pendingJobs.slice(0, 3).map((job) => {
                          const id = job.id ?? job.jobId;
                          return (
                            <div key={id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-[#FFECE3] rounded-lg flex items-center justify-center text-sm">💼</div>
                                <div>
                                  <p className="text-sm font-poppins-medium text-[#1a1a1a]">{job.title ?? "Untitled Job"}</p>
                                  <p className="text-xs text-gray-400 font-poppins">{job.location ?? "—"}</p>
                                </div>
                              </div>
                              <Badge color="orange">Pending Job</Badge>
                            </div>
                          );
                        })}
                        {pendingCompanies.slice(0, 3).map((co) => {
                          const id = co.id ?? co.companyId;
                          return (
                            <div key={id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-[#FFECE3] rounded-lg flex items-center justify-center text-sm">🏢</div>
                                <div>
                                  <p className="text-sm font-poppins-medium text-[#1a1a1a]">{co.companyName ?? "Unnamed Company"}</p>
                                  <p className="text-xs text-gray-400 font-poppins">{co.industry ?? "—"}</p>
                                </div>
                              </div>
                              <Badge color="orange">Pending Company</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── PENDING JOBS ── */}
              {activeTab === "jobs" && (
                <div>
                  <SectionHeader title="Pending Jobs" count={pendingJobs.length} />
                  {pendingJobs.length === 0 ? (
                    <EmptyState icon="💼" message="No pending jobs — you're all caught up!" />
                  ) : (
                    <div className="space-y-3">
                      {pendingJobs.map((job) => {
                        const id = job.id ?? job.jobId;
                        const isLoading = actionLoading === id;
                        return (
                          <div key={id} className="bg-white border border-[#4242425C]/20 rounded-2xl p-5 hover:shadow-sm transition-all">
                            <div className="flex items-start justify-between gap-4">
                              <button
                                type="button"
                                onClick={() => setJobDetailsModal({ id, fallback: job })}
                                className="flex-1 min-w-0 text-left"
                              >
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h3 className="font-poppins-semibold text-[#1a1a1a] text-sm hover:text-[#D3571F] transition-colors">{job.title ?? "Untitled"}</h3>
                                  <Badge color="orange">Pending</Badge>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-poppins text-gray-500 mt-1">
                                  {job.location  && <span>📍 {job.location}</span>}
                                  {job.salaryRange && <span>💰 {job.salaryRange}</span>}
                                  {job.jobType !== undefined && <span>⏱ Type {job.jobType}</span>}
                                  {job.deadline  && <span>📅 Deadline: {new Date(job.deadline).toLocaleDateString()}</span>}
                                </div>
                                {job.summary && (
                                  <p className="text-xs text-gray-600 font-poppins mt-2 line-clamp-2">{job.summary}</p>
                                )}
                              </button>
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  disabled={isLoading}
                                  onClick={() => setJobDetailsModal({ id, fallback: job })}
                                  className="px-4 py-2 bg-[#FFECE3] hover:bg-[#FFDCC8] text-[#D3571F] text-xs font-poppins-medium rounded-xl transition-colors disabled:opacity-50"
                                >
                                  View Details
                                </button>
                                <button
                                  disabled={isLoading}
                                  onClick={() => handleApproveJob(id)}
                                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-poppins-medium rounded-xl transition-colors disabled:opacity-50"
                                >
                                  {isLoading ? "…" : "Approve"}
                                </button>
                                <button
                                  disabled={isLoading}
                                  onClick={() => setRejectModal({ type: "Job", id, name: job.title ?? "this job" })}
                                  className="px-4 py-2 bg-red-100 hover:bg-red-500 hover:text-white text-red-500 text-xs font-poppins-medium rounded-xl transition-colors disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── PENDING COMPANIES ── */}
              {activeTab === "companies" && (
                <div>
                  <SectionHeader title="Pending Companies" count={pendingCompanies.length} />
                  {pendingCompanies.length === 0 ? (
                    <EmptyState icon="🏢" message="No pending companies — you're all caught up!" />
                  ) : (
                    <div className="space-y-3">
                      {pendingCompanies.map((co) => {
                        const id = co.id ?? co.companyId;
                        const isLoading = actionLoading === id;
                        return (
                          <div key={id} className="bg-white border border-[#4242425C]/20 rounded-2xl p-5 hover:shadow-sm transition-all">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                {co.logoUrl ? (
                                  <img src={co.logoUrl} alt={co.companyName} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-100" />
                                ) : (
                                  <div className="w-12 h-12 bg-[#FFECE3] rounded-xl flex items-center justify-center text-xl flex-shrink-0">🏢</div>
                                )}
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <h3 className="font-poppins-semibold text-[#1a1a1a] text-sm">{co.companyName ?? "Unnamed"}</h3>
                                    <Badge color="orange">Pending</Badge>
                                  </div>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-poppins text-gray-500">
                                    {co.industry && <span>🏭 {co.industry}</span>}
                                    {co.website  && <a href={co.website} target="_blank" rel="noreferrer" className="text-[#D3571F] hover:underline truncate max-w-[180px]">🔗 {co.website}</a>}
                                  </div>
                                  {co.description && (
                                    <p className="text-xs text-gray-600 font-poppins mt-1.5 line-clamp-2">{co.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  disabled={isLoading}
                                  onClick={() => handleApproveCompany(id)}
                                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-poppins-medium rounded-xl transition-colors disabled:opacity-50"
                                >
                                  {isLoading ? "…" : "Approve"}
                                </button>
                                <button
                                  disabled={isLoading}
                                  onClick={() => setRejectModal({ type: "Company", id, name: co.companyName ?? "this company" })}
                                  className="px-4 py-2 bg-red-100 hover:bg-red-500 hover:text-white text-red-500 text-xs font-poppins-medium rounded-xl transition-colors disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── CATEGORIES ── */}
              {activeTab === "categories" && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <SectionHeader title="Categories" count={categories.length} />
                    <button
                      onClick={() => setCategoryModal({})}
                      className="flex items-center gap-2 px-4 py-2 bg-[#D3571F] text-white text-sm font-poppins-medium rounded-xl hover:bg-[#B8461A] transition-colors"
                    >
                      <span>+</span> Add Category
                    </button>
                  </div>
                  {categories.length === 0 ? (
                    <EmptyState icon="🏷️" message="No categories yet. Add one to get started." />
                  ) : (
                    <div className="bg-white border border-[#4242425C]/20 rounded-2xl overflow-hidden">
                      <div className="grid grid-cols-[1fr_auto] gap-0 divide-y divide-[#4242425C]/10">
                        {categories.map((cat, i) => {
                          const id = cat.id ?? cat.categoryId;
                          return (
                            <React.Fragment key={id ?? i}>
                              <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                                <div className="w-7 h-7 bg-[#FFECE3] rounded-lg flex items-center justify-center text-[11px] text-[#D3571F] font-poppins-bold flex-shrink-0">
                                  {(i + 1).toString().padStart(2, "0")}
                                </div>
                                <span className="text-sm font-poppins-medium text-[#1a1a1a]">{cat.categoryName}</span>
                              </div>
                              <div className="flex items-center gap-2 px-5 py-3.5 hover:bg-gray-50 transition-colors justify-end">
                                <button
                                  onClick={() => setCategoryModal({ category: cat })}
                                  className="text-xs font-poppins-medium text-gray-500 hover:text-[#D3571F] transition-colors px-2 py-1 rounded-lg hover:bg-[#FFECE3]"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(id)}
                                  className="text-xs font-poppins-medium text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "skills" && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <SectionHeader title="Skills" count={skills.length} />
                    <button
                      onClick={() => setSkillModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#D3571F] text-white text-sm font-poppins-medium rounded-xl hover:bg-[#B8461A] transition-colors"
                    >
                      <span>+</span> Add Skill
                    </button>
                  </div>

                  {skills.length === 0 ? (
                    <EmptyState icon="✨" message="No skills yet. Add one to get started." />
                  ) : (
                    <div className="bg-white border border-[#4242425C]/20 rounded-2xl overflow-hidden">
                      <div className="grid grid-cols-[1fr_auto] gap-0 divide-y divide-[#4242425C]/10">
                        {skills.map((skill, i) => {
                          const id = skill.id ?? skill.skillId;
                          return (
                            <React.Fragment key={id ?? i}>
                              <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                                <div className="w-7 h-7 bg-[#FFECE3] rounded-lg flex items-center justify-center text-[11px] text-[#D3571F] font-poppins-bold flex-shrink-0">
                                  {(i + 1).toString().padStart(2, "0")}
                                </div>
                                <span className="text-sm font-poppins-medium text-[#1a1a1a]">{skill.skillName}</span>
                              </div>
                              <div className="flex items-center gap-2 px-5 py-3.5 hover:bg-gray-50 transition-colors justify-end">
                                <button
                                  onClick={() => handleDeleteSkill(id)}
                                  className="text-xs font-poppins-medium text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── MANAGE USERS ── */}
              {activeTab === "users" && (
                <div className="space-y-6">
                  {/* User Sub-Tabs */}
                  <div className="flex border-b border-[#4242425C]/25">
                    {[
                      { id: "accounts", label: "User Accounts" },
                      { id: "seekers",  label: "Job Seekers" },
                      { id: "employers", label: "Employers" },
                      { id: "register", label: "Add Admin User" }
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setUserSubTab(st.id)}
                        className={`px-6 py-3 text-sm font-poppins-medium border-b-2 transition-all text-gray-600 -mb-[2px]
                          ${userSubTab === st.id ? "border-[#D3571F] text-[#D3571F] font-poppins-semibold" : "border-transparent hover:text-[#D3571F]"}`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* User Accounts List */}
                  {userSubTab === "accounts" && (
                    <div className="space-y-4">
                      {/* Summary strip */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[
                          { label: "All Users", value: userMetrics.total, icon: "👥" },
                          { label: "Job Seekers", value: userMetrics.seekers, icon: "🙋" },
                          { label: "Employers", value: userMetrics.employers, icon: "🏢" },
                          { label: "Admins", value: userMetrics.admins, icon: "🛡️" },
                          { label: "With CV", value: userMetrics.withCV, icon: "📄" },
                          { label: "Locked", value: userMetrics.locked, icon: "🚫" },
                        ].map((chip) => (
                          <div key={chip.label} className="bg-white border border-[#4242425C]/20 rounded-xl px-4 py-3 flex items-center gap-3">
                            <span className="text-lg">{chip.icon}</span>
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-poppins-medium">{chip.label}</p>
                              <p className="text-base font-poppins-bold text-[#1a1a1a] leading-tight">{chip.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Search + role filter */}
                      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        <div className="relative flex-1 max-w-sm">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-sm">🔍</span>
                          <input
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            placeholder="Search by name, email, headline…"
                            className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm font-poppins placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D3571F]/40"
                          />
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {["All", "JobSeeker", "Employer", "Admin"].map((role) => (
                            <button
                              key={role}
                              onClick={() => setUserRoleFilter(role)}
                              className={`px-3 py-1.5 rounded-full text-xs font-poppins-medium transition-colors border
                                ${userRoleFilter === role
                                  ? "bg-[#D3571F] text-white border-[#D3571F]"
                                  : "bg-white text-gray-500 border-gray-200 hover:border-[#E46E39]/40 hover:text-[#D3571F]"}`}
                            >
                              {role}
                            </button>
                          ))}
                        </div>
                        <span className="ml-auto text-xs text-gray-400 font-poppins">
                          Showing {filteredUsers.length} of {users.length}
                        </span>
                      </div>

                      {filteredUsers.length === 0 ? (
                        <EmptyState icon="👤" message={userSearch || userRoleFilter !== "All" ? "No users match your search." : "No users found."} />
                      ) : (
                        <div className="bg-white border border-[#4242425C]/20 rounded-2xl overflow-x-auto shadow-sm">
                          <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                              <tr className="border-b border-[#4242425C]/10 text-xs font-poppins-semibold uppercase tracking-wider text-gray-400 bg-gray-50/50">
                                <th className="px-5 py-4">User</th>
                                <th className="px-4 py-4">Role</th>
                                <th className="px-4 py-4">Apps</th>
                                <th className="px-4 py-4">Interviews</th>
                                <th className="px-4 py-4">Avg Match</th>
                                <th className="px-4 py-4">Profile</th>
                                <th className="px-4 py-4">Joined</th>
                                <th className="px-4 py-4">Status</th>
                                <th className="px-4 py-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#4242425C]/10 text-sm font-poppins">
                              {filteredUsers.map((user) => {
                                const isLocked = user.isLocked ?? user.lockoutEnabled ?? false;
                                const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.userName || "Unnamed User";
                                const completion = user.profileCompletion ?? 0;
                                return (
                                  <tr key={user.id} className="hover:bg-gray-50/70 transition-colors align-middle">
                                    <td className="px-5 py-4 min-w-[200px]">
                                      <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-[#FFECE3] rounded-full flex items-center justify-center text-xs font-poppins-bold text-[#D3571F] flex-shrink-0">
                                          {initialsOf(name, user.email)}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-poppins-medium text-[#1a1a1a] truncate">{name}</p>
                                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4">
                                      <Badge color={isLocked ? "gray" : (user.userType ?? user.role) === "Admin" ? "purple" : (user.userType ?? user.role) === "Employer" ? "blue" : "orange"}>
                                        {user.userType ?? user.role ?? "JobSeeker"}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-4">
                                      <span className="font-poppins-semibold text-[#1a1a1a]">{user.applicationCount ?? 0}</span>
                                      {(user.acceptedCount ?? 0) > 0 && (
                                        <span className="ml-1 text-xs text-green-600 font-poppins">({user.acceptedCount}✓)</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 text-gray-600">{user.interviewCount ?? 0}</td>
                                    <td className="px-4 py-4">
                                      {user.averageMatchScore != null ? (
                                        <span className={`text-xs font-poppins-semibold px-2 py-1 rounded-lg ${user.averageMatchScore >= 70 ? "bg-green-50 text-green-700" : user.averageMatchScore >= 40 ? "bg-[#FFECE3] text-[#D3571F]" : "bg-red-50 text-red-600"}`}>
                                          {user.averageMatchScore}%
                                        </span>
                                      ) : (
                                        <span className="text-gray-300 text-xs">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 min-w-[120px]">
                                      <div className="flex items-center gap-2">
                                        <div className="h-2 w-16 bg-gray-100 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full ${completion >= 70 ? "bg-green-500" : completion >= 40 ? "bg-[#FF9768]" : "bg-red-400"}`}
                                            style={{ width: `${completion}%` }}
                                          />
                                        </div>
                                        <span className="text-xs text-gray-400 font-poppins">{completion}%</span>
                                        {user.hasCV && <span title="CV on file">📄</span>}
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 text-gray-500 whitespace-nowrap">{formatDate(user.createdAt)}</td>
                                    <td className="px-4 py-4">
                                      {isLocked ? <Badge color="red">Locked</Badge> : <Badge color="green">Active</Badge>}
                                    </td>
                                    <td className="px-4 py-4 text-right whitespace-nowrap">
                                      <button
                                        onClick={() => setUserDetailsModalId(user.id)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-poppins-medium bg-[#FFECE3] text-[#D3571F] hover:bg-[#FFDCC8] transition-colors mr-2"
                                      >
                                        View
                                      </button>
                                      <button
                                        onClick={() => handleLockUnlock(user.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-poppins-medium transition-colors
                                          ${isLocked 
                                            ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200" 
                                            : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"}`}
                                      >
                                        {isLocked ? "Unlock" : "Lock"}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Job Seekers Profiles */}
                  {userSubTab === "seekers" && (
                    <div className="space-y-4">
                      <SectionHeader title="Job Seeker Profiles" count={jobSeekers.length} />
                      {jobSeekers.length === 0 ? (
                        <EmptyState icon="👤" message="No job seekers registered." />
                      ) : (
                        <div className="bg-white border border-[#4242425C]/20 rounded-2xl overflow-x-auto shadow-sm">
                          <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                              <tr className="border-b border-[#4242425C]/10 text-xs font-poppins-semibold uppercase tracking-wider text-gray-400 bg-gray-50/50">
                                <th className="px-6 py-4">Seeker</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Applications</th>
                                <th className="px-6 py-4">Profile Strength</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#4242425C]/10 text-sm font-poppins">
                              {jobSeekers.map((seeker) => {
                                const isLocked = seeker.isLocked ?? seeker.lockoutEnabled ?? getIsUserLocked(seeker.id);
                                const completion = seeker.profileCompletion ?? 0;
                                return (
                                  <tr key={seeker.id} className="hover:bg-gray-50/70 transition-colors">
                                    <td className="px-6 py-4 font-poppins-medium text-[#1a1a1a]">
                                      <div className="flex items-center gap-3">
                                        {seeker.photoUrl ? (
                                          <img src={seeker.photoUrl} alt="seeker" className="w-8 h-8 rounded-full object-cover border border-gray-100 flex-shrink-0" />
                                        ) : (
                                          <div className="w-8 h-8 bg-[#FFECE3] rounded-full flex items-center justify-center text-xs font-poppins-bold text-[#D3571F] flex-shrink-0">
                                            {(seeker.firstName?.slice(0, 1) ?? seeker.email?.slice(0, 1) ?? "S").toUpperCase()}
                                          </div>
                                        )}
                                        <div className="min-w-0">
                                          <p className="truncate">{`${seeker.firstName ?? ""} ${seeker.lastName ?? ""}`.trim() || seeker.userName || "Unnamed Seeker"}</p>
                                          <p className="text-xs text-gray-400 font-poppins truncate">{seeker.headline || seeker.location || seeker.email}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{seeker.email}</td>
                                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                      <span className="font-poppins-semibold text-[#1a1a1a]">{seeker.applicationCount ?? 0}</span> apps
                                      <span className="block text-[11px] text-gray-400">
                                        {seeker.acceptedCount ?? 0} accepted · {seeker.rejectedCount ?? 0} rejected
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 min-w-[130px]">
                                      <div className="flex items-center gap-2">
                                        <div className="h-2 w-14 bg-gray-100 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full ${completion >= 70 ? "bg-green-500" : completion >= 40 ? "bg-[#FF9768]" : "bg-red-400"}`}
                                            style={{ width: `${completion}%` }}
                                          />
                                        </div>
                                        <span className="text-xs text-gray-400 font-poppins">{completion}%</span>
                                      </div>
                                      <span className="block text-[11px] text-gray-400 mt-1">
                                        {seeker.skillCount ?? 0} skills · {seeker.hasCV ? "CV ✓" : "no CV"}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                      {isLocked ? (
                                        <Badge color="red">Locked</Badge>
                                      ) : (
                                        <Badge color="green">Active</Badge>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                      <button
                                        onClick={() => setUserDetailsModalId(seeker.id)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-poppins-medium bg-[#FFECE3] text-[#D3571F] hover:bg-[#FFDCC8] transition-colors mr-2"
                                      >
                                        View
                                      </button>
                                      <button
                                        onClick={() => handleLockUnlock(seeker.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-poppins-medium transition-colors
                                          ${isLocked 
                                            ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200" 
                                            : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"}`}
                                      >
                                        {isLocked ? "Unlock" : "Lock"}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Employers Profiles */}
                  {userSubTab === "employers" && (
                    <div className="space-y-4">
                      <SectionHeader title="Employer Profiles" count={employers.length} />
                      {employers.length === 0 ? (
                        <EmptyState icon="🏢" message="No employers registered." />
                      ) : (
                        <div className="bg-white border border-[#4242425C]/20 rounded-2xl overflow-x-auto shadow-sm">
                          <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                              <tr className="border-b border-[#4242425C]/10 text-xs font-poppins-semibold uppercase tracking-wider text-gray-400 bg-gray-50/50">
                                <th className="px-6 py-4">Employer</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Company</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#4242425C]/10 text-sm font-poppins">
                              {employers.map((emp) => {
                                const isLocked = emp.isLocked ?? emp.lockoutEnabled ?? getIsUserLocked(emp.id);
                                return (
                                  <tr key={emp.id} className="hover:bg-gray-50/70 transition-colors">
                                    <td className="px-6 py-4 font-poppins-medium text-[#1a1a1a]">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-[#FFECE3] rounded-lg flex items-center justify-center text-sm flex-shrink-0">
                                          🏢
                                        </div>
                                        <div className="min-w-0">
                                          <p className="truncate">{`${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim() || emp.userName || "Unnamed Employer"}</p>
                                          <p className="text-xs text-gray-400 font-poppins truncate">{emp.headline || "—"}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{emp.email}</td>
                                    <td className="px-6 py-4 text-gray-500">
                                      {emp.companyName ? (
                                        <Badge color="orange">{emp.companyName}</Badge>
                                      ) : (
                                        <span className="text-gray-300 italic">No company linked</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">📍 {emp.location || "—"}</td>
                                    <td className="px-6 py-4">
                                      {isLocked ? (
                                        <Badge color="red">Locked</Badge>
                                      ) : (
                                        <Badge color="green">Active</Badge>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                      <button
                                        onClick={() => setUserDetailsModalId(emp.id)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-poppins-medium bg-[#FFECE3] text-[#D3571F] hover:bg-[#FFDCC8] transition-colors mr-2"
                                      >
                                        View
                                      </button>
                                      <button
                                        onClick={() => handleLockUnlock(emp.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-poppins-medium transition-colors
                                          ${isLocked 
                                            ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200" 
                                            : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"}`}
                                      >
                                        {isLocked ? "Unlock" : "Lock"}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Register Admin Form */}
                  {userSubTab === "register" && (
                    <div className="max-w-xl bg-white border border-[#4242425C]/20 rounded-2xl p-6 shadow-sm">
                      <h3 className="font-poppins-semibold text-[#1a1a1a] text-sm mb-4">Register New Admin Account</h3>
                      <form onSubmit={handleRegisterAdmin} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-poppins-medium text-gray-500 mb-1.5">First Name</label>
                            <input
                              type="text"
                              value={adminForm.firstName}
                              onChange={(e) => setAdminForm(prev => ({ ...prev, firstName: e.target.value }))}
                              required
                              placeholder="John"
                              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-poppins placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D3571F]/40"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-poppins-medium text-gray-500 mb-1.5">Last Name</label>
                            <input
                              type="text"
                              value={adminForm.lastName}
                              onChange={(e) => setAdminForm(prev => ({ ...prev, lastName: e.target.value }))}
                              required
                              placeholder="Doe"
                              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-poppins placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D3571F]/40"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-poppins-medium text-gray-500 mb-1.5">Email address</label>
                          <input
                            type="email"
                            value={adminForm.email}
                            onChange={(e) => setAdminForm(prev => ({ ...prev, email: e.target.value }))}
                            required
                            placeholder="admin@searchera.com"
                            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-poppins placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D3571F]/40"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-poppins-medium text-gray-500 mb-1.5">Password</label>
                            <input
                              type="password"
                              value={adminForm.password}
                              onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                              required
                              placeholder="••••••••"
                              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-poppins placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D3571F]/40"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-poppins-medium text-gray-500 mb-1.5">Confirm Password</label>
                            <input
                              type="password"
                              value={adminForm.confirmPassword}
                              onChange={(e) => setAdminForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              required
                              placeholder="••••••••"
                              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-poppins placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D3571F]/40"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={adminFormLoading}
                          className="w-full bg-[#D3571F] text-white py-2.5 rounded-xl text-sm font-poppins-medium hover:bg-[#B8461A] transition-colors disabled:opacity-50"
                        >
                          {adminFormLoading ? "Creating account…" : "Register Admin"}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* ── ANALYTICS ── */}
              {activeTab === "analytics" && (
                <div className="space-y-8">
                  <SectionHeader title="System Analytics & Metrics" />

                  {/* Screening quality stat strip */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon="🎯" label="Avg Screening Score" value={screeningQuality?.average != null ? `${screeningQuality.average}%` : "—"} sub={`${screeningQuality?.scoredApplications ?? 0} scored apps`} accent />
                    <StatCard icon="⬆️" label="Best Match" value={screeningQuality?.max != null ? `${screeningQuality.max}%` : "—"} sub="Highest AI score" />
                    <StatCard icon="⬇️" label="Lowest Match" value={screeningQuality?.min != null ? `${screeningQuality.min}%` : "—"} sub="Weakest AI score" />
                    <StatCard
                      icon="✅"
                      label="Strong Fits"
                      value={screeningQuality?.tiers?.find((t) => t.label === "Strong")?.value ?? 0}
                      sub={`of ${screeningQuality?.scoredApplications ?? 0} screened`}
                    />
                  </div>

                  {/* Fit tier breakdown */}
                  {(screeningQuality?.tiers ?? []).some((t) => t.value > 0) && (
                    <div className="p-6 bg-white border border-[#4242425C]/20 rounded-2xl shadow-sm">
                      <h3 className="font-poppins-semibold text-[#1a1a1a] text-sm mb-5">Candidate Fit Tiers</h3>
                      <div className="flex h-6 w-full rounded-full overflow-hidden border border-gray-100">
                        {screeningQuality.tiers.map((tier) => {
                          const tierTotal = screeningQuality.tiers.reduce((s, t) => s + t.value, 0) || 1;
                          if (!tier.value) return null;
                          return (
                            <div
                              key={tier.label}
                              title={`${tier.label}: ${tier.value}`}
                              className="h-full flex items-center justify-center text-[10px] font-poppins-bold text-white transition-all duration-500"
                              style={{ width: `${(tier.value / tierTotal) * 100}%`, backgroundColor: tier.color }}
                            >
                              {Math.round((tier.value / tierTotal) * 100)}%
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-5 mt-3">
                        {screeningQuality.tiers.map((tier) => (
                          <div key={tier.label} className="flex items-center gap-2 text-xs font-poppins">
                            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: tier.color }} />
                            <span className="text-gray-600">{tier.label}</span>
                            <span className="text-gray-400 font-poppins-semibold">{tier.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Donut Chart: Employment Rate */}
                    <div className="flex flex-col items-center justify-center p-6 bg-white border border-[#4242425C]/20 rounded-2xl shadow-sm">
                      <h3 className="font-poppins-semibold text-[#1a1a1a] text-sm mb-4">Employment Rate</h3>
                      {employmentRate > 0 || (dashboardStats?.totalUsers ?? 0) > 0 ? (
                        <>
                          <div className="relative w-36 h-36 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="72" cy="72" r="40" className="stroke-[#FFECE3] fill-transparent" strokeWidth="10" />
                              <circle cx="72" cy="72" r="40" className="stroke-[#D3571F] fill-transparent transition-all duration-500" strokeWidth="10" strokeDasharray={2 * Math.PI * 40} strokeDashoffset={2 * Math.PI * 40 - (employmentRate / 100) * (2 * Math.PI * 40)} strokeLinecap="round" />
                            </svg>
                            <span className="absolute text-2xl font-poppins-bold text-[#1a1a1a]">{employmentRate}%</span>
                          </div>
                          <p className="text-[11px] text-gray-400 font-poppins mt-4 text-center">
                            {dashboardStats?.applicationsByStatus?.accepted ?? 0} of seekers placed via accepted applications.
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-300 font-poppins py-10">No placement data yet</p>
                      )}
                    </div>

                    {/* Applications Distribution Bar Chart */}
                    <div className="p-6 bg-white border border-[#4242425C]/20 rounded-2xl shadow-sm md:col-span-2 flex flex-col justify-between">
                      <h3 className="font-poppins-semibold text-[#1a1a1a] text-sm mb-4">Applications by Status</h3>
                      {applicationsDistribution.length === 0 ? (
                        <div className="h-40 flex items-center justify-center text-xs font-poppins text-gray-300">No applications data</div>
                      ) : (
                        <div className="h-40 flex items-end gap-4 px-2">
                          {applicationsDistribution.map((item, idx) => {
                            const maxVal = Math.max(...applicationsDistribution.map(d => d.value), 1);
                            const heightPct = (item.value / maxVal) * 100;
                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center group relative min-w-0">
                                <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all bg-[#1a1a1a] text-white text-[10px] font-poppins px-2 py-1 rounded shadow-md pointer-events-none z-10 whitespace-nowrap">
                                  {item.value} apps
                                </div>
                                <div 
                                  className="w-full rounded-t-lg bg-[#FFECE3] group-hover:bg-[#FFDCC8] border-t-2 border-[#D3571F] transition-all duration-500"
                                  style={{ height: `${heightPct}%` }}
                                />
                                <span className="text-[9px] font-poppins text-gray-400 mt-2 truncate w-full text-center" title={item.label}>
                                  {item.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Time series row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="p-6 bg-white border border-[#4242425C]/20 rounded-2xl shadow-sm">
                      <h3 className="font-poppins-semibold text-[#1a1a1a] text-sm mb-1">Applications Over Time</h3>
                      <p className="text-[11px] text-gray-400 font-poppins mb-4">Submissions in the last 6 months</p>
                      <MiniBarChart data={appsOverTime} suffix=" apps" />
                    </div>

                    <div className="p-6 bg-white border border-[#4242425C]/20 rounded-2xl shadow-sm">
                      <h3 className="font-poppins-semibold text-[#1a1a1a] text-sm mb-1">User Growth</h3>
                      <p className="text-[11px] text-gray-400 font-poppins mb-4">New registrations per month</p>
                      <MiniBarChart data={usersGrowth} valueKey="total" color="#8B7CF6" suffix=" signups" />
                    </div>
                  </div>

                  {/* Funnel + Job types row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="p-6 bg-white border border-[#4242425C]/20 rounded-2xl shadow-sm">
                      <h3 className="font-poppins-semibold text-[#1a1a1a] text-sm mb-1">Screening Funnel</h3>
                      <p className="text-[11px] text-gray-400 font-poppins mb-4">How applications progress through the pipeline</p>
                      <FunnelBars data={screeningFunnel} />
                    </div>

                    <div className="p-6 bg-white border border-[#4242425C]/20 rounded-2xl shadow-sm">
                      <h3 className="font-poppins-semibold text-[#1a1a1a] text-sm mb-4">Jobs by Type</h3>
                      <DonutChart data={jobTypeDist} />
                    </div>
                  </div>

                  {/* Top skills + Top jobs row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="p-6 bg-white border border-[#4242425C]/20 rounded-2xl shadow-sm space-y-4">
                      <h3 className="font-poppins-semibold text-[#1a1a1a] text-sm">Top Candidate Skills</h3>
                      <p className="text-[11px] text-gray-400 font-poppins -mt-2">Aggregated from seeker profiles & CVs</p>
                      {topSkillsList.length === 0 ? (
                        <p className="text-xs text-gray-300 font-poppins text-center py-4">No skills data available</p>
                      ) : (
                        <div className="space-y-4 pt-2">
                          {topSkillsList.slice(0, 8).map((item, idx) => {
                            const maxVal = Math.max(...topSkillsList.map(d => d.count), 1);
                            const widthPct = (item.count / maxVal) * 100;
                            return (
                              <div key={idx} className="space-y-1.5">
                                <div className="flex justify-between text-xs font-poppins">
                                  <span className="font-poppins-medium text-gray-700">{item.name}</span>
                                  <span className="text-gray-400 font-poppins-semibold">{item.count}</span>
                                </div>
                                <div className="h-2.5 w-full bg-[#F9F6F3] rounded-full overflow-hidden border border-gray-100">
                                  <div 
                                    className="h-full bg-gradient-to-r from-[#FF9768] to-[#D3571F] rounded-full transition-all duration-500"
                                    style={{ width: `${widthPct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="p-6 bg-white border border-[#4242425C]/20 rounded-2xl shadow-sm space-y-4">
                      <h3 className="font-poppins-semibold text-[#1a1a1a] text-sm">Most Applied Jobs</h3>
                      <p className="text-[11px] text-gray-400 font-poppins -mt-2">Where candidates are focusing</p>
                      {topJobs.length === 0 ? (
                        <p className="text-xs text-gray-300 font-poppins text-center py-4">No application data yet</p>
                      ) : (
                        <div className="divide-y divide-[#4242425C]/10">
                          {topJobs.map((job, idx) => (
                            <div key={job.id ?? idx} className="flex items-center gap-3 py-3">
                              <span className="w-7 h-7 rounded-lg bg-[#FFECE3] text-[#D3571F] text-[11px] font-poppins-bold flex items-center justify-center flex-shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-poppins-medium text-[#1a1a1a] truncate">{job.label}</p>
                                <p className="text-[11px] text-gray-400 font-poppins truncate">{job.companyName ?? "—"}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-poppins-bold text-[#D3571F]">{job.value}</p>
                                {job.avgMatchScore != null && (
                                  <p className="text-[10px] text-gray-400 font-poppins">avg {job.avgMatchScore}% match</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-sm font-poppins-medium transition-all
            ${toast.type === "error" ? "bg-red-500 text-white" : "bg-[#1a1a1a] text-white"}`}
        >
          <span>{toast.type === "error" ? "✕" : "✓"}</span>
          {toast.message}
        </div>
      )}

      {/* ── Job Details Modal ── */}
      {jobDetailsModal && (
        <JobDetailsModal
          jobId={jobDetailsModal.id}
          fallback={jobDetailsModal.fallback}
          actionLoading={actionLoading}
          onClose={() => setJobDetailsModal(null)}
          onApprove={() => {
            handleApproveJob(jobDetailsModal.id);
            setJobDetailsModal(null);
          }}
          onReject={() => {
            const name = jobDetailsModal.fallback?.title ?? "this job";
            setRejectModal({ type: "Job", id: jobDetailsModal.id, name });
            setJobDetailsModal(null);
          }}
        />
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <RejectModal
          type={rejectModal.type}
          item={rejectModal.name}
          onClose={() => setRejectModal(null)}
          onConfirm={(reason) =>
            rejectModal.type === "Job"
              ? handleRejectJob(rejectModal.id, reason)
              : handleRejectCompany(rejectModal.id, reason)
          }
        />
      )}

      {/* ── Category Modal ── */}
      {categoryModal !== null && (
        <CategoryModal
          category={categoryModal.category}
          onClose={() => setCategoryModal(null)}
          onConfirm={(name) =>
            categoryModal.category
              ? handleEditCategory(categoryModal.category.id ?? categoryModal.category.categoryId, name)
              : handleAddCategory(name)
          }
        />
      )}

      {/* ── User Details Modal ── */}
      {userDetailsModalId != null && (
        <UserDetailsModal
          key={userDetailsModalId}
          userId={userDetailsModalId}
          onClose={() => setUserDetailsModalId(null)}
          onChanged={async () => {
            const updatedUsers = await getAllUsers().catch(() => []);
            setUsers(Array.isArray(updatedUsers) ? updatedUsers : []);
          }}
          showToast={showToast}
        />
      )}

      {skillModal && (
        <SkillModal
          onClose={() => setSkillModal(false)}
          onConfirm={handleAddSkill}
        />
      )}
    </div>
  );
};

// ── Empty State ────────────────────────────────────────────────────────────
const EmptyState = ({ icon, message }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="text-4xl mb-4">{icon}</div>
    <p className="font-poppins text-gray-400 text-sm max-w-xs">{message}</p>
  </div>
);

export default AdminDashboard;