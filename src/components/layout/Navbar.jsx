import React, { useState, useEffect, useRef, useMemo } from "react";
import Login1 from "../../assets/icons/Login1.png";
import Login2 from "../../assets/icons/Login2.png";
import Login3 from "../../assets/icons/Login3.png";
import Login4 from "../../assets/icons/Login4.png";
import { Link, useLocation } from "react-router-dom";
import { Bell, CircleUserRound, Loader2 } from "lucide-react";
import {
  getNotificationDetails,
  getUserNotifications,
} from "../../utilities/api/notificationsApi";
import AiStatusBadge from "../common/AiStatusBadge";

const pickFirst = (obj, keys, fallback = null) => {
  if (!obj || typeof obj !== "object") {
    return fallback;
  }

  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return obj[key];
    }
  }

  return fallback;
};

const normalizeNotification = (rawNotification = {}) => {
  const readValue = pickFirst(rawNotification, [
    "isRead",
    "IsRead",
    "read",
    "Read",
    "status",
    "Status",
  ]);

  const normalizedRead =
    typeof readValue === "boolean"
      ? readValue
      : typeof readValue === "string"
        ? ["true", "read", "seen"].includes(readValue.toLowerCase())
        : false;

  return {
    id: pickFirst(rawNotification, [
      "id",
      "Id",
      "notificationId",
      "NotificationId",
    ]),
    message: pickFirst(rawNotification, ["message", "Message", "body", "Body"], ""),
    type: pickFirst(rawNotification, [
      "type",
      "Type",
      "notificationType",
      "NotificationType",
    ], 0),
    title: pickFirst(rawNotification, ["title", "Title", "subject", "Subject"], "Notification"),
    createdAt: pickFirst(rawNotification, [
      "createdAt",
      "CreatedAt",
      "date",
      "Date",
      "sentAt",
      "SentAt",
    ]),
    isRead: normalizedRead,
  };
};

const formatNotificationDate = (value) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleString();
};

