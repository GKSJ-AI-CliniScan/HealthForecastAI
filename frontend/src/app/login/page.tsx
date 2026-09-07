"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  Eye,
  EyeOff,
  HeartPulse,
  LockKeyhole,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";

type Role =
  | "doctor"
  | "hospital"
  | "researcher"
  | "system";

export default function LoginPage() {
  const [selectedRole, setSelectedRole] =
    useState<Role>("doctor");

  const [showPassword, setShowPassword] =
    useState(false);

  const [rememberMe, setRememberMe] =
    useState(false);

  const handleLogin = () => {
    /*
      FRONTEND ONLY

      Your backend is not connected yet.
      Later replace this with your API login request.
    */
   const handleLogin = () => {
  if (selectedRole === "doctor") {
    window.location.href = "/doctor";
  } else if (selectedRole === "hospital") {
    window.location.href = "/admin";
  } else if (selectedRole === "researcher") {
    window.location.href = "/researcher";
  } else if (selectedRole === "system") {
    window.location.href = "/system-admin";
  }
};

  };

  return (
    <main className="min-h-[100svh] overflow-hidden bg-[#f8fcff] text-[#092957]">

      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">

        {/* Large left circle */}
        <div
          className="
            absolute
            -left-[220px]
            top-[120px]
            h-[570px]
            w-[570px]
            rounded-full
            bg-[#eaf6ff]
          "
        />

        {/* Left inner circle */}
        <div
          className="
            absolute
            left-[110px]
            top-[250px]
            h-[300px]
            w-[300px]
            rounded-full
            border
            border-blue-100
          "
        />

        {/* Top right circle */}
        <div
          className="
            absolute
            right-[10%]
            top-[-80px]
            h-[230px]
            w-[230px]
            rounded-full
            bg-[#edf8ff]
          "
        />

        {/* Bottom right circle */}
        <div
          className="
            absolute
            -bottom-[170px]
            right-[-80px]
            h-[420px]
            w-[420px]
            rounded-full
            bg-[#eaf6ff]
          "
        />

        {/* Small center circle */}
        <div
          className="
            absolute
            left-[47%]
            bottom-[12%]
            h-[100px]
            w-[100px]
            rounded-full
            bg-[#edf8ff]
          "
        />

      </div>


      {/* =====================================================
          HEADER
      ====================================================== */}

      <header
        className="
          relative
          z-20
          mx-auto
          flex
          h-[68px]
          w-full
          max-w-[1440px]
          items-center
          justify-between
          px-6
          sm:px-8
          lg:px-10
          xl:px-12
        "
      >

        {/* BRAND */}

        <button
          onClick={() => {
            window.location.href = "/";
          }}
          className="
            flex
            items-center
            gap-3
          "
        >

          {/* Logo */}

          <div
            className="
              flex
              h-[44px]
              w-[44px]
              items-center
              justify-center
              rounded-[13px]
              bg-[#1268D5]
              text-white
              shadow-md
              shadow-blue-100
            "
          >
            <HeartPulse
              size={25}
              strokeWidth={2.5}
            />
          </div>


          {/* Brand text */}

          <div className="text-left">

            <div
              className="
                text-[20px]
                font-extrabold
                leading-none
                tracking-[-0.7px]
                text-[#092957]
              "
            >
              HealthForecast{" "}
              <span className="text-[#1268D5]">
                AI
              </span>
            </div>

            <div
              className="
                mt-1
                text-[8px]
                font-semibold
                tracking-[0.22em]
                text-[#7891af]
              "
            >
              HEALTHCARE INTELLIGENCE
            </div>

          </div>

        </button>


        {/* BACK TO HOME */}

        <button
          onClick={() => {
            window.location.href = "/";
          }}
          className="
            flex
            items-center
            gap-2
            text-[11px]
            font-semibold
            text-slate-400
            transition
            hover:text-[#1268D5]
          "
        >

          <ArrowLeft size={14} />

          Back to Home

        </button>

      </header>


      {/* =====================================================
          MAIN
      ====================================================== */}

      <section
        className="
          relative
          z-10
          mx-auto
          flex
          min-h-[calc(100svh-68px)]
          max-w-[1440px]
          items-center
          px-6
          pb-7
          pt-2
          sm:px-8
          lg:px-10
          xl:px-12
        "
      >

        <div
          className="
            grid
            w-full
            items-center
            gap-10
            lg:grid-cols-[1fr_1fr]
            xl:gap-16
          "
        >

          {/* =================================================
              LEFT CONTENT
          ================================================== */}

          <div className="hidden lg:block">

            <div className="relative">

              {/* Label */}

              <div className="flex items-center gap-3">

                <div className="h-[2px] w-9 bg-[#1268D5]" />

                <span
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.22em]
                    text-[#1268D5]
                  "
                >
                  Predict. Prevent. Improve.
                </span>

              </div>


              {/* Main heading */}

              <h1
                className="
                  mt-5
                  max-w-[570px]
                  text-[clamp(42px,4vw,58px)]
                  font-extrabold
                  leading-[1.02]
                  tracking-[-2.4px]
                  text-[#092957]
                "
              >

                Smarter
                <br />

                Healthcare
                <br />

                for a Healthier
                <br />

                <span className="text-[#1268D5]">
                  Tomorrow.
                </span>

              </h1>


              {/* Description */}

              <p
                className="
                  mt-5
                  max-w-[500px]
                  text-[15px]
                  leading-[1.6]
                  text-[#627b99]
                "
              >
                AI-powered healthcare forecasting that helps
                identify patient risks, reduce readmissions,
                and support better healthcare decisions.
              </p>


              {/* =================================================
                  FEATURES
              ================================================== */}

              <div className="mt-7 space-y-3.5">

                <Feature
                  icon={<Users size={18} />}
                  title="Patient Risk Intelligence"
                  description="Identify high-risk patients earlier."
                />

                <Feature
                  icon={<BarChart3 size={18} />}
                  title="Readmission Forecasting"
                  description="Support proactive patient care."
                />

                <Feature
                  icon={<Stethoscope size={18} />}
                  title="Healthcare Analytics"
                  description="Turn data into better outcomes."
                />

              </div>

            </div>

          </div>


          {/* =================================================
              RIGHT LOGIN CARD
          ================================================== */}

          <div className="mx-auto w-full max-w-[535px]">

            <div
              className="
                rounded-[22px]
                border
                border-[#e0ebf5]
                bg-white
                px-6
                py-6
                shadow-[0_18px_55px_rgba(22,90,150,0.10)]
                sm:px-7
                sm:py-7
                lg:px-8
                lg:py-7
              "
            >

              {/* =================================================
                  LOGIN HEADER
              ================================================== */}

              <div className="mb-5">

                <p
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.25em]
                    text-[#1268D5]
                  "
                >
                  Welcome Back
                </p>

                <h2
                  className="
                    mt-1.5
                    text-[28px]
                    font-extrabold
                    leading-tight
                    tracking-[-1px]
                    text-[#092957]
                  "
                >
                  Sign in to your account
                </h2>

                <p
                  className="
                    mt-1.5
                    text-[13px]
                    text-[#6c839d]
                  "
                >
                  Access your healthcare intelligence workspace.
                </p>

              </div>


              {/* =================================================
                  EMAIL
              ================================================== */}

              <div>

                <label
                  htmlFor="email"
                  className="
                    mb-1.5
                    block
                    text-[11px]
                    font-bold
                    text-[#092957]
                  "
                >
                  Email address
                </label>

                <div className="relative">

                  {/* Email icon */}

                  <div
                    className="
                      pointer-events-none
                      absolute
                      left-3.5
                      top-1/2
                      -translate-y-1/2
                      text-[#6d88a7]
                    "
                  >
                    <MailIcon />
                  </div>


                  <input
                    id="email"
                    type="email"
                    placeholder="doctor@healthforecast.ai"
                    className="
                      h-[46px]
                      w-full
                      rounded-xl
                      border
                      border-[#dce8f2]
                      bg-[#fcfeff]
                      pl-10
                      pr-4
                      text-[12px]
                      text-[#092957]
                      outline-none
                      transition
                      placeholder:text-[#9aadc1]
                      focus:border-[#1268D5]
                      focus:ring-4
                      focus:ring-[#1268D5]/10
                    "
                  />

                </div>

              </div>


              {/* =================================================
                  PASSWORD
              ================================================== */}

              <div className="mt-4">

                <div className="mb-1.5 flex items-center justify-between">

                  <label
                    htmlFor="password"
                    className="
                      text-[11px]
                      font-bold
                      text-[#092957]
                    "
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    className="
                      text-[10px]
                      font-semibold
                      text-[#1268D5]
                      hover:text-[#0c55b2]
                    "
                  >
                    Forgot password?
                  </button>

                </div>


                <div className="relative">

                  <LockKeyhole
                    size={16}
                    className="
                      absolute
                      left-3.5
                      top-1/2
                      -translate-y-1/2
                      text-[#6d88a7]
                    "
                  />


                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Enter your password"
                    className="
                      h-[46px]
                      w-full
                      rounded-xl
                      border
                      border-[#dce8f2]
                      bg-[#fcfeff]
                      pl-10
                      pr-11
                      text-[12px]
                      text-[#092957]
                      outline-none
                      transition
                      placeholder:text-[#9aadc1]
                      focus:border-[#1268D5]
                      focus:ring-4
                      focus:ring-[#1268D5]/10
                    "
                  />


                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="
                      absolute
                      right-3.5
                      top-1/2
                      -translate-y-1/2
                      text-[#7892af]
                      transition
                      hover:text-[#1268D5]
                    "
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >

                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}

                  </button>

                </div>

              </div>


              {/* =================================================
                  ROLE SELECTION
              ================================================== */}

              <div className="mt-5">

                <label
                  className="
                    mb-2
                    block
                    text-[11px]
                    font-bold
                    text-[#092957]
                  "
                >
                  Sign in as
                </label>


                <div className="space-y-1.5">

                  <RoleCard
                    role="doctor"
                    selectedRole={selectedRole}
                    setSelectedRole={setSelectedRole}
                    icon={<Stethoscope size={17} />}
                    title="Doctor"
                    description="Patient care & clinical insights"
                  />

                  <RoleCard
                    role="hospital"
                    selectedRole={selectedRole}
                    setSelectedRole={setSelectedRole}
                    icon={<Building2 size={17} />}
                    title="Hospital Administrator"
                    description="Hospital operations & analytics"
                  />

                  <RoleCard
                    role="researcher"
                    selectedRole={selectedRole}
                    setSelectedRole={setSelectedRole}
                    icon={<Search size={17} />}
                    title="Healthcare Researcher"
                    description="Research & population analytics"
                  />

                  <RoleCard
                    role="system"
                    selectedRole={selectedRole}
                    setSelectedRole={setSelectedRole}
                    icon={<ShieldCheck size={17} />}
                    title="System Administrator"
                    description="Users, security & platform settings"
                  />

                </div>

              </div>


              {/* =================================================
                  REMEMBER ME
              ================================================== */}

              <div
                className="
                  mt-4
                  flex
                  items-center
                  justify-between
                "
              >

                <label
                  className="
                    flex
                    cursor-pointer
                    items-center
                    gap-2
                  "
                >

                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) =>
                      setRememberMe(e.target.checked)
                    }
                    className="
                      h-3.5
                      w-3.5
                      cursor-pointer
                      accent-[#1268D5]
                    "
                  />

                  <span className="text-[10px] text-[#6f849d]">
                    Remember me
                  </span>

                </label>


                <div
                  className="
                    flex
                    items-center
                    gap-1.5
                    text-[10px]
                    text-[#8094aa]
                  "
                >

                  <LockKeyhole size={12} />

                  Secure login

                </div>

              </div>


              {/* =================================================
                  SIGN IN
              ================================================== */}

              <button
                onClick={handleLogin}
                className="
                  mt-4
                  flex
                  h-[48px]
                  w-full
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#1268D5]
                  text-[13px]
                  font-bold
                  text-white
                  shadow-lg
                  shadow-[#1268D5]/20
                  transition
                  duration-200
                  hover:-translate-y-0.5
                  hover:bg-[#0d5fc5]
                  hover:shadow-xl
                "
              >

                Sign in

                <ArrowRight
                  size={16}
                  className="ml-2"
                />

              </button>


              {/* =================================================
                  SECURITY NOTE
              ================================================== */}

              <div className="mt-4">

                <div className="flex items-center gap-2">

                  <div className="h-px flex-1 bg-[#edf2f7]" />

                  <span
                    className="
                      text-[8px]
                      font-medium
                      text-[#9aacbd]
                    "
                  >
                    HealthForecast AI
                  </span>

                  <div className="h-px flex-1 bg-[#edf2f7]" />

                </div>

                <p
                  className="
                    mt-2
                    text-center
                    text-[8px]
                    leading-4
                    text-[#91a3b5]
                  "
                >
                  Your healthcare workspace is protected
                  with secure authentication and role-based access.
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}


/* =========================================================
   FEATURE COMPONENT
========================================================= */

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">

      <div
        className="
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-full
          bg-[#eaf6ff]
          text-[#1268D5]
        "
      >
        {icon}
      </div>

      <div>

        <p
          className="
            text-[12px]
            font-bold
            text-[#092957]
          "
        >
          {title}
        </p>

        <p
          className="
            mt-0.5
            text-[10px]
            text-[#7990aa]
          "
        >
          {description}
        </p>

      </div>

    </div>
  );
}


/* =========================================================
   ROLE CARD
========================================================= */

function RoleCard({
  role,
  selectedRole,
  setSelectedRole,
  icon,
  title,
  description,
}: {
  role: Role;
  selectedRole: Role;
  setSelectedRole: (role: Role) => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  const selected = selectedRole === role;

  return (
    <button
      type="button"
      onClick={() => setSelectedRole(role)}
      className={`
        flex
        min-h-[53px]
        w-full
        items-center
        gap-3
        rounded-xl
        border
        px-3
        py-2
        text-left
        transition-all
        duration-150

        ${
          selected
            ? "border-[#1683F5] bg-[#f0f8ff]"
            : "border-[#dfe9f2] bg-white hover:border-[#bcdcff] hover:bg-[#fbfdff]"
        }
      `}
    >

      {/* ICON */}

      <div
        className={`
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-lg

          ${
            selected
              ? "bg-white text-[#1268D5]"
              : "bg-[#eaf6ff] text-[#1268D5]"
          }
        `}
      >
        {icon}
      </div>


      {/* TEXT */}

      <div className="min-w-0 flex-1">

        <p
          className="
            truncate
            text-[10px]
            font-bold
            text-[#092957]
          "
        >
          {title}
        </p>

        <p
          className="
            mt-0.5
            truncate
            text-[8px]
            text-[#8195ab]
          "
        >
          {description}
        </p>

      </div>


      {/* RADIO */}

      <div
        className={`
          flex
          h-[18px]
          w-[18px]
          shrink-0
          items-center
          justify-center
          rounded-full
          border

          ${
            selected
              ? "border-[#1683F5]"
              : "border-[#c9d8e5]"
          }
        `}
      >

        {selected && (
          <div
            className="
              h-2.5
              w-2.5
              rounded-full
              bg-[#1683F5]
            "
          />
        )}

      </div>

    </button>
  );
}


/* =========================================================
   EMAIL ICON
========================================================= */

function MailIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect
        width="20"
        height="16"
        x="2"
        y="4"
        rx="2"
      />

      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}