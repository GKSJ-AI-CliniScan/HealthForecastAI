// =====================================================================
// middleware.ts — har page request se PEHLE chalta hai (Next.js edge).
// WHY: doctor agar address bar mein "/admin" type kare, toh page dikhne se
// pehle hi use apne workspace pe wapas bhej do.
// ⚠️ Ye UX guard hai. Asli lock backend ka require_role + 403 hai.
// ⚠️ Location: `src/` folder use ho raha hai toh ye file src/middleware.ts
//    pe hi rehni chahiye (app/ ke andar NAHI), warna Next.js ise chalata hi nahi.
// =====================================================================

import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_ROLE,
  COOKIE_TOKEN,
  LOGIN_PATH,
  ROLES,
  isTokenExpired,
  normalizeRole,
  roleForPath,
} from "./lib/auth-config";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ---- 1. Session padho ----
  const token = req.cookies.get(COOKIE_TOKEN)?.value;
  const role = normalizeRole(req.cookies.get(COOKIE_ROLE)?.value);
  // WHY expiry yahan bhi: expired token wala user dashboard pe pahunch ke
  // har API pe 401 dekhe, usse achha seedha login pe bhejo.
  const loggedIn = Boolean(token && role && !isTokenExpired(token));

  // ---- 2. Login page: pehle se logged in ho toh apne workspace pe bhejo ----
  if (pathname === LOGIN_PATH) {
    if (loggedIn && role) {
      return NextResponse.redirect(new URL(ROLES[role].home, req.url));
    }
    return NextResponse.next();
  }

  // ---- 3. Ye path kis role ka hai? Kisi ka nahi -> public, jaane do ----
  const areaRole = roleForPath(pathname);
  if (!areaRole) return NextResponse.next();

  // ---- 4. Protected area, par login nahi -> login pe, wapsi ka path saath ----
  if (!loggedIn || !role) {
    const url = new URL(LOGIN_PATH, req.url);
    url.searchParams.set("next", pathname); // login ke baad yahin wapas
    const res = NextResponse.redirect(url);
    // Expired/kharab cookies saaf karo taaki loop na bane.
    res.cookies.delete(COOKIE_TOKEN);
    res.cookies.delete(COOKIE_ROLE);
    return res;
  }

  // ---- 5. GALAT ROLE: doctor ne /admin khola -> doctor ke home pe ----
  if (areaRole !== role) {
    return NextResponse.redirect(new URL(ROLES[role].home, req.url));
  }

  return NextResponse.next(); // sahi role, sahi area
}

// WHY matcher: static files, images, _next aur /api pe middleware chalana
// bekaar hai (slow) — sirf pages pe chalao.
export const config = {
  matcher: ["/((?!_next/static|_next/image|api|favicon.ico|.*\\..*).*)"],
};
