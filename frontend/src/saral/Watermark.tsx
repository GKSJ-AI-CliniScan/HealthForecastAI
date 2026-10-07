"use client";
// WHY: useState / useEffect / onError sirf browser mein chalte hain.
// Next.js App Router mein bina "use client" ke ye Server Component ban jata
// aur hooks error dete. FLOW: ye line poori file ko client bundle mein bhejti hai.

import { useEffect, useRef, useState } from "react";
// WHY: useState  -> logo load hua ya nahi, uska state (logoOk)
//      useRef    -> <img> element ko directly check karne ke liye
//      useEffect -> page load (hydration) ke baad ek baar check chalane ke liye

/**
 * Watermark — KP orbit logo, har page ke corner mein.
 *
 * Kaam: /public/logo-mark.svg dikhana. Agar logo load fail ho jaye
 * (file missing, galat path, network issue) toh tooti image ki jagah
 * simple "KP" text badge dikhana — watermark kabhi gayab nahi hota.
 *
 * Isi wajah se `logoOk` ab ACTUALLY render mein use ho raha hai,
 * aur ESLint ka "assigned but never used" error khatam.
 */
export function Watermark() {
  const [logoOk, setLogoOk] = useState(true);
  // WHY: default true — optimistic: maan ke chalo logo load hoga.
  // USE: false hote hi neeche fallback "KP" badge render hota hai.
  // FLOW: setLogoOk(false) do jagah se call hota hai — onError aur useEffect.

  const imgRef = useRef<HTMLImageElement>(null);
  // WHY: edge case ke liye (neeche useEffect dekho). <img> ka DOM element
  // yahan milta hai taaki uski load-state padh sakein.

  useEffect(() => {
    // EDGE CASE: Next.js server pe HTML bana ke bhejta hai. Agar logo
    // React ke hydrate hone SE PEHLE hi fail ho gaya, toh onError
    // handler attach hi nahi hua tha — error miss ho jata.
    // FIX: mount ke baad khud check karo: image "complete" hai par
    // naturalWidth 0 hai => matlab load fail hua tha.
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setLogoOk(false);
    }
  }, []);
  // WHY [] : sirf pehli baar (mount pe) chalana hai, har render pe nahi.

  return (
    <div
      aria-hidden="true"
      // WHY: watermark decoration hai. Screen reader users (blind users
      // feature) ko har page pe "KP logo" sunna irritating hoga — isliye hide.
      style={{
        position: "fixed", // scroll karne pe bhi corner mein tikka rahe
        right: "12px",
        bottom: "12px",
        zIndex: 50, // content ke upar dikhe, par modals (usually 1000+) ke neeche
        opacity: 0.35, // halka — UI ko distract na kare
        pointerEvents: "none", // IMPORTANT: neeche ke buttons/links pe click block na ho
        userSelect: "none", // text select karte waqt "KP" select na ho
      }}
    >
      {logoOk ? (
        // CASE 1: logo theek hai -> SVG dikhao
        // eslint-disable-next-line @next/next/no-img-element
        <img
          // WHY plain <img> (next/image nahi): chhota local SVG hai,
          // optimization ka koi fayda nahi. Ye rule sirf warning hai,
          // disable line sirf saaf console ke liye.
          ref={imgRef}
          src="/logo-mark.svg" // FLOW: Next.js /public folder se serve karta hai
          alt="" // decorative image -> khaali alt (accessibility rule)
          width={40}
          height={40}
          draggable={false}
          onError={() => setLogoOk(false)}
          // FLOW: load fail -> logoOk=false -> re-render -> CASE 2 dikhega
        />
      ) : (
        // CASE 2: logo fail hua -> text fallback, watermark phir bhi dikhe
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1.5px solid currentColor",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          KP
        </span>
      )}
    </div>
  );
}
export default Watermark;