const isPathActive = (pathname, to) => {
  if (!to || to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
};

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginHovered, setIsLoginHovered] = useState(false);
  const [loginIcon, setLoginIcon] = useState(Login1);
  const [hoveredNav, setHoveredNav] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const notificationsPanelRef = useRef(null);
  const profileMenuPanelRef = useRef(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const location = useLocation();
  const isLoggedIn = !!localStorage.getItem("token");

  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const roleRaw =
    localStorage.getItem("userType") ||
    localStorage.getItem("role") ||
    "";
  const normalizedRole = String(roleRaw).toLowerCase();
  const isEmployer =
    normalizedRole.includes("employer") ||
    normalizedRole.includes("company") ||
    isAdmin;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userType");
    localStorage.removeItem("isAdmin");
    window.location.href = "/login";
  };

  /**
   * Role-aware primary nav.
   * Labels focus on outcomes (find work, hire, track progress) rather than system jargon.
   */
  const navItems = useMemo(() => {
    if (isLoggedIn && isEmployer) {
      return [
        {
          id: "screening",
          label: "Candidate screening",
          to: "/employer/applications",
          title: "Review applications to HORAI Labs",
          description:
            "See applicants for each role, ranked by assessment and profile fit — then accept or reject with feedback.",
        },
        {
          id: "hire",
          label: "Post a role",
          to: "/for-employers",
          title: "Add openings for your teams",
          description:
            "Publish new HORAI Labs roles by department so candidates can apply to the right team.",
        },
        {
          id: "roles",
          label: "Open roles",
          to: "/jobs",
          title: "Live careers board",
          description:
            "Preview how openings appear to applicants, and edit your team’s postings.",
        },
      ];
    }

    if (isLoggedIn && !isEmployer) {
      return [
        {
          id: "jobs",
          label: "Open roles",
          to: "/jobs",
          title: "Careers at HORAI Labs",
          description:
            "Browse openings across our departments and apply with your profile.",
        },
        {
          id: "applications",
          label: "My applications",
          to: "/applications",
          title: "Track your applications",
          description:
            "See status, hiring feedback, and assessment steps for roles you applied to.",
        },
        {
          id: "profile",
          label: "My profile",
          to: "/profile",
          title: "Your candidate profile",
          description:
            "Keep your CV, skills, and experience up to date for HORAI Labs hiring.",
        },
      ];
    }

    // Guests — company careers portal (not a multi-employer marketplace)
    return [
      {
        id: "jobs",
        label: "Open roles",
        to: "/jobs",
        title: "Work at HORAI Labs",
        description:
          "Explore roles across engineering, product, design, data, and growth — and apply to join us.",
      },
      {
        id: "hire",
        label: "Hiring team",
        to: "/for-employers",
        title: "Internal hiring tools",
        description:
          "For HORAI Labs recruiters and managers: post roles and review applicants.",
      },
    ];
  }, [isLoggedIn, isEmployer]);

  useEffect(() => {
    if (isLoginHovered) {
      const timer1 = setTimeout(() => setLoginIcon(Login3), 0);
      const timer2 = setTimeout(() => setLoginIcon(Login2), 250);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }

    const timer1 = setTimeout(() => setLoginIcon(Login4), 0);
    const timer2 = setTimeout(() => setLoginIcon(Login1), 250);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isLoginHovered]);

  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([]);
      setIsNotificationsOpen(false);
      setSelectedNotification(null);
      return;
    }

    let isMounted = true;

    const loadNotifications = async (isSilent = false) => {
      try {
        if (!isSilent) {
          setIsNotificationsLoading(true);
        }

        const data = await getUserNotifications();

        if (!isMounted) {
          return;
        }

        const normalized = data
          .map((item) => normalizeNotification(item))
          .filter((item) => item.id || item.message)
          .sort((a, b) => {
            const leftDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const rightDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return rightDate - leftDate;
          });

        setNotifications(normalized);
        setNotificationsError("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setNotificationsError(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to load notifications.",
        );
      } finally {
        if (isMounted) {
          setIsNotificationsLoading(false);
        }
      }
    };

    loadNotifications();
    const intervalId = setInterval(() => loadNotifications(true), 60000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isNotificationsOpen) {
      return;
    }

    const handleOutsideClick = (event) => {
      if (
        notificationsPanelRef.current &&
        !notificationsPanelRef.current.contains(event.target)
      ) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    const handleOutsideClick = (event) => {
      if (
        profileMenuPanelRef.current &&
        !profileMenuPanelRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isProfileMenuOpen]);

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMenuOpen(false);
    setIsNotificationsOpen(false);
    setIsProfileMenuOpen(false);
  }, [location.pathname]);

  const handleNotificationOpen = () => {
    setIsProfileMenuOpen(false);
    setIsNotificationsOpen((prev) => !prev);
  };

  const handleProfileMenuOpen = () => {
    setIsNotificationsOpen(false);
    setIsProfileMenuOpen((prev) => !prev);
  };

  const handleNotificationSelect = async (notificationId) => {
    if (!notificationId) {
      return;
    }

    try {
      const details = await getNotificationDetails(notificationId);
      setSelectedNotification(normalizeNotification(details));
      setNotificationsError("");
      setNotifications((prev) =>
        prev.map((item) =>
          String(item.id) === String(notificationId) ? { ...item, isRead: true } : item,
        ),
      );
    } catch (error) {
      setNotificationsError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load notification details.",
      );
    }
  };

  const unreadNotificationsCount = notifications.filter((item) => !item.isRead).length;
  const visibleMobileNotifications = notifications.slice(0, 3);
  const isProfilePage = location.pathname === "/profile";

  const navLinkClass = (to) => {
    const active = isPathActive(location.pathname, to);
    return `relative text-[17px] lg:text-[18px] font-avro font-normal cursor-pointer transition-colors ${
      active
        ? "text-primary-accent"
        : "text-primary hover:text-secondary-accent"
    }`;
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-[#4242425C]/36 bg-white/95 backdrop-blur-md">
      <div className="w-full px-6 lg:px-8">
        <div className="flex h-16 items-center">
          {/* Logo */}
          <div className="shrink-0">
            <Link
              to="/"
              className="font-alatsi text-[30px] font-normal text-primary-accent transition-colors hover:text-secondary-accent"
              aria-label="HORAI home"
            >
              HORAI
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden flex-1 items-center justify-center gap-8 lg:gap-10 md:flex">
            {navItems.map((item) => {
              const active = isPathActive(location.pathname, item.to);
              return (
                <div
                  key={item.id}
                  className="relative group"
                  onMouseEnter={() => setHoveredNav(item.id)}
                  onMouseLeave={() => setHoveredNav(null)}
                >
                  <Link to={item.to} className={navLinkClass(item.to)}>
                    {item.label}
                    {active && (
                      <span
                        className="absolute -bottom-2 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-primary-accent"
                        aria-hidden="true"
                      />
                    )}
                  </Link>

                  <div
                    className={`absolute left-1/2 top-full z-40 mt-3 w-72 -translate-x-1/2 rounded-2xl border border-[#F1DED3] bg-white px-5 py-4 shadow-[0_18px_50px_rgba(122,62,29,0.12)] transition-all duration-300 ${
                      hoveredNav === item.id
                        ? "visible translate-y-0 opacity-100"
                        : "invisible pointer-events-none -translate-y-3 opacity-0"
                    }`}
                    onMouseEnter={() => setHoveredNav(item.id)}
                    onMouseLeave={() => setHoveredNav(null)}
                  >
                    <p className="mb-1 text-[10px] font-poppins-semibold uppercase tracking-[0.16em] text-[#C26A42]">
                      {isEmployer ? "Hiring desk" : "Careers"}
                    </p>
                    <h3 className="mb-1.5 font-avro text-[16px] font-bold text-primary">
                      {item.title}
                    </h3>
                    <p className="text-[13px] leading-relaxed text-[#292624]">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Login / account tools */}
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            {isLoggedIn && isEmployer && <AiStatusBadge />}
            {isLoggedIn && (
              <div className="relative" ref={notificationsPanelRef}>
                <button
                  type="button"
                  onClick={handleNotificationOpen}
                  className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 ${
                    isNotificationsOpen
                      ? "bg-[#FFF3ED] text-[#111111]"
                      : "text-[#111111] hover:bg-[#FFF3ED] hover:text-primary-accent"
                  }`}
                  aria-label="Open notifications"
                >
                  <Bell
                    className={`h-6 w-6 transition-transform duration-200 ${
                      isNotificationsOpen ? "rotate-12" : "hover:rotate-12"
                    }`}
                    strokeWidth={1.2}
                  />
                  {unreadNotificationsCount > 0 && (
                    <span
                      className="absolute bottom-2 left-2 h-2.5 w-2.5 rounded-full bg-[#F25D5D]"
                      aria-hidden="true"
                    />
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
                    <div className="mb-2 flex items-center justify-between border-b border-gray-100 px-1 pb-2">
                      <p className="text-sm font-poppins-semibold text-primary">Updates</p>
                      <span className="text-xs font-poppins text-gray-500">
                        {unreadNotificationsCount} unread
                      </span>
                    </div>

                    {isNotificationsLoading ? (
                      <div className="flex items-center justify-center py-6 text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <p className="py-6 text-center text-xs font-poppins text-gray-500">
                        You&apos;re all caught up.
                      </p>
                    ) : (
                      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                        {notifications.map((notification) => {
                          const isSelected = selectedNotification?.id === notification.id;

                          return (
                            <button
                              key={String(notification.id)}
                              type="button"
                              onClick={() => handleNotificationSelect(notification.id)}
                              className={`w-full rounded-xl border p-2.5 text-left transition-colors ${
                                isSelected
                                  ? "border-primary-accent/30 bg-[#FFF7F2]"
                                  : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="truncate text-xs font-poppins-semibold text-primary">
                                  {notification.title}
                                </p>
                                {!notification.isRead && (
                                  <span
                                    className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary-accent"
                                    aria-hidden="true"
                                  />
                                )}
                              </div>
                              <p className="mt-1 line-clamp-3 text-xs font-poppins text-gray-600">
                                {notification.message || "No message available."}
                              </p>
                              {notification.createdAt && (
                                <p className="mt-1 text-[10px] font-poppins text-gray-400">
                                  {formatNotificationDate(notification.createdAt)}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {selectedNotification && (
                      <div className="mt-3 rounded-xl border border-primary-accent/20 bg-[#FFF7F2] p-2.5">
                        <p className="text-xs font-poppins-semibold text-primary-accent">
                          {selectedNotification.title || "Selected"}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-xs font-poppins text-gray-700">
                          {selectedNotification.message || "No message available."}
                        </p>
                      </div>
                    )}

                    {notificationsError && (
                      <p className="mt-2 text-xs font-poppins text-red-500">{notificationsError}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {isLoggedIn && (
              <div className="relative" ref={profileMenuPanelRef}>
                <button
                  type="button"
                  onClick={handleProfileMenuOpen}
                  aria-label="Open account menu"
                  className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 ${
                    isProfilePage || isProfileMenuOpen
                      ? "bg-[#FFF3ED] text-[#111111]"
                      : "text-[#111111] hover:bg-[#FFF3ED]"
                  }`}
                >
                  <CircleUserRound className="h-8 w-8 text-[#111111]" strokeWidth={1.15} />
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
                    <p className="px-3 pb-1 pt-1 text-[10px] font-poppins-semibold uppercase tracking-[0.14em] text-gray-400">
                      {isEmployer ? "Hiring account" : "Your account"}
                    </p>
                    <Link
                      to="/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex w-full items-center rounded-xl px-3 py-2 text-sm font-poppins-medium text-[#1A1A1A] transition-colors hover:bg-[#FFF3ED] hover:text-primary-accent"
                    >
                      Profile & CV
                    </Link>
                    {isEmployer ? (
                      <Link
                        to="/employer/applications"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="mt-0.5 flex w-full items-center rounded-xl px-3 py-2 text-sm font-poppins-medium text-[#1A1A1A] transition-colors hover:bg-[#FFF3ED] hover:text-primary-accent"
                      >
                        Candidate screening
                      </Link>
                    ) : (
                      <Link
                        to="/applications"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="mt-0.5 flex w-full items-center rounded-xl px-3 py-2 text-sm font-poppins-medium text-[#1A1A1A] transition-colors hover:bg-[#FFF3ED] hover:text-primary-accent"
                      >
                        My applications
                      </Link>
                    )}
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="mt-0.5 flex w-full items-center rounded-xl px-3 py-2 text-sm font-poppins-medium text-[#1A1A1A] transition-colors hover:bg-[#FFF3ED] hover:text-primary-accent"
                      >
                        Admin console
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-1 flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-poppins-medium text-red-500 transition-colors hover:bg-red-50"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isLoggedIn && (
              <div className="flex items-center gap-2">
                <Link
                  to="/register"
                  className="rounded-full px-3 py-2 text-sm font-poppins-medium text-primary transition hover:text-primary-accent"
                >
                  Register
                </Link>
                <Link
                  to="/login"
                  className="cursor-pointer rounded-full px-1"
                  onMouseEnter={() => setIsLoginHovered(true)}
                  onMouseLeave={() => setIsLoginHovered(false)}
                  aria-label="Login"
                >
                  <img
                    src={loginIcon}
                    alt="Login"
                    className="h-8 w-auto transition-all duration-300 ease-in-out"
                  />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex flex-1 justify-end md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="relative rounded-lg p-2 text-primary hover:text-primary-accent focus:outline-none focus:ring-2 focus:ring-orange-500"
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              <div className="relative h-6 w-6">
                <svg
                  className={`absolute inset-0 transition-all duration-300 ${
                    isMenuOpen
                      ? "scale-0 rotate-90 opacity-0"
                      : "scale-100 rotate-0 opacity-100"
                  }`}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <svg
                  className={`absolute inset-0 transition-all duration-300 ${
                    isMenuOpen
                      ? "scale-100 rotate-0 opacity-100"
                      : "scale-0 -rotate-90 opacity-0"
                  }`}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`overflow-hidden border-t border-gray-100 bg-white transition-all duration-300 ease-in-out md:hidden ${
            isMenuOpen ? "max-h-[32rem] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="space-y-1 px-4 py-4">
            <p className="px-2 pb-2 text-[10px] font-poppins-semibold uppercase tracking-[0.16em] text-[#C26A42]">
              {isLoggedIn
                ? isEmployer
                  ? "Hiring desk"
                  : "Your career"
                : "HORAI Labs careers"}
            </p>

            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.to}
                className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isPathActive(location.pathname, item.to)
                    ? "bg-[#FFF3ED] text-primary-accent"
                    : "text-primary hover:bg-[#FFF8F4] hover:text-primary-accent"
                }`}
              >
                {item.label}
              </Link>
            ))}

            {isLoggedIn && (
              <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-poppins-semibold text-primary">Updates</span>
                  <span className="text-[10px] font-poppins text-gray-500">
                    {unreadNotificationsCount} unread
                  </span>
                </div>
                {visibleMobileNotifications.length === 0 ? (
                  <p className="text-xs font-poppins text-gray-500">You&apos;re all caught up.</p>
                ) : (
                  <div className="space-y-1">
                    {visibleMobileNotifications.map((notification) => (
                      <p
                        key={String(notification.id)}
                        className="line-clamp-2 text-xs font-poppins text-gray-600"
                      >
                        {notification.message || "No message available."}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
              >
                Sign out
              </button>
            ) : (
              <div className="mt-2 flex flex-col gap-1 border-t border-gray-100 pt-3">
                <Link
                  to="/login"
                  className="rounded-xl bg-[#7A3E1D] px-3 py-2.5 text-center text-sm font-medium text-white"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl px-3 py-2.5 text-center text-sm font-medium text-primary hover:bg-[#FFF8F4]"
                >
                  Register
                </Link>
                <Link
                  to="/for-employers"
                  className="rounded-xl px-3 py-2 text-center text-xs font-medium text-[#7A3E1D] hover:bg-[#FFF8F4]"
                >
                  Hiring team · Post a role
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
