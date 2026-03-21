// ###########################################################################
// # +html.tsx — Template HTML personnalise pour Expo Router (web)
// # Injecte un splash brande visible AVANT que React ne monte
// # Le splash se cache automatiquement quand #root recoit du contenu
// ###########################################################################

import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />

        {/* Splash brande — visible avant React */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body { background-color: #030306; margin: 0; }
              #pre-splash {
                position: fixed; inset: 0; z-index: 99999;
                display: flex; flex-direction: column;
                align-items: center; justify-content: center;
                background-color: #030306;
                transition: opacity 0.4s ease;
              }
              #pre-splash.hide { opacity: 0; pointer-events: none; }
              #pre-splash .ps-icon {
                width: 64px; height: 64px;
                animation: psPulse 1.6s ease-in-out infinite;
              }
              #pre-splash .ps-title {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 28px; font-weight: 700; color: #F0F0F5;
                margin-top: 10px; letter-spacing: 1px;
              }
              #pre-splash .ps-sub {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px; color: #8E8EA0; margin-top: 16px;
              }
              @keyframes psPulse {
                0%, 100% { opacity: 0.6; }
                50% { opacity: 1; }
              }
            `,
          }}
        />
      </head>
      <body>
        {/* Splash pre-React */}
        <div id="pre-splash">
          <svg
            className="ps-icon"
            viewBox="0 0 512 512"
            fill="#D0D4DC"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M479.07 111.36a16 16 0 00-13.15-14.74c-86.5-15.52-122.61-26.74-168.92-52.7a16 16 0 00-14-1.64 16 16 0 00-14 1.64c-46.31 25.96-82.42 37.18-168.92 52.7a16 16 0 00-13.15 14.74C73.93 184.55 80.28 336.87 256 448c175.72-111.13 182.07-263.45 169.07-336.64zM227.58 351.39l-56.56-56.56 22.63-22.63 33.94 33.94 78.38-78.38 22.63 22.63z" />
          </svg>
          <div className="ps-title">VerifNews</div>
          {/* Intentionally French — brand tagline, not translatable */}
          <div className="ps-sub">L'info verifiee</div>
        </div>

        {children}

        {/* Auto-retire le splash quand React a rendu */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var splash = document.getElementById('pre-splash');
                if (!splash) return;
                var observer = new MutationObserver(function() {
                  var root = document.getElementById('root');
                  if (root && root.children.length > 0) {
                    splash.classList.add('hide');
                    setTimeout(function() { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 500);
                    observer.disconnect();
                  }
                });
                var root = document.getElementById('root');
                if (root) observer.observe(root, { childList: true, subtree: true });
                // Fallback: retire apres 5s quoi qu'il arrive
                setTimeout(function() {
                  if (splash.parentNode) {
                    splash.classList.add('hide');
                    setTimeout(function() { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 500);
                  }
                }, 5000);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
