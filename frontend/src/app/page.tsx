
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const roles = [
  {
    id: "doctor",
    title: "Doctor",
    description: "Patient care & clinical insights",
    icon: "✚",
  },
  {
    id: "admin",
    title: "Hospital Administrator",
    description: "Hospital operations & analytics",
    icon: "▣",
  },
  {
    id: "researcher",
    title: "Healthcare Researcher",
    description: "Research & population analytics",
    icon: "⌕",
  },
  {
    id: "system-admin",
    title: "System Administrator",
    description: "Users, security & platform settings",
    icon: "⚙",
  },
];

export default function LoginPage() {
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState("doctor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!email || !password) {
    alert("Please enter your email and password.");
    return;
  }

  if (selectedRole === "doctor") {
    router.push("/doctor");
  }

  if (selectedRole === "admin") {
    router.push("/admin");
  }

  if (selectedRole === "researcher") {
    router.push("/researcher");
  }

  if (selectedRole === "system-admin") {
    router.push("/system-admin");
  }
}

  return (
    <main className="login-page">
      {/* Left branding panel */}
      <section className="login-brand-panel">
        <div className="login-brand-content">
          <div className="login-logo">
            <span>+</span>
          </div>

          <p className="login-eyebrow">
            PREDICTIVE HEALTHCARE INTELLIGENCE
          </p>

          <h1>
            HealthForecast
            <span> AI</span>
          </h1>

          <p className="login-description">
            Intelligent healthcare analytics designed to help clinical teams
            identify patient risks, understand outcomes and make data-driven
            decisions.
          </p>

          <div className="login-feature-list">
            <div className="login-feature">
              <div>✓</div>
              <span>Patient risk intelligence</span>
            </div>

            <div className="login-feature">
              <div>✓</div>
              <span>Readmission forecasting</span>
            </div>

            <div className="login-feature">
              <div>✓</div>
              <span>Clinical decision support</span>
            </div>

            <div className="login-feature">
              <div>✓</div>
              <span>Healthcare analytics</span>
            </div>
          </div>
        </div>

        <div className="login-brand-footer">
          <span>HealthForecast AI</span>
          <span>Secure Healthcare Platform</span>
        </div>
      </section>

      {/* Right login panel */}
      <section className="login-form-panel">
        <div className="login-form-container">
          <div className="mobile-login-logo">
            <div className="login-logo">
              <span>+</span>
            </div>

            <span>HealthForecast AI</span>
          </div>

          <div className="login-heading">
            <p className="login-small-label">WELCOME BACK</p>

            <h2>Sign in to your account</h2>

            <p>
              Access your healthcare intelligence workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">Email address</label>

              <div className="input-wrapper">
                <span className="input-icon">@</span>

                <input
                  id="email"
                  type="email"
                  placeholder="doctor@healthforecast.ai"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <div className="password-label-row">
                <label htmlFor="password">Password</label>

                <button
                  type="button"
                  className="forgot-button"
                  onClick={() =>
                    alert("Password reset will be connected to the backend.")
                  }
                >
                  Forgot password?
                </button>
              </div>

              <div className="input-wrapper">
                <span className="input-icon">●</span>

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Role */}
            <div className="form-group">
              <label>Sign in as</label>

              <div className="role-grid">
                {roles.map((role) => (
                  <button
                    type="button"
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`role-card ${
                      selectedRole === role.id
                        ? "role-card-selected"
                        : ""
                    }`}
                  >
                    <div className="role-icon">{role.icon}</div>

                    <div className="role-content">
                      <p>{role.title}</p>

                      <span>{role.description}</span>
                    </div>

                    <div className="role-radio">
                      {selectedRole === role.id && <span />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Remember */}
            <div className="remember-row">
              <label className="remember-label">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>

              <span className="secure-label">
                🔒 Secure login
              </span>
            </div>

            {/* Submit */}
            <button type="submit" className="login-submit">
              Sign in
              <span>→</span>
            </button>
          </form>

          <div className="login-divider">
            <span />
            <p>Healthcare Intelligence Platform</p>
            <span />
          </div>

          <p className="login-security-note">
            Your healthcare workspace is protected with secure
            authentication and role-based access controls.
          </p>

          <p className="login-version">
            HealthForecast AI · Version 1.0
          </p>
        </div>
      </section>
    </main>
  );
}