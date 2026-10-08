// =====================================================================
// auth-config.ts — RBAC ki SAARI settings ek hi jagah.
// WHY: Samarth ka exact login response abhi confirm nahi hua. Agar role
// ke naam, route ya endpoint alag nikle, toh sirf YE file badalni padegi —
// baaki code (login page, middleware) yahin se padhta hai.
// FLOW: auth-client.ts, middleware.ts aur login/page.tsx teeno isse import karte hain.
// =====================================================================

// ---- 1. Roles aur unke workspace routes --------------------------------
// WHY: har role ka apna "ghar" (home route). Login ke baad user wahin jata hai,
// aur middleware isi se decide karta hai ki kaunsa route kis role ka hai.
// ⚠️ Keys (doctor, hospital_admin...) backend ke role values se MATCH honi chahiye.
export const ROLES = {
  doctor: { label: "Doctor", home: "/doctor" },
  hospital_admin: { label: "Hospital Administrator", home: "/hospital" },
  researcher: { label: "Healthcare Researcher", home: "/researcher" },
  system_admin: { label: "System Administrator", home: "/admin" },
} as const;

export type Role = keyof typeof ROLES;
// WHY: TypeScript type — galat role string likhoge toh compile time pe hi error.

// ---- 2. Backend ke alag naam -> humare naam ----------------------------
// WHY: agar backend "admin" ya "hospital" bhejta hai, toh unhe yahan map karo.
// Jo role na ROLES mein ho na yahan — woh REJECT hoga (kisi default role pe nahi girega).
export const ROLE_ALIASES: Record<string, Role> = {
  admin: "system_admin",
  system: "system_admin",
  hospital: "hospital_admin",
  healthcare_researcher: "researcher",
};

// ---- 3. Backend API ----------------------------------------------------
// WHY NEXT_PUBLIC_: browser se call hoti hai. ⚠️ Docker mein ye value BUILD
// time pe bake hoti hai — compose mein build.args se pass karni padegi.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const LOGIN_ENDPOINT = "/auth/login";

// WHY: FastAPI ka OAuth2PasswordRequestForm "form" + `username` field leta hai,
// custom endpoint usually "json" + `email`. Samarth se confirm karke set karo.
export const LOGIN_BODY_FORMAT: "json" | "form" = "json";

// ---- 4. Cookies --------------------------------------------------------
// WHY cookie (localStorage nahi): Next.js middleware server/edge pe chalta hai,
// woh sirf cookies padh sakta hai, localStorage nahi.
export const COOKIE_TOKEN = "hf_token";
export const COOKIE_ROLE = "hf_role";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 ghante (ek shift)

// ---- 5. Role picker toggle ---------------------------------------------
// false = sirf email + password.
// true  = screen pe role picker dikhega (Samarth ki request), PAR picker sirf
//         "kaunsa portal" ka hint hai — backend ka role hi final hai; mismatch
//         pe login reject hota hai. Isliye true karna bhi secure hai.
export const SHOW_ROLE_PICKER = false;

// ---- 6. Bina login wale pages ------------------------------------------
export const LOGIN_PATH = "/login";

// ---- Helpers (pure functions, browser + middleware dono mein chalte hain) ----

// Kisi bhi string ko humare Role mein badlo, ya null (unknown = reject).
export function normalizeRole(value: unknown): Role | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v in ROLES) return v as Role;
  return ROLE_ALIASES[v] ?? null;
}

// Diya hua path kis role ke area ka hai? (e.g. "/admin/users" -> system_admin)
export function roleForPath(pathname: string): Role | null {
  for (const [role, cfg] of Object.entries(ROLES)) {
    if (pathname === cfg.home || pathname.startsWith(cfg.home + "/")) {
      return role as Role;
    }
  }
  return null; // public ya shared page
}

// JWT ka payload padho (signature VERIFY nahi hota — woh backend ka kaam hai).
// USE: token se role nikalna (agar response mein na ho) aur expiry check.
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded)); // atob browser + edge dono mein hai
  } catch {
    return null; // token JWT nahi hai (opaque token) — koi baat nahi
  }
}

// Token expire ho gaya? exp claim na ho toh "nahi" maano (backend 401 dega).
export function isTokenExpired(token: string): boolean {
  const exp = decodeJwtPayload(token)?.exp;
  return typeof exp === "number" && exp * 1000 <= Date.now();
}
