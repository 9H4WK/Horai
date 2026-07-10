import { Link } from "react-router-dom";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#E8D8CE] bg-gradient-to-b from-[#FFF9F5] to-[#F7F1EC] text-[#4F4F4F]">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
          <div className="max-w-sm space-y-4">
            <Link
              to="/"
              className="inline-block font-alatsi text-3xl text-primary-accent transition hover:text-secondary-accent"
            >
              HORAI
            </Link>
            <p className="text-sm leading-7 text-[#5E524C]">
              HORAI Labs careers portal — apply to join our teams, or manage hiring if
              you are part of the recruiting desk. Not a public multi-company job board.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                to="/jobs"
                className="rounded-full bg-[#7A3E1D] px-4 py-2 text-xs font-poppins-medium text-white transition hover:opacity-90"
              >
                Open roles
              </Link>
              <Link
                to="/for-employers"
                className="rounded-full border border-[#D9C0B0] bg-white px-4 py-2 text-xs font-poppins-medium text-[#7A3E1D] transition hover:bg-[#FFF3ED]"
              >
                Post a role
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-poppins-semibold uppercase tracking-[0.16em] text-[#C26A42]">
              Applicants
            </p>
            <nav className="flex flex-col gap-2.5" aria-label="Applicant links">
              <Link to="/jobs" className="text-sm text-[#4A403B] transition hover:text-[#7A3E1D]">
                Open roles
              </Link>
              <Link
                to="/applications"
                className="text-sm text-[#4A403B] transition hover:text-[#7A3E1D]"
              >
                My applications
              </Link>
              <Link to="/profile" className="text-sm text-[#4A403B] transition hover:text-[#7A3E1D]">
                My profile
              </Link>
              <Link
                to="/register"
                className="text-sm text-[#4A403B] transition hover:text-[#7A3E1D]"
              >
                Register
              </Link>
            </nav>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-poppins-semibold uppercase tracking-[0.16em] text-[#C26A42]">
              Hiring desk
            </p>
            <nav className="flex flex-col gap-2.5" aria-label="Hiring links">
              <Link
                to="/for-employers"
                className="text-sm text-[#4A403B] transition hover:text-[#7A3E1D]"
              >
                Post a role
              </Link>
              <Link
                to="/employer/applications"
                className="text-sm text-[#4A403B] transition hover:text-[#7A3E1D]"
              >
                Candidate screening
              </Link>
              <Link to="/jobs" className="text-sm text-[#4A403B] transition hover:text-[#7A3E1D]">
                Live openings
              </Link>
              <Link to="/login" className="text-sm text-[#4A403B] transition hover:text-[#7A3E1D]">
                Login
              </Link>
            </nav>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-poppins-semibold uppercase tracking-[0.16em] text-[#C26A42]">
              Company
            </p>
            <nav className="flex flex-col gap-2.5" aria-label="Company links">
              <Link to="/" className="text-sm text-[#4A403B] transition hover:text-[#7A3E1D]">
                Home
              </Link>
              <span className="text-sm text-[#8A7E77]">HORAI Labs · Nairobi</span>
            </nav>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-[#E8D8CE] pt-6 text-center sm:flex-row sm:text-left">
          <p className="text-sm text-[#7A6E68]">© {year} HORAI Labs. Careers & recruitment portal.</p>
          <p className="text-xs text-[#9A8E87]">One employer · Many teams · Fairer selection</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
