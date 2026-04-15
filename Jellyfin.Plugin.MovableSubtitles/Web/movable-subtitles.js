/*
 * Movable and Sizable Subtitles for Jellyfin.
 * Injected into the Jellyfin web client on load.
 *
 * Finds the built-in subtitle rendering surface (.videoSubtitles) and makes it
 *   - draggable by mouse / touch,
 *   - resizable via scroll wheel / pinch gesture,
 *   - persistent per user (optional).
 *
 * The script is served by the plugin at
 *   /MovableSubtitles/script.js
 * and its <script> tag is injected into the web client's index.html at plugin startup.
 */
(function () {
    'use strict';

    if (window.__movableSubtitlesLoaded) {
        return;
    }
    window.__movableSubtitlesLoaded = true;

    var STORAGE_KEY = 'movableSubtitles.state.v1';
    var CONFIG_URL = ApiClientBaseUrl() + '/MovableSubtitles/config';
    var state = {
        enabled: true,
        allowDrag: true,
        allowResize: true,
        rememberPosition: true,
        defaultFontSize: 100
    };

    function ApiClientBaseUrl() {
        try {
            if (window.ApiClient && typeof window.ApiClient.serverAddress === 'function') {
                return window.ApiClient.serverAddress();
            }
        } catch (err) {
            /* ignore */
        }
        return '';
    }

    function loadState() {
        if (!state.rememberPosition) {
            return null;
        }
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (err) {
            return null;
        }
    }

    function saveState(pos) {
        if (!state.rememberPosition) {
            return;
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
        } catch (err) {
            /* quota - ignore */
        }
    }

    function fetchConfig() {
        return fetch(CONFIG_URL, { credentials: 'include' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (cfg) {
                if (cfg) {
                    state.enabled = cfg.Enabled !== false;
                    state.allowDrag = cfg.AllowDrag !== false;
                    state.allowResize = cfg.AllowResize !== false;
                    state.rememberPosition = cfg.RememberPosition !== false;
                    state.defaultFontSize = cfg.DefaultFontSize || 100;
                }
            })
            .catch(function () { /* use defaults */ });
    }

    function findSubtitleElement() {
        return document.querySelector('.videoSubtitles')
            || document.querySelector('.htmlvideoplayer .videoSubtitles')
            || document.querySelector('video + div.videoSubtitles');
    }

    function attachBehaviour(el) {
        if (!el || el.__movableAttached) {
            return;
        }
        el.__movableAttached = true;

        var stored = loadState() || {};
        var scale = stored.scale || (state.defaultFontSize / 100);
        var offsetX = stored.offsetX || 0;
        var offsetY = stored.offsetY || 0;

        function apply() {
            el.style.transform = 'translate(' + offsetX + 'px, ' + offsetY + 'px) scale(' + scale + ')';
            el.style.transformOrigin = 'center center';
            el.style.transition = 'none';
            el.style.cursor = state.allowDrag ? 'grab' : '';
            el.style.touchAction = 'none';
            el.style.userSelect = 'none';
            el.style.pointerEvents = 'auto';
        }
        apply();

        // --- Dragging (mouse + touch) ---
        var dragging = false;
        var startX = 0;
        var startY = 0;
        var baseOffsetX = 0;
        var baseOffsetY = 0;

        function onPointerDown(e) {
            if (!state.allowDrag) {
                return;
            }
            dragging = true;
            el.style.cursor = 'grabbing';
            var point = e.touches ? e.touches[0] : e;
            startX = point.clientX;
            startY = point.clientY;
            baseOffsetX = offsetX;
            baseOffsetY = offsetY;
            e.preventDefault();
        }

        function onPointerMove(e) {
            if (!dragging) {
                return;
            }
            var point = e.touches ? e.touches[0] : e;
            offsetX = baseOffsetX + (point.clientX - startX);
            offsetY = baseOffsetY + (point.clientY - startY);
            apply();
        }

        function onPointerUp() {
            if (!dragging) {
                return;
            }
            dragging = false;
            el.style.cursor = state.allowDrag ? 'grab' : '';
            saveState({ scale: scale, offsetX: offsetX, offsetY: offsetY });
        }

        el.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);

        el.addEventListener('touchstart', onPointerDown, { passive: false });
        window.addEventListener('touchmove', onPointerMove, { passive: false });
        window.addEventListener('touchend', onPointerUp);

        // --- Resizing (wheel) ---
        el.addEventListener('wheel', function (e) {
            if (!state.allowResize) {
                return;
            }
            e.preventDefault();
            var delta = e.deltaY < 0 ? 0.05 : -0.05;
            scale = Math.min(3, Math.max(0.5, scale + delta));
            apply();
            saveState({ scale: scale, offsetX: offsetX, offsetY: offsetY });
        }, { passive: false });

        // --- Resizing (pinch) ---
        var pinchStartDist = 0;
        var pinchStartScale = scale;
        el.addEventListener('touchstart', function (e) {
            if (!state.allowResize || e.touches.length !== 2) {
                return;
            }
            pinchStartDist = touchDistance(e.touches);
            pinchStartScale = scale;
        }, { passive: false });

        el.addEventListener('touchmove', function (e) {
            if (!state.allowResize || e.touches.length !== 2) {
                return;
            }
            var d = touchDistance(e.touches);
            if (pinchStartDist > 0) {
                scale = Math.min(3, Math.max(0.5, pinchStartScale * (d / pinchStartDist)));
                apply();
            }
            e.preventDefault();
        }, { passive: false });

        el.addEventListener('touchend', function () {
            pinchStartDist = 0;
            saveState({ scale: scale, offsetX: offsetX, offsetY: offsetY });
        });

        function touchDistance(touches) {
            var dx = touches[0].clientX - touches[1].clientX;
            var dy = touches[0].clientY - touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }

        // Double-click / double-tap resets to default
        var lastTap = 0;
        function resetPosition() {
            offsetX = 0;
            offsetY = 0;
            scale = state.defaultFontSize / 100;
            apply();
            saveState({ scale: scale, offsetX: offsetX, offsetY: offsetY });
        }
        el.addEventListener('dblclick', resetPosition);
        el.addEventListener('touchend', function () {
            var now = Date.now();
            if (now - lastTap < 350) {
                resetPosition();
            }
            lastTap = now;
        });
    }

    function watchForSubtitles() {
        var observer = new MutationObserver(function () {
            if (!state.enabled) {
                return;
            }
            var el = findSubtitleElement();
            if (el) {
                attachBehaviour(el);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Also try immediately in case it's already there.
        var el = findSubtitleElement();
        if (el && state.enabled) {
            attachBehaviour(el);
        }
    }

    function start() {
        fetchConfig().then(function () {
            if (!state.enabled) {
                console.info('[MovableSubtitles] disabled via plugin config');
                return;
            }
            watchForSubtitles();
            console.info('[MovableSubtitles] ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
