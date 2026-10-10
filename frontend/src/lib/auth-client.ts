// =====================================================================
// auth-client.ts — browser side login / logout.
// WHY alag file: login page sirf UI rakhe; API call, role nikalna, cookie
// set karna yahan. Kal koi aur page (signup, session timeout) bhi yahi use kare.
// FLOW: login/page.tsx -> login() -> backend -> cookies -> middleware padhta hai.
// =====================================================================

import {
  API_BASE,
  COOKIE_ROLE,
  COOKIE_TOKEN,
  LOGIN_BODY_FORMAT,
  LOGIN_ENDPOINT,
  SESSION_MAX_AGE_SECONDS,
  decodeJwtPayload,
  normalizeRole,
  type Role,
} from "./auth-config";

// WHY custom error: UI ko pata chale KAUNSI galti hui, taaki sahi message dikhe.
export type AuthErrorCode =
  | "invalid_credentials" // galat email/password (401/403)
  | "network" // backend tak pahunch hi nahi paye
  | "server" // backend 500 etc.
  | "bad_response" // token ya role missing / unknown
  | "role_mismatch"; // picker ka role != account ka role

export class AuthError extends Error {
  constructor(public code: AuthErrorCode, public actualRole?: Role) {
    super(code);
  }
}

// Cookie likhne ka helper.
function setCookie(name: string, value: string, maxAge: number) {
  // WHY Secure sirf https pe: localhost (http) pe Secure cookie set hi nahi hoti.
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  // WHY SameSite=Lax: dusri site se aaye forged requests ke saath cookie nahi jaati.
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function logout() {
  // WHY Max-Age=0: browser turant cookie delete kar deta hai.
  setCookie(COOKIE_TOKEN, "", 0);
  setCookie(COOKIE_ROLE, "", 0);
}

// Browser JS se token padhne ke liye (API calls mein Authorization header).
export function getToken(): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_TOKEN}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * login — email + password backend ko bhejo, role BACKEND se lo.
 * @param expectedRole sirf tab jab SHOW_ROLE_PICKER = true. Ye check karta hai,
 *                     decide NAHI karta — decide hamesha backend ka role karta hai.
 */
export async function login(
  email: string,
  password: string,
  expectedRole?: Role
): Promise<Role> {
  // ---- 1. Request body (format config se) ----
  const isForm = LOGIN_BODY_FORMAT === "form";
  const body = isForm
    ? new URLSearchParams({ username: email, password })
    : JSON.stringify({ email, password });

  // ---- 2. Backend call ----
  let res: Response;
  try {
    res = await fetch(API_BASE + LOGIN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": isForm
          ? "application/x-www-form-urlencoded"
          : "application/json",
      },
      body,
    });
  } catch {
    throw new AuthError("network"); // backend band hai / CORS / galat URL
  }

  if (res.status === 401 || res.status === 403 || res.status === 422) {
    throw new AuthError("invalid_credentials");
  }
  if (!res.ok) throw new AuthError("server");

  // ---- 3. Token + role nikalo (kai common shapes support) ----
  const data = await res.json().catch(() => null);
  const token: unknown = data?.access_token ?? data?.token;
  if (typeof token !== "string" || !token) throw new AuthError("bad_response");

  // WHY order: pehle response ka role, phir user object, phir JWT claim.
  const role = normalizeRole(
    data?.role ?? data?.user?.role ?? decodeJwtPayload(token)?.role
  );
  // SECURITY: unknown role -> reject. Kabhi "doctor" ya kuch default mat maano.
  if (!role) throw new AuthError("bad_response");

  // ---- 4. Picker check (agar picker on hai) ----
  if (expectedRole && expectedRole !== role) {
    // Cookie set hi nahi karte — user andar jata hi nahi.
    throw new AuthError("role_mismatch", role);
  }

  // ---- 5. Session save ----
  // NOTE: hf_role cookie sirf UX routing ke liye hai (middleware). Koi isse
  // edit kare toh bhi data nahi milega — backend har API pe token ka role
  // check karke 403 deta hai. ASLI security wahi hai.
  setCookie(COOKIE_TOKEN, token, SESSION_MAX_AGE_SECONDS);
  setCookie(COOKIE_ROLE, role, SESSION_MAX_AGE_SECONDS);
  return role; // FLOW: login page is role ke home pe redirect karega
}
