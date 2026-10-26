(() => {
    'use strict';

    const EXT = 'instagram_ui_zoom';
    const STYLE_ID = 'ig-ui-zoom-runtime-style';
    const VIEWER_ID = 'ig-image-viewer';
    let viewer = null;
    let activeImg = null;
    let scale = 1;
    let tx = 0;
    let ty = 0;
    let startX = 0;
    let startY = 0;
    let startTx = 0;
    let startTy = 0;
    let dragPointerId = null;
    let lastTap = 0;
    let pinchStartDistance = 0;
    let pinchStartScale = 1;
    let pinchStartMid = null;
    let pinchStartTx = 0;
    let pinchStartTy = 0;
    const activePointers = new Map();

    const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

    function addRuntimeStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            /* Instagram-inspired toolbar styling; buttons and actions remain native */
            #top-bar, #top-settings-holder, #send_form {
                --ig-ui-icon: #e8e8e8;
                --ig-ui-muted: #bdbdbd;
                --ig-ui-border: #292929;
                --ig-ui-pink: #e1306c;
                --ig-ui-purple: #833ab4;
            }
            #top-bar button, #top-settings-holder button,
            #top-bar .menu_button, #top-settings-holder .menu_button,
            #send_form button, #send_form .menu_button,
            #send_form .round_button, #send_form .interactable,
            #send_form .left_menu_button, #send_form .right_menu_button {
                color: var(--ig-ui-icon) !important;
                opacity: 1 !important;
                -webkit-tap-highlight-color: transparent;
                transition: color .16s ease, background-color .16s ease,
                            border-color .16s ease, filter .16s ease;
            }
            #top-bar button i, #top-bar button .fa,
            #top-settings-holder button i,
            #send_form button i, #send_form .menu_button i,
            #send_form .round_button i,
            #send_form .interactable i {
                color: currentColor !important;
                opacity: 1 !important;
            }
            #top-bar button svg, #top-settings-holder button svg,
            #send_form button svg, #send_form .menu_button svg,
            #send_form .round_button svg {
                color: currentColor !important;
                opacity: 1 !important;
            }
            #top-bar button:hover, #top-settings-holder button:hover,
            #send_form button:hover, #send_form .menu_button:hover,
            #send_form .round_button:hover {
                color: #fff !important;
                background-color: #191319 !important;
                border-color: rgba(225,48,108,.55) !important;
            }
            #top-bar button:active, #top-settings-holder button:active,
            #send_form button:active, #send_form .menu_button:active,
            #send_form .round_button:active {
                filter: brightness(1.2);
            }
            #top-bar button:focus-visible, #top-settings-holder button:focus-visible,
            #send_form button:focus-visible, #send_form .menu_button:focus-visible,
            #send_form .round_button:focus-visible {
                outline: 2px solid #d62976 !important;
                outline-offset: 2px;
            }
            #send_form {
                border-top: 1px solid #222 !important;
            }
            #send_form textarea, #send_textarea {
                border-color: #292929 !important;
            }
            #ig-image-viewer {
                position: fixed;
                inset: 0;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                height: 100dvh;
                z-index: 2147483000;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0,0,0,.98);
                color: #fff;
                overscroll-behavior: contain;
                touch-action: none;
                -webkit-tap-highlight-color: transparent;
            }
            #ig-image-viewer[hidden] { display: none !important; }
            #ig-image-viewer .igv-stage {
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                touch-action: none;
            }
            #ig-image-viewer .igv-image {
                display: block !important;
                position: relative;
                z-index: 1;
                max-width: 100vw !important;
                max-height: 100dvh !important;
                width: auto !important;
                height: auto !important;
                object-fit: contain;
                transform-origin: center center;
                will-change: transform;
                user-select: none;
                -webkit-user-drag: none;
                pointer-events: none;
                background: transparent !important;
            }
            #ig-image-viewer .igv-status {
                position: absolute;
                z-index: 2;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                max-width: 80vw;
                padding: 12px 16px;
                border-radius: 12px;
                background: #171717;
                color: #eee;
                font: 14px/1.4 system-ui, sans-serif;
                text-align: center;
            }
            #ig-image-viewer .igv-status[hidden] {
                display: none !important;
            }
            #ig-image-viewer .igv-close,
            #ig-image-viewer .igv-control {
                position: absolute;
                z-index: 2;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 44px;
                height: 44px;
                border: 1px solid rgba(255,255,255,.16);
                border-radius: 50%;
                background: rgba(28,28,28,.88);
                color: white;
                font: 600 25px/1 system-ui, sans-serif;
                cursor: pointer;
                touch-action: manipulation;
                box-shadow: 0 3px 14px rgba(0,0,0,.35);
            }
            #ig-image-viewer .igv-close {
                top: max(14px, env(safe-area-inset-top));
                right: 14px;
                font-size: 28px;
            }
            #ig-image-viewer .igv-controls {
                position: absolute;
                z-index: 2;
                bottom: max(18px, env(safe-area-inset-bottom));
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 12px;
            }
            #ig-image-viewer .igv-control {
                position: static;
                width: 42px;
                height: 42px;
                font-size: 22px;
            }
            #ig-image-viewer .igv-close:active,
            #ig-image-viewer .igv-control:active {
                background: linear-gradient(45deg,#feda75,#d62976,#833ab4,#405de6);
            }
            body.igv-open { overflow: hidden !important; }
            @media (prefers-reduced-motion: reduce) {
                #top-bar button, #top-settings-holder button, #send_form button {
                    transition: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function findImageSource(img) {
        const anchor = img.closest('a[href]');
        const candidates = [
            anchor?.getAttribute('href'),
            img.getAttribute('data-full'),
            img.getAttribute('data-original'),
            img.getAttribute('data-src'),
            img.getAttribute('data-url'),
            img.currentSrc,
            img.getAttribute('src'),
            img.src
        ].filter(Boolean);

        for (const raw of candidates) {
            if (/^(javascript:|#)/i.test(raw)) continue;
            try {
                const url = new URL(raw, document.baseURI).href;
                if (/^https?:|^blob:|^file:/i.test(url)) return url;
            } catch (_) {}
        }
        return '';
    }

    function isChatImage(img) {
        if (!(img instanceof HTMLImageElement) || !img.isConnected) return false;
        if (img.closest(`#${VIEWER_ID}`)) return false;
        if (img.closest('.avatar, .mesAvatarWrapper, #avatar_div, .character_select, .user_avatar, .avatar img')) return false;
        // SillyTavern themes/extensions use several message wrappers; accept the
        // standard chat container and common message-content classes.
        return Boolean(img.closest('#chat, .mes, .mes_text, .mes_block, .mes_content'));
    }

    function ensureViewer() {
        if (viewer && viewer.isConnected) return viewer;

        viewer = document.createElement('div');
        viewer.id = VIEWER_ID;
        viewer.hidden = true;
        viewer.setAttribute('role', 'dialog');
        viewer.setAttribute('aria-modal', 'true');
        viewer.setAttribute('aria-label', 'Image viewer');

        const stage = document.createElement('div');
        stage.className = 'igv-stage';

        const image = document.createElement('img');
        image.className = 'igv-image';
        image.alt = '';
        image.draggable = false;

        const status = document.createElement('div');
        status.className = 'igv-status';
        status.textContent = 'Loading image…';
        stage.append(image, status);

        image.addEventListener('load', () => {
            status.hidden = true;
            image.style.display = 'block';
        });
        image.addEventListener('error', () => {
            status.hidden = false;
            status.textContent = 'Could not load this image. Close and try again.';
            image.style.display = 'none';
        });

        const close = document.createElement('button');
        close.className = 'igv-close';
        close.type = 'button';
        close.setAttribute('aria-label', 'Close image');
        close.textContent = '×';

        const controls = document.createElement('div');
        controls.className = 'igv-controls';

        const minus = document.createElement('button');
        minus.className = 'igv-control';
        minus.type = 'button';
        minus.setAttribute('aria-label', 'Zoom out');
        minus.textContent = '−';

        const reset = document.createElement('button');
        reset.className = 'igv-control';
        reset.type = 'button';
        reset.setAttribute('aria-label', 'Reset zoom');
        reset.textContent = '↺';

        const plus = document.createElement('button');
        plus.className = 'igv-control';
        plus.type = 'button';
        plus.setAttribute('aria-label', 'Zoom in');
        plus.textContent = '+';

        controls.append(minus, reset, plus);
        viewer.append(stage, close, controls);
        document.body.appendChild(viewer);

        close.addEventListener('click', closeViewer);
        minus.addEventListener('click', () => setZoom(scale / 1.35));
        plus.addEventListener('click', () => setZoom(scale * 1.35));
        reset.addEventListener('click', resetZoom);
        stage.addEventListener('wheel', onWheel, { passive: false });
        stage.addEventListener('pointerdown', onPointerDown);
        stage.addEventListener('pointermove', onPointerMove);
        stage.addEventListener('pointerup', onPointerUp);
        stage.addEventListener('pointercancel', onPointerUp);
        stage.addEventListener('dblclick', onDoubleClick);
        viewer.addEventListener('click', (event) => {
            if (event.target !== viewer && event.target !== stage) return;
            if (scale > 1) return;
            const r = currentViewerImage()?.getBoundingClientRect();
            const onImage = r && event.clientX >= r.left && event.clientX <= r.right
                && event.clientY >= r.top && event.clientY <= r.bottom;
            if (!onImage) closeViewer();
        });

        return viewer;
    }

    function currentViewerImage() {
        return viewer?.querySelector('.igv-image');
    }

    function renderTransform() {
        const image = currentViewerImage();
        if (!image) return;
        image.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
        image.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
    }

    function setZoom(next) {
        scale = clamp(next, 1, 6);
        if (scale === 1) {
            tx = 0;
            ty = 0;
        }
        renderTransform();
    }

    function resetZoom() {
        scale = 1;
        tx = 0;
        ty = 0;
        renderTransform();
    }

    function openViewer(img) {
        const src = findImageSource(img);
        if (!src) return;

        const root = ensureViewer();
        const image = currentViewerImage();
        activeImg = img;
        image.style.display = 'block';
        const status = root.querySelector('.igv-status');
        if (status) {
            status.hidden = false;
            status.textContent = 'Loading image…';
        }
        image.removeAttribute('src');
        image.alt = img.alt || '';
        resetZoom();
        root.hidden = false;
        document.body.classList.add('igv-open');
        // Assign after revealing the viewer so mobile browsers can begin loading.
        image.src = src;
        root.querySelector('.igv-close')?.focus({ preventScroll: true });
    }

    function closeViewer() {
        if (!viewer || viewer.hidden) return;
        viewer.hidden = true;
        document.body.classList.remove('igv-open');
        const image = currentViewerImage();
        if (image) {
            image.removeAttribute('src');
            image.style.display = 'block';
        }
        const status = viewer.querySelector('.igv-status');
        if (status) {
            status.hidden = true;
            status.textContent = 'Loading image…';
        }
        if (activeImg?.isConnected) activeImg.focus?.({ preventScroll: true });
        activeImg = null;
        resetZoom();
    }

    function onWheel(event) {
        event.preventDefault();
        const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
        setZoom(scale * factor);
    }

    function onDoubleClick(event) {
        event.preventDefault();
        if (scale > 1) resetZoom();
        else setZoom(2.5);
    }

    function pointerDistance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function pointerMidpoint(a, b) {
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    function onPointerDown(event) {
        if (viewer?.hidden) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;

        const stage = viewer.querySelector('.igv-stage');
        stage.setPointerCapture?.(event.pointerId);
        activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

        const now = Date.now();
        if (event.pointerType !== 'mouse' && now - lastTap < 320 && activePointers.size === 1) {
            if (scale > 1) resetZoom();
            else setZoom(2.5);
            lastTap = 0;
            activePointers.delete(event.pointerId);
            return;
        }
        lastTap = now;

        if (activePointers.size >= 2) {
            const points = [...activePointers.values()];
            pinchStartDistance = pointerDistance(points[0], points[1]) || 1;
            pinchStartScale = scale;
            pinchStartMid = pointerMidpoint(points[0], points[1]);
            pinchStartTx = tx;
            pinchStartTy = ty;
            dragPointerId = null;
            return;
        }

        dragPointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        startTx = tx;
        startTy = ty;
    }

    function onPointerMove(event) {
        if (viewer?.hidden || !activePointers.has(event.pointerId)) return;
        activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

        if (activePointers.size >= 2) {
            const points = [...activePointers.values()];
            const distance = pointerDistance(points[0], points[1]) || 1;
            const midpoint = pointerMidpoint(points[0], points[1]);

            scale = clamp(pinchStartScale * (distance / Math.max(1, pinchStartDistance)), 1, 6);
            tx = pinchStartTx + midpoint.x - pinchStartMid.x;
            ty = pinchStartTy + midpoint.y - pinchStartMid.y;

            if (scale === 1) {
                tx = 0;
                ty = 0;
            }
            renderTransform();
            return;
        }

        if (dragPointerId !== event.pointerId || scale <= 1) return;
        tx = startTx + event.clientX - startX;
        ty = startTy + event.clientY - startY;
        renderTransform();
    }

    function onPointerUp(event) {
        activePointers.delete(event.pointerId);
        if (dragPointerId === event.pointerId) dragPointerId = null;

        if (activePointers.size === 1) {
            const [id, point] = [...activePointers.entries()][0];
            dragPointerId = id;
            startX = point.x;
            startY = point.y;
            startTx = tx;
            startTy = ty;
        } else if (activePointers.size === 0) {
            dragPointerId = null;
        }
    }

    function onKeyDown(event) {
        if (!viewer || viewer.hidden) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            closeViewer();
        } else if (event.key === '+' || event.key === '=') {
            setZoom(scale * 1.25);
        } else if (event.key === '-') {
            setZoom(scale / 1.25);
        } else if (event.key === '0') {
            resetZoom();
        }
    }

    // Delegated capture listeners work even when ST re-renders messages after edits.
    // Do not reject anchor-wrapped images: those are common in SillyTavern markdown.
    function onChatImageActivation(event) {
        if (event.type === 'pointerdown' && event.pointerType === 'mouse' && event.button !== 0) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        const img = target.closest('img');
        if (!img || !isChatImage(img)) return;

        // Avoid avatar clicks and buttons, but allow an image inside an <a>.
        if (img.closest('button') && !img.closest('.mes_text, .mes_block, .mes_content')) return;
        const src = findImageSource(img);
        if (!src) {
            console.warn(`[${EXT}] Chat image found, but no usable source URL was found.`, img);
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        openViewer(img);
    }

    function init() {
        addRuntimeStyle();
        // Click is the primary path. Pointerup is a mobile fallback for skins
        // that suppress synthetic clicks; ignore it for mouse to avoid duplicates.
        document.addEventListener('click', onChatImageActivation, true);
        document.addEventListener('pointerup', (event) => {
            if (event.pointerType === 'touch') onChatImageActivation(event);
        }, true);
        document.addEventListener('keydown', onKeyDown, true);
        console.info(`[${EXT}] Instagram-style toolbar and image zoom loaded.`);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
