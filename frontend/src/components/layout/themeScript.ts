/** localStorage key holding the viewer's explicit choice: "light" or "dark". */
export const THEME_STORAGE_KEY = 'hfai-theme';

/**
 * Runs in <head> before first paint, so a saved choice is applied before the
 * page is drawn (no flash of the wrong theme). With nothing saved it does
 * nothing and the system setting decides, through the CSS media query. A
 * constant string - no request data is ever interpolated into it.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;
