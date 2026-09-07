"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";

export default function Home() {
  const goToLogin = () => {
    window.location.href = "/login";
  };

  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#092957]">

      {/* =====================================================
          ENTRY PAGE
      ====================================================== */}

      <section className="relative min-h-[100svh] overflow-hidden">

        {/* ===================================================
            BACKGROUND DECORATIONS
        ==================================================== */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">

          {/* Left blue glow */}
          <div
            className="
              absolute
              -left-[260px]
              top-[100px]
              h-[650px]
              w-[650px]
              rounded-full
              bg-[#e7f4ff]
              opacity-80
              blur-3xl
            "
          />

          {/* Right blue glow */}
          <div
            className="
              absolute
              -right-[260px]
              top-[120px]
              h-[600px]
              w-[600px]
              rounded-full
              bg-[#edf8ff]
              opacity-90
              blur-3xl
            "
          />

          {/* Top circle */}
          <div
            className="
              absolute
              right-[17%]
              top-[70px]
              h-[110px]
              w-[110px]
              rounded-full
              bg-[#e7f5ff]
            "
          />

          {/* Bottom right circle */}
          <div
            className="
              absolute
              bottom-[-100px]
              right-[-40px]
              h-[300px]
              w-[300px]
              rounded-full
              bg-[#edf8ff]
            "
          />

          {/* Bottom blue curve */}
          <div
            className="
              absolute
              bottom-[-230px]
              left-[-5%]
              h-[330px]
              w-[110%]
              rounded-[50%]
              bg-[#edf8ff]
            "
          />

        </div>


        {/* ===================================================
            HEADER
        ==================================================== */}

        <header
          className="
            relative
            z-30
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

          {/* LOGO */}

          <button
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
            className="group flex items-center gap-2.5"
          >

            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-[#1268d5]
                text-white
                shadow-md
                shadow-blue-200
                transition
                duration-300
                group-hover:scale-105
              "
            >
              <HeartPulse size={22} strokeWidth={2.5} />
            </div>


            <div className="text-left">

              <div
                className="
                  text-[18px]
                  font-bold
                  leading-tight
                  tracking-[-0.4px]
                  text-[#092957]
                "
              >
                HealthForecast{" "}
                <span className="text-[#1268d5]">AI</span>
              </div>

              <div
                className="
                  text-[7px]
                  font-semibold
                  tracking-[0.18em]
                  text-slate-400
                "
              >
                HEALTHCARE INTELLIGENCE
              </div>

            </div>

          </button>


          {/* TOP RIGHT MESSAGE */}

          <div className="hidden text-right sm:block">

            <p className="text-[11px] leading-4 text-slate-400">
              Smarter Data
            </p>

            <p className="text-[11px] leading-4 text-slate-400">
              Healthier People
            </p>

            <p className="text-[11px] leading-4 text-slate-400">
              Brighter Tomorrows
            </p>

            <div className="ml-auto mt-1.5 h-[2px] w-8 bg-[#1268d5]" />

          </div>

        </header>


        {/* ===================================================
            MAIN HERO
        ==================================================== */}

        <div
          className="
            relative
            z-20
            mx-auto
            flex
            min-h-[calc(100svh-68px)]
            max-w-[1440px]
            items-center
            px-6
            pb-8
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
              grid-cols-1
              items-center
              lg:grid-cols-[0.82fr_1.55fr_0.82fr]
              lg:gap-3
              xl:grid-cols-[0.85fr_1.5fr_0.85fr]
              xl:gap-5
            "
          >

            {/* =================================================
                LEFT DOCTOR
            ================================================== */}

            <div className="relative hidden h-[min(68vh,520px)] lg:block">

              {/* Small side label */}

              <div
                className="
                  absolute
                  left-0
                  top-[30%]
                  z-10
                  max-w-[90px]
                "
              >

                <p
                  className="
                    text-[9px]
                    font-semibold
                    uppercase
                    leading-5
                    tracking-[0.25em]
                    text-[#8aa6ca]
                  "
                >
                  AI
                  <br />
                  DRIVEN
                  <br />
                  BETTER
                  <br />
                  CARE
                </p>

                <div className="mt-3 h-[2px] w-7 bg-[#1268d5]" />

              </div>


              {/* Doctor background */}

              <div
                className="
                  absolute
                  bottom-[-50px]
                  left-[-110px]
                  h-[min(65vh,520px)]
                  w-[min(34vw,500px)]
                  overflow-hidden
                  rounded-[50%]
                  bg-gradient-to-br
                  from-[#dcefff]
                  via-[#edf8ff]
                  to-transparent
                "
              >

                {/* Doctor */}

                <div
                  className="
                    absolute
                    bottom-0
                    left-[18%]
                    h-[min(61vh,490px)]
                    w-[280px]
                  "
                >

                  {/* Hair */}

                  <div
                    className="
                      absolute
                      left-[62px]
                      top-[5px]
                      h-[105px]
                      w-[145px]
                      rounded-[50%]
                      bg-[#18253c]
                    "
                  />

                  {/* Face */}

                  <div
                    className="
                      absolute
                      left-[80px]
                      top-[40px]
                      h-[125px]
                      w-[108px]
                      rounded-[48%]
                      bg-[#f2c7a5]
                    "
                  />

                  {/* Hair front */}

                  <div
                    className="
                      absolute
                      left-[72px]
                      top-[22px]
                      h-[58px]
                      w-[125px]
                      rounded-[50%]
                      bg-[#17243a]
                    "
                  />

                  {/* Neck */}

                  <div
                    className="
                      absolute
                      left-[107px]
                      top-[150px]
                      h-[45px]
                      w-[48px]
                      bg-[#e7b994]
                    "
                  />

                  {/* White coat */}

                  <div
                    className="
                      absolute
                      bottom-0
                      left-[20px]
                      h-[275px]
                      w-[245px]
                      rounded-t-[90px]
                      bg-white
                      shadow-xl
                    "
                  />

                  {/* Blue scrubs */}

                  <div
                    className="
                      absolute
                      bottom-[158px]
                      left-[98px]
                      h-[110px]
                      w-[85px]
                      bg-[#1268d5]
                      [clip-path:polygon(20%_0,80%_0,100%_100%,0_100%)]
                    "
                  />

                  {/* Stethoscope */}

                  <div
                    className="
                      absolute
                      bottom-[105px]
                      left-[77px]
                      h-[125px]
                      w-[125px]
                      rounded-b-[50%]
                      border-[4px]
                      border-[#475569]
                      border-t-0
                    "
                  />

                  <div
                    className="
                      absolute
                      bottom-[92px]
                      left-[130px]
                      h-9
                      w-9
                      rounded-full
                      border-[4px]
                      border-[#475569]
                      bg-white
                    "
                  />

                  {/* Tablet */}

                  <div
                    className="
                      absolute
                      bottom-[18px]
                      right-[-5px]
                      h-[125px]
                      w-[90px]
                      rotate-[-8deg]
                      rounded-xl
                      bg-[#64748b]
                      p-2
                      shadow-xl
                    "
                  >

                    <div className="h-full w-full rounded-lg bg-[#e8f3fb]" />

                  </div>

                </div>

              </div>

            </div>


            {/* =================================================
                CENTER CONTENT
            ================================================== */}

            <div className="relative z-30 mx-auto w-full max-w-[690px] text-center">

              {/* EYEBROW */}

              <div className="mb-4 flex items-center justify-center gap-4 sm:mb-5">

                <span className="hidden h-px w-10 bg-[#6ba5ff] sm:block" />

                <span
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.35em]
                    text-[#1268d5]
                    sm:text-[10px]
                  "
                >
                  Healthcare Intelligence
                </span>

                <span className="hidden h-px w-10 bg-[#6ba5ff] sm:block" />

              </div>


              {/* MAIN HEADING */}

              <h1
                className="
                  text-[clamp(38px,4.1vw,58px)]
                  font-extrabold
                  leading-[1.02]
                  tracking-[-2px]
                  text-[#092957]
                "
              >

                Predict Risk.
                <br />

                Prevent Readmission.
                <br />

                <span className="text-[#1268d5]">
                  Improve Patient Care.
                </span>

              </h1>


              {/* DESCRIPTION */}

              <p
                className="
                  mx-auto
                  mt-5
                  max-w-[560px]
                  text-[14px]
                  leading-[1.6]
                  text-slate-500
                  sm:mt-6
                  sm:text-[15px]
                "
              >
                AI-powered healthcare forecasting that helps identify patient
                risks, forecast readmissions, and support better healthcare
                decisions.
              </p>


              {/* BUTTONS */}

              <div className="mt-6 flex justify-center gap-3">

                <button
                  onClick={goToLogin}
                  className="
                    group
                    h-[46px]
                    rounded-xl
                    bg-[#1268d5]
                    px-6
                    text-[13px]
                    font-bold
                    text-white
                    shadow-lg
                    shadow-blue-200
                    transition
                    duration-300
                    hover:-translate-y-0.5
                    hover:bg-[#0d55b3]
                  "
                >
                  Get Started

                  <ArrowRight
                    size={15}
                    className="ml-2 inline transition group-hover:translate-x-1"
                  />

                </button>


                <button
                  onClick={goToLogin}
                  className="
                    h-[46px]
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-7
                    text-[13px]
                    font-bold
                    text-[#092957]
                    shadow-sm
                    transition
                    duration-300
                    hover:-translate-y-0.5
                    hover:border-[#1268d5]
                    hover:text-[#1268d5]
                  "
                >
                  Sign In
                </button>

              </div>


              {/* =================================================
                  CAPABILITIES
              ================================================== */}

              <div
                className="
                  mx-auto
                  mt-9
                  grid
                  max-w-[620px]
                  grid-cols-3
                  border-t
                  border-slate-200
                "
              >

                <Capability
                  icon={<Users size={19} />}
                  title="Patient Risk"
                  subtitle="Intelligence"
                />

                <Capability
                  icon={<BarChart3 size={19} />}
                  title="Readmission"
                  subtitle="Forecasting"
                />

                <Capability
                  icon={<Stethoscope size={19} />}
                  title="Healthcare"
                  subtitle="Analytics"
                />

              </div>

            </div>


            {/* =================================================
                RIGHT FORECASTING PANEL
            ================================================== */}

            <div className="relative hidden h-[min(68vh,520px)] lg:block">

              <div
                className="
                  absolute
                  right-[-15px]
                  top-[50%]
                  w-[clamp(245px,20vw,305px)]
                  -translate-y-1/2
                  rotate-[1deg]
                  rounded-[23px]
                  border
                  border-white
                  bg-white/75
                  p-4
                  shadow-[0_20px_55px_rgba(20,90,150,0.14)]
                  backdrop-blur-xl
                  xl:right-0
                "
              >

                {/* Panel header */}

                <div className="mb-3">

                  <p className="text-[9px] font-bold text-[#1268d5]">
                    Forecasting
                  </p>

                  <h3 className="mt-1 text-[15px] font-bold leading-[1.15] text-[#092957]">
                    A Healthier
                    <br />
                    Tomorrow
                  </h3>

                </div>


                {/* CHART */}

                <div
                  className="
                    relative
                    h-[120px]
                    rounded-xl
                    border
                    border-blue-100
                    bg-white/90
                    p-2.5
                  "
                >

                  <svg
                    viewBox="0 0 300 150"
                    className="h-full w-full"
                    preserveAspectRatio="none"
                  >

                    <path
                      d="
                        M5 125
                        C30 115, 40 95, 65 105
                        S100 125, 125 90
                        S160 65, 180 85
                        S215 110, 230 55
                        S260 25, 295 45
                      "
                      fill="none"
                      stroke="#4b91f7"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />

                    <circle
                      cx="230"
                      cy="55"
                      r="5"
                      fill="#1268d5"
                    />

                  </svg>


                  <div
                    className="
                      absolute
                      right-2
                      top-2
                      rounded-lg
                      bg-white
                      px-2
                      py-1.5
                      shadow-md
                    "
                  >

                    <div className="flex items-center gap-1.5">

                      <ArrowRight
                        size={11}
                        className="rotate-90 text-teal-500"
                      />

                      <span className="text-[7px] font-bold text-slate-500">
                        Lower
                        <br />
                        Readmissions
                      </span>

                    </div>

                  </div>

                </div>


                {/* FORECAST ITEMS */}

                <div className="mt-3 space-y-2">

                  <ForecastItem
                    icon={<Users size={14} />}
                    title="Identify Risk"
                    subtitle="Earlier"
                  />

                  <ForecastItem
                    icon={<ShieldCheck size={14} />}
                    title="Enable Proactive"
                    subtitle="Care"
                  />

                  <ForecastItem
                    icon={<BarChart3 size={14} />}
                    title="Improve"
                    subtitle="Outcomes"
                  />

                </div>

              </div>

            </div>

          </div>

        </div>


        {/* ===================================================
            BOTTOM RIGHT TEXT
        ==================================================== */}

        <div
          className="
            pointer-events-none
            absolute
            bottom-5
            right-6
            z-20
            hidden
            text-right
            xl:block
          "
        >

          <p
            className="
              text-[8px]
              font-semibold
              uppercase
              leading-4
              tracking-[0.25em]
              text-[#8aa6ca]
            "
          >
            TECHNOLOGY
            <br />
            FOR HEALTHIER
            <br />
            TOMORROWS
          </p>

          <div className="ml-auto mt-2 h-[2px] w-8 bg-[#1268d5]" />

        </div>

      </section>

    </main>
  );
}


/* =========================================================
   CAPABILITY
========================================================= */

function Capability({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div
      className="
        flex
        items-center
        justify-center
        gap-2
        px-2
        py-3
        sm:gap-2.5
        sm:px-3
        sm:py-3.5
      "
    >

      <div
        className="
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-full
          bg-blue-50
          text-[#1268d5]
          sm:h-9
          sm:w-9
        "
      >
        {icon}
      </div>

      <div className="text-left">

        <p className="text-[9px] font-bold leading-4 text-[#092957] sm:text-[10px]">
          {title}
        </p>

        <p className="text-[9px] font-bold leading-4 text-[#092957] sm:text-[10px]">
          {subtitle}
        </p>

      </div>

    </div>
  );
}


/* =========================================================
   FORECAST ITEM
========================================================= */

function ForecastItem({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div
      className="
        flex
        items-center
        gap-2.5
        rounded-lg
        border
        border-blue-100
        bg-white/90
        px-2.5
        py-2
      "
    >

      <div
        className="
          flex
          h-7
          w-7
          shrink-0
          items-center
          justify-center
          rounded-full
          bg-blue-50
          text-[#1268d5]
        "
      >
        {icon}
      </div>

      <div>

        <p className="text-[8px] font-semibold leading-3.5 text-slate-500">
          {title}
        </p>

        <p className="text-[8px] font-semibold leading-3.5 text-slate-500">
          {subtitle}
        </p>

      </div>

    </div>
  );
}