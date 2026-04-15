/*
 * Movable and Sizable Subtitles for Jellyfin  (menu-driven UI)
 * ------------------------------------------------------------
 * Injects a small "Aa" toggle button into the Jellyfin video player chrome.
 * Clicking it opens a floating control panel that lets the viewer
 *   - nudge subtitles up / down / left / right,
 *   - increase or decrease their size,
 *   - jump to top / middle / bottom presets,
 *   - reset everything.
 *
 * Direct drag / wheel / pinch on the subtitle element are still available
 * as opt-in modes (off by default) configurable from the plugin admin page.
 */
(function () {
    'use strict';

    if (window.__movableSubtitlesLoaded) {
        return;
    }
    window.__movableSubtitlesLoaded = true;

    var STORAGE_KEY = 'movableSubtitles.state.v2';
    var PANEL_POS_KEY = 'movableSubtitles.panelPos.v1';

    var state = {
        enabled: true,
        showControlPanel: true,
        allowDrag: false,
        allowResize: false,
        rememberPosition: true,
        defaultFontSize: 100
    };

    // Live position/size of the subtitle element.
    var subPos = { offsetX: 0, offsetY: 0, scale: 1 };

    // References to injected UI nodes.
    var panelEl = null;
    var toggleBtn = null;
    var subtitleEl = null;

    // ------------------------------------------------------------------ Utils
    function apiBase() {
        try {
            if (window.ApiClient && typeof window.ApiClient.serverAddress === 'function') {
                return window.ApiClient.serverAddress();
            }
        } catch (e) { /* ignore */ }
        return '';
    }

    function loadStored(key) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    function saveStored(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* quota */ }
    }

    function saveSubPos() {
        if (!state.rememberPosition) { return; }
        saveStored(STORAGE_KEY, subPos);
    }

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    // --------------------------------------------------------------- Config fetch
    function fetchConfig() {
        return fetch(apiBase() + '/MovableSubtitles/config', { credentials: 'include' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (cfg) {
                if (!cfg) { return; }
                state.enabled = cfg.Enabled !== false;
                state.showControlPanel = cfg.ShowControlPanel !== false;
                state.allowDrag = !!cfg.AllowDrag;
                state.allowResize = !!cfg.AllowResize;
                state.rememberPosition = cfg.RememberPosition !== false;
                state.defaultFontSize = cfg.DefaultFontSize || 100;
            })
            .catch(function () { /* use defaults */ });
    }

    // --------------------------------------------------------- Subtitle element
    function findSubtitleElement() {
        return document.querySelector('.videoSubtitles')
            || document.querySelector('.htmlvideoplayer .videoSubtitles')
            || document.querySelector('video + div.videoSubtitles');
    }

    function findPlayerContainer() {
        return document.querySelector('.videoPlayerContainer')
            || document.querySelector('.htmlVideoPlayerContainer')
            || document.querySelector('.htmlvideoplayer')
            || document.querySelector('video') && document.querySelector('video').parentElement
            || document.body;
    }

    function applyTransform() {
        if (!subtitleEl) { return; }
        subtitleEl.style.transform =
            'translate(' + subPos.offsetX + 'px, ' + subPos.offsetY + 'px) scale(' + subPos.scale + ')';
        subtitleEl.style.transformOrigin = 'center center';
        subtitleEl.style.transition = 'transform 120ms ease-out';
        subtitleEl.style.pointerEvents = state.allowDrag ? 'auto' : 'none';
        subtitleEl.style.userSelect = 'none';
        subtitleEl.style.cursor = state.allowDrag ? 'grab' : '';
    }

    function loadSubPosFromStorage() {
        var stored = state.rememberPosition ? loadStored(STORAGE_KEY) : null;
        if (stored) {
            subPos.offsetX = stored.offsetX || 0;
            subPos.offsetY = stored.offsetY || 0;
            subPos.scale = stored.scale || (state.defaultFontSize / 100);
        } else {
            subPos.offsetX = 0;
            subPos.offsetY = 0;
            subPos.scale = state.defaultFontSize / 100;
        }
    }

    // ------------------------------------------------------------ Optional drag
    function bindDirectManipulation(el) {
        if (el.__movableDirectBound) { return; }
        el.__movableDirectBound = true;

        var dragging = false;
        var startX = 0, startY = 0, baseX = 0, baseY = 0;

        function down(e) {
            if (!state.allowDrag) { return; }
            dragging = true;
            var p = e.touches ? e.touches[0] : e;
            startX = p.clientX; startY = p.clientY;
            baseX = subPos.offsetX; baseY = subPos.offsetY;
            el.style.cursor = 'grabbing';
            e.preventDefault();
        }
        function move(e) {
            if (!dragging) { return; }
            var p = e.touches ? e.touches[0] : e;
            subPos.offsetX = baseX + (p.clientX - startX);
            subPos.offsetY = baseY + (p.clientY - startY);
            applyTransform();
        }
        function up() {
            if (!dragging) { return; }
            dragging = false;
            el.style.cursor = state.allowDrag ? 'grab' : '';
            saveSubPos();
        }

        el.addEventListener('mousedown', down);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        el.addEventListener('touchstart', down, { passive: false });
        window.addEventListener('touchmove', move, { passive: false });
        window.addEventListener('touchend', up);

        el.addEventListener('wheel', function (e) {
            if (!state.allowResize) { return; }
            e.preventDefault();
            subPos.scale = clamp(subPos.scale + (e.deltaY < 0 ? 0.05 : -0.05), 0.5, 3);
            applyTransform();
            saveSubPos();
        }, { passive: false });
    }

    // ----------------------------------------------------------------- Presets
    function presetTop() {
        if (!subtitleEl) { return; }
        var container = findPlayerContainer();
        var rect = container.getBoundingClientRect();
        subPos.offsetY = -Math.round(rect.height * 0.40);
        subPos.offsetX = 0;
        applyTransform(); saveSubPos();
    }

    function presetMiddle() {
        if (!subtitleEl) { return; }
        var container = findPlayerContainer();
        var rect = container.getBoundingClientRect();
        subPos.offsetY = -Math.round(rect.height * 0.20);
        subPos.offsetX = 0;
        applyTransform(); saveSubPos();
    }

    function presetBottom() {
        subPos.offsetX = 0;
        subPos.offsetY = 0;
        applyTransform(); saveSubPos();
    }

    function resetAll() {
        subPos.offsetX = 0;
        subPos.offsetY = 0;
        subPos.scale = state.defaultFontSize / 100;
        applyTransform(); saveSubPos();
    }

    function nudge(dx, dy) {
        subPos.offsetX += dx;
        subPos.offsetY += dy;
        applyTransform(); saveSubPos();
    }

    function resize(delta) {
        subPos.scale = clamp(subPos.scale + delta, 0.5, 3);
        applyTransform(); saveSubPos();
    }

    // ------------------------------------------------------------------ Styles
    function injectStyles() {
        if (document.getElementById('movableSubtitlesStyles')) { return; }
        var css = ''
            + '.msub-toggle{position:fixed;top:12px;right:12px;z-index:99998;'
            + 'background:rgba(0,0,0,0.65);color:#fff;border:1px solid rgba(255,255,255,0.25);'
            + 'border-radius:999px;padding:6px 12px;font:600 13px/1 sans-serif;cursor:pointer;'
            + 'display:none;align-items:center;gap:6px;backdrop-filter:blur(4px);'
            + '-webkit-backdrop-filter:blur(4px);transition:opacity .15s ease;opacity:0.85}'
            + '.msub-toggle:hover{opacity:1}'
            + '.msub-toggle[aria-pressed="true"]{background:#00a4dc;border-color:#00a4dc}'
            + '.msub-panel{position:fixed;top:54px;right:12px;z-index:99999;'
            + 'background:rgba(20,20,20,0.92);color:#fff;border:1px solid rgba(255,255,255,0.18);'
            + 'border-radius:8px;padding:10px 12px;min-width:224px;'
            + 'box-shadow:0 8px 24px rgba(0,0,0,0.5);font:13px/1.3 sans-serif;'
            + 'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);'
            + 'user-select:none;display:none}'
            + '.msub-panel.msub-open{display:block}'
            + '.msub-panel h4{margin:0 0 6px;font-size:12px;text-transform:uppercase;'
            + 'letter-spacing:.06em;color:#9ac4ff;font-weight:600}'
            + '.msub-panel .msub-header{display:flex;justify-content:space-between;align-items:center;'
            + 'margin:-4px -4px 8px;padding:4px;cursor:move;border-bottom:1px solid rgba(255,255,255,0.08)}'
            + '.msub-panel .msub-title{font-weight:600}'
            + '.msub-panel .msub-close{background:transparent;border:0;color:#fff;font-size:18px;'
            + 'line-height:1;cursor:pointer;padding:2px 6px;border-radius:4px}'
            + '.msub-panel .msub-close:hover{background:rgba(255,255,255,0.1)}'
            + '.msub-panel .msub-section{margin:8px 0}'
            + '.msub-panel .msub-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;'
            + 'max-width:150px;margin:0 auto}'
            + '.msub-panel .msub-pad button{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);'
            + 'color:#fff;border-radius:6px;padding:10px 0;font-size:16px;cursor:pointer;'
            + 'transition:background .1s}'
            + '.msub-panel .msub-pad button:hover{background:rgba(255,255,255,0.18)}'
            + '.msub-panel .msub-pad button:active{background:#00a4dc}'
            + '.msub-panel .msub-pad .msub-spacer{visibility:hidden}'
            + '.msub-panel .msub-pad .msub-reset{background:rgba(0,164,220,0.25);border-color:#00a4dc}'
            + '.msub-panel .msub-row{display:flex;gap:6px;align-items:center;justify-content:space-between}'
            + '.msub-panel .msub-row button{flex:1;background:rgba(255,255,255,0.08);'
            + 'border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:6px;padding:8px 0;'
            + 'font-size:14px;cursor:pointer}'
            + '.msub-panel .msub-row button:hover{background:rgba(255,255,255,0.18)}'
            + '.msub-panel .msub-size{font-variant-numeric:tabular-nums;min-width:52px;text-align:center;'
            + 'padding:6px 10px;background:rgba(255,255,255,0.06);border-radius:6px}'
            + '.msub-panel .msub-presets{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}'
            + '.msub-panel .msub-presets button{background:rgba(255,255,255,0.08);'
            + 'border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:6px;padding:8px 0;'
            + 'font-size:12px;cursor:pointer}'
            + '.msub-panel .msub-presets button:hover{background:rgba(255,255,255,0.18)}'
            + '.msub-panel .msub-reset-all{width:100%;margin-top:4px;background:transparent;'
            + 'border:1px solid rgba(255,255,255,0.2);color:#ddd;border-radius:6px;padding:6px 0;'
            + 'font-size:12px;cursor:pointer}'
            + '.msub-panel .msub-reset-all:hover{background:rgba(255,255,255,0.08);color:#fff}';
        var styleEl = document.createElement('style');
        styleEl.id = 'movableSubtitlesStyles';
        styleEl.textContent = css;
        document.head.appendChild(styleEl);
    }

    // ------------------------------------------------------------------ Panel
    function buildPanel() {
        if (panelEl) { return panelEl; }
        panelEl = document.createElement('div');
        panelEl.className = 'msub-panel';
        panelEl.setAttribute('role', 'dialog');
        panelEl.setAttribute('aria-label', 'Subtitle position controls');
        panelEl.innerHTML = ''
            + '<div class="msub-header">'
            + '  <span class="msub-title">Subtitle Controls</span>'
            + '  <button type="button" class="msub-close" aria-label="Close">×</button>'
            + '</div>'
            + '<div class="msub-section">'
            + '  <h4>Position</h4>'
            + '  <div class="msub-pad">'
            + '    <div class="msub-spacer"></div>'
            + '    <button type="button" data-dir="up" aria-label="Move up">↑</button>'
            + '    <div class="msub-spacer"></div>'
            + '    <button type="button" data-dir="left" aria-label="Move left">←</button>'
            + '    <button type="button" class="msub-reset" data-dir="center" aria-label="Center">⌂</button>'
            + '    <button type="button" data-dir="right" aria-label="Move right">→</button>'
            + '    <div class="msub-spacer"></div>'
            + '    <button type="button" data-dir="down" aria-label="Move down">↓</button>'
            + '    <div class="msub-spacer"></div>'
            + '  </div>'
            + '</div>'
            + '<div class="msub-section">'
            + '  <h4>Size</h4>'
            + '  <div class="msub-row">'
            + '    <button type="button" data-size="-" aria-label="Smaller">A−</button>'
            + '    <span class="msub-size" data-role="sizeReadout">100%</span>'
            + '    <button type="button" data-size="+" aria-label="Larger">A+</button>'
            + '  </div>'
            + '</div>'
            + '<div class="msub-section">'
            + '  <h4>Quick position</h4>'
            + '  <div class="msub-presets">'
            + '    <button type="button" data-preset="top">Top</button>'
            + '    <button type="button" data-preset="middle">Middle</button>'
            + '    <button type="button" data-preset="bottom">Bottom</button>'
            + '  </div>'
            + '</div>'
            + '<button type="button" class="msub-reset-all" data-action="resetAll">Reset all</button>';
        document.body.appendChild(panelEl);

        // Restore remembered panel position
        var storedPanelPos = loadStored(PANEL_POS_KEY);
        if (storedPanelPos && typeof storedPanelPos.top === 'number') {
            panelEl.style.top = storedPanelPos.top + 'px';
            panelEl.style.right = 'auto';
            panelEl.style.left = storedPanelPos.left + 'px';
        }

        // Close button
        panelEl.querySelector('.msub-close').addEventListener('click', function () {
            hidePanel();
        });

        // Directional pad (click + hold-to-repeat)
        panelEl.querySelectorAll('.msub-pad button').forEach(function (btn) {
            var held;
            function start(e) {
                e.preventDefault();
                var dir = btn.getAttribute('data-dir');
                actDir(dir);
                held = setInterval(function () { actDir(dir); }, 90);
            }
            function stop() { clearInterval(held); held = null; }
            btn.addEventListener('mousedown', start);
            btn.addEventListener('touchstart', start, { passive: false });
            btn.addEventListener('mouseup', stop);
            btn.addEventListener('mouseleave', stop);
            btn.addEventListener('touchend', stop);
            btn.addEventListener('touchcancel', stop);
        });

        // Size row
        panelEl.querySelectorAll('[data-size]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                resize(btn.getAttribute('data-size') === '+' ? 0.05 : -0.05);
                updateSizeReadout();
            });
        });

        // Presets
        panelEl.querySelectorAll('[data-preset]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var p = btn.getAttribute('data-preset');
                if (p === 'top') { presetTop(); }
                else if (p === 'middle') { presetMiddle(); }
                else { presetBottom(); }
            });
        });

        panelEl.querySelector('[data-action="resetAll"]').addEventListener('click', function () {
            resetAll();
            updateSizeReadout();
        });

        makePanelDraggable();
        return panelEl;
    }

    function actDir(dir) {
        var step = 8;
        if (dir === 'up') { nudge(0, -step); }
        else if (dir === 'down') { nudge(0, step); }
        else if (dir === 'left') { nudge(-step, 0); }
        else if (dir === 'right') { nudge(step, 0); }
        else if (dir === 'center') { subPos.offsetX = 0; applyTransform(); saveSubPos(); }
    }

    function updateSizeReadout() {
        if (!panelEl) { return; }
        var el = panelEl.querySelector('[data-role="sizeReadout"]');
        if (el) { el.textContent = Math.round(subPos.scale * 100) + '%'; }
    }

    function makePanelDraggable() {
        var header = panelEl.querySelector('.msub-header');
        var dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

        header.addEventListener('mousedown', function (e) {
            if (e.target.classList.contains('msub-close')) { return; }
            dragging = true;
            var rect = panelEl.getBoundingClientRect();
            startX = e.clientX; startY = e.clientY;
            startLeft = rect.left; startTop = rect.top;
            panelEl.style.right = 'auto';
            e.preventDefault();
        });
        document.addEventListener('mousemove', function (e) {
            if (!dragging) { return; }
            var left = clamp(startLeft + (e.clientX - startX), 0, window.innerWidth - 100);
            var top = clamp(startTop + (e.clientY - startY), 0, window.innerHeight - 60);
            panelEl.style.left = left + 'px';
            panelEl.style.top = top + 'px';
        });
        document.addEventListener('mouseup', function () {
            if (!dragging) { return; }
            dragging = false;
            var rect = panelEl.getBoundingClientRect();
            saveStored(PANEL_POS_KEY, { top: rect.top, left: rect.left });
        });
    }

    function showPanel() {
        buildPanel();
        panelEl.classList.add('msub-open');
        updateSizeReadout();
        if (toggleBtn) { toggleBtn.setAttribute('aria-pressed', 'true'); }
    }
    function hidePanel() {
        if (panelEl) { panelEl.classList.remove('msub-open'); }
        if (toggleBtn) { toggleBtn.setAttribute('aria-pressed', 'false'); }
    }
    function togglePanel() {
        if (panelEl && panelEl.classList.contains('msub-open')) { hidePanel(); }
        else { showPanel(); }
    }

    // ---------------------------------------------------------------- Toggle btn
    function buildToggleButton() {
        if (toggleBtn) { return; }
        toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'msub-toggle';
        toggleBtn.setAttribute('aria-label', 'Toggle subtitle position controls');
        toggleBtn.setAttribute('aria-pressed', 'false');
        toggleBtn.innerHTML = '<span style="font-weight:700">Aa</span> <span>⇅</span>';
        toggleBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            togglePanel();
        });
        document.body.appendChild(toggleBtn);
    }

    function updateToggleButtonVisibility() {
        if (!toggleBtn) { return; }
        var hasVideo = !!document.querySelector('video');
        toggleBtn.style.display = (hasVideo && state.showControlPanel) ? 'inline-flex' : 'none';
        if (!hasVideo && panelEl) { hidePanel(); }
    }

    // ------------------------------------------------------------------- Main
    function attachBehaviour() {
        subtitleEl = findSubtitleElement();
        if (subtitleEl) {
            applyTransform();
            bindDirectManipulation(subtitleEl);
        }
        updateToggleButtonVisibility();
    }

    function watchDom() {
        var observer = new MutationObserver(function () {
            attachBehaviour();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function bindKeyboardShortcut() {
        document.addEventListener('keydown', function (e) {
            // Ctrl+Shift+S — open/close panel. Also plain 's' when a video is focused.
            if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
                if (!state.enabled || !state.showControlPanel) { return; }
                e.preventDefault();
                togglePanel();
            }
        });
    }

    function start() {
        fetchConfig().then(function () {
            if (!state.enabled) {
                console.info('[MovableSubtitles] disabled via plugin config');
                return;
            }
            injectStyles();
            loadSubPosFromStorage();
            buildToggleButton();
            attachBehaviour();
            watchDom();
            bindKeyboardShortcut();
            console.info('[MovableSubtitles] ready (menu mode)');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
