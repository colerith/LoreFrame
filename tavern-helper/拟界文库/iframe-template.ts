function buildIframeHtml() {
  return `
      <!doctype html>
      <html lang="zh-CN">
        <head>
          <meta charset="utf-8" />
          <link rel="stylesheet" href="${FONT_AWESOME_CSS_URL}" />
          <style>
            :root {
              color-scheme: normal;
              font-family:
                Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              width: 100%;
              height: 100%;
              margin: 0;
              overflow: hidden;
              background: transparent;
            }

            button {
              font: inherit;
            }

            body {
              --safe-top: 0px;
              --safe-right: 0px;
              --safe-bottom: 0px;
              --safe-left: 0px;
              --safe-top-final: max(env(safe-area-inset-top, 0px), var(--safe-top));
              --safe-right-final: max(env(safe-area-inset-right, 0px), var(--safe-right));
              --safe-bottom-final: max(env(safe-area-inset-bottom, 0px), var(--safe-bottom));
              --safe-left-final: max(env(safe-area-inset-left, 0px), var(--safe-left));
              --mobile-header-height: 96px;
              --mobile-body-top: 96px;
              --mobile-body-height: calc(100dvh - 96px);
              --panel-bg: #f6f4f1;
              --panel-bg-soft: rgba(255, 255, 255, 0.68);
              --panel-popup-bg: rgba(255, 238, 230, 0.92);
              --panel-border: rgba(112, 122, 145, 0.18);
              --panel-text: #2a313f;
              --panel-muted: rgba(42, 49, 63, 0.58);
              --panel-control: rgba(255, 255, 255, 0.62);
              --panel-control-hover: rgba(255, 255, 255, 0.9);
              --panel-accent: #85a9d8;
              --panel-accent-strong: #587ba9;
              --panel-danger: #c06a67;
              --panel-shadow: 0 18px 44px rgba(126, 137, 163, 0.18);
              --panel-shadow-soft: 0 10px 28px rgba(126, 137, 163, 0.12);
              --panel-glow: radial-gradient(circle at top left, rgba(145, 192, 255, 0.22), transparent 42%);
              --bubble-bg: rgba(255, 255, 255, 0.78);
              --bubble-bg-hover: rgba(255, 255, 255, 0.9);
              --bubble-text: var(--panel-text);
              --switch-track: rgba(126, 146, 176, 0.28);
              --switch-knob: #ffffff;
              background:
                radial-gradient(circle at top left, rgba(160, 203, 255, 0.16), transparent 34%),
                radial-gradient(circle at 85% 14%, rgba(255, 213, 196, 0.18), transparent 28%),
                linear-gradient(180deg, #faf9f7 0%, #f1efec 100%);
              border-radius: 26px;
            }

            body.theme-night {
              --panel-bg: #11161e;
              --panel-bg-soft: rgba(27, 34, 46, 0.82);
              --panel-popup-bg: rgba(83, 64, 60, 0.92);
              --panel-border: rgba(196, 211, 238, 0.14);
              --panel-text: #edf3ff;
              --panel-muted: rgba(220, 229, 245, 0.7);
              --panel-control: rgba(155, 177, 214, 0.12);
              --panel-control-hover: rgba(185, 204, 236, 0.18);
              --panel-accent: #8db1df;
              --panel-accent-strong: #d3e2fb;
              --panel-danger: #ef9a95;
              --panel-shadow: 0 22px 52px rgba(4, 8, 20, 0.42);
              --panel-shadow-soft: 0 14px 30px rgba(4, 8, 20, 0.28);
              --panel-glow: radial-gradient(circle at top left, rgba(122, 164, 247, 0.18), transparent 42%);
              --bubble-bg: rgba(25, 32, 44, 0.82);
              --bubble-bg-hover: rgba(32, 40, 55, 0.94);
              --bubble-text: var(--panel-text);
              --switch-track: rgba(167, 189, 225, 0.2);
              --switch-knob: #f5f8ff;
              background:
                radial-gradient(circle at top left, rgba(90, 130, 207, 0.22), transparent 34%),
                radial-gradient(circle at 85% 14%, rgba(128, 96, 88, 0.14), transparent 28%),
                linear-gradient(180deg, #131924 0%, #0d1219 100%);
            }

            .online-bubble {
              position: absolute;
              inset: 0;
              display: grid;
              width: 100%;
              height: 100%;
              place-items: center;
              border: 0;
              border-radius: 999px;
              background: transparent;
              color: white;
              cursor: pointer;
              touch-action: none;
              user-select: none;
              transition:
                filter 180ms ease,
                transform 180ms ease;
            }

            .online-bubble:hover {
              filter: none;
            }

            .online-bubble:active {
              transform: scale(0.98);
            }

            .online-bubble__orb {
              display: grid;
              width: 45px;
              height: 45px;
              place-items: center;
              border: 0;
              border-radius: 999px;
              background: var(--bubble-bg);
              box-shadow: var(--panel-shadow-soft);
              backdrop-filter: blur(18px);
              color: var(--bubble-text);
              pointer-events: none;
              transition: transform 180ms ease;
            }

            .online-bubble:hover .online-bubble__orb {
              transform: scale(1.04);
            }

            .online-bubble__icon {
              position: relative;
              display: grid;
              width: 26px;
              height: 26px;
              place-items: center;
              line-height: 1;
            }

            .online-bubble__icon-state {
              position: absolute;
              inset: 0;
              display: grid;
              place-items: center;
              opacity: 0;
              transform: scale(0.82) rotate(-12deg);
              transition:
                opacity 220ms ease,
                transform 220ms ease;
            }

            .online-bubble__icon-state svg {
              width: 26px;
              height: 26px;
              display: block;
            }

            .online-bubble__icon-state i {
              font-size: 26px;
              line-height: 1;
            }

            .online-content-status-icon {
              position: relative;
              display: grid;
              width: 26px;
              height: 26px;
              place-items: center;
            }

            .online-content-status-icon--success {
              color: #55b48a;
            }

            .online-content-status-icon--error {
              color: #e06c75;
            }

            .online-content-status-icon--loading {
              color: currentColor;
            }

            .online-content-status-icon__ring {
              position: absolute;
              inset: 0;
              display: grid;
              place-items: center;
              animation: onlineContentBubbleSpin 0.95s linear infinite;
            }

            .online-content-status-icon__ring--back {
              opacity: 0.22;
              transform: scale(0.92);
              animation-direction: reverse;
              animation-duration: 1.4s;
            }

            .online-content-status-icon__spark {
              position: absolute;
              top: -2px;
              right: -1px;
              color: #ffd36e;
              font-size: 9px;
              filter: drop-shadow(0 0 6px rgba(255, 211, 110, 0.42));
              animation: onlineContentBubbleSpark 0.9s ease-in-out infinite alternate;
            }

            @keyframes onlineContentBubbleSpin {
              from {
                transform: rotate(0deg);
              }
              to {
                transform: rotate(360deg);
              }
            }

            @keyframes onlineContentBubbleSpark {
              from {
                transform: translate3d(-1px, 1px, 0) scale(0.88);
                opacity: 0.56;
              }
              to {
                transform: translate3d(1px, -1px, 0) scale(1.08);
                opacity: 1;
              }
            }

            body[data-bubble-state="idle"] .online-bubble__icon-state.is-idle,
            body[data-bubble-state="loading"] .online-bubble__icon-state.is-loading,
            body[data-bubble-state="success"] .online-bubble__icon-state.is-success,
            body[data-bubble-state="error"] .online-bubble__icon-state.is-error {
              opacity: 1;
              transform: scale(1) rotate(0deg);
            }

            .online-panel {
              position: relative;
              display: none;
              width: 100%;
              height: 100%;
              overflow: hidden;
              border: 1px solid var(--panel-border);
              border-radius: 26px;
              clip-path: inset(0 round 26px);
              background:
                var(--panel-glow),
                linear-gradient(180deg, color-mix(in srgb, var(--panel-bg) 92%, white 8%) 0%, var(--panel-bg) 100%);
              box-shadow: var(--panel-shadow);
              backdrop-filter: blur(26px);
              color: var(--panel-text);
              isolation: isolate;
            }

            .online-panel::before {
              position: absolute;
              inset: 0;
              border-radius: inherit;
              background:
                linear-gradient(135deg, rgba(255, 255, 255, 0.46), transparent 24%, transparent 72%, rgba(255, 255, 255, 0.18));
              content: "";
              pointer-events: none;
              z-index: 0;
            }

            .online-panel::after {
              position: absolute;
              inset: 0;
              border-radius: inherit;
              box-shadow:
                inset 0 0 0 1px rgba(255, 255, 255, 0.22),
                inset 0 22px 40px rgba(255, 255, 255, 0.06),
                0 0 0 1px rgba(255, 255, 255, 0.06);
              content: "";
              pointer-events: none;
              z-index: 0;
            }

            .inline-toast {
              position: absolute;
              top: calc(62px + var(--safe-top-final));
              left: 50%;
              z-index: 20;
              max-width: min(320px, calc(100% - 28px));
              transform: translateX(-50%);
              border: 1px solid var(--panel-border);
              border-radius: 16px;
              background: var(--panel-popup-bg);
              box-shadow: var(--panel-shadow-soft);
              backdrop-filter: blur(18px);
              color: var(--panel-text);
              font-size: 12px;
              line-height: 1.5;
              padding: 8px 12px;
              pointer-events: none;
            }

            .panel-resize-handle {
              position: absolute;
              right: 0;
              bottom: 0;
              z-index: 4;
              display: none;
              width: 18px;
              height: 18px;
              border: 0;
              background: transparent;
              color: var(--panel-muted);
              cursor: nwse-resize;
              padding: 0;
              touch-action: none;
            }

            .panel-resize-handle::before {
              position: absolute;
              right: 4px;
              bottom: 4px;
              width: 9px;
              height: 9px;
              border-right: 2px solid currentColor;
              border-bottom: 2px solid currentColor;
              content: "";
              opacity: 0.7;
            }

            body.is-desktop .panel-resize-handle {
              display: block;
            }

            .online-panel__header {
              position: relative;
              z-index: 1;
              display: flex;
              min-height: 62px;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              padding: 14px 18px 12px 20px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.28);
              background: linear-gradient(180deg, rgba(255, 255, 255, 0.54), rgba(255, 255, 255, 0.18));
              backdrop-filter: blur(18px);
            }

            .online-panel__actions {
              display: flex;
              flex: 0 0 auto;
              align-items: center;
              gap: 10px;
            }

            .online-panel__header .online-icon-button {
              width: 30px;
              height: 30px;
            }

            .header-switch {
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1;
              white-space: nowrap;
            }

            .theme-switch {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              border: 0;
              background: transparent;
              color: var(--panel-muted);
              cursor: pointer;
              padding: 0;
              touch-action: manipulation;
            }

            .theme-switch__label {
              min-width: 28px;
              font-size: 12px;
              line-height: 1;
              text-align: right;
            }

            .theme-switch__track {
              position: relative;
              display: block;
              width: 42px;
              height: 24px;
              border-radius: 999px;
              background: var(--switch-track);
              transition: background 160ms ease;
            }

            .theme-switch__track::after {
              position: absolute;
              top: 3px;
              left: 3px;
              width: 18px;
              height: 18px;
              border-radius: 999px;
              background: var(--switch-knob);
              content: "";
              transition: transform 160ms ease;
            }

            body.theme-night .theme-switch__track::after {
              transform: translateX(18px);
            }

            .online-panel__title {
              display: flex;
              min-width: 0;
              align-items: center;
              gap: 10px;
              flex-wrap: wrap;
              overflow: hidden;
              cursor: move;
              touch-action: none;
              user-select: none;
            }

            .online-panel__title-brand {
              display: inline-flex;
              min-width: 0;
              align-items: center;
              gap: 10px;
              flex: 0 1 auto;
              max-width: 100%;
            }

            .online-panel__title strong {
              min-width: 0;
              display: block;
              overflow: hidden;
              font-size: 18px;
              font-weight: 700;
              letter-spacing: 0.01em;
              line-height: 1.25;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .online-panel__version {
              display: inline-flex;
              flex: 0 0 auto;
              align-items: center;
              justify-content: center;
              padding: 4px 10px;
              border: 1px solid color-mix(in srgb, var(--panel-accent) 44%, white 18%);
              border-radius: 999px;
              background: color-mix(in srgb, var(--panel-accent) 18%, white 82%);
              color: color-mix(in srgb, var(--panel-accent-strong) 82%, var(--panel-text) 18%);
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.08em;
              line-height: 1;
              text-transform: uppercase;
              white-space: nowrap;
            }

            .online-panel__title-meta {
              display: inline-flex;
              min-width: 0;
              align-items: center;
              gap: 8px;
              margin-top: 1px;
              flex: 0 1 auto;
            }

            .online-panel__title-divider {
              flex: 0 0 auto;
              color: color-mix(in srgb, var(--panel-accent) 68%, white 32%);
              font-size: 13px;
              line-height: 1;
              opacity: 0.72;
            }

            .online-panel__title-character {
              display: block;
              min-width: 0;
              overflow: hidden;
              color: rgba(20, 33, 61, 0.62);
              color: var(--panel-muted);
              font-size: 13px;
              line-height: 1.2;
              opacity: 0.76;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .online-close {
              display: grid;
              flex: 0 0 auto;
              width: 34px;
              height: 34px;
              place-items: center;
              border: 1px solid color-mix(in srgb, var(--panel-border) 84%, white 16%);
              border-radius: 999px;
              background:
                linear-gradient(180deg, color-mix(in srgb, var(--panel-bg-soft) 84%, white 16%), color-mix(in srgb, var(--panel-control) 78%, transparent 22%));
              box-shadow:
                0 10px 20px rgba(120, 132, 156, 0.12),
                inset 0 1px 0 rgba(255, 255, 255, 0.34);
              backdrop-filter: blur(14px);
              color: var(--panel-muted);
              cursor: pointer;
              transition:
                color 160ms ease,
                background 160ms ease,
                box-shadow 160ms ease,
                transform 160ms ease;
            }

            .online-close svg {
              width: 14px;
              height: 14px;
              pointer-events: none;
            }

            .online-close:hover {
              background:
                linear-gradient(180deg, color-mix(in srgb, var(--panel-control-hover) 86%, white 14%), color-mix(in srgb, var(--panel-bg-soft) 88%, transparent 12%));
              box-shadow:
                0 14px 24px rgba(120, 132, 156, 0.16),
                inset 0 1px 0 rgba(255, 255, 255, 0.42);
              color: var(--panel-text);
              transform: translateY(-1px) scale(1.03);
            }

            .online-panel__body {
              position: relative;
              display: block;
              height: calc(100% - 62px);
              overflow: hidden;
              z-index: 1;
            }

            .online-sidebar {
              position: absolute;
              z-index: 2;
              top: 0;
              bottom: 0;
              left: 0;
              display: flex;
              width: 240px;
              flex-direction: column;
              justify-content: flex-start;
              gap: 18px;
              min-width: 0;
              overflow-x: hidden;
              overflow-y: auto;
              padding: 18px 16px 18px;
              border-right: 1px solid rgba(255, 255, 255, 0.24);
              background: linear-gradient(180deg, rgba(255, 255, 255, 0.56), rgba(255, 255, 255, 0.24));
              backdrop-filter: blur(18px);
              scrollbar-color: rgba(24, 33, 29, 0.28) transparent;
              scrollbar-width: thin;
              transform: translateX(-100%);
              transition: transform 180ms ease;
            }

            .online-sidebar::-webkit-scrollbar,
            .online-main::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }

            .online-sidebar::-webkit-scrollbar-track,
            .online-main::-webkit-scrollbar-track {
              background: transparent;
            }

            .online-sidebar::-webkit-scrollbar-thumb,
            .online-main::-webkit-scrollbar-thumb {
              border: 2px solid transparent;
              border-radius: 999px;
              background: rgba(24, 33, 29, 0.28);
              background-clip: padding-box;
            }

            body.theme-night .online-sidebar,
            body.theme-night .online-main {
              scrollbar-color: rgba(166, 210, 190, 0.42) transparent;
            }

            body.theme-night .online-sidebar::-webkit-scrollbar-thumb,
            body.theme-night .online-main::-webkit-scrollbar-thumb {
              background: rgba(166, 210, 190, 0.42);
              background-clip: padding-box;
            }

            body.theme-night .online-panel__version {
              border-color: color-mix(in srgb, var(--panel-accent) 54%, white 8%);
              background: color-mix(in srgb, var(--panel-accent) 20%, rgba(18, 24, 35, 0.8) 80%);
              color: #d9e8ff;
            }

            body.sidebar-open .online-sidebar {
              transform: translateX(0);
            }

            body.is-settings-root .online-sidebar,
            body.is-settings-root:not(.is-mobile) .sidebar-toggle {
              display: none !important;
            }

            .sidebar-toggle {
              position: absolute;
              z-index: 3;
              top: 50%;
              left: 0;
              display: grid;
              width: 24px;
              height: 54px;
              place-items: center;
              border: 1px solid rgba(255, 255, 255, 0.32);
              border-left: 0;
              border-radius: 0 14px 14px 0;
              background: color-mix(in srgb, var(--panel-bg) 74%, transparent 26%);
              box-shadow: var(--panel-shadow-soft);
              backdrop-filter: blur(16px);
              color: var(--panel-text);
              cursor: pointer;
              font-size: 22px;
              line-height: 1;
              opacity: 0.84;
              transform: translateY(-50%);
              transition:
                left 180ms ease,
                background 160ms ease,
                opacity 160ms ease;
            }

            .sidebar-toggle:hover {
              background: color-mix(in srgb, var(--panel-control-hover) 78%, transparent 22%);
              opacity: 1;
            }

            body.sidebar-open .sidebar-toggle {
              left: 240px;
            }

            .sidebar-sections {
              display: grid;
              gap: 18px;
              align-content: start;
            }

            .sidebar-section {
              border-top: 1px solid rgba(255, 255, 255, 0.28);
              padding-top: 16px;
            }

            .sidebar-section:first-child {
              border-top: 0;
              padding-top: 0;
            }

            .sidebar-section summary {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              min-height: 24px;
              cursor: pointer;
              list-style: none;
              color: var(--panel-muted);
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.04em;
              line-height: 1.2;
              text-transform: uppercase;
              user-select: none;
            }

            .sidebar-section summary::-webkit-details-marker {
              display: none;
            }

            .sidebar-section summary::after {
              content: '›';
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 16px;
              height: 16px;
              border-radius: 999px;
              color: var(--panel-muted);
              background: transparent;
              font-size: 15px;
              transition: transform 160ms ease, background 160ms ease;
            }

            .sidebar-section summary:hover::after {
              background: var(--panel-control);
            }

            .sidebar-section[open] summary::after {
              transform: rotate(90deg);
            }

            .sidebar-section .online-nav {
              margin-top: 9px;
            }

            .online-sidebar__label {
              margin: 0;
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1.5;
            }

            .online-nav {
              display: grid;
              gap: 8px;
              margin-top: 0;
            }

            .online-nav__item {
              display: grid;
              grid-template-columns: minmax(0, 1fr) auto;
              width: 100%;
              min-width: 0;
              align-items: center;
              gap: 8px;
              border: 1px solid rgba(255, 255, 255, 0.3);
              border-radius: 16px;
              background: rgba(255, 255, 255, 0.42);
              box-shadow: 0 8px 20px rgba(150, 159, 184, 0.08);
              backdrop-filter: blur(12px);
              color: var(--panel-text);
              cursor: pointer;
              padding: 10px 11px;
              text-align: left;
              transition:
                background 140ms ease,
                border-color 140ms ease,
                transform 140ms ease,
                box-shadow 140ms ease;
            }

            .online-nav__item:hover,
            .online-nav__item.is-active {
              border-color: rgba(133, 169, 216, 0.42);
              background: rgba(255, 255, 255, 0.82);
              box-shadow: 0 14px 28px rgba(134, 151, 183, 0.12);
              transform: translateY(-1px);
            }

            .online-nav__item.is-active {
              color: var(--panel-accent-strong);
            }

            .online-nav__item span {
              min-width: 0;
              overflow: hidden;
              font-size: 12px;
              font-weight: 600;
              line-height: 1.25;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .online-nav__item small {
              color: var(--panel-muted);
              font-size: 10px;
              line-height: 1;
              white-space: nowrap;
            }

            .online-main {
              display: flex;
              flex-direction: column;
              justify-content: stretch;
              align-items: center;
              width: 100%;
              height: 100%;
              min-width: 0;
              gap: 12px;
              padding: 18px 18px 24px;
              overflow: auto;
              background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 20%);
              scrollbar-color: rgba(24, 33, 29, 0.28) transparent;
              scrollbar-width: thin;
            }

            .online-panel__copyright {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 2px;
              width: calc(100% - 20px);
              margin: 0 10px;
              padding: 6px 2px 0;
              color: var(--panel-muted);
              font-size: 11px;
              line-height: 1.45;
              pointer-events: none;
              text-align: center;
              user-select: none;
            }

            .online-panel__copyright strong {
              color: var(--panel-text);
              font-weight: 700;
            }

            .online-panel__copyright-label {
              opacity: 0.74;
            }

            .online-panel__copyright-line {
              opacity: 0.88;
            }

            .online-panel__copyright.is-mobile-footer {
              display: none;
              width: 100%;
              margin: 0;
              padding: 10px 10px 20px;
            }

            body.is-settings-root .online-main {
              padding-left: 0;
              overflow: auto;
              align-items: stretch;
            }

            .view-panel {
              display: flex;
              width: min(100%, 680px);
              flex-direction: column;
              align-items: center;
              gap: 18px;
            }

            .view-panel[data-view="online"] {
              width: 100%;
              height: 100%;
              align-items: stretch;
              gap: 8px;
            }

            .view-panel[data-view="settings"] {
              width: 100%;
              max-width: 1040px;
              align-items: stretch;
            }

            .view-panel[data-view="theater"] {
              width: 100%;
              max-width: 1040px;
              align-items: stretch;
              min-height: 100%;
            }

            .view-panel[data-view="theater-edit"],
            .view-panel[data-view="settings"] {
              width: 100%;
              max-width: 1040px;
              align-items: stretch;
              min-height: 100%;
            }

            .view-panel[hidden] {
              display: none;
            }

            .online-empty {
              max-width: 420px;
              text-align: center;
            }

            .online-empty__icon {
              display: grid;
              width: 76px;
              height: 76px;
              margin: 0 auto 18px;
              place-items: center;
              border: 1px solid var(--panel-border);
              border-radius: 18px;
              background: var(--panel-bg-soft);
              color: var(--panel-accent-strong);
              font-size: 34px;
            }

            .online-empty h2 {
              margin: 0;
              color: var(--panel-text);
              font-size: 20px;
              line-height: 1.35;
            }

            .online-empty p {
              margin: 10px 0 0;
              color: var(--panel-muted);
              font-size: 13px;
              line-height: 1.7;
            }

            .debug-panel {
              width: min(100%, 860px);
              border: 1px solid rgba(255, 255, 255, 0.32);
              border-radius: 24px;
              overflow: hidden;
              background: rgba(255, 255, 255, 0.52);
              box-shadow: var(--panel-shadow-soft);
              backdrop-filter: blur(22px);
              text-align: left;
            }

            .debug-panel__header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              padding: 16px 18px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.28);
              background: linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.18));
            }

            .debug-panel__header strong {
              font-size: 15px;
            }

            .settings-layout {
              display: grid;
              grid-template-columns: 220px minmax(0, 1fr);
              gap: 0;
              width: 100%;
              min-width: 0;
              align-items: stretch;
            }

            .settings-column {
              display: grid;
              gap: 12px;
              align-content: start;
              position: sticky;
              top: 0;
              align-self: start;
              min-width: 0;
            }

            .settings-sidebar {
              position: static;
              display: grid;
              gap: 14px;
              align-content: start;
              min-width: 0;
              margin: 0 10px;
              padding: 16px;
              border: 1px solid rgba(255, 255, 255, 0.32);
              border-radius: 22px;
              background: rgba(255, 255, 255, 0.52);
              box-shadow: var(--panel-shadow-soft);
              backdrop-filter: blur(22px);
            }

            .settings-sidebar__divider {
              height: 1px;
              background: linear-gradient(90deg, transparent, var(--panel-border), transparent);
              opacity: 0.9;
            }

            .settings-sidebar__section {
              display: grid;
              gap: 10px;
            }

            .settings-sidebar__section-head {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
            }

            .settings-sidebar__section-head strong {
              font-size: 13px;
              line-height: 1.3;
            }

            .settings-sidebar__section-head span {
              color: var(--panel-muted);
              font-size: 11px;
              line-height: 1.3;
            }

            .detail-library-folder-head-actions {
              display: flex;
              align-items: center;
              gap: 6px;
            }

            .detail-library-folder-head-actions .icon-button {
              width: 24px;
              height: 24px;
              font-size: 12px;
            }

            .settings-home-button {
              position: relative;
              overflow: hidden;
              border-color: rgba(133, 169, 216, 0.32);
              background:
                linear-gradient(135deg, rgba(145, 192, 255, 0.24), rgba(255, 255, 255, 0.84)),
                rgba(255, 255, 255, 0.78);
              box-shadow:
                0 14px 28px rgba(128, 151, 187, 0.16),
                inset 0 1px 0 rgba(255, 255, 255, 0.44);
            }

            .settings-home-button::before {
              position: absolute;
              inset: 0;
              background: linear-gradient(90deg, rgba(255, 255, 255, 0.18), transparent 55%);
              content: "";
              pointer-events: none;
            }

            .settings-home-button span,
            .settings-home-button small {
              position: relative;
              z-index: 1;
            }

            .settings-sidebar__head {
              display: grid;
              gap: 4px;
            }

            .settings-sidebar__head strong {
              font-size: 14px;
              line-height: 1.3;
            }

            .settings-sidebar__head span {
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1.5;
            }

            .settings-nav {
              display: grid;
              gap: 6px;
            }

            .settings-content {
              display: grid;
              gap: 18px;
              min-width: 0;
              padding-left: 8px;
              padding-right: 10px;
              padding-bottom: 20px;
              overflow: visible;
            }

            .settings-content > .debug-panel {
              width: 100%;
              max-width: none;
            }

            .save-settings-button {
              width: calc(100% - 20px);
              margin: 0 10px;
              justify-content: center;
              min-height: 44px;
              border-color: color-mix(in srgb, var(--panel-accent) 44%, white 18%);
              background:
                linear-gradient(135deg, color-mix(in srgb, var(--panel-accent) 24%, white 76%), rgba(255, 255, 255, 0.96)),
                rgba(255, 255, 255, 0.86);
              box-shadow:
                0 18px 32px rgba(110, 135, 173, 0.18),
                inset 0 1px 0 rgba(255, 255, 255, 0.5);
              color: color-mix(in srgb, var(--panel-accent-strong) 78%, var(--panel-text) 22%);
              font-weight: 700;
            }

            .save-settings-button:hover {
              background:
                linear-gradient(135deg, color-mix(in srgb, var(--panel-accent) 32%, white 68%), rgba(255, 255, 255, 1)),
                rgba(255, 255, 255, 0.98);
              color: var(--panel-accent-strong);
            }

            .settings-section[hidden] {
              display: none;
            }

            .debug-panel__status {
              color: var(--panel-accent-strong);
              font-size: 12px;
              white-space: nowrap;
            }

            .debug-panel__body {
              display: grid;
              gap: 12px;
              padding: 14px;
            }

            .detail-library-browser {
              overflow-x: auto;
              overflow-y: visible;
              -webkit-overflow-scrolling: touch;
              scrollbar-width: none;
            }

            .detail-library-browser::-webkit-scrollbar {
              display: none;
              width: 0;
              height: 0;
            }

            .debug-row {
              display: grid;
              gap: 4px;
            }

            .debug-row__label {
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1.3;
            }

            .debug-row__value {
              margin: 0;
              color: var(--panel-text);
              font-size: 13px;
              line-height: 1.55;
              white-space: pre-wrap;
              overflow-wrap: anywhere;
            }

            .prompt-viewer-list {
              display: grid;
              gap: 14px;
            }

            .prompt-viewer-group {
              display: grid;
              gap: 8px;
            }

            .prompt-viewer-group h3 {
              margin: 0;
              color: var(--panel-muted);
              font-size: 12px;
              letter-spacing: 0;
              line-height: 1.3;
              text-transform: uppercase;
            }

            .prompt-viewer-card {
              overflow: hidden;
              border: 1px solid rgba(255, 255, 255, 0.28);
              border-radius: 18px;
              background: rgba(255, 255, 255, 0.44);
              box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.26);
            }

            .prompt-viewer-card__head {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.22);
              background: rgba(255, 255, 255, 0.34);
              color: var(--panel-muted);
              padding: 8px 10px;
              font-size: 12px;
              line-height: 1.2;
            }

            .prompt-viewer-code {
              max-height: 360px;
              margin: 0;
              overflow: auto;
              background: transparent;
              color: var(--panel-text);
              font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
              font-size: 12px;
              line-height: 1.6;
              padding: 10px;
              white-space: pre-wrap;
              overflow-wrap: anywhere;
              scrollbar-color: rgba(24, 33, 29, 0.28) transparent;
              scrollbar-width: thin;
            }

            .prompt-viewer-code::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }

            .prompt-viewer-code::-webkit-scrollbar-thumb {
              border: 2px solid transparent;
              border-radius: 999px;
              background: rgba(24, 33, 29, 0.28);
              background-clip: padding-box;
            }

            body.theme-night .prompt-viewer-code {
              scrollbar-color: rgba(166, 210, 190, 0.42) transparent;
            }

            body.theme-night .prompt-viewer-code::-webkit-scrollbar-thumb {
              background: rgba(166, 210, 190, 0.42);
              background-clip: padding-box;
            }

            .run-log-list {
              display: grid;
              gap: 10px;
            }

            .run-log-toolbar {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              flex-wrap: wrap;
            }

            .run-log-summary {
              display: flex;
              align-items: center;
              gap: 8px;
              flex-wrap: wrap;
            }

            .run-log-summary__chip {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              border-radius: 999px;
              background: rgba(255, 255, 255, 0.54);
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1.2;
              padding: 7px 10px;
            }

            .run-log-summary__chip strong {
              color: var(--panel-text);
              font-size: 12px;
              line-height: 1.2;
            }

            .detail-activation-recent-list {
              display: grid;
              gap: 8px;
            }

            .detail-activation-log {
              display: grid;
              gap: 4px;
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 14px;
              background: rgba(255, 255, 255, 0.28);
              padding: 10px 12px;
            }

            .detail-activation-log header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
            }

            .detail-activation-log strong {
              color: var(--panel-text);
              font-size: 13px;
              line-height: 1.4;
            }

            .detail-activation-log span,
            .detail-activation-log p {
              margin: 0;
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1.45;
            }

            .run-log-card {
              display: grid;
              gap: 7px;
              border: 1px solid rgba(255, 255, 255, 0.28);
              border-radius: 18px;
              background: rgba(255, 255, 255, 0.4);
              box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
              padding: 12px;
            }

            .run-log-card__head {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1.2;
            }

            .run-log-card__meta {
              display: flex;
              align-items: center;
              gap: 8px;
              min-width: 0;
            }

            .run-log-card__badge {
              display: inline-flex;
              align-items: center;
              border-radius: 999px;
              padding: 5px 9px;
              font-size: 11px;
              line-height: 1;
              white-space: nowrap;
            }

            .run-log-card__badge[data-tone="error"] {
              background: rgba(224, 108, 117, 0.16);
              color: #b94b57;
            }

            .run-log-card__badge[data-tone="warn"] {
              background: rgba(221, 161, 94, 0.2);
              color: #8b5c12;
            }

            .run-log-card__badge[data-tone="success"] {
              background: rgba(85, 180, 138, 0.16);
              color: #2f7d5b;
            }

            .run-log-card__badge[data-tone="info"] {
              background: rgba(57, 123, 255, 0.14);
              color: #2f5fb8;
            }

            .run-log-card__badge[data-tone="neutral"] {
              background: rgba(24, 33, 29, 0.08);
              color: var(--panel-muted);
            }

            .run-log-card__title {
              display: grid;
              gap: 3px;
              min-width: 0;
            }

            .run-log-card__title strong {
              color: var(--panel-text);
              font-size: 13px;
              line-height: 1.35;
              overflow-wrap: anywhere;
            }

            .run-log-card__title span {
              color: var(--panel-muted);
              font-size: 11px;
              line-height: 1.25;
            }

            .run-log-card p {
              margin: 0;
              color: var(--panel-text);
              font-size: 13px;
              line-height: 1.45;
              overflow-wrap: anywhere;
            }

            .run-log-card pre {
              max-height: 240px;
              margin: 0;
              overflow: auto;
              border-radius: 8px;
              background: var(--panel-bg-soft);
              color: var(--panel-text);
              font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
              font-size: 12px;
              line-height: 1.55;
              padding: 8px;
              white-space: pre-wrap;
              overflow-wrap: anywhere;
            }

            .run-log-card details {
              display: grid;
              gap: 7px;
            }

            .run-log-card summary {
              color: var(--panel-muted);
              cursor: pointer;
              font-size: 12px;
              line-height: 1.3;
            }

            .worldbook-entry-list {
              display: grid;
              gap: 8px;
            }


            .worldbook-dashboard { gap: 14px; }
            .worldbook-data-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
            .worldbook-data-card { display: grid; align-content: start; gap: 8px; min-width: 0; border: 1px solid rgba(255, 255, 255, 0.28); border-radius: 20px; background: rgba(255, 255, 255, 0.48); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22); padding: 14px; }
            .worldbook-data-card.is-accent { border-color: rgba(133, 169, 216, 0.34); background: linear-gradient(180deg, rgba(230, 240, 255, 0.72), rgba(255, 255, 255, 0.48)); }
            .worldbook-data-card__label, .worldbook-data-card__hint { color: var(--panel-muted); font-size: 11px; line-height: 1.35; }
            .worldbook-big-number { color: var(--panel-accent-strong); font-size: 30px; line-height: 1; }
            .worldbook-kv { display: flex; min-width: 0; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 12px; line-height: 1.35; }
            .worldbook-kv span { flex: 0 0 auto; color: var(--panel-muted); }
            .worldbook-kv strong { min-width: 0; overflow: hidden; color: var(--panel-text); font-size: 12px; font-weight: 600; text-align: right; text-overflow: ellipsis; white-space: nowrap; }
            .worldbook-source-details { border: 1px solid rgba(255, 255, 255, 0.28); border-radius: 18px; background: rgba(255, 255, 255, 0.42); padding: 12px 14px; }
            .worldbook-source-details summary { color: var(--panel-muted); cursor: pointer; font-size: 12px; line-height: 1.3; }
            .worldbook-detail-grid { display: grid; gap: 8px; margin-top: 10px; }
            .worldbook-detail-grid .worldbook-kv { display: grid; gap: 4px; }
            .worldbook-detail-grid .worldbook-kv strong { text-align: left; white-space: normal; overflow-wrap: anywhere; }
            .worldbook-entry-panel { overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.28); border-radius: 20px; background: rgba(255, 255, 255, 0.42); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2); }
            .worldbook-entry-panel__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.22); background: rgba(255, 255, 255, 0.32); padding: 12px 14px; }
            .worldbook-entry-panel__head strong { font-size: 13px; }
            .worldbook-entry-panel__head span { color: var(--panel-muted); font-size: 11px; }
            .worldbook-entry-panel .worldbook-entry-list { gap: 0; }
            .worldbook-entry-row { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--panel-border); padding: 9px 12px; }
            .worldbook-entry-row:last-child { border-bottom: 0; }
            .worldbook-entry-main { min-width: 0; }
            .worldbook-entry-main strong { display: block; overflow: hidden; color: var(--panel-text); font-size: 13px; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
            .worldbook-entry-main p { margin: 3px 0 0; overflow: hidden; color: var(--panel-muted); font-size: 11px; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
            .worldbook-switch { position: relative; display: inline-flex; flex: 0 0 auto; width: 38px; height: 22px; cursor: pointer; }
            .worldbook-switch input { position: absolute; opacity: 0; pointer-events: none; }
            .worldbook-switch span { position: absolute; inset: 0; box-sizing: border-box; border: 1px solid var(--panel-border); border-radius: 999px; background: var(--panel-control); transition: background 160ms ease, border-color 160ms ease; }
            .worldbook-switch span::after { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 999px; background: var(--panel-muted); content: ""; transition: transform 160ms ease, background 160ms ease; }
            .worldbook-switch input:checked + span { border-color: var(--panel-accent); background: var(--panel-accent); }
            .worldbook-switch input:checked + span::after { background: var(--panel-bg); transform: translateX(16px); }
            [data-theme="night"] .worldbook-switch span { border-color: color-mix(in srgb, var(--panel-border) 72%, white 18%); background: color-mix(in srgb, var(--panel-bg-soft) 82%, white 6%); }
            [data-theme="night"] .worldbook-switch span::after { background: color-mix(in srgb, var(--panel-muted) 72%, white 16%); }
            [data-theme="night"] .worldbook-switch input:checked + span { border-color: var(--panel-accent); background: var(--panel-accent); }
            [data-theme="night"] .worldbook-switch input:checked + span::after { background: var(--panel-bg); }
            @media (max-width: 760px) { .worldbook-data-grid { grid-template-columns: 1fr; } }
            .worldbook-entry-card {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
              border: 1px solid var(--panel-border);
              border-radius: 10px;
              background: var(--panel-bg);
              padding: 9px 10px;
            }

            .worldbook-entry-card strong {
              display: block;
              color: var(--panel-text);
              font-size: 13px;
              line-height: 1.35;
            }

            .worldbook-entry-card p {
              margin: 3px 0 0;
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1.4;
              overflow-wrap: anywhere;
            }

            .form-grid {
              display: grid;
              width: 100%;
              gap: 12px;
            }

            .settings-stack {
              display: grid;
              gap: 14px;
            }

            [data-image-provider-panel][hidden] {
              display: none !important;
            }
            .settings-card {
              display: grid;
              position: relative;
              gap: 12px;
              border: 1px solid rgba(255, 255, 255, 0.3);
              border-radius: 20px;
              background: rgba(255, 255, 255, 0.54);
              box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.3),
                0 10px 24px rgba(132, 145, 172, 0.08);
              backdrop-filter: blur(18px);
              padding: 14px;
            }

            .settings-card.is-api {
              z-index: 6;
              background: color-mix(in srgb, rgba(255, 255, 255, 0.68) 84%, var(--panel-accent) 16%);
            }

            .settings-card.is-retry {
              z-index: 1;
            }

            .settings-card.is-summary {
              align-self: start;
              background: color-mix(in srgb, rgba(255, 255, 255, 0.68) 88%, var(--panel-accent) 12%);
            }

            .settings-card__head {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
            }

            .settings-card__head h3 {
              margin: 0;
              font-size: 14px;
              line-height: 1.3;
            }

            .settings-card.is-summary .settings-card__head {
              display: grid;
              grid-template-columns: minmax(0, 1fr) auto;
              align-items: center;
            }

            .summary-tag-selector {
              display: grid;
              grid-template-columns: minmax(120px, 180px) 34px;
              align-items: center;
              gap: 8px;
              justify-self: end;
            }

            .summary-tag-selector .select {
              min-width: 0;
            }

            .settings-card__note {
              margin: 0;
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1.6;
            }

            .appearance-theme-schedule {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
            }

            .appearance-theme-schedule[hidden] {
              display: none;
            }

            .settings-topbar {
              display: grid;
              grid-template-columns: auto minmax(0, 1fr);
              align-items: end;
              gap: 10px;
            }

            .preset-select-row {
              position: relative;
              display: grid;
              grid-template-columns: minmax(0, 1fr) repeat(7, 34px);
              gap: 8px;
            }

            .prompt-secondary-actions {
              display: contents;
            }

            .prompt-more-button {
              display: none;
            }

            .preset-select-row [data-prompt-combobox] {
              order: 0;
            }

            .preset-select-row [data-sync-builtin-prompts] {
              order: 1;
            }

            .preset-select-row [data-save-prompt] {
              order: 2;
            }

            .preset-select-row [data-save-as-prompt] {
              order: 3;
            }

            .preset-select-row [data-toggle-publish-prompt] {
              order: 4;
            }

            .preset-select-row [data-import-prompts] {
              order: 5;
            }

            .preset-select-row [data-export-prompts] {
              order: 6;
            }

            .preset-select-row [data-delete-prompt] {
              order: 7;
            }

            .random-prompt-list {
              display: grid;
              max-height: 210px;
              gap: 6px;
              margin-top: 10px;
              overflow: auto;
              overscroll-behavior: contain;
              padding: 8px;
              border: 1px solid var(--panel-border);
              border-radius: 10px;
              background: var(--panel-bg);
              scrollbar-color: rgba(24, 33, 29, 0.28) transparent;
              scrollbar-width: thin;
            }

            .random-prompt-list::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }

            .random-prompt-list::-webkit-scrollbar-track {
              background: transparent;
            }

            .random-prompt-list::-webkit-scrollbar-thumb {
              border: 2px solid transparent;
              border-radius: 999px;
              background: rgba(24, 33, 29, 0.28);
              background-clip: padding-box;
            }

            body.theme-night .random-prompt-list {
              scrollbar-color: rgba(166, 210, 190, 0.42) transparent;
            }

            body.theme-night .random-prompt-list::-webkit-scrollbar-thumb {
              background: rgba(166, 210, 190, 0.42);
              background-clip: padding-box;
            }

            .prompt-export-dialog__body {
              scrollbar-color: rgba(24, 33, 29, 0.26) transparent;
              scrollbar-width: thin;
            }

            .prompt-export-dialog__body::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }

            .prompt-export-dialog__body::-webkit-scrollbar-track {
              background: transparent;
            }

            .prompt-export-dialog__body::-webkit-scrollbar-thumb {
              border: 2px solid transparent;
              border-radius: 999px;
              background: rgba(24, 33, 29, 0.26);
              background-clip: padding-box;
            }

            body.theme-night .prompt-export-dialog__body {
              scrollbar-color: rgba(166, 210, 190, 0.28) transparent;
            }

            body.theme-night .prompt-export-dialog__body::-webkit-scrollbar-thumb {
              background: rgba(166, 210, 190, 0.28);
              background-clip: padding-box;
            }

            .random-prompt-option {
              display: flex;
              align-items: center;
              gap: 9px;
              min-height: 34px;
              border: 1px solid transparent;
              border-radius: 8px;
              background: transparent;
              color: var(--panel-text);
              cursor: pointer;
              padding: 7px 8px;
              font-size: 12px;
              line-height: 1.35;
            }

            .random-prompt-option:hover {
              border-color: var(--panel-border);
              background: var(--panel-control);
            }

            .random-prompt-option input {
              flex: 0 0 auto;
            }

            .random-prompt-option span {
              min-width: 0;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .prompt-section-divider {
              height: 1px;
              background: linear-gradient(90deg, transparent, var(--panel-border), transparent);
              margin: 2px 0;
            }

            .detail-library-root {
              display: grid;
              gap: 12px;
            }

            .detail-library-page[hidden] {
              display: none;
            }

            .detail-library-overview {
              display: grid;
              gap: 12px;
            }

            .detail-library-summary {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
            }

            .detail-library-stat {
              display: grid;
              gap: 4px;
              border: 1px solid color-mix(in srgb, var(--panel-border) 80%, white 18%);
              border-radius: 16px;
              background:
                linear-gradient(180deg, color-mix(in srgb, var(--panel-bg-soft) 76%, white 24%), color-mix(in srgb, var(--panel-bg) 88%, transparent 12%));
              box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.24),
                0 10px 22px rgba(118, 129, 153, 0.08);
              padding: 12px;
            }

            .detail-library-stat span {
              color: var(--panel-muted);
              font-size: 11px;
              line-height: 1.3;
            }

            .detail-library-stat strong {
              color: var(--panel-accent-strong);
              font-size: 24px;
              line-height: 1;
            }

            .detail-activation-chart-card {
              display: grid;
              gap: 12px;
              border: 1px solid color-mix(in srgb, var(--panel-border) 80%, white 18%);
              border-radius: 18px;
              background:
                linear-gradient(180deg, color-mix(in srgb, var(--panel-bg-soft) 78%, white 22%), color-mix(in srgb, var(--panel-bg) 92%, transparent 8%));
              box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.22),
                0 10px 24px rgba(117, 129, 154, 0.08);
              padding: 14px;
            }

            .detail-activation-chart-card__head {
              display: flex;
              align-items: baseline;
              justify-content: space-between;
              gap: 12px;
            }

            .detail-activation-chart-card__head strong {
              color: var(--panel-text);
              font-size: 15px;
            }

            .detail-activation-chart-card__head span {
              color: var(--panel-accent-strong);
              font-size: 13px;
            }

            .detail-activation-chart {
              display: grid;
              grid-template-columns: 144px minmax(0, 1fr);
              gap: 14px;
              align-items: start;
            }

            .detail-activation-chart__pie {
              position: relative;
              display: grid;
              place-items: center;
              flex-shrink: 0;
              width: 144px;
              height: 144px;
              border-radius: 999px;
              box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.18),
                0 10px 24px rgba(54, 68, 96, 0.12);
              overflow: hidden;
            }

            .detail-activation-chart__pie-surface {
              position: absolute;
              inset: 0;
              border-radius: inherit;
              box-shadow:
                inset 0 0 0 1px rgba(255, 255, 255, 0.28),
                inset 0 12px 20px rgba(255, 255, 255, 0.12);
            }

            .detail-activation-chart__pie-center {
              position: relative;
              z-index: 1;
              display: grid;
              place-items: center;
              gap: 2px;
              width: 74px;
              height: 74px;
              border-radius: 999px;
              background:
                linear-gradient(180deg, color-mix(in srgb, var(--panel-bg-soft) 88%, white 12%), color-mix(in srgb, var(--panel-bg) 96%, transparent 4%));
              box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.42),
                0 6px 14px rgba(54, 68, 96, 0.12);
              text-align: center;
            }

            .detail-activation-chart__pie-center strong {
              color: var(--panel-text);
              font-size: 22px;
              line-height: 1;
            }

            .detail-activation-chart__pie-center small {
              color: var(--panel-muted);
              font-size: 11px;
              line-height: 1.2;
            }

            .detail-activation-chart__legend {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px 18px;
              min-width: 0;
              align-items: start;
            }

            .detail-activation-chart__legend-item {
              display: grid;
              grid-template-columns: 12px minmax(0, 1fr);
              gap: 8px 10px;
              align-items: center;
            }

            .detail-activation-chart__swatch {
              display: block;
              width: 12px;
              height: 12px;
              border-radius: 999px;
              grid-row: span 2;
            }

            .detail-activation-chart__legend-item strong,
            .detail-activation-chart__legend-item small {
              min-width: 0;
              overflow-wrap: anywhere;
            }

            .detail-activation-chart__legend-item strong {
              color: var(--panel-text);
              font-size: 13px;
              line-height: 1.4;
            }

            .detail-activation-chart__legend-item small {
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1.4;
            }

            .detail-library-manager {
              display: grid;
              grid-template-columns: minmax(0, 1fr);
              gap: 14px;
              min-height: 540px;
            }

            .detail-library-folders,
            .detail-library-stage,
            .detail-library-detail {
              border: 1px solid color-mix(in srgb, var(--panel-border) 82%, white 18%);
              border-radius: 18px;
              background:
                linear-gradient(180deg, color-mix(in srgb, var(--panel-bg-soft) 74%, white 20%), color-mix(in srgb, var(--panel-bg) 90%, transparent 10%));
              box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.18),
                0 10px 24px rgba(117, 129, 154, 0.08);
            }

            .detail-library-folders {
              display: grid;
              align-content: start;
              gap: 10px;
              padding: 12px;
            }

            .detail-library-folder-list {
              display: grid;
              gap: 8px;
            }

            .detail-library-folder {
              display: flex;
              width: 100%;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              appearance: none;
              border: 1px solid color-mix(in srgb, var(--panel-border) 56%, transparent 44%);
              border-radius: 14px;
              background: color-mix(in srgb, var(--panel-bg-soft) 56%, transparent 44%);
              color: var(--panel-text);
              cursor: pointer;
              padding: 10px 12px;
              text-align: left;
              transition:
                border-color 160ms ease,
                background 160ms ease,
                transform 160ms ease;
            }

            .detail-library-folder:hover,
            .detail-library-folder.is-active {
              border-color: color-mix(in srgb, var(--panel-accent) 34%, var(--panel-border) 66%);
              background: color-mix(in srgb, var(--panel-control) 68%, var(--panel-accent) 14%);
              transform: translateY(-1px);
            }

            .detail-library-folder small {
              color: var(--panel-muted);
              font-size: 11px;
            }

            .detail-library-folder__label {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 13px;
              overflow: hidden;
            }

            .detail-library-folder__label > span {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .detail-library-folder .detail-library-folder__drag {
              color: var(--panel-muted);
              cursor: grab;
              font-size: 12px;
              opacity: 0.6;
              flex-shrink: 0;
            }

            .detail-library-folder .detail-library-folder__drag:active {
              cursor: grabbing;
            }

            .detail-library-folder.is-drag-over {
              border-style: dashed;
              border-color: var(--panel-accent);
              background: color-mix(in srgb, var(--panel-accent) 14%, var(--panel-bg-soft) 86%);
            }

            .detail-library-folder.is-dragging {
              opacity: 0.5;
            }

            .detail-folder-sort-list {
              display: grid;
              gap: 8px;
              max-height: 320px;
              overflow-y: auto;
              margin-top: 10px;
            }

            .detail-folder-sort-item {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
              border: 1px solid color-mix(in srgb, var(--panel-border) 56%, transparent 44%);
              border-radius: 10px;
              background: color-mix(in srgb, var(--panel-bg-soft) 56%, transparent 44%);
              padding: 8px 10px;
            }

            .detail-folder-sort-item span {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              font-size: 13px;
            }

            .detail-folder-sort-actions {
              display: flex;
              align-items: center;
              gap: 4px;
            }

            .detail-folder-sort-actions .icon-button {
              width: 24px;
              height: 24px;
              font-size: 12px;
            }

            .detail-folder-sort-actions .icon-button:disabled {
              opacity: 0.35;
              cursor: not-allowed;
            }

            .detail-library-stage {
              display: grid;
              gap: 12px;
              min-height: 100%;
              padding: 12px;
            }

            .detail-library-toolbar {
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
            }

            .detail-library-toolbar__actions,
            .detail-library-folder-actions {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }

            .detail-library-toolbar__title {
              display: grid;
              gap: 4px;
              min-width: 0;
            }

            .detail-library-toolbar__meta {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              flex-wrap: wrap;
              justify-content: flex-end;
            }

            .detail-library-toolbar__icon-actions {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              flex-wrap: wrap;
            }

            .detail-library-bulk-actions {
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              gap: 8px;
            }

            .detail-library-bulk-actions[hidden] {
              display: none !important;
            }

            .detail-library-filters {
              display: grid;
              grid-template-columns: minmax(180px, 1.3fr) repeat(4, minmax(120px, 0.7fr));
              gap: 10px;
              align-items: center;
            }

            .detail-library-edit-form {
              display: grid;
              gap: 14px;
            }

            .detail-library-edit-tags {
              display: grid;
              gap: 10px;
            }

            .detail-library-filter-tags {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }

            .vibe-transfer-head {
              display: flex;
              align-items: baseline;
              justify-content: space-between;
              gap: 12px;
              margin: 18px 0 10px;
            }

            .vibe-transfer-head strong {
              color: var(--panel-text);
              font-size: 16px;
            }

            .vibe-transfer-head span {
              color: var(--panel-muted);
              font-size: 12px;
            }

            .vibe-reference-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
              gap: 10px;
              margin-top: 12px;
            }

            .vibe-reference-card {
              position: relative;
              min-width: 0;
              overflow: hidden;
              border: 1px solid var(--panel-border);
              border-radius: 10px;
              background: var(--panel-bg-soft);
            }

            .vibe-reference-card__preview {
              display: grid;
              width: 100%;
              aspect-ratio: 1;
              place-items: center;
              overflow: hidden;
              background: color-mix(in srgb, var(--panel-bg-soft) 72%, var(--panel-accent) 28%);
              color: var(--panel-muted);
              font-size: 11px;
              text-align: center;
            }

            .vibe-reference-card__preview img {
              display: block;
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .vibe-reference-card__meta {
              display: grid;
              gap: 3px;
              padding: 7px 8px 8px;
            }

            .vibe-reference-card__name {
              overflow: hidden;
              color: var(--panel-text);
              font-size: 11px;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .vibe-reference-card__source {
              color: var(--panel-muted);
              font-size: 10px;
            }

            .vibe-reference-card__strength {
              display: grid;
              grid-template-columns: auto minmax(0, 1fr) 46px;
              gap: 6px;
              align-items: center;
              color: var(--panel-muted);
              font-size: 10px;
            }

            .vibe-reference-card__strength input[type="range"] {
              width: 100%;
              height: 3px;
              accent-color: var(--panel-accent);
            }

            .vibe-reference-card__strength input[type="range"]::-webkit-slider-runnable-track {
              height: 3px;
              border-radius: 999px;
              background: color-mix(in srgb, var(--panel-accent) 72%, var(--panel-border) 28%);
            }

            .vibe-reference-card__strength input[type="range"]::-webkit-slider-thumb {
              width: 13px;
              height: 13px;
              margin-top: -5px;
            }

            .vibe-reference-card__strength .input {
              min-width: 0;
              padding: 4px 5px;
              border-radius: 6px;
              font-size: 10px;
            }

            .vibe-reference-card__name-row {
              display: flex;
              align-items: center;
              gap: 5px;
              min-width: 0;
            }

            .vibe-reference-card__rename {
              display: grid;
              width: 18px;
              height: 18px;
              flex: 0 0 auto;
              place-items: center;
              border: 0;
              background: transparent;
              color: var(--panel-accent-strong);
              cursor: pointer;
              font-size: 10px;
            }

            .novelai-config-title {
              font-size: 16px !important;
            }

            .vibe-transfer-head strong {
              font-size: 18px;
            }

            .novelai-preset-toolbar {
              display: grid;
              grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
              gap: 12px;
              align-items: end;
            }

            .novelai-preset-actions {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }

            .prompt-textarea-stack {
              display: grid;
              gap: 12px;
            }

            .model-fetch-row {
              display: grid;
              grid-template-columns: minmax(0, 1fr) auto;
              gap: 8px;
              align-items: center;
            }

            .prompt-reference-section {
              display: grid;
              gap: 10px;
              margin-top: 14px;
              padding-top: 14px;
              border-top: 1px solid var(--panel-border);
            }

            .prompt-reference-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(116px, 1fr));
              gap: 10px;
            }

            .prompt-reference-card {
              position: relative;
              overflow: hidden;
              border: 1px solid var(--panel-border);
              border-radius: 9px;
              background: var(--panel-bg-soft);
            }

            .prompt-reference-card img {
              display: block;
              width: 100%;
              aspect-ratio: 1;
              object-fit: cover;
            }

            .prompt-reference-card__meta {
              padding: 6px 8px;
              color: var(--panel-muted);
              font-size: 10px;
            }

            .vibe-library-section {
              display: grid;
              gap: 10px;
              margin-top: 18px;
              padding-top: 14px;
              border-top: 1px solid var(--panel-border);
            }

            .vibe-library-head,
            .vibe-library-pagination {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
            }

            .vibe-library-head strong {
              color: var(--panel-text);
              font-size: 14px;
            }

            .vibe-library-head span,
            .vibe-library-pagination span {
              color: var(--panel-muted);
              font-size: 11px;
            }

            .vibe-library-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
              gap: 10px;
            }

            .vibe-library-card {
              display: grid;
              gap: 7px;
              min-width: 0;
              padding: 7px;
              border: 1px solid var(--panel-border);
              border-radius: 9px;
              background: var(--panel-bg-soft);
            }

            .vibe-library-card .vibe-reference-card__preview {
              border-radius: 6px;
            }

            .vibe-library-card__name {
              overflow: hidden;
              color: var(--panel-text);
              font-size: 11px;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .vibe-reference-card__remove {
              position: absolute;
              top: 6px;
              right: 6px;
              display: grid;
              width: 24px;
              height: 24px;
              place-items: center;
              border: 1px solid rgba(255, 255, 255, 0.72);
              border-radius: 50%;
              background: rgba(20, 24, 28, 0.72);
              color: white;
              cursor: pointer;
            }

            .detail-library-tag-chip {
              display: inline-flex;
              align-items: center;
              min-height: 28px;
              border: 1px solid color-mix(in srgb, var(--panel-border) 80%, white 18%);
              border-radius: 999px;
              background: color-mix(in srgb, var(--panel-bg-soft) 76%, transparent 24%);
              color: var(--panel-muted);
              font-size: 11px;
              line-height: 1;
              padding: 0 10px;
            }

            button.detail-library-tag-chip {
              cursor: pointer;
            }

            .detail-library-tag-chip__remove {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 18px;
              height: 18px;
              margin-left: 6px;
              border-radius: 999px;
              background: color-mix(in srgb, var(--panel-border) 72%, transparent 28%);
              color: currentColor;
              font-size: 11px;
              line-height: 1;
              flex: 0 0 auto;
            }

            .detail-library-tag-chip--removable {
              gap: 0;
              padding-right: 6px;
            }

            .detail-library-tag-chip--removable:hover {
              color: var(--panel-text);
              border-color: color-mix(in srgb, var(--panel-accent) 36%, var(--panel-border) 64%);
            }

            .detail-library-tag-chip.is-active {
              border-color: color-mix(in srgb, var(--panel-accent) 44%, var(--panel-border) 56%);
              background: color-mix(in srgb, var(--panel-accent) 14%, var(--panel-bg-soft) 86%);
              color: var(--panel-text);
            }

            .detail-library-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
              align-content: start;
            }

            .detail-library-grid--scrollable {
              overflow: visible;
            }

            .detail-library-grid--scrollable::-webkit-scrollbar {
              display: none;
            }

            .detail-library-card {
              display: grid;
              gap: 10px;
              border: 1px solid color-mix(in srgb, var(--panel-border) 80%, white 20%);
              border-radius: 18px;
              background:
                linear-gradient(180deg, color-mix(in srgb, var(--panel-bg-soft) 72%, white 20%), color-mix(in srgb, var(--panel-bg) 92%, transparent 8%));
              box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.18),
                0 8px 22px rgba(120, 132, 156, 0.08);
              padding: 12px;
            }

            .detail-library-card.is-active {
              border-color: color-mix(in srgb, var(--panel-accent) 55%, white 12%);
              box-shadow: 0 10px 22px rgba(88, 123, 169, 0.12);
            }

            .detail-library-card__head {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 8px;
            }

            .detail-library-card__title-button {
              display: grid;
              gap: 6px;
              min-width: 0;
              border: 0;
              background: transparent;
              color: inherit;
              cursor: pointer;
              padding: 0;
              text-align: left;
            }

            .detail-library-card strong,
            .detail-library-card p {
              margin: 0;
            }

            .detail-library-card strong {
              overflow: hidden;
              font-size: 14px;
              line-height: 1.3;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .detail-library-card p {
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1.5;
              overflow: hidden;
              display: -webkit-box;
              -webkit-box-orient: vertical;
              -webkit-line-clamp: 3;
            }

            .detail-library-card__meta {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              color: var(--panel-muted);
              font-size: 11px;
            }

            .detail-library-card__meta-actions {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              flex: 0 0 auto;
              position: relative;
              z-index: 1;
            }

            .detail-library-card__action {
              display: inline-flex;
              width: 22px;
              height: 22px;
              align-items: center;
              justify-content: center;
              border: 0;
              background: transparent;
              color: var(--panel-muted);
              cursor: pointer;
              padding: 0;
              transition:
                color 160ms ease,
                transform 160ms ease;
            }

            .detail-library-card__action:hover {
              color: var(--panel-text);
              transform: translateY(-1px);
            }

            .detail-library-card__action.is-danger {
              color: color-mix(in srgb, var(--panel-danger) 88%, white 12%);
            }

            .detail-library-card__action.is-danger:hover {
              color: var(--panel-danger);
            }

            .detail-library-activation {
              display: inline-flex;
              align-items: center;
              min-height: 24px;
              border: 1px solid var(--panel-border);
              border-radius: 999px;
              background: color-mix(in srgb, var(--panel-bg-soft) 74%, transparent 26%);
              color: color-mix(in srgb, var(--panel-muted) 92%, #8c98ad 8%);
              font-size: 11px;
              line-height: 1;
              padding: 0 9px;
            }

            .detail-library-activation.is-active {
              border-color: color-mix(in srgb, #36b37e 62%, white 18%);
              background: color-mix(in srgb, #36b37e 22%, rgba(255,255,255,0.18) 78%);
              color: #1f8f63;
            }

            .detail-library-activation:not(.is-active) {
              border-color: color-mix(in srgb, #d96b6b 48%, var(--panel-border) 52%);
              background: color-mix(in srgb, #d96b6b 12%, rgba(255,255,255,0.18) 88%);
              color: #b95858;
            }

            .detail-library-detail {
              display: grid;
              gap: 12px;
              padding: 12px;
            }

            .detail-library-detail__head {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
            }

            .detail-library-empty {
              border: 1px dashed var(--panel-border);
              border-radius: 16px;
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1.6;
              padding: 18px;
              text-align: center;
            }

            .appearance-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
            }

            .appearance-section {
              display: grid;
              gap: 12px;
            }

            .appearance-section__head {
              display: grid;
              gap: 4px;
            }

            .appearance-section__head strong {
              font-size: 14px;
              line-height: 1.3;
            }

            .appearance-section__head span {
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1.5;
            }

            .bubble-settings-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
            }

            .bubble-settings-grid .field.is-wide {
              grid-column: 1 / -1;
            }

            .bubble-icon-input-row {
              display: grid;
              grid-template-columns: minmax(0, 1fr) 34px;
              gap: 8px;
            }

            .icon-picker-dialog {
              width: min(760px, calc(100vw - 32px));
              background:
                var(--panel-glow),
                linear-gradient(180deg, color-mix(in srgb, var(--panel-bg) 94%, white 6%) 0%, var(--panel-bg) 100%);
              box-shadow: var(--panel-shadow);
              backdrop-filter: blur(24px);
            }

            .icon-picker-dialog__search {
              width: 100%;
              margin-bottom: 12px;
            }

            .icon-picker-dialog__grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(82px, 1fr));
              gap: 12px;
              max-height: min(58vh, 520px);
              overflow: auto;
              padding-right: 4px;
            }

            .icon-picker-dialog__grid::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }

            .icon-picker-dialog__grid::-webkit-scrollbar-thumb {
              border: 2px solid transparent;
              border-radius: 999px;
              background: rgba(24, 33, 29, 0.26);
              background-clip: padding-box;
            }

            .icon-picker-dialog__item {
              display: grid;
              min-height: 96px;
              align-content: center;
              justify-items: center;
              gap: 8px;
              border: 1px solid var(--panel-border);
              border-radius: 16px;
              background: var(--panel-control);
              color: var(--panel-text);
              cursor: pointer;
              padding: 10px;
              transition: transform 140ms ease, background 140ms ease, border-color 140ms ease;
            }

            .icon-picker-dialog__item:hover,
            .icon-picker-dialog__item.is-active {
              transform: translateY(-1px);
              border-color: var(--panel-accent);
              background: var(--panel-control-hover);
            }

            .icon-picker-dialog__item i {
              font-size: 28px;
              line-height: 1;
              pointer-events: none;
            }

            .icon-picker-dialog__item-label {
              max-width: 100%;
              overflow: hidden;
              color: var(--panel-muted);
              font-size: 11px;
              line-height: 1.3;
              text-align: center;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .icon-picker-dialog__empty {
              margin: 0;
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1.6;
              text-align: center;
            }

            .debug-tools-layout {
              display: grid;
              gap: 18px;
            }

            .debug-tools-overview {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
            }

            .debug-tools-overview-card {
              display: grid;
              gap: 8px;
              border: 1px solid rgba(255, 255, 255, 0.24);
              border-radius: 18px;
              background: rgba(255, 255, 255, 0.36);
              padding: 14px 16px;
            }

            .debug-tools-overview-card span {
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1.25;
            }

            .debug-tools-overview-card strong {
              color: var(--panel-text);
              font-size: 15px;
              line-height: 1.35;
            }

            .debug-tools-columns {
              display: grid;
              grid-template-columns: minmax(0, 1fr);
              gap: 18px;
              align-items: start;
            }

            .debug-tools-aside,
            .debug-tools-main {
              display: grid;
              gap: 18px;
            }

            .debug-tools-card {
              display: grid;
              gap: 14px;
              border: 1px solid rgba(255, 255, 255, 0.24);
              border-radius: 22px;
              background: linear-gradient(180deg, rgba(255, 255, 255, 0.52), rgba(255, 255, 255, 0.28));
              box-shadow: var(--panel-shadow-soft);
              backdrop-filter: blur(18px);
              padding: 18px;
            }

            .debug-tools-card__head {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
            }

            .debug-tools-card__head strong {
              font-size: 15px;
              line-height: 1.2;
            }

            .debug-tools-card__head span {
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1.3;
            }

            .debug-tools-stat-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px;
            }

            .debug-tools-stat {
              display: grid;
              gap: 4px;
              border-radius: 16px;
              background: rgba(255, 255, 255, 0.28);
              padding: 11px 12px;
            }

            .debug-tools-stat span {
              color: var(--panel-muted);
              font-size: 11px;
              line-height: 1.25;
            }

            .debug-tools-stat strong {
              color: var(--panel-text);
              font-size: 13px;
              line-height: 1.4;
              overflow-wrap: anywhere;
            }

            .prompt-viewer-toolbar {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              flex-wrap: wrap;
            }

            .prompt-viewer-meta {
              display: flex;
              align-items: center;
              gap: 8px;
              flex-wrap: wrap;
            }

            .prompt-viewer-meta__chip {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              border-radius: 999px;
              background: rgba(255, 255, 255, 0.52);
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1.2;
              padding: 7px 10px;
            }

            .prompt-viewer-meta__chip strong {
              color: var(--panel-text);
              font-size: 12px;
            }

            .appearance-color-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px;
            }

            .appearance-color-field {
              display: grid;
              grid-template-columns: 34px minmax(0, 1fr);
              align-items: center;
              gap: 9px;
              border: 1px solid var(--panel-border);
              border-radius: 9px;
              background: var(--panel-bg);
              padding: 8px;
            }

            .appearance-color-field input[type="color"] {
              width: 34px;
              height: 28px;
              border: 0;
              border-radius: 8px;
              background: transparent;
              cursor: pointer;
              padding: 0;
            }

            .appearance-color-field strong {
              display: block;
              overflow: hidden;
              color: var(--panel-text);
              font-size: 12px;
              line-height: 1.25;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .appearance-color-field span {
              color: var(--panel-muted);
              font-size: 11px;
              line-height: 1.2;
            }

            .bubble-color-field {
              width: 100%;
              min-height: 54px;
            }

            .bubble-color-field input[type="color"]:disabled {
              cursor: not-allowed;
              opacity: 0.55;
            }

            .bubble-color-field:has(input[type="color"]:disabled) {
              opacity: 0.72;
            }

            @media (max-width: 760px) {
              .appearance-grid,
              .appearance-color-grid,
              .appearance-theme-schedule,
              .bubble-settings-grid {
                grid-template-columns: 1fr;
              }

              .settings-card.is-summary .settings-card__head {
                grid-template-columns: minmax(0, 1fr) auto;
              }

              .settings-card.is-summary .settings-card__head h3 {
                white-space: nowrap;
              }

              .summary-tag-selector {
                grid-template-columns: 116px 34px;
              }

              .preset-select-row {
                grid-template-columns: minmax(0, 1fr) repeat(3, 34px);
              }

              .preset-select-row [data-save-prompt] {
                order: 1;
              }

              .preset-select-row [data-save-as-prompt] {
                order: 2;
              }

              .preset-select-row [data-prompt-actions-more] {
                order: 3;
              }

              .prompt-secondary-actions [data-sync-builtin-prompts] {
                order: 1;
              }

              .prompt-secondary-actions [data-toggle-publish-prompt] {
                order: 2;
              }

              .prompt-secondary-actions [data-import-prompts] {
                order: 3;
              }

              .prompt-secondary-actions [data-export-prompts] {
                order: 4;
              }

              .prompt-secondary-actions [data-delete-prompt] {
                order: 5;
              }

              .prompt-more-button {
                display: inline-flex;
              }

              .prompt-secondary-actions {
                position: absolute;
                z-index: 24;
                right: 0;
                top: calc(100% + 6px);
                display: none;
                grid-template-columns: repeat(5, 34px);
                gap: 8px;
                border: 1px solid var(--panel-border);
                border-radius: 10px;
                background: var(--panel-bg-soft);
                padding: 8px;
              }

              .prompt-secondary-actions.is-open {
                display: grid;
              }
            }

            .summary-tag-grid {
              display: grid;
              grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
              gap: 10px;
            }

            .icon-button {
              display: inline-flex;
              width: 34px;
              height: 34px;
              align-items: center;
              justify-content: center;
              border: 1px solid var(--panel-border);
              border-radius: 8px;
              background: var(--panel-control);
              color: var(--panel-muted);
              cursor: pointer;
              touch-action: manipulation;
            }

            .icon-button:hover {
              color: var(--panel-danger);
              border-color: var(--panel-danger);
            }

            .icon-button svg {
              width: 13px;
              height: 13px;
              pointer-events: none;
            }

            .icon-button.prompt-more-button {
              display: none;
            }

            .prompt-secondary-actions .icon-button:hover {
              color: var(--panel-muted);
              border-color: var(--panel-border);
            }

            .prompt-secondary-actions [data-delete-prompt],
            .prompt-secondary-actions [data-delete-prompt]:hover,
            [data-delete-summary-tag],
            [data-delete-summary-tag]:hover {
              color: var(--panel-danger);
            }

            @media (max-width: 760px) {
              .icon-button.prompt-more-button {
                display: inline-flex;
              }
            }

            .preset-status {
              color: var(--panel-accent-strong);
              font-size: 12px;
              white-space: nowrap;
            }

            .prompt-editor-grid {
              display: grid;
              grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
              gap: 12px;
            }

            .prompt-editor-head {
              display: grid;
              grid-template-columns: auto minmax(0, 1fr) 34px;
              align-items: center;
              gap: 8px;
            }

            .prompt-editor-head label {
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1.3;
            }

            .prompt-template-actions {
              display: flex;
              gap: 8px;
            }

            .prompt-template-actions[hidden] {
              display: none;
            }

            .textarea[readonly] {
              cursor: default;
              opacity: 0.86;
            }

            .prompt-editor-grid .textarea {
              min-height: 390px;
            }

            .api-grid {
              display: grid;
              grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 0.9fr);
              gap: 10px;
            }

            .api-provider-fields[hidden] {
              display: none !important;
            }

            .field {
              display: grid;
              gap: 6px;
            }

            .field[hidden] {
              display: none !important;
            }

            .field label,
            .field__label {
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1.3;
            }

            .input,
            .textarea,
            .select {
              width: 100%;
              min-width: 0;
              border: 1px solid var(--panel-border);
              border-radius: 14px;
              background: rgba(255, 255, 255, 0.72);
              box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
              color: var(--panel-text);
              padding: 9px 10px;
              outline: none;
            }

            .input::placeholder,
            .textarea::placeholder {
              color: var(--panel-muted);
            }

            .textarea {
              min-height: 260px;
              resize: vertical;
              font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
              font-size: 12px;
              line-height: 1.6;
            }

            .model-combobox {
              position: relative;
              display: grid;
              z-index: 2;
            }

            .model-combobox__input {
              padding-right: 38px;
            }

            .model-combobox__toggle {
              position: absolute;
              top: 1px;
              right: 1px;
              width: 34px;
              height: calc(100% - 2px);
              border: 0;
              border-left: 1px solid var(--panel-border);
              border-radius: 0 7px 7px 0;
              background: transparent;
              color: var(--panel-muted);
              cursor: pointer;
            }

            .model-combobox__toggle:hover {
              color: var(--panel-text);
              background: var(--panel-control);
            }

            .model-combobox__menu {
              position: absolute;
              z-index: 48;
              top: calc(100% + 4px);
              left: 0;
              right: 0;
              display: grid;
              max-height: 220px;
              overflow: auto;
              border: 1px solid var(--panel-border);
              border-radius: 14px;
              background: rgba(255, 255, 255, 0.78);
              box-shadow: var(--panel-shadow-soft);
              backdrop-filter: blur(18px);
              padding: 4px;
            }

            .model-combobox__menu[hidden] {
              display: none;
            }

            .model-combobox__option {
              border: 0;
              border-radius: 6px;
              background: transparent;
              color: var(--panel-text);
              cursor: pointer;
              padding: 7px 8px;
              text-align: left;
              font-size: 12px;
              line-height: 1.35;
              word-break: break-all;
            }

            .model-combobox__option:hover,
            .model-combobox__option.is-active {
              background: var(--panel-control-hover);
            }

            .button-row {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }

            .plain-button {
              border: 1px solid var(--panel-border);
              border-radius: 12px;
              background: rgba(255, 255, 255, 0.62);
              box-shadow: 0 8px 18px rgba(141, 152, 176, 0.08);
              color: var(--panel-text);
              cursor: pointer;
              font-size: 12px;
              line-height: 1.2;
              padding: 8px 11px;
            }

            .plain-button:hover {
              background: var(--panel-control-hover);
            }

            .danger-button.is-warning {
              border-color: #c58a22;
              background: rgba(197, 138, 34, 0.16);
              color: #8a5a08;
            }

            .danger-button.is-danger {
              border-color: var(--panel-danger);
              background: color-mix(in srgb, var(--panel-danger) 18%, transparent);
              color: var(--panel-danger);
              font-weight: 700;
            }

            .plain-button:disabled,
            .online-icon-button:disabled {
              cursor: not-allowed;
              opacity: 0.46;
            }


            .code-editor-panel__head {
              display: flex;
              flex: 0 0 auto;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1.3;
            }

            .code-editor-panel__head strong {
              color: var(--panel-text);
              font-size: 13px;
            }

            .code-editor-actions {
              flex: 0 0 auto;
              align-items: center;
            }

            .code-editor-actions .plain-button {
              flex: 0 0 auto;
              min-width: 72px;
              height: 30px;
              padding: 0 10px;
              line-height: 1;
              white-space: nowrap;
            }

            .checkbox-row {
              display: flex;
              align-items: center;
              gap: 8px;
              color: var(--panel-text);
              font-size: 13px;
              line-height: 1.4;
            }

            .checkbox-row input {
              position: relative;
              width: 38px;
              height: 22px;
              flex: 0 0 auto;
              margin: 0;
              appearance: none;
              border: 0;
              border-radius: 999px;
              background: var(--switch-track);
              cursor: pointer;
              transition: background 160ms ease;
            }

            .checkbox-row input::after {
              position: absolute;
              top: 3px;
              left: 3px;
              width: 16px;
              height: 16px;
              border-radius: 999px;
              background: var(--switch-knob);
              content: "";
              transition: transform 160ms ease;
            }

            .checkbox-row input:checked {
              background: var(--panel-accent);
            }

            .checkbox-row input:checked::after {
              transform: translateX(16px);
            }

            .danger-zone {
              display: grid;
              gap: 10px;
              border: 1px solid color-mix(in srgb, var(--panel-danger) 35%, var(--panel-border));
              border-radius: 12px;
              background: color-mix(in srgb, var(--panel-bg) 84%, var(--panel-danger) 5%);
              padding: 12px;
            }

            body.theme-night .online-panel {
              background:
                var(--panel-glow),
                linear-gradient(180deg, rgba(20, 27, 38, 0.96) 0%, rgba(14, 20, 29, 0.98) 100%);
            }

            body.theme-night .online-panel__header,
            body.theme-night .debug-panel__header,
            body.theme-night .online-sidebar,
            body.theme-night .settings-sidebar,
            body.theme-night .worldbook-entry-panel__head,
            body.theme-night .prompt-viewer-card__head {
              background: linear-gradient(180deg, rgba(45, 56, 74, 0.74), rgba(25, 32, 45, 0.42));
            }

            body.theme-night .debug-panel,
            body.theme-night .settings-sidebar,
            body.theme-night .settings-card,
            body.theme-night .debug-tools-card,
            body.theme-night .debug-tools-overview-card,
            body.theme-night .debug-tools-stat,
            body.theme-night .prompt-viewer-card,
            body.theme-night .run-log-card,
            body.theme-night .worldbook-data-card,
            body.theme-night .worldbook-source-details,
            body.theme-night .worldbook-entry-panel,
            body.theme-night .detail-library-stat,
            body.theme-night .detail-library-folders,
            body.theme-night .detail-library-stage,
            body.theme-night .detail-library-card,
            body.theme-night .online-nav__item,
            body.theme-night .online-icon-button,
            body.theme-night .plain-button {
              background: rgba(24, 31, 43, 0.72);
              box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.06),
                0 10px 24px rgba(2, 6, 16, 0.22);
            }

            body.theme-night .online-nav__item:hover,
            body.theme-night .online-nav__item.is-active,
            body.theme-night .online-icon-button:hover,
            body.theme-night .online-icon-button.is-active,
            body.theme-night .plain-button:hover {
              background: rgba(36, 46, 62, 0.92);
            }

            body.theme-night .input,
            body.theme-night .textarea,
            body.theme-night .select,
            body.theme-night .model-combobox__menu,
            body.theme-night .random-prompt-list,
            body.theme-night .appearance-color-field,
            body.theme-night .run-log-card pre {
              background: rgba(14, 20, 29, 0.86);
              color: var(--panel-text);
              border-color: rgba(196, 211, 238, 0.12);
              box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
            }

            body.theme-night .run-log-summary__chip,
            body.theme-night .prompt-viewer-meta__chip {
              background: rgba(255, 255, 255, 0.06);
            }

            body.theme-night .run-log-card__badge[data-tone="error"] {
              background: rgba(224, 108, 117, 0.18);
              color: #ffb1b8;
            }

            body.theme-night .run-log-card__badge[data-tone="warn"] {
              background: rgba(221, 161, 94, 0.18);
              color: #ffd08f;
            }

            body.theme-night .run-log-card__badge[data-tone="success"] {
              background: rgba(85, 180, 138, 0.18);
              color: #b1e5cb;
            }

            body.theme-night .run-log-card__badge[data-tone="info"] {
              background: rgba(57, 123, 255, 0.18);
              color: #b9d0ff;
            }

            body.theme-night .run-log-card__badge[data-tone="neutral"] {
              background: rgba(255, 255, 255, 0.08);
              color: var(--panel-muted);
            }

            body.theme-night .settings-home-button {
              background:
                linear-gradient(135deg, rgba(113, 155, 228, 0.32), rgba(30, 40, 55, 0.92)),
                rgba(24, 31, 43, 0.84);
              border-color: rgba(141, 177, 233, 0.3);
            }

            body.theme-night .save-settings-button {
              background:
                linear-gradient(135deg, rgba(108, 154, 228, 0.28), rgba(26, 36, 52, 0.96)),
                rgba(24, 31, 43, 0.88);
              border-color: rgba(140, 180, 236, 0.34);
              color: #d7e6ff;
            }

            body.theme-night .save-settings-button:hover {
              background:
                linear-gradient(135deg, rgba(128, 176, 245, 0.36), rgba(32, 44, 62, 0.98)),
                rgba(30, 39, 55, 0.96);
              color: #edf4ff;
            }

            body.theme-night .confirm-dialog.detail-tag-manager-dialog {
              background:
                var(--panel-glow),
                linear-gradient(180deg, rgba(20, 27, 38, 0.96) 0%, rgba(14, 20, 29, 0.98) 100%);
            }

            body.theme-night .detail-library-folder {
              border-color: rgba(196, 211, 238, 0.12);
              background: rgba(18, 24, 34, 0.78);
            }

            body.theme-night .detail-library-folder:hover,
            body.theme-night .detail-library-folder.is-active {
              border-color: rgba(141, 177, 233, 0.3);
              background: rgba(35, 45, 61, 0.9);
            }

            body.theme-night .detail-library-folder.is-drag-over {
              border-color: rgba(141, 177, 233, 0.54);
              background: rgba(45, 60, 82, 0.82);
            }

            body.theme-night .detail-library-activation {
              background: rgba(19, 25, 36, 0.82);
            }

            body.theme-night .detail-library-activation.is-active {
              border-color: rgba(92, 214, 161, 0.52);
              background: rgba(33, 97, 74, 0.34);
              color: #8ce7c3;
            }

            body.theme-night .detail-library-activation:not(.is-active) {
              border-color: rgba(237, 120, 120, 0.34);
              background: rgba(102, 45, 52, 0.28);
              color: #ffb1b1;
            }

            body.theme-night .detail-library-card__action.is-danger {
              color: #ff9d9d;
            }

            .danger-zone h3 {
              margin: 0;
              font-size: 14px;
              line-height: 1.3;
            }

            .confirm-backdrop {
              position: fixed;
              inset: 0;
              z-index: 30;
              display: grid;
              place-items: center;
              background: rgba(0, 0, 0, 0.36);
              padding: 18px;
            }

            .confirm-dialog {
              display: grid;
              width: min(420px, 100%);
              gap: 12px;
              border: 1px solid var(--panel-border);
              border-radius: 14px;
              background:
                var(--panel-glow),
                linear-gradient(180deg, color-mix(in srgb, var(--panel-bg) 94%, white 6%) 0%, var(--panel-bg) 100%);
              box-shadow: var(--panel-shadow);
              backdrop-filter: blur(24px);
              color: var(--panel-text);
              padding: 16px;
            }

            .confirm-dialog.icon-picker-dialog {
              width: min(760px, calc(100vw - 32px));
              background:
                var(--panel-glow),
                linear-gradient(180deg, color-mix(in srgb, var(--panel-bg) 94%, white 6%) 0%, var(--panel-bg) 100%);
              box-shadow: var(--panel-shadow);
              backdrop-filter: blur(24px);
            }

            .confirm-dialog.detail-tag-manager-dialog {
              width: min(520px, calc(100vw - 32px));
              background:
                var(--panel-glow),
                linear-gradient(180deg, color-mix(in srgb, var(--panel-bg) 94%, white 6%) 0%, var(--panel-bg) 100%);
              box-shadow: var(--panel-shadow);
              backdrop-filter: blur(24px);
            }

            .confirm-dialog.detail-library-dialog {
              width: min(1120px, calc(100vw - 32px));
              max-height: min(88vh, 820px);
              background:
                var(--panel-glow),
                linear-gradient(180deg, color-mix(in srgb, var(--panel-bg) 94%, white 6%) 0%, var(--panel-bg) 100%);
              box-shadow: var(--panel-shadow);
              backdrop-filter: blur(24px);
              overflow: hidden;
            }

            .confirm-dialog.excluded-character-dialog {
              width: min(760px, calc(100vw - 40px));
              max-height: min(84vh, 760px);
              overflow: hidden;
              padding: 18px 18px 14px;
            }

            .excluded-character-dialog__toolbar {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              margin-bottom: 2px;
            }

            .excluded-character-dialog__toolbar .icon-button {
              width: 42px;
              height: 42px;
              min-width: 42px;
              border-radius: 999px;
              padding: 0;
            }

            .excluded-character-dialog__body {
              max-height: min(60vh, 560px);
              padding-right: 6px;
            }

            .excluded-character-dialog__footer {
              position: sticky;
              bottom: 0;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              margin-top: 4px;
              padding-top: 10px;
              background:
                linear-gradient(180deg, color-mix(in srgb, var(--panel-bg) 18%, transparent 82%) 0%, var(--panel-bg) 38%),
                transparent;
            }

            .excluded-character-dialog__count {
              flex: 1 1 auto;
            }

            .excluded-character-dialog__done {
              min-width: 88px;
              border-radius: 14px;
            }

            .confirm-dialog.detail-import-dialog,
            .confirm-dialog.detail-export-dialog {
              width: min(860px, calc(100vw - 32px));
              max-height: min(88vh, 820px);
              background:
                var(--panel-glow),
                linear-gradient(180deg, color-mix(in srgb, var(--panel-bg) 94%, white 6%) 0%, var(--panel-bg) 100%);
              box-shadow: var(--panel-shadow);
              backdrop-filter: blur(24px);
              overflow: hidden;
            }

            .detail-import-dialog__body,
            .detail-export-dialog__body {
              display: grid;
              gap: 14px;
              max-height: min(68vh, 620px);
              overflow: auto;
              padding-right: 4px;
            }

            .detail-import-dialog__body,
            .detail-export-dialog__body {
              scrollbar-color: rgba(24, 33, 29, 0.26) transparent;
              scrollbar-width: thin;
            }

            .detail-import-dialog__body::-webkit-scrollbar,
            .detail-export-dialog__body::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }

            .detail-import-dialog__body::-webkit-scrollbar-track,
            .detail-export-dialog__body::-webkit-scrollbar-track {
              background: transparent;
            }

            .detail-import-dialog__body::-webkit-scrollbar-thumb,
            .detail-export-dialog__body::-webkit-scrollbar-thumb {
              border: 2px solid transparent;
              border-radius: 999px;
              background: rgba(24, 33, 29, 0.26);
              background-clip: padding-box;
            }

            body.theme-night .detail-import-dialog__body,
            body.theme-night .detail-export-dialog__body {
              scrollbar-color: rgba(166, 210, 190, 0.28) transparent;
            }

            body.theme-night .detail-import-dialog__body::-webkit-scrollbar-thumb,
            body.theme-night .detail-export-dialog__body::-webkit-scrollbar-thumb {
              background: rgba(166, 210, 190, 0.28);
              background-clip: padding-box;
            }

            .detail-import-dialog__toolbar,
            .detail-export-dialog__toolbar {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              align-items: center;
              justify-content: space-between;
            }

            .detail-import-dialog__hero {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 14px;
            }

            .detail-import-dialog__hero-copy {
              display: grid;
              gap: 8px;
              min-width: 0;
            }

            .detail-import-dialog__hero-copy p {
              margin: 0;
            }

            .detail-import-dialog__hero .checkbox-row {
              flex: 0 0 auto;
              align-self: flex-start;
              margin-top: 2px;
            }

            .detail-import-list {
              display: grid;
              gap: 10px;
            }

            .detail-import-card {
              display: grid;
              gap: 8px;
              border: 1px solid color-mix(in srgb, var(--panel-border) 80%, white 20%);
              border-radius: 14px;
              background: color-mix(in srgb, var(--panel-bg-soft) 78%, transparent 22%);
              padding: 12px;
            }

            .detail-import-card__head {
              display: flex;
              gap: 10px;
              align-items: flex-start;
            }

            .detail-import-card__head input {
              margin-top: 2px;
            }

            .detail-import-card__title {
              display: grid;
              gap: 4px;
              min-width: 0;
            }

            .detail-import-card__title strong,
            .detail-import-card__title p {
              margin: 0;
            }

            .detail-import-card__title p {
              color: var(--panel-muted);
              font-size: 12px;
              line-height: 1.5;
            }

            .detail-library-dialog__body {
              display: grid;
              gap: 14px;
              overflow: hidden;
              padding: 16px;
            }

            .detail-library-window__header {
              position: sticky;
              top: 0;
              z-index: 1;
            }

            .detail-library-dialog .detail-library-manager {
              min-height: 0;
              max-height: min(66vh, 620px);
            }

            .detail-library-dialog .detail-library-folders,
            .detail-library-dialog .detail-library-stage {
              overflow: hidden;
            }

            .detail-library-dialog .detail-library-folder-list,
            .detail-library-dialog .detail-library-grid,
            .detail-library-dialog .detail-library-detail {
              overflow: auto;
            }

            .detail-library-dialog .detail-library-detail {
              max-height: 340px;
            }

            .confirm-dialog.is-danger {
              border-color: var(--panel-danger);
            }

            .confirm-dialog.is-warning {
              border-color: #c58a22;
            }

            .confirm-dialog h3,
            .confirm-dialog p {
              margin: 0;
            }

            .confirm-dialog p {
              color: var(--panel-muted);
              font-size: 13px;
              line-height: 1.6;
              white-space: pre-wrap;
            }

            .online-preview {
              display: block;
              width: 100%;
              flex: 0 0 auto;
              min-height: 120px;
              min-width: 100%;
              border: 1px solid var(--panel-border);
              border-radius: 10px;
              background: var(--panel-bg);
              color-scheme: light;
              overflow: hidden;
            }

            .online-preview-shell {
              position: relative;
              display: flex;
              flex: 1 1 0;
              min-height: 120px;
              height: 100%;
              overflow: auto !important;
              overscroll-behavior: contain !important;
              scrollbar-color: rgba(24, 33, 29, 0.18) transparent !important;
              scrollbar-width: thin !important;
            }

            .image-generation-trigger {
              position: absolute;
              left: 14px;
              bottom: 12px;
              z-index: 4;
              display: inline-flex;
              align-items: center;
              gap: 7px;
              border: 1px solid color-mix(in srgb, var(--panel-accent) 48%, white 18%);
              border-radius: 999px;
              background: color-mix(in srgb, var(--panel-bg-soft) 88%, white 12%);
              box-shadow: var(--panel-shadow-soft);
              backdrop-filter: blur(14px);
              color: var(--panel-text);
              cursor: pointer;
              padding: 7px 13px;
              font-size: 12px;
            }

            .image-generation-trigger[hidden] {
              display: none;
            }

            .online-preview-shell::-webkit-scrollbar {
              width: 5px !important;
              height: 5px !important;
              background: transparent !important;
            }

            .online-preview-shell::-webkit-scrollbar-track {
              background: transparent !important;
              box-shadow: none !important;
              border: 0 !important;
            }

            .online-preview-shell::-webkit-scrollbar-thumb {
              border: 1px solid transparent !important;
              border-radius: 999px !important;
              background: rgba(24, 33, 29, 0.18) !important;
              background-clip: padding-box !important;
              box-shadow: none !important;
            }

            .online-preview-shell::-webkit-scrollbar-corner {
              background: transparent !important;
            }

            body.theme-night .online-preview {
              color-scheme: dark;
            }

            body.theme-night .online-preview-shell {
              scrollbar-color: rgba(166, 210, 190, 0.2) transparent !important;
            }

            body.theme-night .online-preview-shell::-webkit-scrollbar-thumb {
              background: rgba(166, 210, 190, 0.2) !important;
              background-clip: padding-box !important;
            }

            body.theme-night .detail-activation-log {
              background: rgba(17, 24, 35, 0.42);
            }

            body.theme-night .detail-activation-chart__pie {
              box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.08),
                0 10px 24px rgba(2, 8, 20, 0.28);
            }

            body.theme-night .detail-activation-chart__pie-surface {
              box-shadow:
                inset 0 0 0 1px rgba(255, 255, 255, 0.14),
                inset 0 12px 20px rgba(255, 255, 255, 0.04);
            }

            body.theme-night .detail-activation-chart__pie-center {
              background:
                linear-gradient(180deg, color-mix(in srgb, var(--panel-bg-soft) 86%, white 14%), color-mix(in srgb, var(--panel-bg) 96%, transparent 4%));
              box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.12),
                0 6px 14px rgba(2, 8, 20, 0.22);
            }

            .online-preview-badge {
              position: absolute;
              right: 12px;
              bottom: 12px;
              z-index: 2;
              max-width: min(68%, 280px);
              border: 1px solid rgba(255, 255, 255, 0.24);
              border-radius: 999px;
              background: color-mix(in srgb, var(--panel-bg) 68%, transparent 32%);
              box-shadow: 0 8px 22px rgba(10, 18, 34, 0.18);
              backdrop-filter: blur(14px);
              color: var(--panel-text);
              font-size: 12px;
              line-height: 1.35;
              padding: 7px 12px;
              pointer-events: none;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .online-toolbar {
              display: flex;
              flex: 0 0 auto;
              width: 100%;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              min-width: 0;
              padding: 2px 0;
            }

            body.is-panel-fullscreen .panel-resize-handle {
              display: none !important;
            }

            .online-title-area {
              display: flex;
              flex: 1 1 auto;
              min-width: 0;
              align-items: center;
              gap: 6px;
            }

            .online-title-display {
              flex: 0 1 auto;
              min-width: 0;
              overflow: hidden;
              border: 0;
              background: transparent;
              color: var(--panel-text);
              cursor: pointer;
              font-size: 14px;
              font-weight: 700;
              line-height: 1.35;
              padding: 4px 0;
              text-align: left;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .online-title-input {
              flex: 1 1 auto;
              min-width: 0;
              border: 1px solid var(--panel-border);
              border-radius: 8px;
              background: var(--panel-bg);
              color: var(--panel-text);
              font-size: 14px;
              line-height: 1.35;
              padding: 5px 8px;
              outline: none;
            }

            .online-title-input[hidden],
            .online-title-display[hidden] {
              display: none;
            }

            .online-actions {
              position: relative;
              display: flex;
              flex: 0 0 auto;
              align-items: center;
              gap: 6px;
            }

            .toolbar-secondary,
            .version-control {
              display: flex;
              align-items: center;
              gap: 6px;
            }

            .online-icon-button {
              display: inline-flex;
              width: 30px;
              height: 30px;
              flex: 0 0 auto;
              align-items: center;
              justify-content: center;
              border: 1px solid rgba(255, 255, 255, 0.3);
              border-radius: 12px;
              background: rgba(255, 255, 255, 0.56);
              box-shadow: 0 8px 18px rgba(141, 152, 176, 0.08);
              backdrop-filter: blur(12px);
              color: var(--panel-text);
              cursor: pointer;
              padding: 0;
              touch-action: manipulation;
            }

            .online-icon-button:hover,
            .online-icon-button.is-active {
              background: rgba(255, 255, 255, 0.9);
              color: var(--panel-accent-strong);
            }

            .online-icon-button.is-danger:hover {
              color: var(--panel-danger);
              border-color: var(--panel-danger);
            }

            .online-icon-button svg {
              width: 13px;
              height: 13px;
              pointer-events: none;
            }

            .online-icon-button i,
            .version-label i {
              font-size: 14px;
              line-height: 1;
              pointer-events: none;
            }

            .toolbar-more {
              display: none;
            }

            .version-label {
              flex: 0 0 auto;
              color: var(--panel-muted);
              font-size: 12px;
              white-space: nowrap;
            }

            .code-editor-panel {
              display: flex;
              flex: 0 0 auto;
              min-height: 0;
              flex-direction: column;
              gap: 8px;
            }

            .code-editor-panel[hidden] {
              display: none;
            }

            .code-editor {
              width: 100%;
              height: 320px;
              min-height: 160px;
              max-height: none;
              flex: 0 0 auto;
              border: 1px solid var(--panel-border);
              border-radius: 8px;
              background: var(--panel-bg);
              color: var(--panel-text);
              font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
              font-size: 12px;
              line-height: 1.55;
              padding: 10px;
              resize: vertical;
            }

            body.is-panel .online-bubble {
              display: none;
            }

            body.is-panel .online-panel {
              display: block;
            }

            body.is-mobile .online-panel {
              border-radius: 0;
              clip-path: none;
            }

            body.is-mobile .online-panel__header {
              display: grid;
              grid-template-columns: minmax(0, 1fr) auto;
              align-items: center;
              gap: 10px 12px;
              min-height: 0;
              padding: calc(12px + var(--safe-top-final)) calc(12px + var(--safe-right-final)) 12px
                calc(12px + var(--safe-left-final));
            }

            body.is-mobile .online-panel__body {
              height: calc(100% - var(--mobile-header-height, 96px));
            }

            body.is-mobile .online-panel__title {
              display: grid;
              grid-template-columns: minmax(0, 1fr);
              min-width: 0;
              align-items: start;
              gap: 6px;
            }

            body.is-mobile .online-panel__title-brand {
              display: inline-flex;
              min-width: 0;
              align-items: center;
              gap: 8px;
              flex-wrap: nowrap;
              max-width: 100%;
            }

            body.is-mobile .online-panel__title strong {
              font-size: 19px;
              line-height: 1.08;
              margin-top: 0;
            }

            body.is-mobile .online-panel__version {
              align-self: center;
              margin-top: 0;
              padding: 4px 9px;
              font-size: 10px;
            }

            body.is-mobile .online-panel__title-meta {
              display: block;
              min-width: 0;
              margin-top: 0;
            }

            body.is-mobile .online-panel__title-divider {
              display: none;
            }

            body.is-mobile .online-panel__title-character {
              display: block;
              font-size: 12px;
              line-height: 1.2;
              margin-top: 0;
            }

            body.is-mobile .online-panel__actions {
              display: grid;
              grid-template-columns: 32px 32px;
              justify-content: end;
              justify-items: end;
              align-items: center;
              gap: 8px;
            }

            body.is-mobile .online-panel__actions > [data-nav-view="settings"] {
              grid-column: 1;
            }

            body.is-mobile .online-panel__actions > .online-close {
              grid-column: 2;
            }

            body.is-mobile .online-panel__body {
              display: block;
            }

            body.is-desktop .online-panel__body {
              display: grid;
              grid-template-columns: 0 minmax(0, 1fr);
              transition: grid-template-columns 180ms ease;
            }

            body.is-desktop.sidebar-open .online-panel__body {
              grid-template-columns: 240px minmax(0, 1fr);
            }

            body.is-desktop .online-sidebar {
              position: relative;
              grid-column: 1;
              grid-row: 1;
              width: 240px;
              transform: none;
              visibility: hidden;
            }

            body.is-desktop.sidebar-open .online-sidebar {
              visibility: visible;
            }

            body.is-desktop .online-main {
              grid-column: 2;
              grid-row: 1;
            }

            body.is-desktop .sidebar-toggle {
              left: 0;
            }

            body.is-desktop.sidebar-open .sidebar-toggle {
              left: 240px;
            }

            body.is-mobile .online-sidebar {
              width: min(240px, 78vw);
              padding: 16px;
            }

            body.is-mobile .online-nav__item {
              gap: 8px;
              padding: 9px 10px;
            }

            body.is-mobile.sidebar-open .sidebar-toggle {
              left: min(240px, 78vw);
            }

            body.is-mobile .online-main {
              display: flex;
              flex-direction: column;
              align-items: stretch;
              justify-content: flex-start;
              min-height: 100%;
              padding: 12px 12px 48px;
            }

            body.is-mobile .settings-column .online-panel__copyright {
              display: none;
            }

            body.is-mobile .online-panel__copyright.is-mobile-footer {
              display: flex;
            }

            body.is-mobile .online-toolbar {
              gap: 6px;
            }

            body.is-mobile .online-title-display {
              max-width: 100%;
              font-size: 13px;
            }

            body.is-mobile .online-title-area .online-icon-button {
              display: none;
            }

            body.is-mobile .toolbar-secondary .mobile-source-jump {
              display: inline-flex;
            }

            body.is-mobile .online-icon-button {
              width: 32px;
              height: 32px;
            }

            body.is-mobile .toolbar-more {
              display: inline-flex;
            }

            body.is-mobile .toolbar-secondary {
              position: absolute;
              z-index: 5;
              top: calc(100% + 8px);
              right: 0;
              display: none;
              min-width: 156px;
              align-items: stretch;
              flex-direction: column;
              gap: 7px;
              border: 1px solid var(--panel-border);
              border-radius: 10px;
              background: var(--panel-bg);
              padding: 8px;
            }

            body.is-mobile .toolbar-secondary.is-open {
              display: flex;
            }

            body.is-mobile .toolbar-secondary .online-icon-button {
              width: 100%;
            }

            body.is-mobile .version-control {
              display: grid;
              grid-template-columns: 32px minmax(44px, 1fr) 32px;
              align-items: center;
              justify-content: space-between;
              width: 100%;
            }

            body.is-mobile .version-control .online-icon-button {
              width: 32px;
            }

            body.is-mobile .version-control .version-label {
              text-align: center;
            }

            body.is-mobile .settings-topbar,
            body.is-mobile .prompt-editor-grid,
            body.is-mobile .summary-tag-grid,
            body.is-mobile .api-grid {
              grid-template-columns: 1fr;
            }

            body.is-mobile .novelai-preset-toolbar {
              grid-template-columns: 1fr;
            }

            body.is-mobile .novelai-preset-actions {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            body.is-mobile .novelai-preset-actions .plain-button {
              width: 100%;
            }

            body.is-mobile .detail-library-summary,
            body.is-mobile .detail-library-manager {
              grid-template-columns: 1fr;
            }

            body.is-mobile .detail-activation-chart {
              grid-template-columns: 1fr;
              justify-items: center;
            }

            body.is-mobile .detail-activation-chart__legend {
              width: 100%;
              grid-template-columns: 1fr;
            }

            body.is-mobile .online-preview-badge {
              right: 10px;
              bottom: 10px;
              max-width: calc(100% - 20px);
            }

            body.is-mobile .detail-library-filters {
              grid-template-columns: 1fr;
            }

            body.is-mobile .detail-library-toolbar,
            body.is-mobile .detail-library-toolbar__actions,
            body.is-mobile .detail-library-folder-actions,
            body.is-mobile .detail-library-toolbar__meta {
              justify-content: stretch;
            }

            body.is-mobile .detail-library-toolbar {
              display: grid;
              grid-template-columns: minmax(0, 1fr);
              align-items: start;
              gap: 12px;
            }

            body.is-mobile .detail-library-toolbar__title {
              width: 100%;
            }

            body.is-mobile .detail-library-toolbar__meta {
              display: grid;
              grid-template-columns: minmax(0, 1fr);
              justify-items: start;
              width: 100%;
              gap: 10px;
            }

            body.is-mobile .detail-library-toolbar__icon-actions {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 44px));
              justify-content: start;
              gap: 10px;
              width: 100%;
            }

            body.is-mobile .detail-library-toolbar__icon-actions .icon-button {
              width: 44px;
              height: 44px;
            }

            body.is-mobile .detail-library-toolbar__actions .plain-button,
            body.is-mobile .detail-library-folder-actions .plain-button {
              width: 100%;
            }

            body.is-mobile .settings-column {
              gap: 10px;
            }

            body.is-mobile .settings-sidebar {
              position: static;
              gap: 12px;
              padding: 14px;
            }

            body.is-mobile .settings-content {
              padding-left: 0;
              padding-right: 0;
            }

            body.is-mobile .settings-sidebar {
              margin: 0;
            }

            body.is-mobile .settings-nav,
            body.is-mobile [data-detail-manager-folder-list],
            body.is-mobile .detail-library-folder-list {
              display: grid;
              gap: 8px;
              overflow: visible;
            }

            .detail-library-browser > .detail-library-bulk-actions,
            .detail-library-browser > .detail-library-filters,
            .detail-library-browser > .detail-library-manager {
              width: min(100%, 960px);
            }

            body.is-mobile.is-settings-root .settings-layout {
              position: relative;
              grid-template-columns: minmax(0, 1fr);
              min-height: 100%;
            }

            body.is-mobile.is-settings-root .settings-column {
              position: fixed;
              top: var(--mobile-body-top, 96px);
              left: var(--safe-left-final);
              bottom: 0;
              z-index: 4;
              width: min(240px, calc(78vw - var(--safe-left-final)));
              height: var(--mobile-body-height, calc(100dvh - 96px));
              min-height: var(--mobile-body-height, calc(100dvh - 96px));
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              align-items: stretch;
              justify-content: flex-start;
              gap: 18px;
              margin: 0;
              padding: 18px 16px 18px;
              overflow-x: hidden;
              overflow-y: auto;
              border-right: 1px solid rgba(255, 255, 255, 0.24);
              background: linear-gradient(180deg, rgba(255, 255, 255, 0.56), rgba(255, 255, 255, 0.24));
              backdrop-filter: blur(18px);
              scrollbar-color: rgba(24, 33, 29, 0.28) transparent;
              scrollbar-width: thin;
              box-shadow: var(--panel-shadow-soft);
              transform: translateX(-100%);
              transition: transform 180ms ease;
            }

            body.is-mobile.is-settings-root .settings-column::-webkit-scrollbar {
              width: 8px;
            }

            body.is-mobile.is-settings-root .settings-column::-webkit-scrollbar-track {
              background: transparent;
            }

            body.is-mobile.is-settings-root .settings-column::-webkit-scrollbar-thumb {
              border: 2px solid transparent;
              border-radius: 999px;
              background: rgba(24, 33, 29, 0.28);
              background-clip: padding-box;
            }

            body.is-mobile.is-settings-root.sidebar-open .settings-column {
              transform: translateX(0);
            }

            body.is-mobile.is-settings-root .settings-content {
              width: 100%;
              padding-left: 0;
              padding-right: 0;
            }

            body.is-mobile.is-settings-root .settings-sidebar {
              flex: 0 0 auto;
              width: 100%;
              border-radius: 0;
              border: 0;
              background: transparent;
              box-shadow: none;
              backdrop-filter: none;
              padding: 0;
            }

            body.is-mobile.is-settings-root .save-settings-button,
            body.is-mobile.is-settings-root .online-panel__copyright {
              width: 100%;
              margin-left: 0;
              margin-right: 0;
            }

            body.theme-night.is-mobile.is-settings-root .settings-column {
              background: linear-gradient(180deg, rgba(45, 56, 74, 0.82), rgba(25, 32, 45, 0.62));
              scrollbar-color: rgba(166, 210, 190, 0.42) transparent;
            }

            body.theme-night.is-mobile.is-settings-root .settings-column::-webkit-scrollbar-thumb {
              background: rgba(166, 210, 190, 0.42);
              background-clip: padding-box;
            }

            body.theme-night.is-mobile.is-settings-root .settings-sidebar {
              background: transparent;
            }

            body.is-mobile .detail-library-filters {
              grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
              gap: 8px;
            }

            body.is-mobile .detail-library-filters .input {
              grid-column: 1 / -1;
            }

            @media (max-width: 1023px) {
              .detail-library-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
              }
            }

            body.is-mobile .detail-library-card {
              gap: 8px;
              border-radius: 16px;
              padding: 10px;
            }

            body.is-mobile .detail-library-card__head {
              display: grid;
              gap: 6px;
            }

            body.is-mobile .detail-library-card strong {
              white-space: normal;
              font-size: 13px;
              display: -webkit-box;
              -webkit-box-orient: vertical;
              -webkit-line-clamp: 2;
            }

            body.is-mobile .detail-library-card p {
              -webkit-line-clamp: 2;
              font-size: 11px;
            }

            body.is-mobile .detail-library-card__meta {
              font-size: 10px;
            }

            body.is-mobile .detail-library-card__meta-actions {
              justify-content: flex-start;
              flex-wrap: wrap;
              gap: 6px;
            }

            body.is-mobile .detail-library-activation {
              min-height: 22px;
              padding: 0 8px;
              font-size: 10px;
            }

            body.is-mobile.is-panel .online-panel,
            body.is-mobile.is-panel .online-panel__header,
            body.is-mobile.is-panel .online-panel__body,
            body.is-mobile.is-panel .online-main,
            body.is-panel-force-fullscreen .online-panel,
            body.is-panel-force-fullscreen .online-panel__header,
            body.is-panel-force-fullscreen .online-panel__body,
            body.is-panel-force-fullscreen .online-main {
              border-radius: 0;
            }

            body.is-mobile .prompt-editor-grid .textarea {
              min-height: 260px;
            }

            body.is-mobile .debug-tools-overview,
            body.is-mobile .debug-tools-columns,
            body.is-mobile .debug-tools-stat-grid {
              grid-template-columns: minmax(0, 1fr);
            }

            body.is-mobile .online-preview {
              min-height: clamp(420px, 56dvh, 520px);
              height: 100%;
            }

            body.is-mobile .online-preview-shell {
              display: flex;
              flex: 1 1 auto;
              min-height: clamp(420px, 56dvh, 520px);
              height: auto;
              -ms-overflow-style: none !important;
            }

            body.is-mobile .online-preview-shell::-webkit-scrollbar {
              width: 0 !important;
              height: 0 !important;
              display: none !important;
            }

            body.is-mobile .online-empty {
              display: grid;
              flex: 1 1 auto;
              width: 100%;
              max-width: none;
              min-height: clamp(420px, 56dvh, 520px);
              place-content: center;
              padding: 28px 18px;
              box-sizing: border-box;
            }

            body.is-mobile .view-panel[data-view="online"] {
              display: flex;
              flex: 1 1 auto;
              min-height: calc(100dvh - var(--mobile-header-height, 96px) - 24px - var(--safe-bottom-final));
            }

            body.is-mobile .view-panel[hidden] {
              display: none;
            }

            body.is-mobile .view-panel[data-view="online"] > * {
              min-width: 0;
            }

            body.is-mobile .code-editor {
              height: 360px;
              min-height: 320px;
              max-height: 68vh;
            }

            body.is-mobile .theme-switch__label {
              display: none;
            }

            body.is-mobile .confirm-dialog.excluded-character-dialog {
              width: min(100%, calc(100vw - 20px));
              max-height: min(88vh, 92dvh);
              padding: 16px 14px 12px;
            }

            body.is-mobile .excluded-character-dialog__toolbar .icon-button {
              width: 40px;
              height: 40px;
              min-width: 40px;
            }

            body.is-mobile .excluded-character-dialog__body {
              max-height: min(64vh, 68dvh);
            }

            body.is-mobile .excluded-character-dialog__footer {
              align-items: flex-end;
              flex-wrap: wrap;
            }

            body.is-mobile .excluded-character-dialog__done {
              margin-left: auto;
            }

            body.is-mobile .worldbook-entry-card {
              align-items: stretch;
              flex-direction: column;
            }

            body.is-mobile {
              border-radius: 0;
              padding-bottom: var(--safe-bottom-final);
            }
          </style>
        </head>
        <body>
          <button class="online-bubble" type="button" aria-label="打开${APP_TITLE}面板" title="${APP_TITLE}">
            <span class="online-bubble__orb">
              <span class="online-bubble__icon" aria-hidden="true">
                <span class="online-bubble__icon-state is-idle">
                  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 26 26"><g fill="currentColor"><path fill-rule="evenodd" d="M4.25 13a8.75 8.75 0 1 0 17.5 0a8.75 8.75 0 0 0-17.5 0m16 0a7.25 7.25 0 1 1-14.5 0a7.25 7.25 0 0 1 14.5 0" clip-rule="evenodd"/><path fill-rule="evenodd" d="M9.25 13c0 4.522 1.491 8.25 3.75 8.25s3.75-3.728 3.75-8.25S15.259 4.75 13 4.75S9.25 8.478 9.25 13m6 0c0 3.762-1.195 6.75-2.25 6.75s-2.25-2.988-2.25-6.75S11.945 6.25 13 6.25s2.25 2.988 2.25 6.75" clip-rule="evenodd"/><path d="m6.602 8.467l1.006-1.112q.15.136.325.267c1.271.952 3.3 1.54 5.515 1.54c1.891 0 3.653-.427 4.931-1.158q.463-.265.819-.57l.974 1.141q-.466.399-1.048.73c-1.516.868-3.534 1.356-5.676 1.356c-2.522 0-4.865-.678-6.415-1.839a6 6 0 0 1-.431-.355m0 9.082l1.006 1.112q.15-.136.325-.267c1.271-.952 3.3-1.54 5.515-1.54c1.891 0 3.653.427 4.931 1.158q.463.265.819.57l.974-1.141a7 7 0 0 0-1.048-.73c-1.516-.868-3.534-1.356-5.676-1.356c-2.522 0-4.865.678-6.415 1.839a6 6 0 0 0-.431.355M4.75 13.75v-1.5h16.5v1.5z"/><path fill-rule="evenodd" d="M13 24c6.075 0 11-4.925 11-11S19.075 2 13 2S2 6.925 2 13s4.925 11 11 11m0 2c7.18 0 13-5.82 13-13S20.18 0 13 0S0 5.82 0 13s5.82 13 13 13" clip-rule="evenodd"/></g></svg>
                </span>
                <span class="online-bubble__icon-state is-loading">
                  <span class="online-content-status-icon online-content-status-icon--loading">
                    <i class="fa-solid fa-circle-notch online-content-status-icon__ring" aria-hidden="true"></i>
                    <i class="fa-solid fa-circle-notch online-content-status-icon__ring online-content-status-icon__ring--back" aria-hidden="true"></i>
                    <i class="fa-solid fa-sparkles online-content-status-icon__spark" aria-hidden="true"></i>
                  </span>
                </span>
                <span class="online-bubble__icon-state is-success">
                  <span class="online-content-status-icon online-content-status-icon--success">
                    <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                  </span>
                </span>
                <span class="online-bubble__icon-state is-error">
                  <span class="online-content-status-icon online-content-status-icon--error">
                    <i class="fa-solid fa-circle-xmark" aria-hidden="true"></i>
                  </span>
                </span>
              </span>
            </span>
          </button>

          <section class="online-panel" aria-label="${APP_TITLE}面板">
            <header class="online-panel__header">
              <div class="online-panel__title">
                <span class="online-panel__title-brand">
                  <strong>${APP_TITLE}</strong>
                  <span class="online-panel__version">${APP_VERSION}</span>
                </span>
                <span class="online-panel__title-meta">
                  <span class="online-panel__title-divider" aria-hidden="true">✦</span>
                  <span class="online-panel__title-character" data-current-character-title>等待读取角色</span>
                </span>
              </div>
              <div class="online-panel__actions">
                <button class="online-icon-button" type="button" data-nav-view="settings" aria-label="打开设置" title="设置" aria-current="false">
                  <svg viewBox="0 0 512 512" aria-hidden="true" focusable="false">
                    <path fill="currentColor" d="M78.6 228.4c-1.2 9-2.6 18.1-2.6 27.6s1.4 18.6 2.6 27.6l-45.3 35.3c-4.3 3.4-5.5 9.6-2.9 14.5l42.9 74.3c2.6 4.9 8.4 7 13.6 5.3l53.4-21.4c14 10.8 29.3 19.7 45.8 26.1l8.1 56.9c.8 5.6 5.6 9.8 11.3 9.8h85.8c5.7 0 10.5-4.2 11.3-9.8l8.1-56.9c16.5-6.4 31.8-15.3 45.8-26.1l53.4 21.4c5.2 1.7 11-.4 13.6-5.3l42.9-74.3c2.6-4.9 1.4-11.1-2.9-14.5l-45.3-35.3c1.2-9 2.6-18.1 2.6-27.6s-1.4-18.6-2.6-27.6l45.3-35.3c4.3-3.4 5.5-9.6 2.9-14.5l-42.9-74.3c-2.6-4.9-8.4-7-13.6-5.3l-53.4 21.4c-14-10.8-29.3-19.7-45.8-26.1l-8.1-56.9c-.8-5.6-5.6-9.8-11.3-9.8h-85.8c-5.7 0-10.5 4.2-11.3 9.8l-8.1 56.9c-16.5 6.4-31.8 15.3-45.8 26.1l-53.4-21.4c-5.2-1.7-11 .4-13.6 5.3L30.4 158.6c-2.6 4.9-1.4 11.1 2.9 14.5zm177.4 91.6c-35.3 0-64-28.7-64-64s28.7-64 64-64s64 28.7 64 64s-28.7 64-64 64"/>
                  </svg>
                </button>
                <button class="online-close" type="button" aria-label="关闭${APP_TITLE}面板" title="关闭">
                  <svg viewBox="0 0 384 512" aria-hidden="true" focusable="false">
                    <path fill="currentColor" d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3l105.4 105.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
                  </svg>
                </button>
              </div>
            </header>

            <main class="online-panel__body">
              <button class="sidebar-toggle" type="button" aria-label="展开或收回目录" aria-expanded="false">›</button>
              <aside class="online-sidebar" aria-label="线上侧栏">
                <div class="sidebar-sections">
                  <details class="sidebar-section" open>
                    <summary>收藏夹</summary>
                    <button class="online-nav__item" type="button" data-open-detail-library-manager aria-current="false">
                      <span>管理小剧场</span>
                      <small>快速进入</small>
                    </button>
                    <nav class="online-nav" aria-label="线上收藏记录" data-online-favorite-list>
                      <p class="online-sidebar__label">还没有收藏页面。</p>
                    </nav>
                  </details>
                  <details class="sidebar-section" open>
                    <summary>生成记录</summary>
                    <nav class="online-nav" aria-label="线上生成记录" data-online-record-list>
                      <p class="online-sidebar__label">当前聊天还没有生成记录。</p>
                    </nav>
                  </details>
                </div>
              </aside>
              <section class="online-main" aria-label="页面区域">
                <section class="view-panel" data-view="online" aria-label="当前聊天页面">
                  <div class="online-toolbar">
                    <div class="online-title-area">
                      <button class="online-title-display" type="button" data-online-title-display title="点击编辑标题">当前聊天还没有页面</button>
                      <input class="online-title-input" type="text" data-online-title-input placeholder="标题" hidden />
                      <button class="online-icon-button" type="button" data-edit-online-title aria-label="编辑标题" title="编辑标题">
                        <svg viewBox="0 0 512 512" aria-hidden="true" focusable="false">
                          <path fill="currentColor" d="M471.6 21.7c-28.9-28.9-75.7-28.9-104.6 0L339.8 48.9l123.3 123.3 27.2-27.2c28.9-28.9 28.9-75.7 0-104.6L471.6 21.7zM314.1 74.6 76.1 312.6c-8.2 8.2-14 18.5-16.8 29.7L32.7 448.8c-2.4 9.6.4 19.7 7.4 26.7s17.1 9.8 26.7 7.4l106.5-26.6c11.2-2.8 21.5-8.6 29.7-16.8l238-238L314.1 74.6z"/>
                        </svg>
                      </button>
                    </div>
                    <div class="online-actions">
                      <button class="online-icon-button" type="button" data-quick-create-theater aria-label="快速新建小剧场" title="快速新建小剧场">
                        <i class="fa-solid fa-add" aria-hidden="true"></i>
                      </button>
                      <button class="online-icon-button" type="button" data-refresh-online aria-label="刷新页面预览" title="刷新页面预览">
                        <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
                      </button>
                      <button class="online-icon-button" type="button" data-regenerate-online aria-label="重新生成" title="重新生成">
                        <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
                      </button>
                      <button class="online-icon-button" type="button" data-edit-online-code aria-label="编辑" title="编辑" aria-expanded="false">
                        <svg viewBox="0 0 512 512" aria-hidden="true" focusable="false">
                          <path fill="currentColor" d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 182.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-128 128zm493.3 0-128-128c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L434.7 256 329.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l128-128c12.5-12.5 12.5-32.8 0-45.3z"/>
                        </svg>
                      </button>
                      <button class="online-icon-button" type="button" data-toggle-panel-fullscreen aria-label="全屏显示" title="全屏显示">
                        <i class="fa-solid fa-expand" aria-hidden="true"></i>
                      </button>

                      <div class="toolbar-secondary" data-toolbar-menu>
                        <button class="online-icon-button mobile-source-jump" type="button" data-scroll-source-message-mobile aria-label="跳转到原始酒馆楼层" title="跳转到原始酒馆楼层" hidden>
                          <i class="fa-solid fa-map-location-dot" aria-hidden="true"></i>
                        </button>
                        <button class="online-icon-button" type="button" data-toggle-favorite aria-label="收藏" title="收藏">
                          <svg viewBox="0 0 576 512" aria-hidden="true" focusable="false">
                            <path fill="currentColor" d="M316.9 18.6 386.7 160l156 22.7c26.2 3.8 36.7 36.1 17.7 54.6L447.5 347.3l26.6 155.4c4.5 26.1-23 46-46.4 33.7L288 463 148.3 536.4c-23.4 12.3-50.9-7.6-46.4-33.7l26.6-155.4L15.6 237.3c-19-18.5-8.5-50.8 17.7-54.6l156-22.7 69.8-141.4c11.7-23.7 45.1-23.7 56.8 0z"/>
                          </svg>
                        </button>
                        <div class="version-control">
                          <button class="online-icon-button" type="button" data-previous-online-version aria-label="上一个版本" title="上一个版本">
                            <svg viewBox="0 0 320 512" aria-hidden="true" focusable="false">
                              <path fill="currentColor" d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 246.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z"/>
                            </svg>
                          </button>
                          <span class="version-label" data-online-version-label>0/0</span>
                          <button class="online-icon-button" type="button" data-next-online-version aria-label="下一个版本" title="下一个版本">
                            <svg viewBox="0 0 320 512" aria-hidden="true" focusable="false">
                              <path fill="currentColor" d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"/>
                            </svg>
                          </button>
                        </div>
                        <button class="online-icon-button is-danger" type="button" data-delete-online aria-label="删除本页" title="删除本页">
                          <svg viewBox="0 0 448 512" aria-hidden="true" focusable="false">
                            <path fill="currentColor" d="M135.2 17.7C140.6 6.8 151.7 0 163.8 0h120.4c12.1 0 23.2 6.8 28.6 17.7L320 32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64s14.3-32 32-32h96l7.2-14.3zM32 128h384l-21.2 339c-1.6 25.3-22.6 45-47.9 45H101.1c-25.3 0-46.3-19.7-47.9-45L32 128zm96 64c-8.8 0-16 7.2-16 16v224c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16v224c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16v224c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16z"/>
                          </svg>
                        </button>
                      </div>
                      <button class="online-icon-button toolbar-more" type="button" data-toolbar-more aria-label="更多操作" title="更多操作" aria-expanded="false">
                        <svg viewBox="0 0 128 512" aria-hidden="true" focusable="false">
                          <path fill="currentColor" d="M64 360a56 56 0 1 0 0 112 56 56 0 1 0 0-112zm0-160a56 56 0 1 0 0 112 56 56 0 1 0 0-112zM120 96A56 56 0 1 0 8 96a56 56 0 1 0 112 0z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <section class="code-editor-panel" data-code-editor-panel hidden data-editor-mode="html">
                    <div class="code-editor-panel__head">
                      <strong data-code-editor-title>编辑代码</strong>
                      <span data-code-editor-hint>修改 HTML 后保存，会自动重新提取正文记忆。</span>
                    </div>
                    <textarea class="code-editor" data-online-code-editor spellcheck="false"></textarea>
                    <div class="button-row code-editor-actions">
                      <button class="plain-button" type="button" data-save-online-code>保存</button>
                      <button class="plain-button" type="button" data-cancel-online-code>收起编辑</button>
                    </div>
                  </section>
                  <div hidden>
                    <span data-generate-status>待机</span>
                    <span data-generate-detail>尚未生成。</span>
                    <span data-current-chat-id>等待读取</span>
                    <span data-online-updated-at>尚未生成</span>
                    <span data-online-prompt-name>尚未生成</span>
                    <span data-online-memory-preview>当前聊天还没有线上正文记忆。</span>
                  </div>
                  <div class="online-preview-shell">
                    <iframe class="online-preview" title="页面预览" data-online-preview sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe>
                    <div class="online-preview-badge" data-online-detail-badge hidden></div>
                    <button class="image-generation-trigger" type="button" data-trigger-image-generation hidden title="处理当前页面中的生图资产">
                      <i class="fa-solid fa-image" aria-hidden="true"></i>
                      <span>生成图片</span>
                    </button>
                  </div>
                </section>
                <section class="view-panel" data-view="settings" aria-label="设置中心" hidden>
                  <div class="settings-layout">
                    <div class="settings-column">
                      <aside class="settings-sidebar" aria-label="设置导航">
                        <div class="settings-sidebar__head">
                          <strong>设置中心</strong>
                          <span>在这里统一调整基础设置、提示词、资料读取、美化方案与调试工具。</span>
                        </div>
                        <button class="online-nav__item settings-home-button" type="button" data-nav-view="online" aria-current="false">
                          <span>返回首页</span>
                          <small>当前聊天</small>
                        </button>
                        <nav class="online-nav settings-nav" aria-label="${APP_TITLE}设置目录">
                          <button class="online-nav__item" type="button" data-settings-nav-view="settings" aria-current="false">
                            <span>基础设置</span>
                            <small>运行</small>
                          </button>
                          <button class="online-nav__item" type="button" data-settings-nav-view="prompt-management" aria-current="false">
                            <span>提示词管理</span>
                            <small>小剧场 / 预设</small>
                          </button>
                          <button class="online-nav__item" type="button" data-settings-nav-view="image-generation" aria-current="false">
                            <span>剧场生图</span>
                            <small>NovelAI</small>
                          </button>
                          <button class="online-nav__item" type="button" data-settings-nav-view="sources" aria-current="false">
                            <span>世界书管理</span>
                            <small>资料</small>
                          </button>
                          <button class="online-nav__item" type="button" data-settings-nav-view="appearance" aria-current="false">
                            <span>美化方案</span>
                            <small>配色</small>
                          </button>
                          <button class="online-nav__item" type="button" data-settings-nav-view="debug-tools" aria-current="false">
                            <span>调试工具</span>
                            <small>请求 / 日志</small>
                          </button>
                        </nav>
                      </aside>
                      <button class="plain-button save-settings-button" type="button" data-save-all-settings>保存全部设置</button>
                      <aside class="online-panel__copyright" aria-label="版权信息">
                        <span class="online-panel__copyright-label">@${APP_COPYRIGHT_YEAR} <strong>${APP_TITLE}</strong></span>
                        <span class="online-panel__copyright-line">原作 · ${APP_ORIGINAL_AUTHOR}</span>
                        <span class="online-panel__copyright-line">二改 · ${APP_REMIX_AUTHOR}</span>
                      </aside>
                    </div>
                    <div class="settings-content">
                  <section class="settings-section debug-panel" data-settings-view="settings">
                    <header class="debug-panel__header">
                      <strong>基础设置</strong>
                      <span class="debug-panel__status">运行 / 显示</span>
                    </header>
                    <div class="debug-panel__body">
                      <div class="debug-row">
                        <span class="debug-row__label">状态说明</span>
                        <p class="debug-row__value" data-runtime-settings-detail>基础设置正在载入...</p>
                      </div>
                      <div class="form-grid">
                        <div class="settings-stack">
                          <section class="settings-card is-reader">
                            <div class="settings-card__head">
                              <h3>阅读器显示</h3>
                            </div>
                            <p class="settings-card__note">只调整手机端页面的整体阅读比例。</p>
                            <div class="field">
                              <label for="online-content-mobile-view-scale">手机端页面缩放</label>
                              <select class="select" id="online-content-mobile-view-scale" data-mobile-view-scale>
                                <option value="1">100%</option>
                                <option value="0.95">95%</option>
                                <option value="0.9">90%</option>
                                <option value="0.85">85%</option>
                                <option value="0.8">80%</option>
                              </select>
                            </div>
                          </section>

                          <section class="settings-card is-auto-generate">
                            <div class="settings-card__head">
                              <h3>自动生成</h3>
                            </div>
                            <p class="settings-card__note">开启后，正文回复结束会自动生成页面；关闭后只保留手动重新生成。</p>
                            <label class="checkbox-row" title="开启页面自动生成">
                              <input type="checkbox" data-auto-generate />
                              <span>正文回复结束后自动生成页面</span>
                            </label>
                          </section>

                          <section class="settings-card is-launch-entry">
                            <div class="settings-card__head">
                              <h3>打开入口方式</h3>
                            </div>
                            <p class="settings-card__note">可同时开启多个入口。悬浮球用于常驻打开；另外两项会尝试注入到酒馆宿主按钮区。</p>
                            <div class="field">
                              <label class="checkbox-row">
                                <input type="checkbox" data-launch-entry-mode="floating_ball" />
                                <span>悬浮球</span>
                              </label>
                              <label class="checkbox-row">
                                <input type="checkbox" data-launch-entry-mode="qr_button" />
                                <span>注入快速回复栏</span>
                              </label>
                              <label class="checkbox-row">
                                <input type="checkbox" data-launch-entry-mode="extensions_menu" />
                                <span>注入扩展程序菜单</span>
                              </label>
                            </div>
                          </section>

                          <section class="settings-card is-history-depth">
                            <div class="settings-card__head">
                              <h3>自动隐藏</h3>
                            </div>
                            <p class="settings-card__note">设置发送请求时保留的历史 AI 上下文楼层数，从最新历史 AI 楼层向前计数。留空表示不额外裁剪，发送全部历史上下文；0 表示不发送历史上下文，只发送最新 AI 消息与用户消息。</p>
                            <div class="field">
                              <label for="online-content-chat-history-depth">保留历史楼层数</label>
                              <input class="input" id="online-content-chat-history-depth" type="number" min="0" step="1" inputmode="numeric" data-chat-history-depth placeholder="留空 = 不主动隐藏" />
                            </div>
                          </section>

                          <section class="settings-card is-storage-limit">
                            <div class="settings-card__head">
                              <h3>本地缓存</h3>
                            </div>
                            <p class="settings-card__note">小剧场将存到浏览器缓存，并按角色卡隔离。超出上限后会自动清理当前角色下最旧的未收藏记录；已收藏内容默认不计入清理。</p>
                            <div class="field">
                              <label for="online-content-storage-limit-mb">当前角色缓存上限（MB）</label>
                              <input class="input" id="online-content-storage-limit-mb" type="number" min="1" max="512" step="1" inputmode="numeric" data-online-storage-limit-mb />
                            </div>
                            <div class="button-row">
                              <button class="plain-button danger-button is-warning" type="button" data-clear-current-online-storage>清理当前聊天缓存</button>
                              <button class="plain-button danger-button is-danger" type="button" data-clear-online-storage>清理全部剧场缓存</button>
                            </div>
                            <p class="settings-card__note" data-online-storage-summary>正在统计当前角色缓存占用...</p>
                          </section>

                          <section class="settings-card is-excluded-characters">
                            <div class="settings-card__head">
                              <h3>排除角色卡</h3>
                              <button class="plain-button" type="button" data-edit-excluded-characters>编辑名单</button>
                            </div>
                            <p class="settings-card__note">选中的角色卡将被排除在外，不会触发小剧场的相关功能。</p>
                            <p class="settings-card__note" data-excluded-characters-summary>已排除 0 个角色。</p>
                            <div class="detail-library-filter-tags" data-excluded-characters-chips></div>
                          </section>

                          <section class="settings-card is-excluded-tags">
                            <div class="settings-card__head">
                              <h3>排除标签</h3>
                            </div>
                            <p class="settings-card__note">可加入需要排除的标签名，如 &lt;tag&gt;...&lt;/tag&gt; ，设置时只填 tag 名即可，排除后标签包裹内容不会被发送给剧场生成，避免污染美化。</p>
                            <div class="button-row">
                              <input class="input" type="text" data-excluded-tag-input placeholder="标签名，如 tool / 无码拟人" />
                              <button class="plain-button" type="button" data-add-excluded-tag>添加</button>
                              <button class="plain-button" type="button" data-inject-default-excluded-tags>注入内置标签</button>
                            </div>
                            <div class="detail-library-filter-tags" data-excluded-tags-chips></div>
                          </section>

                          <section class="settings-card is-summary">
                            <div class="settings-card__head">
                              <h3>预设摘要标签</h3>
                              <div class="summary-tag-selector">
                                <select class="select" data-summary-tag-select aria-label="选择预设摘要标签"></select>
                                <button class="icon-button" type="button" data-edit-summary-tag aria-label="编辑预设摘要标签" title="编辑预设摘要标签">
                                  <svg viewBox="0 0 512 512" aria-hidden="true" focusable="false">
                                    <path fill="currentColor" d="M471.6 21.7c-28.9-28.9-75.7-28.9-104.6 0L339.8 48.9l123.3 123.3 27.2-27.2c28.9-28.9 28.9-75.7 0-104.6L471.6 21.7zM314.1 74.6 76.1 312.6c-8.2 8.2-14 18.5-16.8 29.7L32.7 448.8c-2.4 9.6.4 19.7 7.4 26.7s17.1 9.8 26.7 7.4l106.5-26.6c11.2-2.8 21.5-8.6 29.7-16.8l238-238L314.1 74.6z"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <p class="settings-card__note">历史酒馆正文会只保留这对标签内的小摘要；最新一回合正文仍保留原始内容。</p>
                            <input class="input" type="text" data-summary-tag-name hidden placeholder="摘要标签预设名称" />
                            <div class="summary-tag-grid">
                              <div class="field">
                                <label for="online-content-summary-open-tag">开始标签</label>
                                <input class="input" id="online-content-summary-open-tag" type="text" data-summary-open-tag readonly />
                              </div>
                              <div class="field">
                                <label for="online-content-summary-close-tag">闭合标签</label>
                                <input class="input" id="online-content-summary-close-tag" type="text" data-summary-close-tag readonly />
                              </div>
                            </div>
                            <div class="button-row prompt-template-actions" data-summary-tag-actions hidden>
                              <button class="icon-button" type="button" data-save-summary-tag aria-label="保存摘要标签" title="保存摘要标签"><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i></button>
                              <button class="icon-button" type="button" data-save-as-summary-tag aria-label="另存为摘要标签" title="另存为摘要标签"><i class="fa-solid fa-file-circle-plus" aria-hidden="true"></i></button>
                              <button class="icon-button" type="button" data-toggle-publish-summary-tag aria-label="发布摘要标签" title="发布摘要标签"><i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i></button>
                              <button class="icon-button" type="button" data-cancel-summary-tag aria-label="取消编辑摘要标签" title="取消编辑"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
                              <button class="icon-button" type="button" data-delete-summary-tag aria-label="删除摘要标签" title="删除摘要标签"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>
                            </div>
                          </section>

                                                                                                        <section class="settings-card is-api">
                            <div class="settings-card__head">
                              <h3>第二 API</h3>
                              <label class="checkbox-row">
                                <input type="checkbox" data-secondary-api-enabled />
                                <span>使用第二 API</span>
                              </label>
                            </div>
                            <p class="settings-card__note">若关闭或配置不完整，将使用主 API 当前模型。</p>
                            <div class="api-grid">
                              <div class="field">
                                <label for="online-content-secondary-api-profile-select">配置槽位</label>
                                <select class="select" id="online-content-secondary-api-profile-select" data-secondary-api-profile-select></select>
                              </div>
                              <div class="field is-wide">
                                <label>配置管理</label>
                                <div class="button-row">
                                  <button class="plain-button" type="button" data-secondary-api-profile-create>新建配置</button>
                                  <button class="plain-button" type="button" data-secondary-api-profile-rename>重命名</button>
                                  <button class="plain-button" type="button" data-secondary-api-profile-delete>删除当前</button>
                                </div>
                              </div>
                            </div>
                            <p class="settings-card__note" data-secondary-api-profile-summary>当前使用单套第二 API 配置。</p>
                            <div class="api-grid">
                              <div class="field">
                                <label for="online-content-secondary-api-provider">接口类型</label>
                                <select class="select" id="online-content-secondary-api-provider" data-secondary-api-provider>
                                  <option value="openai">OpenAI 兼容</option>
                                  <option value="google_ai_studio">Google AI Studio</option>
                                  <option value="vertex_ai">Google Vertex AI</option>
                                </select>
                              </div>
                              <div class="field is-wide">
                                <label for="online-content-secondary-api-model">Model</label>
                                <div class="model-combobox" data-secondary-api-model-combobox>
                                  <input class="input model-combobox__input" id="online-content-secondary-api-model" type="text" data-secondary-api-model placeholder="填写模型名，或从右侧下拉选择" />
                                  <button class="model-combobox__toggle" type="button" data-secondary-api-model-toggle aria-label="展开模型列表" title="展开模型列表">
                                    <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
                                  </button>
                                  <div class="model-combobox__menu" data-secondary-api-model-menu hidden></div>
                                </div>
                              </div>
                            </div>
                            <div class="api-grid api-provider-fields" data-secondary-api-provider-panel="openai">
                              <div class="field is-wide">
                                <label for="online-content-secondary-api-url">Endpoint</label>
                                <input class="input" id="online-content-secondary-api-url" type="text" data-secondary-api-url placeholder="https://example.com/v1" />
                              </div>
                              <div class="field">
                                <label for="online-content-secondary-api-key">API Key</label>
                                <input class="input" id="online-content-secondary-api-key" type="password" data-secondary-api-key autocomplete="off" />
                              </div>
                            </div>
                            <div class="api-grid api-provider-fields" data-secondary-api-provider-panel="google_ai_studio" hidden>
                              <div class="field">
                                <label for="online-content-secondary-api-key-google">API Key</label>
                                <input class="input" id="online-content-secondary-api-key-google" type="password" data-secondary-api-key autocomplete="off" />
                              </div>
                              <div class="field">
                                <label for="online-content-secondary-api-url-google">反向代理</label>
                                <input class="input" id="online-content-secondary-api-url-google" type="text" data-secondary-api-url placeholder="可选，例如 https://example.com" />
                              </div>
                              <div class="field">
                                <label for="online-content-secondary-api-proxy-password">代理密码</label>
                                <input class="input" id="online-content-secondary-api-proxy-password" type="password" data-secondary-api-proxy-password autocomplete="off" />
                              </div>
                            </div>
                            <div class="api-grid api-provider-fields" data-secondary-api-provider-panel="vertex_ai" hidden>
                              <div class="field">
                                <label for="online-content-secondary-api-key-vertex">API Key（快速模式）</label>
                                <input class="input" id="online-content-secondary-api-key-vertex" type="password" data-secondary-api-key autocomplete="off" />
                              </div>
                              <div class="field">
                                <label for="online-content-secondary-api-vertex-token">Vertex Token（完整模式）</label>
                                <input class="input" id="online-content-secondary-api-vertex-token" type="password" data-secondary-api-vertex-token autocomplete="off" />
                              </div>
                              <div class="field">
                                <label for="online-content-secondary-api-vertex-location">项目地区</label>
                                <input class="input" id="online-content-secondary-api-vertex-location" type="text" data-secondary-api-vertex-location placeholder="" />
                              </div>
                              <div class="field is-wide">
                                <label for="online-content-secondary-api-vertex-project-id">项目 ID</label>
                                <input class="input" id="online-content-secondary-api-vertex-project-id" type="text" data-secondary-api-vertex-project-id placeholder="my-google-cloud-project" />
                              </div>
                            </div>
                            <div class="button-row">
                              <button class="plain-button" type="button" data-fetch-secondary-api-models>获取模型列表</button>
                              <button class="plain-button" type="button" data-save-secondary-api>保存第二 API 设置</button>
                            </div>
                          </section>
                          <section class="settings-card is-retry">
                            <div class="settings-card__head">
                              <h3>失败自动重试</h3>
                              <label class="checkbox-row">
                                <input type="checkbox" data-generation-retry-enabled />
                                <span>启用自动重试</span>
                              </label>
                            </div>
                            <p class="settings-card__note">当请求失败，或超过设定超时时间仍未返回时，会自动终止本次请求并按设定次数重试。</p>
                            <div class="api-grid">
                              <div class="field">
                                <label for="online-content-generation-retry-timeout-ms">超时自动重试（毫秒）</label>
                                <input class="input" id="online-content-generation-retry-timeout-ms" type="number" min="1000" max="600000" step="1000" inputmode="numeric" data-generation-retry-timeout-ms />
                              </div>
                              <div class="field">
                                <label for="online-content-generation-retry-count">最大重试次数</label>
                                <input class="input" id="online-content-generation-retry-count" type="number" min="0" max="3" step="1" inputmode="numeric" data-generation-retry-count />
                              </div>
                            </div>
                          </section>
                          <section class="danger-zone">
                            <h3>危险操作</h3>
                            <p class="settings-card__note">这些操作会重置脚本数据。请确认已经不需要对应内容后再使用。</p>
                            <div class="button-row">
                              <button class="plain-button danger-button is-warning" type="button" data-reset-script-settings>脚本初始化</button>
                              <button class="plain-button danger-button is-danger" type="button" data-format-script-all>格式化</button>
                              <button class="plain-button danger-button is-danger" type="button" data-format-current-chat>聊天窗口格式化</button>
                            </div>
                          </section>
                        </div>
                      </div>
                    </div>
                  </section>
                <section class="settings-section debug-panel" data-settings-view="image-generation" hidden>
                    <header class="debug-panel__header">
                      <strong>剧场生图</strong>
                      <span class="debug-panel__status">NovelAI / Vibe Transfer</span>
                    </header>
                    <div class="debug-panel__body">
                      <div class="debug-row">
                        <span class="debug-row__label">状态说明</span>
                        <p class="debug-row__value" data-image-generation-detail>生图设置正在载入...</p>
                      </div>
                      <div class="form-grid">
                        <div class="settings-stack">
                          <section class="settings-card">
                            <div class="settings-card__head">
                              <h3>生图开关</h3>
                              <label class="checkbox-row">
                                <input type="checkbox" data-image-generation-enabled />
                                <span>开启生图思考注入</span>
                              </label>
                            </div>
                            <p class="settings-card__note">开启后，请求提示词会附加生图思考与当前生图接口参数，方便模型在 HTML 中规划可生成的图片资产。</p>
                            <div class="field">
                              <label for="online-content-image-mode">生图方法</label>
                              <select class="select" id="online-content-image-mode" data-image-generation-mode>
                                <option value="novelai">NovelAI</option>
                                <option value="gpt_image">GPT Image</option>
                              </select>
                            </div>
                          </section>

                          <section class="settings-card" data-image-provider-panel="gpt_image" hidden>
                            <div class="settings-card__head"><h3>GPT Image 配置</h3></div>
                            <p class="settings-card__note">独立保存 GPT Image 配置，支持官方服务及兼容代理。当前用于文生图；NovelAI 的 Vibe 与负面提示词不会发送到此接口。</p>
                            <div class="api-grid">
                              <div class="field is-wide"><label for="loreframe-gpt-endpoint">接口地址</label><input class="input" id="loreframe-gpt-endpoint" data-gpt-image-field="endpoint" placeholder="留空使用官方；支持根地址、/v1 或完整 images/generations 地址" /></div>
                              <div class="field"><label for="loreframe-gpt-key">API Key</label><input class="input" id="loreframe-gpt-key" type="password" autocomplete="off" data-gpt-image-field="api_key" /></div>
                              <div class="field"><label for="loreframe-gpt-model">模型 ID</label><input class="input" id="loreframe-gpt-model" data-gpt-image-field="model" list="loreframe-gpt-model-list" /><button class="plain-button" type="button" data-fetch-gpt-models>拉取 GPT Image 模型</button>
                                <datalist id="loreframe-gpt-model-list" data-gpt-image-model-list><option value="gpt-image-2.5-sunburst"></option><option value="gpt-image-2.5-flare"></option><option value="gpt-image-2"></option><option value="gpt-image-1.5"></option><option value="gpt-image-1"></option><option value="gpt-image-1-mini"></option></datalist>
                              </div>
                              <div class="field"><label for="loreframe-gpt-size">画幅</label><select class="select" id="loreframe-gpt-size" data-gpt-image-field="size"><option value="auto">自动</option><option value="1024x1024">方形 · 1024 × 1024</option><option value="1536x1024">横图 · 1536 × 1024</option><option value="1024x1536">竖图 · 1024 × 1536</option></select></div>
                              <div class="field"><label for="loreframe-gpt-quality">质量</label><select class="select" id="loreframe-gpt-quality" data-gpt-image-field="quality"><option value="auto">自动</option><option value="low">低</option><option value="medium">中</option><option value="high">高</option><option value="xhigh">超高（2.5 系列）</option><option value="max">最高（2.5 系列）</option></select></div>
                              <div class="field"><label for="loreframe-gpt-format">图片格式</label><select class="select" id="loreframe-gpt-format" data-gpt-image-field="output_format"><option value="png">PNG</option><option value="webp">WebP</option><option value="jpeg">JPEG</option></select></div>
                              <div class="field"><label for="loreframe-gpt-background">背景</label><select class="select" id="loreframe-gpt-background" data-gpt-image-field="background"><option value="auto">自动</option><option value="opaque">不透明</option><option value="transparent">透明（PNG / WebP）</option></select></div>
                              <div class="field is-wide"><label for="loreframe-gpt-prompt">共用画风与要求</label><textarea class="textarea" id="loreframe-gpt-prompt" rows="4" maxlength="4000" data-gpt-image-field="positive_prompt" placeholder="用自然语言描述风格；每张图的画面描述会追加在后面。"></textarea></div>
                            </div>
                            <p class="settings-card__note">拉取列表不生图，代理可能返回其他用途的模型；模型及质量选项以服务商支持为准。生成请求最多等待 4 分钟。</p>
                            <button class="plain-button" type="button" data-save-gpt-image>保存 GPT Image 设置</button>
                          </section>
                          <section class="settings-card" data-image-provider-panel="novelai">
                            <div class="settings-card__head">
                              <h3 class="novelai-config-title">NovelAI 预设配置</h3>
                            </div>
                            <div class="novelai-preset-toolbar">
                              <div class="field">
                                <label for="online-content-image-preset-select">配置槽位</label>
                                <select class="select" id="online-content-image-preset-select" data-image-preset-select></select>
                              </div>
                              <div class="field is-wide">
                                <label>配置管理</label>
                                <div class="novelai-preset-actions">
                                  <button class="plain-button" type="button" data-image-preset-create>新建配置</button>
                                  <button class="plain-button" type="button" data-import-baibai-presets>读取柏宝绘配置</button>
                                  <button class="plain-button" type="button" data-image-preset-rename>重命名</button>
                                  <button class="plain-button" type="button" data-image-preset-delete>删除当前</button>
                                </div>
                              </div>
                            </div>
                            <p class="settings-card__note">读取柏宝绘会导入已保存的 NovelAI 接口、密钥及当前画风；同来源再次读取会更新对应槽位，手工配置保留。不会自动开启生图。</p>
                            <div class="api-grid">
                              <div class="field">
                                <label for="online-content-image-connection-mode">API 连接方式</label>
                                <select class="select" id="online-content-image-connection-mode" data-image-connection-mode>
                                  <option value="official">NovelAI 官网</option>
                                  <option value="custom">自定义端点</option>
                                </select>
                              </div>
                              <div class="field is-wide" data-image-custom-endpoint-field>
                                <label for="online-content-image-endpoint">自定义端点</label>
                                <input class="input" id="online-content-image-endpoint" type="text" data-image-endpoint placeholder="https://example.com/ai/generate-image" />
                              </div>
                              <div class="field">
                                <label for="online-content-image-api-key">API Key</label>
                                <input class="input" id="online-content-image-api-key" type="password" data-image-api-key autocomplete="off" />
                              </div>
                            </div>
                            <section class="prompt-reference-section">
                              <div class="settings-card__head">
                                <h3>提示词参考图</h3>
                                <label class="plain-button" for="online-content-image-prompt-reference">导入带元数据的 PNG</label>
                                <input id="online-content-image-prompt-reference" type="file" accept="image/png,image/webp,image/jpeg" multiple data-image-prompt-reference hidden />
                              </div>
                              <p class="settings-card__note">这里专门解析图片元数据中的正面 / 负面提示词，与 Vibe Transfer 参考图分开保存。</p>
                              <div class="prompt-reference-grid" data-image-prompt-reference-list></div>
                            </section>
                            <div class="prompt-textarea-stack">
                              <div class="field is-wide">
                                <label for="online-content-image-positive-prompt">正面提示词</label>
                                <textarea class="textarea" id="online-content-image-positive-prompt" rows="4" maxlength="512" data-image-positive-prompt placeholder="最多 512 字符"></textarea>
                              </div>
                              <div class="field is-wide">
                                <label for="online-content-image-negative-prompt">负面提示词</label>
                                <textarea class="textarea" id="online-content-image-negative-prompt" rows="4" maxlength="512" data-image-negative-prompt placeholder="最多 512 字符"></textarea>
                              </div>
                            </div>
                            <div class="api-grid">
                              <div class="field">
                                <label for="online-content-image-model">模型</label>
                                <div class="model-fetch-row">
                                  <input class="input" id="online-content-image-model" type="text" data-image-model list="online-content-image-model-list" />
                                  <button class="plain-button" type="button" data-fetch-image-models title="从 NovelAI 获取模型列表">拉取模型</button>
                                </div>
                                <select class="select" data-image-model-select aria-label="选择 NovelAI 模型">
                                  <option value="">请先拉取模型列表</option>
                                </select>
                                <datalist id="online-content-image-model-list" data-image-model-list></datalist>
                              </div>
                              <div class="field">
                                <label for="online-content-image-sampler">采样方法</label>
                                <select class="select" id="online-content-image-sampler" data-image-sampler>
                                  <option value="Euler">Euler</option>
                                  <option value="Euler Ancestral">Euler Ancestral</option>
                                  <option value="DPM++ 2M">DPM++ 2M</option>
                                  <option value="DPM++ SDE">DPM++ SDE</option>
                                  <option value="DDIM">DDIM</option>
                                </select>
                              </div>
                              <div class="field">
                                <label for="online-content-image-noise-schedule">噪点表</label>
                                <select class="select" id="online-content-image-noise-schedule" data-image-noise-schedule>
                                  <option value="karras">karras</option>
                                  <option value="native">native</option>
                                  <option value="exponential">exponential</option>
                                  <option value="polyexponential">polyexponential</option>
                                </select>
                              </div>
                              <div class="field">
                                <label for="online-content-image-guidance">Prompt Guidance</label>
                                <input class="input" id="online-content-image-guidance" type="number" min="0" max="30" step="0.1" data-image-guidance />
                              </div>
                              <div class="field">
                                <label for="online-content-image-guidance-rescale">Prompt Guidance Rescale</label>
                                <input class="input" id="online-content-image-guidance-rescale" type="number" min="0" max="1" step="0.01" data-image-guidance-rescale />
                              </div>
                            </div>
                            <div class="api-grid">
                              <div class="field is-wide">
                                <label for="online-content-image-size-preset">预设尺寸</label>
                                <select class="select" id="online-content-image-size-preset" data-image-size-preset>
                                  <option value="512x512">512x512 (1:1, 图标)</option>
                                  <option value="640x640">640x640 (1:1, 图标)</option>
                                  <option value="512x768">512x768 (2:3, 垂直)</option>
                                  <option value="768x512">768x512 (3:2, 水平)</option>
                                  <option value="1024x1024">1024x1024 (1:1, SDXL)</option>
                                  <option value="1216x832">1216x832 (19:13, 超高清)</option>
                                  <option value="832x1216">832x1216 (13:19, 超高清)</option>
                                </select>
                              </div>
                              <div class="field">
                                <label for="online-content-image-steps">生成步数</label>
                                <input class="input" id="online-content-image-steps" type="number" min="1" max="100" step="1" data-image-steps />
                              </div>
                              <div class="field">
                                <label for="online-content-image-seed">种子</label>
                                <input class="input" id="online-content-image-seed" type="number" min="0" step="1" data-image-seed />
                              </div>
                            </div>
                            <div class="field">
                              <label class="checkbox-row"><input type="checkbox" data-image-ai-default-character-position /><span>AI 默认角色位置</span></label>
                              <label class="checkbox-row"><input type="checkbox" data-image-smea /><span>SMEA</span></label>
                              <label class="checkbox-row"><input type="checkbox" data-image-smea-dyn /><span>SMEA DYN</span></label>
                              <label class="checkbox-row"><input type="checkbox" data-image-variety /><span>多样性（Variety）</span></label>
                              <label class="checkbox-row"><input type="checkbox" data-image-decrisp /><span>减少伪影（Decrisp）</span></label>
                            </div>
                            <div class="vibe-transfer-head"><strong>Vibe Transfer</strong><span>随当前 NovelAI 预设一起保存</span></div>
                            <div class="api-grid">
                              <div class="field">
                                <label for="online-content-vibe-group-select">Vibe 组</label>
                                <select class="select" id="online-content-vibe-group-select" data-vibe-group-select></select>
                              </div>
                              <div class="field is-wide">
                                <label>组管理</label>
                                <div class="button-row">
                                  <button class="plain-button" type="button" data-vibe-group-create>新建组</button>
                                  <button class="plain-button" type="button" data-vibe-group-rename>重命名</button>
                                  <button class="plain-button" type="button" data-vibe-group-delete>删除当前</button>
                                </div>
                              </div>
                            </div>
                            <div class="button-row">
                              <label class="plain-button" for="online-content-vibe-file">导入 .naiv4vibe</label>
                              <input id="online-content-vibe-file" type="file" accept=".naiv4vibe,application/json" data-vibe-file hidden />
                              <label class="plain-button" for="online-content-vibe-image">上传参考图</label>
                              <input id="online-content-vibe-image" type="file" accept="image/*" data-vibe-image hidden />
                            </div>
                            <div class="detail-library-filter-tags" data-vibe-reference-list></div>
                            <section class="vibe-library-section">
                              <div class="vibe-library-head">
                                <strong>Vibe 库</strong>
                                <span data-vibe-library-summary>所有已上传 Vibe</span>
                              </div>
                              <div class="vibe-library-grid" data-vibe-library-list></div>
                              <div class="button-row">
                                <button class="plain-button" type="button" data-list-baibai-vibes>读取柏宝绘参考图</button>
                                <select class="select" data-baibai-vibe-select aria-label="柏宝绘参考图"></select>
                                <button class="plain-button" type="button" data-import-baibai-vibe>导入所选到 Vibe 库</button>
                              </div>
                              <p class="settings-card__note">参考图按选择导入，支持原图与匹配模型的缓存编码；导入后在 Vibe 库加入当前组才会使用。</p>
                              <div class="vibe-library-pagination">
                                <button class="plain-button" type="button" data-vibe-library-prev>上一页</button>
                                <span data-vibe-library-page>第 1 页</span>
                                <button class="plain-button" type="button" data-vibe-library-next>下一页</button>
                              </div>
                            </section>
                            <div class="button-row">
                              <button class="plain-button" type="button" data-save-image-generation>保存生图设置</button>
                            </div>
                          </section>
                        </div>
                      </div>
                    </div>
                  </section>
                <section class="settings-section debug-panel" data-settings-view="appearance" hidden>
                    <header class="debug-panel__header">
                      <strong>美化方案</strong>
                      <span class="debug-panel__status">日间 / 夜间分离</span>
                    </header>
                    <div class="debug-panel__body">
                      <div class="debug-row">
                        <span class="debug-row__label">状态说明</span>
                        <p class="debug-row__value" data-appearance-detail>可以分别调整日间和夜间模式下的面板配色。</p>
                      </div>
                      <section class="settings-card">
                        <div class="settings-card__head">
                          <h3>昼夜模式</h3>
                        </div>
                        <p class="settings-card__note">可固定为日间或夜间，也可以按北京时间自动切换。</p>
                        <div class="field">
                          <label for="online-content-theme-mode">主题模式</label>
                          <select class="select" id="online-content-theme-mode" data-theme-mode>
                            <option value="system">系统</option>
                            <option value="day">日间</option>
                            <option value="night">夜间</option>
                          </select>
                        </div>
                        <div class="appearance-theme-schedule" data-theme-schedule-fields>
                          <div class="field">
                            <label for="online-content-theme-day-start">日间开始时间</label>
                            <input class="input" id="online-content-theme-day-start" type="time" data-theme-day-start />
                          </div>
                          <div class="field">
                            <label for="online-content-theme-night-start">夜间开始时间</label>
                            <input class="input" id="online-content-theme-night-start" type="time" data-theme-night-start />
                          </div>
                        </div>
                        <p class="settings-card__note" data-theme-mode-detail>当前使用北京时间自动切换。</p>
                      </section>
                      <section class="appearance-section">
                        <div class="appearance-section__head">
                          <strong>面板美化</strong>
                          <span>继续分别调整日间和夜间模式下的面板配色。</span>
                        </div>
                        <div class="appearance-grid">
                          <section class="settings-card appearance-card" data-appearance-theme="day">
                            <div class="settings-card__head"><h3>日间模式</h3></div>
                            <div class="appearance-color-grid" data-appearance-color-list="day"></div>
                          </section>
                          <section class="settings-card appearance-card" data-appearance-theme="night">
                            <div class="settings-card__head"><h3>夜间模式</h3></div>
                            <div class="appearance-color-grid" data-appearance-color-list="night"></div>
                          </section>
                        </div>
                      </section>
                      <section class="appearance-section">
                        <div class="appearance-section__head">
                          <strong>悬浮球美化</strong>
                          <span>可跟随面板风格，也能单独定制背景、图标和大小。</span>
                        </div>
                        <section class="settings-card">
                          <div class="bubble-settings-grid">
                            <div class="field">
                              <label for="online-content-bubble-background-mode">悬浮球背景</label>
                              <select class="select" id="online-content-bubble-background-mode" data-bubble-background-mode>
                                <option value="follow-panel">跟随面板主背景色</option>
                                <option value="custom">自定义背景色</option>
                                <option value="hidden">隐藏背景，仅显示图标</option>
                              </select>
                            </div>
                            <div class="field">
                              <label class="appearance-color-field bubble-color-field" for="online-content-bubble-background-color">
                                <input id="online-content-bubble-background-color" type="color" data-bubble-background-color />
                                <span>
                                  <strong>背景自定义色</strong>
                                  <span>悬浮球底色</span>
                                </span>
                              </label>
                            </div>
                            <div class="field">
                              <label for="online-content-bubble-icon-color-mode">图标颜色</label>
                              <select class="select" id="online-content-bubble-icon-color-mode" data-bubble-icon-color-mode>
                                <option value="follow-text">跟随主文字色</option>
                                <option value="custom">自定义图标色</option>
                              </select>
                            </div>
                            <div class="field">
                              <label class="appearance-color-field bubble-color-field" for="online-content-bubble-icon-color">
                                <input id="online-content-bubble-icon-color" type="color" data-bubble-icon-color />
                                <span>
                                  <strong>图标自定义色</strong>
                                  <span>悬浮球图标</span>
                                </span>
                              </label>
                            </div>
                            <div class="field">
                              <label for="online-content-bubble-icon-source">图标定制</label>
                              <select class="select" id="online-content-bubble-icon-source" data-bubble-icon-source>
                                <option value="default">默认</option>
                                <option value="fontawesome">Font Awesome 图标类名</option>
                                <option value="image">图链图片</option>
                              </select>
                            </div>
                            <div class="field">
                              <label for="online-content-bubble-icon-size-mode">图标大小</label>
                              <select class="select" id="online-content-bubble-icon-size-mode" data-bubble-icon-size-mode>
                                <option value="default">默认</option>
                                <option value="custom">自定义 em</option>
                              </select>
                            </div>
                            <div class="field is-wide">
                              <label for="online-content-bubble-icon-value">图标内容</label>
                              <div class="bubble-icon-input-row">
                                <input class="input" id="online-content-bubble-icon-value" type="text" data-bubble-icon-value placeholder="如 fa-solid fa-book-open 或 https://example.com/icon.png" />
                                <button class="icon-button" type="button" data-open-bubble-icon-picker aria-label="打开图标选择器" title="选择图标">
                                  <i class="fa-solid fa-icons" aria-hidden="true"></i>
                                </button>
                              </div>
                            </div>
                            <div class="field">
                              <label for="online-content-bubble-icon-size-em">自定义 em 大小</label>
                              <input class="input" id="online-content-bubble-icon-size-em" type="number" min="0.6" max="3" step="0.1" data-bubble-icon-size-em />
                            </div>
                          </div>
                        </section>
                      </section>
                      <div class="button-row">
                        <button class="plain-button" type="button" data-reset-appearance>恢复默认美化方案</button>
                      </div>
                    </div>
                  </section>
                <section class="settings-section debug-panel" data-settings-view="prompt-management" hidden>
                    <header class="debug-panel__header">
                      <strong>提示词管理</strong>
                      <span class="debug-panel__status">个人同步 / 发布</span>
                    </header>
                    <div class="debug-panel__body">
                      <div class="debug-row">
                        <span class="debug-row__label">状态说明</span>
                        <p class="debug-row__value" data-prompt-settings-detail>用于管理基础提示词、小剧场内容与生成方式。</p>
                      </div>
                      <div class="form-grid">
                        <div class="settings-stack">
                          <section class="settings-card">
                            <div class="settings-card__head">
                              <h3>基础提示词</h3>
                              <span class="settings-card__note">基础规则 / 页面骨架</span>
                            </div>
                            <div class="field">
                              <div class="prompt-editor-head">
                                <label for="online-content-base-prompt-select">基础提示词</label>
                                <select class="select" id="online-content-base-prompt-select" data-base-prompt-select></select>
                                <button class="icon-button" type="button" data-edit-base-prompt aria-label="编辑基础提示词" title="编辑基础提示词">
                                  <svg viewBox="0 0 512 512" aria-hidden="true" focusable="false">
                                    <path fill="currentColor" d="M471.6 21.7c-28.9-28.9-75.7-28.9-104.6 0L339.8 48.9l123.3 123.3 27.2-27.2c28.9-28.9 28.9-75.7 0-104.6L471.6 21.7zM314.1 74.6 76.1 312.6c-8.2 8.2-14 18.5-16.8 29.7L32.7 448.8c-2.4 9.6.4 19.7 7.4 26.7s17.1 9.8 26.7 7.4l106.5-26.6c11.2-2.8 21.5-8.6 29.7-16.8l238-238L314.1 74.6z"/>
                                  </svg>
                                </button>
                              </div>
                              <input class="input" type="text" data-base-prompt-name hidden />
                              <textarea class="textarea" id="online-content-base-prompt-content" data-base-prompt-content readonly></textarea>
                              <div class="prompt-template-actions" data-base-prompt-actions hidden>
                                <button class="icon-button" type="button" data-save-base-prompt aria-label="保存基础提示词" title="保存基础提示词"><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i></button>
                                <button class="icon-button" type="button" data-save-as-base-prompt aria-label="另存为基础提示词" title="另存为基础提示词"><i class="fa-solid fa-file-circle-plus" aria-hidden="true"></i></button>
                                <button class="icon-button" type="button" data-toggle-publish-base-prompt aria-label="发布基础提示词" title="发布基础提示词"><i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i></button>
                                <button class="icon-button" type="button" data-cancel-base-prompt aria-label="取消编辑基础提示词" title="取消编辑"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
                                <button class="icon-button" type="button" data-delete-base-prompt aria-label="删除基础提示词" title="删除基础提示词"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>
                              </div>
                            </div>
                          </section>

                          <section class="settings-card">
                            <div class="settings-card__head">
                              <h3>小剧场内容</h3>
                              <span class="settings-card__note">分组管理 / 详情编辑</span>
                            </div>
                            <div class="detail-library-root" data-detail-library-root data-folder-id="" data-selected-prompt-id="" data-selected-prompt-ids="">
                              <div class="detail-library-overview">
                                <div class="detail-library-summary">
                                  <article class="detail-library-stat">
                                    <span>小剧场总数</span>
                                    <strong data-detail-prompt-total>0</strong>
                                  </article>
                                  <article class="detail-library-stat">
                                    <span>已激活</span>
                                    <strong data-detail-prompt-active>0</strong>
                                  </article>
                                </div>
                                <p class="settings-card__note">这里管理用于补充页面气质和内容走向的小剧场。</p>
                                <section class="detail-activation-chart-card">
                                  <div class="detail-activation-chart-card__head">
                                    <strong>激活次数分布</strong>
                                    <span data-detail-activation-total>0 次</span>
                                  </div>
                                  <p class="settings-card__note" data-detail-activation-summary>生成过页面后，这里会按小剧场标题统计激活次数。</p>
                                  <div class="detail-activation-chart" data-detail-activation-chart>
                                    <p class="settings-card__note">暂无激活分布数据。</p>
                                  </div>
                                </section>
                                <div class="button-row">
                                  <button class="plain-button" type="button" data-open-detail-library-manager>管理小剧场</button>
                                </div>
                              </div>
                              <select class="select" id="online-content-detail-prompt-select" data-detail-prompt-select hidden></select>
                              <input class="input" type="text" data-detail-prompt-name hidden />
                              <input class="input" id="online-content-detail-prompt-name-display" type="text" data-detail-prompt-name-display hidden />
                              <textarea class="textarea" id="online-content-detail-prompt-description" data-detail-prompt-description hidden></textarea>
                              <textarea class="textarea" id="online-content-detail-prompt-content" data-detail-prompt-content hidden></textarea>
                              <div class="prompt-template-actions" data-detail-prompt-actions hidden></div>
                            </div>
                          </section>

                          <section class="settings-card is-random">
                            <div class="settings-card__head">
                              <h3>生成设置</h3>
                              <label class="checkbox-row">
                                <input type="checkbox" data-random-detail-enabled />
                                <span>随机生成</span>
                              </label>
                            </div>
                            <p class="settings-card__note">开启后会从已激活的小剧场中随机抽取；关闭时则使用当前选中的小剧场。触发概率用于控制每层消息是否附带小剧场。</p>
                            <div class="appearance-theme-schedule">
                              <div class="field">
                                <label for="online-content-random-detail-count">每次生成剧场数</label>
                                <input class="input" id="online-content-random-detail-count" type="number" min="1" max="10" step="1" data-random-detail-count />
                              </div>
                              <div class="field">
                                <label for="online-content-random-detail-probability">触发概率（%）</label>
                                <input class="input" id="online-content-random-detail-probability" type="number" min="0" max="100" step="1" data-random-detail-probability />
                              </div>
                            </div>
                          </section>



                        </div>
                      </div>
                    </div>
                  </section>
                <section class="settings-section debug-panel" data-settings-view="debug-tools" hidden>
                    <header class="debug-panel__header">
                      <strong>调试工具</strong>
                      <span class="debug-panel__status">监听 / 提示词 / 日志</span>
                    </header>
                    <div class="debug-panel__body">
                      <div class="debug-tools-layout">
                        <section class="debug-tools-overview">
                          <article class="debug-tools-overview-card">
                            <span>监听状态</span>
                            <strong data-online-status>启动中</strong>
                          </article>
                          <article class="debug-tools-overview-card">
                            <span>提示词预览</span>
                            <strong data-prompt-viewer-status>未读取</strong>
                          </article>
                          <article class="debug-tools-overview-card">
                            <span>运行日志</span>
                            <strong data-run-log-count>0 条</strong>
                          </article>
                        </section>
                        <div class="debug-tools-columns">
                          <aside class="debug-tools-aside">
                            <section class="debug-tools-card">
                              <div class="debug-tools-card__head">
                                <strong>监听调试</strong>
                                <span>聊天 / 事件 / 楼层</span>
                              </div>
                              <div class="debug-row">
                                <span class="debug-row__label">状态说明</span>
                                <p class="debug-row__value" data-online-detail>正在连接酒馆事件接口...</p>
                              </div>
                              <div class="debug-tools-stat-grid">
                                <article class="debug-tools-stat">
                                  <span>已读取聊天楼层数</span>
                                  <strong data-chat-count>0</strong>
                                </article>
                                <article class="debug-tools-stat">
                                  <span>读取签名</span>
                                  <strong data-last-signature>尚无</strong>
                                </article>
                              </div>
                              <div class="debug-row">
                                <span class="debug-row__label">最新用户消息</span>
                                <p class="debug-row__value" data-latest-user>等待读取</p>
                              </div>
                              <div class="debug-row">
                                <span class="debug-row__label">最新 AI 回复</span>
                                <p class="debug-row__value" data-latest-assistant>等待读取</p>
                              </div>
                            </section>
                            <section class="debug-tools-card">
                              <div class="debug-tools-card__head">
                                <strong>最近激活小剧场</strong>
                                <span data-detail-activation-recent-count>最近 20 次</span>
                              </div>
                              <div class="detail-activation-recent-list" data-detail-activation-recent-list>
                                <p class="debug-row__value">最近还没有激活记录。</p>
                              </div>
                            </section>
                          </aside>
                          <div class="debug-tools-main">
                            <section class="debug-tools-card">
                              <div class="debug-tools-card__head">
                                <strong>请求提示词</strong>
                                <span>system / assistant / user</span>
                              </div>
                              <div class="debug-row">
                                <span class="debug-row__label">状态说明</span>
                                <p class="debug-row__value" data-prompt-viewer-summary>点击刷新后查看本次${APP_TITLE}会发送的 system / assistant / user 提示词。</p>
                              </div>
                              <div class="prompt-viewer-toolbar">
                                <div class="prompt-viewer-meta" data-prompt-viewer-meta>
                                  <span class="prompt-viewer-meta__chip"><strong>0</strong> 段</span>
                                  <span class="prompt-viewer-meta__chip"><strong>0</strong> 字</span>
                                </div>
                                <button class="plain-button" type="button" data-refresh-prompt-viewer>刷新提示词预览</button>
                              </div>
                              <div class="prompt-viewer-list" data-prompt-viewer-list>
                                <p class="debug-row__value">尚未生成预览。</p>
                              </div>
                            </section>
                            <section class="debug-tools-card">
                              <div class="debug-tools-card__head">
                                <strong>运行日志</strong>
                                <span>最近 ${MAX_RUN_LOGS} 条</span>
                              </div>
                              <div class="run-log-toolbar">
                                <div class="run-log-summary" data-run-log-summary>
                                  <span class="run-log-summary__chip"><strong>0</strong> 条日志</span>
                                </div>
                                <button class="plain-button" type="button" data-clear-run-log>清空日志</button>
                              </div>
                              <div class="run-log-list" data-run-log-list>
                                <p class="debug-row__value">暂无日志。发送正文或手动生成后会显示监听与请求过程。</p>
                              </div>
                            </section>
                            <section class="debug-tools-card">
                              <div class="debug-tools-card__head">
                                <strong>生图调试</strong>
                                <div class="button-row">
                                  <span data-image-generation-log-count>0 条</span>
                                  <button class="plain-button" type="button" data-clear-image-generation-log>清空</button>
                                </div>
                              </div>
                              <div class="run-log-list" data-image-generation-log-list>
                                <p class="debug-row__value">暂无生图请求日志。</p>
                              </div>
                            </section>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                <section class="settings-section debug-panel" data-settings-view="sources" hidden>
                    <header class="debug-panel__header">
                      <strong>资料读取</strong>
                      <span class="debug-panel__status" data-source-status>启动中</span>
                    </header>
                    <div class="debug-panel__body worldbook-dashboard">
                      <div class="worldbook-data-grid">
                        <article class="worldbook-data-card">
                          <span class="worldbook-data-card__label">角色与用户</span>
                          <div class="worldbook-kv"><span>当前角色</span><strong data-character-name>等待读取</strong></div>
                          <div class="worldbook-kv"><span>&lt;user&gt;</span><strong data-user-name>等待读取</strong></div>
                          <div class="worldbook-kv"><span>角色卡字数</span><strong data-character-length>0</strong></div>
                          <div class="worldbook-kv"><span>用户设定字数</span><strong data-user-description-length>0</strong></div>
                        </article>
                        <article class="worldbook-data-card">
                          <span class="worldbook-data-card__label">世界书总览</span>
                          <div class="worldbook-kv"><span>角色绑定</span><strong data-character-worldbooks>等待读取</strong></div>
                          <div class="worldbook-kv"><span>聊天绑定</span><strong data-chat-worldbook>等待读取</strong></div>
                          <div class="worldbook-kv"><span>用户绑定</span><strong data-user-worldbook>等待读取</strong></div>
                          <div class="worldbook-kv"><span>条目总数</span><strong data-worldbook-count>0</strong></div>
                          <div class="worldbook-kv"><span>蓝灯 / 激活绿灯</span><strong><span data-worldbook-constant-count>0</span> / <span data-worldbook-activated-count>0</span></strong></div>
                        </article>
                        <article class="worldbook-data-card is-accent">
                          <span class="worldbook-data-card__label">容量统计</span>
                          <strong class="worldbook-big-number" data-worldbook-included-length>0</strong>
                          <span class="worldbook-data-card__hint">本次纳入页面生成的世界书内容长度估算</span>
                          <div class="worldbook-kv"><span>关键词条目</span><strong data-worldbook-selective-count>0</strong></div>
                        </article>
                      </div>
                      <details class="worldbook-source-details">
                        <summary>查看激活与概览细节</summary>
                        <div class="worldbook-detail-grid">
                          <div class="worldbook-kv"><span>状态说明</span><strong data-source-detail>等待读取角色卡和世界书...</strong></div>
                          <div class="worldbook-kv"><span>最近激活条目</span><strong data-worldbook-activated-list>本次尚未捕获到关键词条目激活</strong></div>
                          <div class="worldbook-kv"><span>世界书概览</span><strong data-worldbook-summary>等待读取</strong></div>
                        </div>
                      </details>
                      <section class="worldbook-entry-panel">
                        <div class="worldbook-entry-panel__head">
                          <strong>条目选择</strong>
                          <span>开启表示会纳入页面上下文</span>
                        </div>
                        <div class="worldbook-entry-list" data-worldbook-entry-controls>
                          <p class="debug-row__value">尚未读取到绑定世界书条目。</p>
                        </div>
                      </section>
                    </div>
                  </section>
                    </div>
                  </div>
                </section>
                <section class="view-panel" data-view="theater" aria-label="管理小剧场" hidden>
                  <div class="settings-layout">
                    <div class="settings-column">
                      <aside class="settings-sidebar" aria-label="小剧场导航">
                        <div class="settings-sidebar__head">
                          <strong>管理小剧场</strong>
                          <span>在这里按文件夹整理小剧场，并管理筛选、标签、激活状态与内容编辑。</span>
                        </div>
                        <button class="online-nav__item settings-home-button" type="button" data-back-detail-library-page aria-current="false">
                          <span>返回提示词管理</span>
                          <small>小剧场内容</small>
                        </button>
                        <button class="online-nav__item settings-home-button" type="button" data-restore-builtin-detail-prompts aria-current="false">
                          <span>恢复内置剧场</span>
                        </button>
                        <div class="settings-sidebar__divider"></div>
                        <section class="settings-sidebar__section" aria-label="小剧场文件夹">
                          <div class="settings-sidebar__section-head">
                            <strong>小剧场文件夹</strong>
                            <div class="detail-library-folder-head-actions">
                              <span data-detail-manager-folder-count>0 项</span>
                              <button class="icon-button" type="button" data-detail-manager-sort-folders aria-label="排序文件夹" title="排序文件夹">
                                <i class="fa-solid fa-arrow-up-wide-short" aria-hidden="true"></i>
                              </button>
                            </div>
                          </div>
                          <div class="detail-library-folder-list">
                            <button class="detail-library-folder" type="button" data-detail-manager-folder-id="__all__">
                              <span>查看全部</span>
                              <small>全部</small>
                            </button>
                          </div>
                          <div class="detail-library-folder-list" data-detail-manager-folder-list></div>
                        </section>
                      </aside>
                    </div>
                    <div class="settings-content">
                      <section class="settings-section debug-panel">
                        <header class="debug-panel__header">
                          <strong>管理小剧场</strong>
                          <div class="detail-library-toolbar__meta">
                            <div class="detail-library-toolbar__icon-actions">
                              <button class="icon-button" type="button" data-detail-manager-toggle-selection aria-label="选择状态" title="选择状态">
                                <i class="fa-solid fa-check-double" aria-hidden="true"></i>
                              </button>
                              <button class="icon-button" type="button" data-detail-manager-rename-folder aria-label="重命名文件夹" title="重命名文件夹">
                                <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
                              </button>
                              <button class="icon-button" type="button" data-detail-manager-create-folder aria-label="新建文件夹" title="新建文件夹">
                                <i class="fa-solid fa-folder-plus" aria-hidden="true"></i>
                              </button>
                              <button class="icon-button" type="button" data-detail-manager-delete-folder aria-label="删除文件夹" title="删除文件夹">
                                <i class="fa-solid fa-folder-minus" aria-hidden="true"></i>
                              </button>
                              <button class="icon-button" type="button" data-detail-manager-create-prompt aria-label="新增小剧场" title="新增小剧场">
                                <i class="fa-solid fa-file-circle-plus" aria-hidden="true"></i>
                              </button>
                              <button class="icon-button" type="button" data-detail-manager-import aria-label="导入小剧场" title="导入小剧场">
                                <i class="fa-solid fa-file-arrow-up" aria-hidden="true"></i>
                              </button>
                              <button class="icon-button" type="button" data-detail-manager-export aria-label="导出小剧场" title="导出小剧场">
                                <i class="fa-solid fa-file-arrow-down" aria-hidden="true"></i>
                              </button>
                              <button class="icon-button" type="button" data-detail-manager-manage-tags aria-label="管理标签" title="管理标签">
                                <i class="fa-solid fa-tags" aria-hidden="true"></i>
                              </button>
                            </div>
                          </div>
                        </header>
                        <div class="debug-panel__body detail-library-browser">
                          <div class="detail-library-bulk-actions" data-detail-manager-bulk-actions hidden>
                            <button class="plain-button" type="button" data-detail-manager-select-all>全选</button>
                            <button class="plain-button" type="button" data-detail-manager-select-none>取消全选</button>
                            <button class="plain-button" type="button" data-detail-manager-activate-selected>批量激活</button>
                            <button class="plain-button" type="button" data-detail-manager-deactivate-selected>批量取消激活</button>
                            <button class="plain-button" type="button" data-detail-manager-delete-selected>删除所选</button>
                            <button class="plain-button" type="button" data-detail-manager-move-selected>批量移动</button>
                          </div>
                          <div class="detail-library-filters">
                            <input class="input" type="search" data-detail-manager-search placeholder="搜索标题、描述或标签" />
                            <select class="select" data-detail-manager-sort>
                              <option value="created_desc">最新创建</option>
                              <option value="created_asc">最早创建</option>
                              <option value="name_asc">按字母排序</option>
                            </select>
                            <select class="select" data-detail-manager-source-filter>
                              <option value="all">全部类型</option>
                              <option value="personal">本地</option>
                              <option value="default">内置</option>
                              <option value="published">已上传</option>
                            </select>
                            <select class="select" data-detail-manager-active-filter>
                              <option value="all">全部状态</option>
                              <option value="active">已激活</option>
                              <option value="inactive">未激活</option>
                            </select>
                            <select class="select" data-detail-manager-tag-filter>
                              <option value="all">全部标签</option>
                            </select>
                          </div>
                          <div class="detail-library-manager">
                            <div class="detail-library-stage">
                              <div class="detail-library-toolbar">
                                <div class="detail-library-toolbar__title">
                                  <strong data-detail-manager-folder-title>当前文件夹</strong>
                                  <p class="settings-card__note" data-detail-manager-folder-summary>正在加载小剧场…</p>
                                </div>
                              </div>
                              <div class="detail-library-filter-tags" data-detail-manager-tag-summary></div>
                              <div class="detail-library-grid detail-library-grid--scrollable" data-detail-manager-card-grid></div>
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                    <aside class="online-panel__copyright is-mobile-footer" aria-label="版权信息">
                      <span class="online-panel__copyright-label">@${APP_COPYRIGHT_YEAR} <strong>${APP_TITLE}</strong></span>
                      <span class="online-panel__copyright-line">原作 · ${APP_ORIGINAL_AUTHOR}</span>
                      <span class="online-panel__copyright-line">二改 · ${APP_REMIX_AUTHOR}</span>
                    </aside>
                  </div>
                </section>
                <section class="view-panel" data-view="theater-edit" aria-label="编辑小剧场" hidden>
                  <div class="settings-layout">
                    <div class="settings-column">
                      <aside class="settings-sidebar" aria-label="小剧场编辑导航">
                        <div class="settings-sidebar__head">
                          <strong>编辑小剧场</strong>
                          <span>在这里修改标题、描述、提示词正文与标签。</span>
                        </div>
                        <button class="online-nav__item settings-home-button" type="button" data-back-detail-edit-page aria-current="false">
                          <span>返回管理小剧场</span>
                          <small>浏览列表</small>
                        </button>
                      </aside>
                    </div>
                    <div class="settings-content">
                      <section class="settings-section debug-panel">
                        <header class="debug-panel__header">
                          <strong data-detail-edit-title>编辑小剧场</strong>
                        </header>
                        <div class="debug-panel__body detail-library-edit-form">
                          <div class="field">
                            <label for="detail-edit-name">标题</label>
                            <input class="input" id="detail-edit-name" type="text" data-detail-edit-name />
                          </div>
                          <div class="field">
                            <label for="detail-edit-description">描述</label>
                            <input class="input" id="detail-edit-description" type="text" data-detail-edit-description />
                          </div>
                          <div class="field detail-library-edit-tags">
                            <label for="detail-edit-tags">标签</label>
                            <input class="input" id="detail-edit-tags" type="text" data-detail-edit-tags placeholder="输入后按回车或逗号添加标签" />
                            <div class="detail-library-filter-tags" data-detail-edit-tag-suggestions></div>
                          </div>
                          <div class="field">
                            <label for="detail-edit-content">提示词内容</label>
                            <textarea class="textarea" id="detail-edit-content" rows="16" data-detail-edit-content></textarea>
                          </div>
                          <div class="button-row">
                            <button class="plain-button" type="button" data-save-detail-edit>保存小剧场</button>
                            <button class="plain-button" type="button" data-cancel-detail-edit>取消并返回</button>
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                </section>
            </main>
            <button class="panel-resize-handle" type="button" aria-label="拉伸面板" title="拉伸面板"></button>
          </section>
        </body>
      </html>
    `;
}
