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
            #ig-video-viewer {
                position: fixed;
                top: 0; left: 0; width: 100vw; height: 100vh; height: 100dvh;
                inset: 0;
                z-index: 2147483000;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0,0,0,.98);
                color: #fff;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
            }
            #ig-video-viewer[hidden] { display: none !important; }
            #ig-video-viewer .igv-stage {
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            #ig-video-viewer .igv-video {
                display: block;
                max-width: 100vw;
                max-height: 100dvh;
                width: auto;
                height: auto;
                background: #000;
            }
            #ig-video-viewer .igv-close {
                position: absolute;
                z-index: 3;
                top: max(14px, env(safe-area-inset-top));
                right: 14px;
                width: 44px;
                height: 44px;
                border: 1px solid rgba(255,255,255,.16);
                border-radius: 50%;
                background: rgba(28,28,28,.88);
                color: #fff;
                font: 600 28px/1 system-ui, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 3px 14px rgba(0,0,0,.35);
            }
            #ig-video-viewer .igv-video-bar {
                position: absolute;
                z-index: 3;
                left: 14px;
                right: 14px;
                bottom: max(18px, env(safe-area-inset-bottom));
            }
            #ig-video-viewer .igv-video-bar input {
                width: 100%;
                accent-color: #e1306c;
            }
            #ig-video-viewer .igv-paused-badge {
                position: absolute;
                z-index: 2;
                left: 50%;
                top: 50%;
                width: 72px;
                height: 72px;
                margin: -36px 0 0 -36px;
                border-radius: 50%;
                background: rgba(255,255,255,.85);
                pointer-events: none;
                opacity: 0;
                transition: opacity .15s ease;
            }
            #ig-video-viewer .igv-paused-badge::after {
                content: '';
                position: absolute;
                left: 26px;
                top: 22px;
                border-left: 24px solid #000;
                border-top: 14px solid transparent;
                border-bottom: 14px solid transparent;
            }
            #ig-video-viewer.igv-paused .igv-paused-badge { opacity: 1; }
            #ig-video-viewer .igv-status {
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
            #ig-video-viewer .igv-status[hidden] { display: none !important; }
            .igv-chat-preview {
                position: relative;
                width: min(100%, 420px);
                aspect-ratio: 16 / 9;
                margin: 4px 0;
                border-radius: 12px;
                overflow: hidden;
                background: #212121;
                cursor: pointer;
                user-select: none;
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
            }
            .igv-chat-preview.igv-has-frame { aspect-ratio: auto; }
            .igv-chat-preview .igv-preview-frame {
                display: block;
                width: 100%;
                height: auto;
                max-height: 70vh;
                object-fit: contain;
                background: #212121;
            }
            .igv-chat-preview.igv-has-frame .igv-preview-frame { min-height: 0; }
            .igv-chat-preview .igv-preview-play {
                position: absolute;
                left: 50%;
                top: 50%;
                width: 64px;
                height: 64px;
                margin: -32px 0 0 -32px;
                border-radius: 50%;
                background: rgba(40,40,40,.72);
                box-shadow: 0 2px 10px rgba(0,0,0,.35);
                pointer-events: none;
            }
            .igv-chat-preview .igv-preview-play::after {
                content: '';
                position: absolute;
                left: 25px;
                top: 20px;
                border-left: 20px solid #fff;
                border-top: 12px solid transparent;
                border-bottom: 12px solid transparent;
            }
            .igv-chat-preview .igv-preview-bar {
                position: absolute;
                left: 0;
                right: 0;
                bottom: 0;
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 14px 12px 8px;
                background: linear-gradient(transparent, rgba(0,0,0,.75));
                color: #fff;
                font: 12px/1 system-ui, sans-serif;
                pointer-events: none;
            }
            .igv-chat-preview .igv-preview-glyph {
                width: 0;
                height: 0;
                border-left: 9px solid #fff;
                border-top: 6px solid transparent;
                border-bottom: 6px solid transparent;
            }
            .igv-chat-preview .igv-preview-track {
                flex: 1;
                height: 2px;
                background: rgba(255,255,255,.35);
                border-radius: 2px;
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

    // ---------- Chat video player ----------
    // Chat videos lose their native controls and open in a full-screen player.
    // One tap on the video plays or pauses it, and the bar at the bottom seeks.
    const VIDEO_VIEWER_ID = 'ig-video-viewer';
    let videoViewer = null;
    let videoEl = null;
    let videoRange = null;
    let videoStatus = null;

    function isChatVideo(video) {
        if (!(video instanceof HTMLVideoElement) || !video.isConnected) return false;
        if (video.closest(`#${VIDEO_VIEWER_ID}`)) return false;
        return Boolean(video.closest('#chat, .mes, .mes_text, .mes_block, .mes_content'));
    }

    function findVideoSource(video) {
        const candidates = [
            video.currentSrc,
            video.getAttribute('src'),
            video.querySelector('source')?.getAttribute('src')
        ].filter(Boolean);
        for (const raw of candidates) {
            if (/^javascript:/i.test(raw)) continue;
            try {
                const url = new URL(raw, document.baseURI).href;
                if (/^(https?:|blob:|file:|data:video)/i.test(url)) return url;
            } catch (_) {}
        }
        return '';
    }

    // Each chat video gets a preview card: its first frame, a play button and a bottom bar.
    // The real <video> stays hidden and is only used to grab the frame; tapping the card opens the player.
    const previewVideos = new WeakMap();

    function formatTime(seconds) {
        if (!Number.isFinite(seconds)) return '';
        const total = Math.floor(seconds);
        const m = Math.floor(total / 60);
        const sec = String(total % 60).padStart(2, '0');
        return `${m}:${sec}`;
    }

    function buildChatPreview(video) {
        const preview = document.createElement('div');
        preview.className = 'igv-chat-preview';
        preview.setAttribute('role', 'button');
        preview.setAttribute('aria-label', 'Play video');

        const canvas = document.createElement('canvas');
        canvas.className = 'igv-preview-frame';

        const play = document.createElement('div');
        play.className = 'igv-preview-play';

        const bar = document.createElement('div');
        bar.className = 'igv-preview-bar';
        const glyph = document.createElement('span');
        glyph.className = 'igv-preview-glyph';
        const time = document.createElement('span');
        time.className = 'igv-preview-time';
        const track = document.createElement('span');
        track.className = 'igv-preview-track';
        bar.append(glyph, time, track);

        preview.append(canvas, play, bar);
        previewVideos.set(preview, video);

        const drawFrame = () => {
            if (!video.videoWidth || !video.videoHeight) return;
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }
            try {
                canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
                preview.classList.add('igv-has-frame');
            } catch (_) {}
        };

        video.addEventListener('loadedmetadata', () => {
            time.textContent = formatTime(video.duration);
            // Seek a hair past zero so the browser decodes a real frame instead of a blank one.
            if (video.currentTime === 0) {
                try { video.currentTime = 0.1; } catch (_) {}
            }
        });
        video.addEventListener('loadeddata', drawFrame);
        video.addEventListener('seeked', drawFrame);

        return preview;
    }

    function prepareChatVideo(video) {
        if (video.dataset.igvPrepared) return;
        video.dataset.igvPrepared = '1';
        video.controls = false;
        video.removeAttribute('poster');
        if (!video.preload || video.preload === 'none') video.preload = 'metadata';
        if (!video.parentElement) return;

        video.style.display = 'none';
        video.parentElement.insertBefore(buildChatPreview(video), video);
    }

    function prepareAllChatVideos() {
        document.querySelectorAll('#chat video').forEach(prepareChatVideo);
    }

    function ensureVideoViewer() {
        if (videoViewer && videoViewer.isConnected) return videoViewer;

        videoViewer = document.createElement('div');
        videoViewer.id = VIDEO_VIEWER_ID;
        videoViewer.hidden = true;
        videoViewer.setAttribute('role', 'dialog');
        videoViewer.setAttribute('aria-modal', 'true');
        videoViewer.setAttribute('aria-label', 'Video player');

        const stage = document.createElement('div');
        stage.className = 'igv-stage';

        videoEl = document.createElement('video');
        videoEl.className = 'igv-video';
        videoEl.setAttribute('playsinline', '');
        videoEl.setAttribute('webkit-playsinline', '');
        videoEl.preload = 'auto';
        videoEl.controls = false;
        stage.appendChild(videoEl);

        const badge = document.createElement('div');
        badge.className = 'igv-paused-badge';

        videoStatus = document.createElement('div');
        videoStatus.className = 'igv-status';
        videoStatus.hidden = true;

        const close = document.createElement('button');
        close.className = 'igv-close';
        close.type = 'button';
        close.setAttribute('aria-label', 'Close video');
        close.textContent = '×';

        const bar = document.createElement('div');
        bar.className = 'igv-video-bar';
        videoRange = document.createElement('input');
        videoRange.type = 'range';
        videoRange.min = '0';
        videoRange.max = '1000';
        videoRange.step = '1';
        videoRange.value = '0';
        videoRange.setAttribute('aria-label', 'Seek');
        bar.appendChild(videoRange);

        videoViewer.append(stage, badge, videoStatus, close, bar);
        document.body.appendChild(videoViewer);

        close.addEventListener('click', closeVideoViewer);
        stage.addEventListener('click', (event) => {
            if (event.target === videoEl) toggleVideoPlayback();
            else if (event.target === stage) closeVideoViewer();
        });

        videoRange.addEventListener('input', () => {
            if (videoEl.duration) videoEl.currentTime = (Number(videoRange.value) / 1000) * videoEl.duration;
        });
        videoEl.addEventListener('timeupdate', () => {
            if (!videoEl.duration || document.activeElement === videoRange) return;
            videoRange.value = String(Math.round((videoEl.currentTime / videoEl.duration) * 1000));
        });
        videoEl.addEventListener('play', () => videoViewer.classList.remove('igv-paused'));
        videoEl.addEventListener('pause', () => videoViewer.classList.add('igv-paused'));
        videoEl.addEventListener('ended', () => videoViewer.classList.add('igv-paused'));
        videoEl.addEventListener('error', () => {
            if (!videoEl.getAttribute('src')) return;
            videoStatus.hidden = false;
            videoStatus.textContent = 'This video could not be played.';
        });

        return videoViewer;
    }

    function toggleVideoPlayback() {
        if (!videoEl) return;
        if (videoEl.paused) videoEl.play().catch(() => {});
        else videoEl.pause();
    }

    function openVideoViewer(video) {
        const src = findVideoSource(video);
        if (!src) return;

        ensureVideoViewer();
        videoStatus.hidden = true;
        videoRange.value = '0';
        videoEl.src = src;
        videoViewer.classList.add('igv-paused');
        videoViewer.hidden = false;
        document.body.classList.add('igv-open');
        // Called from the click that opened the player, so the browser allows playback.
        videoEl.play().catch(() => {});
    }

    function closeVideoViewer() {
        if (!videoViewer || videoViewer.hidden) return;
        videoEl.pause();
        videoEl.removeAttribute('src');
        videoEl.load();
        videoViewer.hidden = true;
        document.body.classList.remove('igv-open');
    }

    function onChatVideoActivation(event) {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const preview = target.closest('.igv-chat-preview');
        const video = preview ? previewVideos.get(preview) : target.closest('video');
        if (!video || !isChatVideo(video)) return;

        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        openVideoViewer(video);
    }

    function onVideoKeyDown(event) {
        if (!videoViewer || videoViewer.hidden) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            closeVideoViewer();
        } else if (event.key === ' ') {
            event.preventDefault();
            toggleVideoPlayback();
        }
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
        document.addEventListener('click', onChatVideoActivation, true);
        document.addEventListener('keydown', onVideoKeyDown, true);
        prepareAllChatVideos();
        // ST adds messages (and their videos) over time, so keep preparing new ones.
        new MutationObserver(prepareAllChatVideos).observe(document.body, { childList: true, subtree: true });
        console.info(`[${EXT}] Instagram-style toolbar and image zoom loaded.`);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
