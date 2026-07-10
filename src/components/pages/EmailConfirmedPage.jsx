import { Link, useLocation } from "react-router-dom";

const EmailConfirmedPage = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const status = params.get("status")?.toLowerCase();

  const isSuccess = status === "success";
  const title = isSuccess ? "Email Verified" : "Verification Failed";
  const message = isSuccess
    ? "Your email has been successfully confirmed. You can now sign in and continue using Horai."
    : "We could not verify your email address. Please try again or contact support if the problem continues.";
  const buttonText = isSuccess ? "Go to login" : "Return home";
  const buttonLink = isSuccess ? "/login" : "/";

  return (
    <div className="w-dvw h-dvh m-auto flex flex-col items-center justify-center gap-8 px-6 text-center bg-[#FBFBFB]">
      <div className="max-w-xl rounded-[2rem] border border-[#E5E5E5] bg-white px-8 py-12 shadow-sm sm:px-12">
        <p className={`mb-4 inline-flex rounded-full px-4 py-1 text-sm font-semibold ${
          isSuccess ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        }`}>
          {isSuccess ? "Success" : "Error"}
        </p>
        <h1 className="text-3xl font-poppins-semibold text-[#141414] sm:text-4xl">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-[#5F5F5F] sm:text-base">
          {message}
        </p>
        <div className="mt-8 flex justify-center">
          <Link to={buttonLink}>
            <button className="rounded-full bg-black px-8 py-3 text-sm font-medium text-white transition hover:bg-[#1F1F1F]">
              {buttonText}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmedPage;
