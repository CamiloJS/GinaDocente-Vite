import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    BookOpen,
    Book,
    ChevronLeft,
    ChevronRight,
    Volume2,
    VolumeX,
    Download,
    Maximize2,
    Minimize2,
    Grid,
    RotateCcw,
    Plus,
    Minus,
    X,
    Loader2,
    Edit3,
    FileText,
    Bookmark,
    Music
} from './Icons';
import {
    normalizeBookRecord,
    getBookTheme,
    buildBookSpreads,
    getSpreadIndexForPage,
    formatSpreadPageLabel,
    calculateDragCurlState,
    clampBookZoom,
    playPageFlipSound,
    readingAmbientPlayer,
    READING_AUDIO_PRESETS,
    getReadingAudioPreset,
    renderPdfToBookPages,
    buildFallbackBookPages,
    buildBookPagesFromOutline,
    buildIllustratedBookPageSvg,
    isCompactedOrFallbackBookPage,
    bookPagesNeedLivePdfRender,
    extractSvgExternalImageOverlay,
    resolveBookReaderUserKey,
    loadUserBookBookmarks,
    toggleUserBookBookmark,
    saveUserBookLastPage
} from '../utils/flipbookEngine';
import { handleForceDownload } from '../utils/helpers';

export default function Flipbook3DModal({
    book,
    onClose,
    initialPage = 0,
    isTeacher = false,
    onEditBook = null,
    userId = null,
    userKey = null
}) {
    const normalizedBook = useMemo(() => normalizeBookRecord(book), [book]);
    const theme = useMemo(() => getBookTheme(normalizedBook.theme), [normalizedBook.theme]);

    const readerUserKey = useMemo(
        () => resolveBookReaderUserKey(userId || userKey || (isTeacher ? 'teacher' : 'student')),
        [userId, userKey, isTeacher]
    );

    const [pages, setPages] = useState(() =>
        Array.isArray(normalizedBook.bookPages) && normalizedBook.bookPages.length > 0
            ? normalizedBook.bookPages
            : []
    );
    const [loadingPdf, setLoadingPdf] = useState(false);
    const [renderProgress, setRenderProgress] = useState({ currentPage: 0, totalPages: 0, percent: 0 });
    const [corsFallbackNotice, setCorsFallbackNotice] = useState(false);

    const [isDoublePage, setIsDoublePage] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth >= 920 : true
    );
    const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [soundMuted, setSoundMuted] = useState(false);
    const [showThumbnails, setShowThumbnails] = useState(false);
    const [showBookmarksPanel, setShowBookmarksPanel] = useState(false);
    const [showAmbientMenu, setShowAmbientMenu] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [ambientState, setAmbientState] = useState(() => readingAmbientPlayer.getState());

    const ambientMenuRef = useRef(null);

    // Per-user Bookmarks & Last Read Page
    const [bookmarks, setBookmarks] = useState(() => {
        const saved = loadUserBookBookmarks(normalizedBook.id, readerUserKey);
        return saved.bookmarks || [];
    });

    // 3D Page Turn Animation, Curl Drag State & Zoom Pan State
    const [flipAnim, setFlipAnim] = useState(null);
    const [dragState, setDragState] = useState(null);
    const [panState, setPanState] = useState(null);

    const modalRootRef = useRef(null);
    const stageScrollRef = useRef(null);
    const bookStageRef = useRef(null);
    const flipTimerRef = useRef(null);
    const hasInitializedPageRef = useRef(false);
    const activePrimaryPageRef = useRef(0);
    const prevDoublePageRef = useRef(isDoublePage);

    const bookPagesSignature = useMemo(() => {
        const arr = Array.isArray(normalizedBook.bookPages) ? normalizedBook.bookPages : [];
        return `${arr.length}:${String(arr[0] || '').slice(0, 64)}:${String(arr[arr.length - 1] || '').slice(0, 64)}`;
    }, [normalizedBook.bookPages]);

    // Subscribe to ambient audio state changes
    useEffect(() => {
        return readingAmbientPlayer.subscribe(setAmbientState);
    }, []);

    // Ambient Reading Audio Lifecycle: Progressive Fade-in on mount and Fade-out on close
    useEffect(() => {
        const ambient = normalizedBook.ambientAudio || {};
        const trackId = ambient.trackId || normalizedBook.ambientAudioTrack || 'piano-calm';
        const isAudioEnabled = ambient.enabled !== false && normalizedBook.ambientAudioEnabled !== false && trackId !== 'none';
        const customUrl = ambient.customUrl || normalizedBook.ambientAudioUrl || '';
        const volume = ambient.volume ?? normalizedBook.ambientAudioVolume ?? 0.22;
        const title = ambient.title || normalizedBook.ambientAudioTitle || '';

        if (isAudioEnabled) {
            readingAmbientPlayer.start({
                trackId,
                customUrl,
                volume,
                fadeInDuration: 2.2,
                title
            });
        } else {
            readingAmbientPlayer.stop({ fadeOutDuration: 0.5 });
        }

        const unlockAmbientAudio = () => {
            if (isAudioEnabled && !readingAmbientPlayer.isPlaying && !readingAmbientPlayer.isMuted) {
                readingAmbientPlayer.start({
                    trackId,
                    customUrl,
                    volume,
                    fadeInDuration: 1.6,
                    title
                });
            }
        };

        window.addEventListener('pointerdown', unlockAmbientAudio, { once: true });
        window.addEventListener('keydown', unlockAmbientAudio, { once: true });

        return () => {
            window.removeEventListener('pointerdown', unlockAmbientAudio);
            window.removeEventListener('keydown', unlockAmbientAudio);
            readingAmbientPlayer.stop({ fadeOutDuration: 1.2 });
        };
    }, [
        normalizedBook.id,
        normalizedBook.ambientAudioTrack,
        normalizedBook.ambientAudioEnabled,
        normalizedBook.ambientAudioUrl,
        normalizedBook.ambientAudioVolume
    ]);

    // Close ambient audio menu when clicking outside
    useEffect(() => {
        if (!showAmbientMenu) return;
        const handleClickOutside = (e) => {
            if (ambientMenuRef.current && !ambientMenuRef.current.contains(e.target)) {
                setShowAmbientMenu(false);
            }
        };
        document.addEventListener('pointerdown', handleClickOutside);
        return () => document.removeEventListener('pointerdown', handleClickOutside);
    }, [showAmbientMenu]);

    // Reload bookmarks when book or user changes
    useEffect(() => {
        const saved = loadUserBookBookmarks(normalizedBook.id, readerUserKey);
        setBookmarks(saved.bookmarks || []);
        hasInitializedPageRef.current = false;
    }, [normalizedBook.id, readerUserKey]);

    // Sync pages when book prop changes or load from PDF URL on-the-fly
    useEffect(() => {
        let cancelled = false;
        const preRendered = Array.isArray(normalizedBook.bookPages) && normalizedBook.bookPages.length > 0
            ? normalizedBook.bookPages
            : [];

        const shouldRenderFromPdf = bookPagesNeedLivePdfRender(preRendered, {
            pdfUrl: normalizedBook.pdfUrl,
            expectedPageCount: normalizedBook.pageCount
        });

        if (preRendered.length > 0) {
            setPages(preRendered);
            setCorsFallbackNotice(false);
            if (!shouldRenderFromPdf) {
                setLoadingPdf(false);
                return () => {
                    cancelled = true;
                };
            }
        }

        if (normalizedBook.pdfUrl) {
            setLoadingPdf(preRendered.length === 0);
            setCorsFallbackNotice(false);
            setRenderProgress({ currentPage: 0, totalPages: 0, percent: 8 });

            renderPdfToBookPages(normalizedBook.pdfUrl, {
                maxPages: Math.max(60, Number(normalizedBook.pageCount) || 60),
                scale: 1.55,
                maxDimension: 1320,
                quality: 0.80,
                compressionLevel: 'light',
                customCoverUrl: normalizedBook.customCoverUrl || '',
                fallbackTitle: normalizedBook.title,
                themeId: normalizedBook.theme,
                onProgress: (prog) => {
                    if (!cancelled) setRenderProgress(prog);
                }
            })
                .then((res) => {
                    if (cancelled) return;
                    if (Array.isArray(res?.pages) && res.pages.length > 0) {
                        const mergedPages = res.pages.map((livePage, idx) => {
                            const existingPage = preRendered[idx];
                            if (existingPage && !isCompactedOrFallbackBookPage(existingPage)) {
                                return existingPage;
                            }
                            return livePage;
                        });
                        setPages(mergedPages);
                    } else if (preRendered.length === 0) {
                        setCorsFallbackNotice(true);
                        setPages(
                            buildFallbackBookPages({
                                title: normalizedBook.title,
                                description: normalizedBook.description,
                                fileName: normalizedBook.fileName,
                                author: normalizedBook.authorName || 'Docente',
                                themeId: normalizedBook.theme,
                                customCoverUrl: normalizedBook.customCoverUrl || ''
                            })
                        );
                    }
                    setLoadingPdf(false);
                })
                .catch(() => {
                    if (cancelled) return;
                    if (preRendered.length === 0) {
                        setCorsFallbackNotice(true);
                        setPages(
                            buildFallbackBookPages({
                                title: normalizedBook.title,
                                description: normalizedBook.description,
                                fileName: normalizedBook.fileName,
                                author: normalizedBook.authorName || 'Docente',
                                themeId: normalizedBook.theme,
                                customCoverUrl: normalizedBook.customCoverUrl || ''
                            })
                        );
                    }
                    setLoadingPdf(false);
                });
        } else {
            setPages(
                buildFallbackBookPages({
                    title: normalizedBook.title,
                    description: normalizedBook.description,
                    fileName: normalizedBook.fileName,
                    author: normalizedBook.authorName || 'Docente',
                    themeId: normalizedBook.theme,
                    customCoverUrl: normalizedBook.customCoverUrl || ''
                })
            );
            setLoadingPdf(false);
        }

        return () => {
            cancelled = true;
        };
    }, [
        normalizedBook.id,
        normalizedBook.pdfUrl,
        bookPagesSignature,
        normalizedBook.pageCount,
        normalizedBook.title,
        normalizedBook.description,
        normalizedBook.fileName,
        normalizedBook.authorName,
        normalizedBook.theme,
        normalizedBook.customCoverUrl
    ]);

    // Responsive resize listener for double/single page mode
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 920) {
                setIsDoublePage(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Reset stage scroll to top-left when turning spreads or resetting zoom to 100%
    useEffect(() => {
        const scroller = stageScrollRef.current;
        if (!scroller) return;
        scroller.scrollTop = 0;
        if (zoom <= 1) {
            scroller.scrollLeft = 0;
        }
    }, [currentSpreadIndex, zoom]);

    const effectivePages = useMemo(() => {
        const fallbackPages = buildFallbackBookPages({
            title: normalizedBook.title,
            description: normalizedBook.description,
            fileName: normalizedBook.fileName,
            author: normalizedBook.authorName || 'Docente',
            themeId: normalizedBook.theme,
            customCoverUrl: normalizedBook.customCoverUrl || ''
        });
        const basePages = pages.length > 0 ? pages : fallbackPages;
        const expectedCount = Math.max(
            basePages.length,
            Number(normalizedBook.pageCount) || 0,
            Array.isArray(normalizedBook.bookOutline) ? normalizedBook.bookOutline.length : 0,
            Array.isArray(normalizedBook.pageTexts) ? normalizedBook.pageTexts.length : 0
        );
        if (expectedCount > basePages.length) {
            const outlinePages = Array.isArray(normalizedBook.bookOutline) && normalizedBook.bookOutline.length > 0
                ? buildBookPagesFromOutline(normalizedBook.bookOutline, {
                    themeId: normalizedBook.theme,
                    author: normalizedBook.authorName || 'Docente',
                    customCoverUrl: normalizedBook.customCoverUrl || ''
                })
                : [];
            return Array.from({ length: expectedCount }, (_, idx) => {
                if (basePages[idx]) return basePages[idx];
                if (outlinePages[idx]) return outlinePages[idx];
                const rawSnippet = String(normalizedBook.pageTexts?.[idx] || '').trim();
                return buildIllustratedBookPageSvg({
                    variant: idx === 0 ? 'cover' : idx === expectedCount - 1 && expectedCount >= 3 ? 'back-cover' : 'content',
                    chapter: idx === 0 ? 'LIBRO' : `PÁGINA ${idx + 1}`,
                    title: idx === 0 ? normalizedBook.title : `${normalizedBook.title} — Página ${idx + 1}`,
                    subtitle: '',
                    body: rawSnippet
                        ? [rawSnippet]
                        : [`Vista de la página ${idx + 1} de "${normalizedBook.title}".`],
                    pageNumber: idx + 1,
                    totalPages: expectedCount,
                    themeId: normalizedBook.theme
                });
            });
        }
        if (basePages.length === 1 && fallbackPages.length > 1) {
            return [basePages[0], ...fallbackPages.slice(1)];
        }
        return basePages;
    }, [pages, normalizedBook]);

    const spreads = useMemo(
        () => buildBookSpreads(effectivePages, isDoublePage),
        [effectivePages, isDoublePage]
    );

    // Jump to initialPage (or user's saved last read page) ONLY once when spreads initialize,
    // and preserve current page when toggling between double-page and single-page modes.
    useEffect(() => {
        if (spreads.length === 0) return;
        if (!hasInitializedPageRef.current) {
            hasInitializedPageRef.current = true;
            prevDoublePageRef.current = isDoublePage;
            let targetPage = Number.isFinite(Number(initialPage)) && Number(initialPage) > 0
                ? Number(initialPage)
                : (Number(book?.initialPage) || 0);
            if (
                (!targetPage || targetPage === 0) &&
                book?.initialPage === undefined &&
                !book?.isPreview
            ) {
                const saved = loadUserBookBookmarks(normalizedBook.id, readerUserKey);
                if (saved.lastPage > 0 && saved.lastPage < effectivePages.length) {
                    targetPage = saved.lastPage;
                }
            }
            activePrimaryPageRef.current = targetPage;
            const idx = getSpreadIndexForPage(targetPage, isDoublePage, effectivePages.length);
            setCurrentSpreadIndex(Math.min(idx, Math.max(0, spreads.length - 1)));
            return;
        }

        if (prevDoublePageRef.current !== isDoublePage) {
            prevDoublePageRef.current = isDoublePage;
            const idx = getSpreadIndexForPage(activePrimaryPageRef.current, isDoublePage, effectivePages.length);
            setCurrentSpreadIndex(Math.min(idx, Math.max(0, spreads.length - 1)));
            return;
        }

        setCurrentSpreadIndex((prev) => Math.min(prev, Math.max(0, spreads.length - 1)));
    }, [initialPage, isDoublePage, effectivePages.length, spreads.length, normalizedBook.id, readerUserKey, book?.initialPage, book?.isPreview]);

    // Clean up animation timer on unmount
    useEffect(() => {
        return () => {
            if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
        };
    }, []);

    const currentSpread = spreads[currentSpreadIndex] || spreads[0] || {
        index: 0,
        leftPage: null,
        rightPage: 0,
        pages: [0]
    };

    const primaryPageIndex = useMemo(() => {
        if (currentSpread.rightPage !== null && currentSpread.rightPage !== undefined) {
            return currentSpread.rightPage;
        }
        if (currentSpread.leftPage !== null && currentSpread.leftPage !== undefined) {
            return currentSpread.leftPage;
        }
        return 0;
    }, [currentSpread]);

    // Persist last read page per user as they browse the book
    useEffect(() => {
        activePrimaryPageRef.current = primaryPageIndex;
        if (!normalizedBook?.id || book?.isPreview || effectivePages.length === 0) return;
        saveUserBookLastPage(normalizedBook.id, readerUserKey, primaryPageIndex, {
            totalPages: effectivePages.length
        });
    }, [normalizedBook?.id, book?.isPreview, readerUserKey, primaryPageIndex, effectivePages.length]);

    const activeBookmarkTargetPageIndex = useMemo(() => {
        const spreadPages = Array.isArray(currentSpread.pages) ? currentSpread.pages : [];
        const markedOnSpread = spreadPages.find((pIdx) => bookmarks.includes(pIdx));
        return markedOnSpread !== undefined ? markedOnSpread : primaryPageIndex;
    }, [currentSpread.pages, bookmarks, primaryPageIndex]);

    const handleToggleBookmark = useCallback(
        (targetPageIdx = activeBookmarkTargetPageIndex, e = null) => {
            if (e && typeof e.stopPropagation === 'function') {
                e.stopPropagation();
            }
            const res = toggleUserBookBookmark(normalizedBook.id, readerUserKey, targetPageIdx, {
                totalPages: effectivePages.length
            });
            setBookmarks(res.bookmarks || []);
        },
        [normalizedBook.id, readerUserKey, activeBookmarkTargetPageIndex, effectivePages.length]
    );

    const isCurrentSpreadBookmarked = useMemo(
        () => (currentSpread.pages || []).some((pIdx) => bookmarks.includes(pIdx)),
        [currentSpread.pages, bookmarks]
    );

    const canGoPrev = currentSpreadIndex > 0 && !flipAnim;
    const canGoNext = currentSpreadIndex < spreads.length - 1 && !flipAnim;

    const triggerAnimatedFlip = useCallback(
        (direction, explicitTargetSpread = null, initialAngleDeg = 0) => {
            if (flipAnim) return;
            const targetSpread =
                explicitTargetSpread !== null
                    ? explicitTargetSpread
                    : direction === 'next'
                        ? currentSpreadIndex + 1
                        : currentSpreadIndex - 1;

            if (targetSpread < 0 || targetSpread >= spreads.length || targetSpread === currentSpreadIndex) {
                return;
            }

            playPageFlipSound({ muted: soundMuted, direction });
            const startAngle = Number.isFinite(initialAngleDeg) ? initialAngleDeg : 0;
            const remainingRatio = Math.max(0.25, 1 - Math.min(1, Math.abs(startAngle) / 180));
            const durationMs = Math.max(180, Math.round(520 * remainingRatio));

            setFlipAnim({
                direction,
                targetSpread,
                startAngleDeg: startAngle,
                durationMs,
                phase: 'start'
            });

            // Trigger CSS transition on next animation frame
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setFlipAnim((prev) => (prev ? { ...prev, phase: 'turning' } : null));
                });
            });

            if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
            flipTimerRef.current = setTimeout(() => {
                setCurrentSpreadIndex(targetSpread);
                setFlipAnim(null);
            }, durationMs + 25);
        },
        [flipAnim, currentSpreadIndex, spreads.length, soundMuted]
    );

    const handleNext = useCallback(() => {
        if (canGoNext) triggerAnimatedFlip('next');
    }, [canGoNext, triggerAnimatedFlip]);

    const handlePrev = useCallback(() => {
        if (canGoPrev) triggerAnimatedFlip('prev');
    }, [canGoPrev, triggerAnimatedFlip]);

    const jumpToPage = useCallback(
        (pageIdx) => {
            const targetSpread = getSpreadIndexForPage(pageIdx, isDoublePage, effectivePages.length);
            if (targetSpread === currentSpreadIndex) return;
            if (Math.abs(targetSpread - currentSpreadIndex) === 1) {
                triggerAnimatedFlip(targetSpread > currentSpreadIndex ? 'next' : 'prev', targetSpread);
            } else {
                playPageFlipSound({
                    muted: soundMuted,
                    direction: targetSpread > currentSpreadIndex ? 'next' : 'prev'
                });
                setCurrentSpreadIndex(targetSpread);
            }
        },
        [isDoublePage, effectivePages.length, currentSpreadIndex, triggerAnimatedFlip, soundMuted]
    );

    // Keyboard navigation
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose?.();
            } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
                e.preventDefault();
                handleNext();
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                e.preventDefault();
                handlePrev();
            } else if (e.key === 'Home') {
                e.preventDefault();
                jumpToPage(0);
            } else if (e.key === 'End') {
                e.preventDefault();
                jumpToPage(effectivePages.length - 1);
            } else if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                setZoom((z) => clampBookZoom(z + 0.15));
            } else if (e.key === '-') {
                e.preventDefault();
                setZoom((z) => clampBookZoom(z - 0.15));
            } else if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                setSoundMuted((m) => !m);
            } else if (e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                readingAmbientPlayer.toggleMute();
            } else if (e.key === 'b' || e.key === 'B') {
                e.preventDefault();
                handleToggleBookmark(activeBookmarkTargetPageIndex);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose, handleNext, handlePrev, jumpToPage, effectivePages.length, handleToggleBookmark, activeBookmarkTargetPageIndex]);

    // Sync fullscreen state with browser fullscreenchange event
    useEffect(() => {
        const onFsChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    // Fullscreen toggle
    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement && modalRootRef.current) {
                await modalRootRef.current.requestFullscreen();
                setIsFullscreen(true);
            } else if (document.fullscreenElement) {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch {
            setIsFullscreen((v) => !v);
        }
    };

    // Interactive Pointer Dragging on the 3D Book Stage (Pan when zoomed > 1, 3D Page Curl when zoom <= 1)
    const handlePointerDown = (e, forcedDirection = null) => {
        if (e.button !== undefined && e.button !== 0) return;
        if (flipAnim) return;
        if (e.target && typeof e.target.closest === 'function' && e.target.closest('[data-bookmark-ribbon]')) {
            return;
        }
        const stage = bookStageRef.current;
        if (!stage) return;

        // When zoomed in (zoom > 1), allow free 2D drag-panning across the entire scroll area (including top/bottom/left/right)
        if (zoom > 1) {
            if (e.pointerType === 'touch') return; // Let native touch pan/scroll work smoothly
            const scroller = stageScrollRef.current;
            if (!scroller) return;
            try {
                stage.setPointerCapture?.(e.pointerId);
            } catch {
                // Ignore capture error
            }
            setPanState({
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                startScrollLeft: scroller.scrollLeft,
                startScrollTop: scroller.scrollTop
            });
            return;
        }

        const rect = stage.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const isLastSpreadBackCover =
            isDoublePage &&
            currentSpreadIndex > 0 &&
            currentSpreadIndex === spreads.length - 1 &&
            currentSpread.rightPage === null;

        let direction =
            forcedDirection ||
            (currentSpreadIndex === 0
                ? 'next'
                : isLastSpreadBackCover
                    ? 'prev'
                    : relX >= rect.width * 0.5
                        ? 'next'
                        : 'prev');

        if (direction === 'next' && currentSpreadIndex >= spreads.length - 1 && !forcedDirection && currentSpreadIndex > 0) {
            direction = 'prev';
        } else if (direction === 'prev' && currentSpreadIndex <= 0 && !forcedDirection && currentSpreadIndex < spreads.length - 1) {
            direction = 'next';
        }

        if (direction === 'next' && currentSpreadIndex >= spreads.length - 1) return;
        if (direction === 'prev' && currentSpreadIndex <= 0) return;

        const leafWidth = isDoublePage
            ? Math.max(180, rect.width * 0.5)
            : Math.max(180, rect.width);

        const initialCurl = calculateDragCurlState({
            startX: e.clientX,
            startY: e.clientY,
            currentX: e.clientX,
            currentY: e.clientY,
            containerWidth: leafWidth,
            containerHeight: rect.height,
            direction
        });

        setDragState({
            pointerId: e.pointerId,
            captured: false,
            forcedDirection: forcedDirection || null,
            startTime: Date.now(),
            startX: e.clientX,
            startY: e.clientY,
            currentX: e.clientX,
            currentY: e.clientY,
            containerWidth: leafWidth,
            containerHeight: rect.height,
            ...initialCurl
        });
    };

    const handlePointerMove = (e) => {
        if (panState) {
            const scroller = stageScrollRef.current;
            if (scroller) {
                const dx = e.clientX - panState.startX;
                const dy = e.clientY - panState.startY;
                scroller.scrollLeft = panState.startScrollLeft - dx;
                scroller.scrollTop = panState.startScrollTop - dy;
            }
            return;
        }

        if (!dragState) return;
        const dx = e.clientX - dragState.startX;
        let effectiveDir = dragState.direction;
        if (!dragState.forcedDirection) {
            if (dx <= -14 && currentSpreadIndex < spreads.length - 1) {
                effectiveDir = 'next';
            } else if (dx >= 14 && currentSpreadIndex > 0) {
                effectiveDir = 'prev';
            }
        }
        const movedDist = Math.hypot(dx, e.clientY - dragState.startY);
        if (movedDist > 6 && !dragState.captured && bookStageRef.current) {
            try {
                bookStageRef.current.setPointerCapture?.(dragState.pointerId);
            } catch {
                // Ignore pointer capture errors
            }
        }

        const curl = calculateDragCurlState({
            startX: dragState.startX,
            startY: dragState.startY,
            currentX: e.clientX,
            currentY: e.clientY,
            containerWidth: dragState.containerWidth,
            containerHeight: dragState.containerHeight,
            direction: effectiveDir
        });
        setDragState((prev) =>
            prev
                ? {
                    ...prev,
                    captured: prev.captured || movedDist > 6,
                    currentX: e.clientX,
                    currentY: e.clientY,
                    ...curl
                }
                : null
        );
    };

    const handlePointerUp = (e) => {
        if (panState) {
            const stage = bookStageRef.current;
            try {
                stage?.releasePointerCapture?.(panState.pointerId);
            } catch {
                // Ignore release errors
            }
            setPanState(null);
            return;
        }

        if (!dragState) return;
        const stage = bookStageRef.current;
        if (dragState.captured) {
            try {
                stage?.releasePointerCapture?.(dragState.pointerId);
            } catch {
                // Ignore release errors
            }
        }

        if (e?.type === 'pointercancel') {
            setDragState(null);
            return;
        }

        const hasValidEventCoords =
            typeof e?.clientX === 'number' &&
            typeof e?.clientY === 'number' &&
            (e.clientX !== 0 || e.clientY !== 0);
        const endX = hasValidEventCoords ? e.clientX : dragState.currentX;
        const endY = hasValidEventCoords ? e.clientY : dragState.currentY;
        const dx = endX - dragState.startX;
        const dy = endY - dragState.startY;
        const totalMove = Math.hypot(dx, dy);
        let dir = dragState.direction;
        if (!dragState.forcedDirection) {
            if (dx <= -14 && currentSpreadIndex < spreads.length - 1) {
                dir = 'next';
            } else if (dx >= 14 && currentSpreadIndex > 0) {
                dir = 'prev';
            }
        }
        const rawDistance = dir === 'next' ? -dx : dx;
        const isTap = totalMove < 14 && rawDistance >= -6;
        const isCoverSwipe = currentSpreadIndex === 0 && totalMove >= 14 && rawDistance >= -12;
        const isIntentionalDrag = dragState.shouldComplete || rawDistance >= 14 || isCoverSwipe;
        const shouldTurn = isTap || isIntentionalDrag;
        const releaseAngle = !isTap && isIntentionalDrag && Math.abs(dragState.angleDeg) > 4 ? dragState.angleDeg : 0;

        setDragState(null);
        if (shouldTurn) {
            triggerAnimatedFlip(dir, null, releaseAngle);
        }
    };

    // Determine active turning state (either from drag or button/keyboard animation)
    const activeTurn = useMemo(() => {
        if (dragState && dragState.progress > 0.01) {
            const targetIdx =
                dragState.direction === 'next'
                    ? Math.min(spreads.length - 1, currentSpreadIndex + 1)
                    : Math.max(0, currentSpreadIndex - 1);
            return {
                mode: 'drag',
                direction: dragState.direction,
                targetSpread: spreads[targetIdx] || currentSpread,
                angleDeg: dragState.angleDeg,
                durationMs: 0,
                progress: dragState.progress,
                shadowOpacity: dragState.shadowOpacity,
                highlightOpacity: dragState.highlightOpacity,
                cornerTiltDeg: dragState.cornerTiltDeg
            };
        }
        if (flipAnim) {
            const targetSpread = spreads[flipAnim.targetSpread] || currentSpread;
            const isTurning = flipAnim.phase === 'turning';
            const startAngle = Number.isFinite(flipAnim.startAngleDeg) ? flipAnim.startAngleDeg : 0;
            const angleDeg =
                flipAnim.direction === 'next'
                    ? isTurning
                        ? -180
                        : startAngle
                    : isTurning
                        ? 180
                        : startAngle;
            return {
                mode: 'anim',
                direction: flipAnim.direction,
                targetSpread,
                angleDeg,
                durationMs: flipAnim.durationMs || 520,
                progress: isTurning ? 1 : Math.min(1, Math.abs(startAngle) / 180),
                shadowOpacity: isTurning ? 0.35 : 0.18,
                highlightOpacity: 0.22,
                cornerTiltDeg: 0
            };
        }
        return null;
    }, [dragState, flipAnim, spreads, currentSpreadIndex, currentSpread]);

    // Calculate visible static pages beneath the turning 3D leaf
    const baseLeftPageIdx =
        activeTurn && activeTurn.direction === 'prev'
            ? activeTurn.targetSpread.leftPage
            : currentSpread.leftPage;

    const baseRightPageIdx =
        activeTurn && activeTurn.direction === 'next'
            ? activeTurn.targetSpread.rightPage
            : currentSpread.rightPage;

    // Paper stack thickness based on progress through the book
    const progressRatio = spreads.length > 1 ? currentSpreadIndex / (spreads.length - 1) : 0;
    const leftStackPx = Math.round(4 + progressRatio * 14);
    const rightStackPx = Math.round(4 + (1 - progressRatio) * 14);

    const renderPageFace = (pageIdx, side = 'right', isBackFace = false) => {
        if (pageIdx === null || pageIdx === undefined || !effectivePages[pageIdx]) {
            return (
                <div
                    className="w-full h-full flex flex-col items-center justify-center select-none"
                    style={{
                        background: `linear-gradient(135deg, ${theme.coverBg} 0%, ${theme.spineColor} 100%)`
                    }}
                >
                    <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white/70 mb-3">
                        <BookOpen size={28} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-white/60">
                        {normalizedBook.title}
                    </span>
                </div>
            );
        }

        const pageSrc = effectivePages[pageIdx];
        const isPageBookmarked = bookmarks.includes(pageIdx);
        const extImgOverlay = extractSvgExternalImageOverlay(pageSrc);

        return (
            <div
                className="relative w-full h-full overflow-hidden select-none"
                style={{ backgroundColor: theme.pageTint || '#fffdf9' }}
            >
                <img loading="lazy" decoding="async"
                    src={pageSrc}
                    alt={`${normalizedBook.title} - Página ${pageIdx + 1}`}
                    draggable={false}
                    onError={(e) => {
                        const target = e.currentTarget;
                        if (target.dataset.fallbackApplied === '1') return;
                        target.dataset.fallbackApplied = '1';
                        const rawSnippet = String(normalizedBook.pageTexts?.[pageIdx] || '').trim();
                        target.src = buildIllustratedBookPageSvg({
                            variant: pageIdx === 0 ? 'cover' : 'content',
                            chapter: `PÁGINA ${pageIdx + 1}`,
                            title:
                                pageIdx === 0
                                    ? normalizedBook.title
                                    : `${normalizedBook.title} — Página ${pageIdx + 1}`,
                            subtitle: '',
                            body: rawSnippet
                                ? [rawSnippet]
                                : [`Vista de la página ${pageIdx + 1} de "${normalizedBook.title}".`],
                            pageNumber: pageIdx + 1,
                            totalPages: effectivePages.length,
                            themeId: normalizedBook.theme
                        });
                    }}
                    className="w-full h-full object-contain pointer-events-none select-none"
                />
                {extImgOverlay && (
                    <img loading="lazy" decoding="async"
                        src={extImgOverlay.href}
                        alt=""
                        draggable={false}
                        className="pointer-events-none select-none"
                        style={{
                            position: 'absolute',
                            left: `${extImgOverlay.leftPct}%`,
                            top: `${extImgOverlay.topPct}%`,
                            width: `${extImgOverlay.widthPct}%`,
                            height: `${extImgOverlay.heightPct}%`,
                            objectFit: extImgOverlay.objectFit || 'contain',
                            borderRadius: '6px'
                        }}
                    />
                )}
                {/* Realistic inner spine shading */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            side === 'left'
                                ? 'linear-gradient(90deg, rgba(15,23,42,0.04) 0%, rgba(15,23,42,0) 14%, rgba(15,23,42,0) 84%, rgba(15,23,42,0.22) 100%)'
                                : 'linear-gradient(90deg, rgba(15,23,42,0.22) 0%, rgba(15,23,42,0) 16%, rgba(15,23,42,0) 86%, rgba(15,23,42,0.04) 100%)'
                    }}
                />
                {/* Interactive Page Bookmark Ribbon (Cinta separadora) */}
                {!isBackFace && (
                    <button
                        type="button"
                        data-bookmark-ribbon="true"
                        onClick={(e) => handleToggleBookmark(pageIdx, e)}
                        title={
                            isPageBookmarked
                                ? `Quitar marcador de la página ${pageIdx + 1}`
                                : `Marcar página ${pageIdx + 1}`
                        }
                        className={`absolute top-0 ${
                            side === 'left' ? 'left-3 sm:left-5' : 'right-3 sm:right-5'
                        } z-20 flex flex-col items-center transition-all duration-200 cursor-pointer ${
                            isPageBookmarked
                                ? 'w-7 sm:w-8 h-12 sm:h-14 opacity-100 hover:h-15'
                                : 'w-6 sm:w-7 h-7 sm:h-8 opacity-35 hover:opacity-90 hover:h-10'
                        }`}
                        style={{
                            background: isPageBookmarked
                                ? 'linear-gradient(180deg, #e11d48 0%, #be123c 100%)'
                                : 'linear-gradient(180deg, rgba(15,23,42,0.45) 0%, rgba(15,23,42,0.25) 100%)',
                            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)',
                            boxShadow: isPageBookmarked ? '0 4px 10px rgba(190,18,60,0.45)' : 'none'
                        }}
                    >
                        <Bookmark
                            size={12}
                            className={`mt-1.5 ${isPageBookmarked ? 'text-white fill-white' : 'text-white/90'}`}
                        />
                    </button>
                )}
                {/* Page corner curl hint when idle */}
                {!isBackFace && !activeTurn && (
                    <div
                        className={`absolute bottom-0 ${
                            side === 'right' ? 'right-0 rounded-tl-2xl' : 'left-0 rounded-tr-2xl'
                        } w-9 h-9 pointer-events-none transition-all duration-300 group-hover/book:w-12 group-hover/book:h-12`}
                        style={{
                            background:
                                side === 'right'
                                    ? 'linear-gradient(315deg, rgba(15,23,42,0.22) 0%, rgba(255,255,255,0.92) 48%, rgba(226,232,240,0.45) 54%, transparent 60%)'
                                    : 'linear-gradient(45deg, rgba(15,23,42,0.22) 0%, rgba(255,255,255,0.92) 48%, rgba(226,232,240,0.45) 54%, transparent 60%)',
                            boxShadow:
                                side === 'right'
                                    ? '-3px -3px 8px rgba(15,23,42,0.12)'
                                    : '3px -3px 8px rgba(15,23,42,0.12)'
                        }}
                    />
                )}
            </div>
        );
    };

    const modalContent = (
        <div
            ref={modalRootRef}
            className="fixed inset-0 z-[999999] bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between select-none animate-fade-in overflow-hidden"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            {/* Ambient 3D Studio Lighting Background */}
            <div
                className="absolute inset-0 pointer-events-none opacity-35"
                style={{
                    background: `radial-gradient(circle at 50% 45%, ${theme.coverSecondary || '#3730a3'} 0%, rgba(15,23,42,0) 68%)`
                }}
            />

            {/* Top Navigation & Controls Bar (Compact & Touch-Friendly on Mobile) */}
            <div className="relative z-20 shrink-0 flex flex-wrap items-center justify-between gap-2 sm:gap-3 px-2.5 sm:px-5 md:px-6 py-2 sm:py-3 bg-slate-900/85 border-b border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0 border border-white/15"
                        style={{ backgroundColor: theme.badgeBg }}
                    >
                        <BookOpen size={18} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-white font-bold text-xs sm:text-sm md:text-base truncate max-w-[145px] sm:max-w-[300px] md:max-w-[440px]">
                                {normalizedBook.title}
                            </h2>
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                            Pág. {formatSpreadPageLabel(currentSpread, effectivePages.length)}
                            {bookmarks.length > 0 ? ` • ${bookmarks.length} marc.` : ''}
                        </p>
                    </div>
                </div>

                {/* Action Controls */}
                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end">
                    {/* Single / Double Page View Toggle */}
                    <button
                        type="button"
                        onClick={() => setIsDoublePage((v) => !v)}
                        className="hidden sm:flex px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold items-center gap-1.5 transition-all active:scale-95"
                        title={isDoublePage ? 'Cambiar a vista de 1 página' : 'Cambiar a vista de libro abierto (2 páginas)'}
                    >
                        {isDoublePage ? <BookOpen size={15} /> : <Book size={15} />}
                        <span className="hidden lg:inline">{isDoublePage ? '2 Páginas' : '1 Página'}</span>
                    </button>

                    {/* Zoom Controls (Visible on Mobile AND Desktop) */}
                    <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/10">
                        <button
                            type="button"
                            onClick={() => setZoom((z) => clampBookZoom(z - 0.15))}
                            className="p-1 sm:p-1.5 text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Alejar zoom"
                        >
                            <Minus size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setZoom(1)}
                            className="px-1.5 sm:px-2 text-[10px] sm:text-[11px] font-bold text-white hover:text-indigo-300 transition-colors"
                            title="Restablecer zoom (100%)"
                        >
                            {Math.round(zoom * 100)}%
                        </button>
                        <button
                            type="button"
                            onClick={() => setZoom((z) => clampBookZoom(z + 0.15))}
                            className="p-1 sm:p-1.5 text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Acercar zoom"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    {/* Bookmark Current Page + Bookmarks Drawer Toggle */}
                    <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/10">
                        <button
                            type="button"
                            onClick={() => handleToggleBookmark(activeBookmarkTargetPageIndex)}
                            className={`px-2 py-1 sm:py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all active:scale-95 ${
                                isCurrentSpreadBookmarked
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                            }`}
                            title={
                                isCurrentSpreadBookmarked
                                    ? `Quitar marcador de página ${activeBookmarkTargetPageIndex + 1} (B)`
                                    : `Guardar marcador en página ${activeBookmarkTargetPageIndex + 1} (B)`
                            }
                        >
                            <Bookmark size={14} className={isCurrentSpreadBookmarked ? 'fill-white' : ''} />
                            <span className="hidden md:inline">
                                {isCurrentSpreadBookmarked ? 'Marcada' : 'Marcar'}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowBookmarksPanel((v) => !v);
                                setShowThumbnails(false);
                            }}
                            className={`px-1.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-extrabold transition-colors ${
                                showBookmarksPanel
                                    ? 'bg-amber-500 text-slate-950'
                                    : 'text-amber-300 hover:bg-white/10'
                            }`}
                            title="Ver mis marcadores guardados"
                        >
                            {bookmarks.length}
                        </button>
                    </div>

                    {/* Sound Toggle (Hojas) */}
                    <button
                        type="button"
                        onClick={() => setSoundMuted((m) => !m)}
                        className={`p-1.5 sm:p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                            soundMuted
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-white/10 hover:bg-white/20 text-emerald-300'
                        }`}
                        title={soundMuted ? 'Activar sonido de hojas (M)' : 'Silenciar sonido de hojas (M)'}
                    >
                        {soundMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>

                    {/* Ambient Reading Audio Controller & Popover */}
                    <div className="relative" ref={ambientMenuRef}>
                        <button
                            type="button"
                            onClick={() => setShowAmbientMenu((v) => !v)}
                            className={`p-1.5 sm:px-2.5 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                                ambientState.isPlaying && !ambientState.isMuted && ambientState.trackId !== 'none'
                                    ? 'bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 border border-emerald-400/40'
                                    : 'bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10'
                            }`}
                            title={`Música de lectura: ${ambientState.title} (A)`}
                        >
                            {ambientState.isPlaying && !ambientState.isMuted && ambientState.trackId !== 'none' ? (
                                <span className="flex items-end gap-0.5 h-3.5 w-3.5 shrink-0 justify-center">
                                    <span className="w-0.5 bg-white rounded-full animate-bounce" style={{ height: '70%', animationDuration: '0.8s' }} />
                                    <span className="w-0.5 bg-white rounded-full animate-bounce" style={{ height: '100%', animationDuration: '0.6s' }} />
                                    <span className="w-0.5 bg-white rounded-full animate-bounce" style={{ height: '45%', animationDuration: '0.9s' }} />
                                </span>
                            ) : (
                                <Music size={15} className="shrink-0 text-slate-400" />
                            )}
                            <span className="hidden md:inline max-w-[100px] truncate text-[11px] font-bold">
                                {ambientState.isMuted || ambientState.trackId === 'none' ? 'Música' : ambientState.title}
                            </span>
                        </button>

                        {/* Ambient Audio Popover */}
                        {showAmbientMenu && (
                            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-slate-900/95 border border-white/15 p-4 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 text-white">
                                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                                    <div className="flex items-center gap-2">
                                        <Music size={16} className="text-emerald-400" />
                                        <span className="text-xs font-bold tracking-wide">Música de lectura</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => readingAmbientPlayer.toggleMute()}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                                            ambientState.isMuted || ambientState.trackId === 'none'
                                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        }`}
                                    >
                                        {ambientState.isMuted || ambientState.trackId === 'none' ? 'Silenciado' : 'Sonando'}
                                    </button>
                                </div>

                                {/* Presets List */}
                                <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar mb-3">
                                    {READING_AUDIO_PRESETS.map((preset) => {
                                        const isSelected = ambientState.trackId === preset.id;
                                        if (preset.id === 'custom' && !normalizedBook.ambientAudioUrl && !normalizedBook.ambientAudio?.customUrl) {
                                            return null;
                                        }
                                        return (
                                            <button
                                                key={preset.id}
                                                type="button"
                                                onClick={() => {
                                                    readingAmbientPlayer.changeTrack(
                                                        preset.id,
                                                        preset.id === 'custom' ? (normalizedBook.ambientAudioUrl || normalizedBook.ambientAudio?.customUrl || '') : '',
                                                        preset.name
                                                    );
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-emerald-600/30 border border-emerald-400/50 text-white font-bold'
                                                        : 'hover:bg-white/5 text-slate-300 border border-transparent'
                                                }`}
                                            >
                                                <div>
                                                    <div className="text-xs font-semibold">{preset.name}</div>
                                                    <div className="text-[10px] text-slate-400 truncate max-w-[210px]">{preset.description}</div>
                                                </div>
                                                {isSelected && (
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Volume Slider */}
                                <div className="pt-2 border-t border-white/10">
                                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-medium">
                                        <span>Volumen ({Math.round((ambientState.volume / 0.65) * 100)}%)</span>
                                        <span className="text-[10px] text-slate-500">Suave</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Volume2 size={14} className="text-slate-400 shrink-0" />
                                        <input
                                            type="range"
                                            min="0.04"
                                            max="0.65"
                                            step="0.02"
                                            value={ambientState.volume}
                                            onChange={(e) => readingAmbientPlayer.setVolume(parseFloat(e.target.value))}
                                            className="w-full accent-emerald-500 h-1.5 bg-white/20 rounded-lg cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Thumbnails Drawer Button */}
                    <button
                        type="button"
                        onClick={() => {
                            setShowThumbnails((s) => !s);
                            setShowBookmarksPanel(false);
                        }}
                        className={`p-1.5 sm:p-2 rounded-xl transition-all active:scale-95 ${
                            showThumbnails
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                        title="Ver miniaturas de páginas"
                    >
                        <Grid size={16} />
                    </button>

                    {/* Fullscreen Toggle */}
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="hidden sm:flex p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
                        title="Pantalla completa"
                    >
                        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>

                    {/* Teacher Edit Button */}
                    {isTeacher && typeof onEditBook === 'function' && (
                        <button
                            type="button"
                            onClick={() => onEditBook(normalizedBook)}
                            className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                            title="Editar"
                        >
                            <Edit3 size={14} />
                            <span className="hidden lg:inline">Editar</span>
                        </button>
                    )}

                    {/* Download Original PDF Button */}
                    {normalizedBook.pdfUrl && (
                        <button
                            type="button"
                            onClick={(e) =>
                                handleForceDownload(
                                    normalizedBook.pdfUrl,
                                    normalizedBook.fileName || `${normalizedBook.title}.pdf`,
                                    e
                                )
                            }
                            className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                            title="Descargar PDF"
                        >
                            <Download size={14} />
                            <span className="hidden md:inline">PDF</span>
                        </button>
                    )}

                    {/* Close Modal Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white transition-all active:scale-95"
                        title="Cerrar (Esc)"
                    >
                        <X size={17} />
                    </button>
                </div>
            </div>

            {/* Optional CORS Notice Banner */}
            {corsFallbackNotice && normalizedBook.pdfUrl && (
                <div className="relative z-20 shrink-0 mx-auto mt-1.5 px-4 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs flex items-center gap-2">
                    <FileText size={14} />
                    <span>Vista previa rápida.</span>
                    <button
                        type="button"
                        onClick={(e) =>
                            handleForceDownload(
                                normalizedBook.pdfUrl,
                                normalizedBook.fileName || `${normalizedBook.title}.pdf`,
                                e
                            )
                        }
                        className="underline font-bold hover:text-white"
                    >
                        Abrir PDF
                    </button>
                </div>
            )}

            {/* Main Interactive Book Stage (Full-range scrollable in all directions when zoomed > 100%) */}
            <div
                ref={stageScrollRef}
                onWheel={(e) => {
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        const delta = e.deltaY < 0 ? 0.12 : -0.12;
                        setZoom((z) => clampBookZoom(z + delta));
                    }
                }}
                className="relative z-10 flex-1 min-h-0 min-w-0 flex overflow-auto custom-scrollbar"
                style={{
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                {/* Side Navigation Floating Buttons (Hidden on mobile or when zoomed in so they never block page text) */}
                {zoom <= 1.05 && (
                    <>
                        <button
                            type="button"
                            onClick={handlePrev}
                            disabled={!canGoPrev}
                            className={`hidden sm:flex fixed left-3 md:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 md:w-12 md:h-12 rounded-full items-center justify-center transition-all shadow-2xl border ${
                                canGoPrev
                                    ? 'bg-slate-900/85 hover:bg-indigo-600 text-white border-white/20 hover:scale-105 active:scale-95 cursor-pointer'
                                    : 'bg-slate-900/40 text-slate-600 border-white/5 cursor-not-allowed opacity-40'
                            }`}
                            title="Página anterior (Flecha izquierda)"
                        >
                            <ChevronLeft size={22} />
                        </button>

                        <button
                            type="button"
                            onClick={handleNext}
                            disabled={!canGoNext}
                            className={`hidden sm:flex fixed right-3 md:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 md:w-12 md:h-12 rounded-full items-center justify-center transition-all shadow-2xl border ${
                                canGoNext
                                    ? 'bg-slate-900/85 hover:bg-indigo-600 text-white border-white/20 hover:scale-105 active:scale-95 cursor-pointer'
                                    : 'bg-slate-900/40 text-slate-600 border-white/5 cursor-not-allowed opacity-40'
                            }`}
                            title="Página siguiente (Flecha derecha)"
                        >
                            <ChevronRight size={22} />
                        </button>
                    </>
                )}

                {loadingPdf ? (
                    <div className="m-auto flex flex-col items-center justify-center bg-slate-900/90 border border-white/15 rounded-3xl p-8 md:p-12 text-center max-w-md shadow-2xl">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 mb-4">
                            <Loader2 size={32} className="animate-spin" />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-1">
                            Cargando libro...
                        </h3>
                        <p className="text-slate-400 text-xs mb-5">
                            {renderProgress.totalPages > 0
                                ? `Página ${renderProgress.currentPage} de ${renderProgress.totalPages}`
                                : ''}
                        </p>
                        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                                style={{ width: `${Math.max(10, renderProgress.percent || 15)}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    /* Safe m-auto shrink-0 wrapper with padding on all 4 edges: centers when smaller than viewport, starts at top-left (0,0) when zoomed > 1 so top/bottom/left/right are NEVER clipped */
                    <div
                        className="relative m-auto shrink-0 flex items-center justify-center p-2.5 sm:p-6 md:p-10"
                        style={{
                            perspective: '2400px',
                            transformOrigin: 'top left'
                        }}
                    >
                        {/* Hardcover Outer Binding Frame */}
                        <div
                            ref={bookStageRef}
                            onPointerDown={(e) => handlePointerDown(e)}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                            className="group/book relative rounded-xl sm:rounded-2xl p-1.5 sm:p-3.5 shadow-[0_35px_90px_-15px_rgba(0,0,0,0.85)] cursor-grab active:cursor-grabbing select-none"
                            style={{
                                background: `linear-gradient(145deg, ${theme.coverBg} 0%, ${theme.spineColor} 50%, ${theme.coverBg} 100%)`,
                                border: `2px solid ${theme.accentColor}44`,
                                transformStyle: 'preserve-3d',
                                touchAction: zoom > 1 ? 'pan-x pan-y pinch-zoom' : 'manipulation'
                            }}
                        >
                            {/* Left Paper Stack Edge Effect */}
                            {isDoublePage && currentSpreadIndex > 0 && (
                                <div
                                    className="absolute top-3.5 bottom-3.5 rounded-l-md pointer-events-none"
                                    style={{
                                        left: `-${leftStackPx}px`,
                                        width: `${leftStackPx}px`,
                                        background:
                                            'repeating-linear-gradient(90deg, #f8fafc 0px, #e2e8f0 1.5px, #cbd5e1 3px)',
                                        boxShadow: '-4px 6px 14px rgba(0,0,0,0.45)'
                                    }}
                                />
                            )}

                            {/* Right Paper Stack Edge Effect */}
                            <div
                                className="absolute top-3.5 bottom-3.5 rounded-r-md pointer-events-none"
                                style={{
                                    right: `-${rightStackPx}px`,
                                    width: `${rightStackPx}px`,
                                    background:
                                        'repeating-linear-gradient(90deg, #cbd5e1 0px, #f8fafc 1.5px, #e2e8f0 3px)',
                                    boxShadow: '6px 8px 18px rgba(0,0,0,0.55)'
                                }}
                            />

                            {/* Inner Book Spread Container (Layout dimensions scale directly with zoom for full top-to-bottom scrolling) */}
                            {isDoublePage ? (
                                <div
                                    className="relative flex items-stretch overflow-visible rounded-lg transition-[width,height] duration-150"
                                    style={{
                                        width: `calc(min(86vw, 1020px) * ${zoom})`,
                                        height: `calc(min(74vh, 720px) * ${zoom})`,
                                        transformStyle: 'preserve-3d'
                                    }}
                                >
                                    {/* Left Stationary Page */}
                                    <div className="relative w-1/2 h-full rounded-l-lg overflow-hidden bg-slate-900/40 shadow-inner">
                                        {baseLeftPageIdx !== null ? (
                                            renderPageFace(baseLeftPageIdx, 'left', false)
                                        ) : (
                                            <div
                                                className="w-full h-full flex flex-col items-center justify-center p-6 text-center"
                                                style={{
                                                    background: `linear-gradient(135deg, ${theme.coverBg} 0%, ${theme.spineColor} 100%)`
                                                }}
                                            >
                                                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white/75 mb-3">
                                                    <BookOpen size={26} />
                                                </div>
                                                <p className="text-xs font-bold uppercase tracking-widest text-white/80">
                                                    {normalizedBook.title}
                                                </p>
                                            </div>
                                        )}

                                        {/* Cast shadow when a page is flipping onto the left side */}
                                        {activeTurn && (
                                            <div
                                                className="absolute inset-0 pointer-events-none transition-opacity duration-150"
                                                style={{
                                                    background:
                                                        'linear-gradient(90deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.45) 100%)',
                                                    opacity: activeTurn.shadowOpacity
                                                }}
                                            />
                                        )}
                                    </div>

                                    {/* Center Book Spine Crease */}
                                    <div
                                        className="relative z-20 w-[6px] -mx-[3px] pointer-events-none"
                                        style={{
                                            background:
                                                'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(255,255,255,0.22) 50%, rgba(0,0,0,0.45) 100%)'
                                        }}
                                    />

                                    {/* Right Stationary Page */}
                                    <div className="relative w-1/2 h-full rounded-r-lg overflow-hidden bg-slate-900/40 shadow-inner">
                                        {renderPageFace(baseRightPageIdx, 'right', false)}

                                        {/* Cast shadow when a page is flipping away from or onto the right side */}
                                        {activeTurn && (
                                            <div
                                                className="absolute inset-0 pointer-events-none transition-opacity duration-150"
                                                style={{
                                                    background:
                                                        'linear-gradient(270deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.48) 100%)',
                                                    opacity: activeTurn.shadowOpacity
                                                }}
                                            />
                                        )}
                                    </div>

                                    {/* 3D Turning Leaf Overlay (Double-Page Mode) */}
                                    {activeTurn && activeTurn.direction === 'next' && (
                                        <div
                                            className="absolute top-0 right-0 w-1/2 h-full z-30 pointer-events-none"
                                            style={{
                                                transformOrigin: 'left center',
                                                transformStyle: 'preserve-3d',
                                                transition:
                                                    activeTurn.mode === 'anim'
                                                        ? `transform ${activeTurn.durationMs || 520}ms cubic-bezier(0.22, 1, 0.36, 1)`
                                                        : 'none',
                                                transform: `rotateY(${activeTurn.angleDeg}deg) skewY(${
                                                    activeTurn.cornerTiltDeg * 0.25
                                                }deg)`
                                            }}
                                        >
                                            {/* Front of turning right leaf */}
                                            <div
                                                className="absolute inset-0 rounded-r-lg overflow-hidden shadow-2xl"
                                                style={{
                                                    backfaceVisibility: 'hidden',
                                                    WebkitBackfaceVisibility: 'hidden'
                                                }}
                                            >
                                                {renderPageFace(currentSpread.rightPage, 'right', true)}
                                                <div
                                                    className="absolute inset-0"
                                                    style={{
                                                        background: `linear-gradient(90deg, rgba(0,0,0,${activeTurn.shadowOpacity}) 0%, rgba(255,255,255,${activeTurn.highlightOpacity}) 45%, rgba(0,0,0,${activeTurn.shadowOpacity * 0.6}) 100%)`
                                                    }}
                                                />
                                            </div>

                                            {/* Back of turning right leaf (becomes the new left page!) */}
                                            <div
                                                className="absolute inset-0 rounded-l-lg overflow-hidden shadow-2xl"
                                                style={{
                                                    backfaceVisibility: 'hidden',
                                                    WebkitBackfaceVisibility: 'hidden',
                                                    transform: 'rotateY(180deg)'
                                                }}
                                            >
                                                {renderPageFace(activeTurn.targetSpread.leftPage, 'left', true)}
                                                <div
                                                    className="absolute inset-0"
                                                    style={{
                                                        background: `linear-gradient(270deg, rgba(0,0,0,${activeTurn.shadowOpacity}) 0%, rgba(255,255,255,${activeTurn.highlightOpacity}) 50%, rgba(0,0,0,${activeTurn.shadowOpacity * 0.5}) 100%)`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeTurn && activeTurn.direction === 'prev' && (
                                        <div
                                            className="absolute top-0 left-0 w-1/2 h-full z-30 pointer-events-none"
                                            style={{
                                                transformOrigin: 'right center',
                                                transformStyle: 'preserve-3d',
                                                transition:
                                                    activeTurn.mode === 'anim'
                                                        ? `transform ${activeTurn.durationMs || 520}ms cubic-bezier(0.22, 1, 0.36, 1)`
                                                        : 'none',
                                                transform: `rotateY(${activeTurn.angleDeg}deg) skewY(${
                                                    -activeTurn.cornerTiltDeg * 0.25
                                                }deg)`
                                            }}
                                        >
                                            {/* Front of turning left leaf */}
                                            <div
                                                className="absolute inset-0 rounded-l-lg overflow-hidden shadow-2xl"
                                                style={{
                                                    backfaceVisibility: 'hidden',
                                                    WebkitBackfaceVisibility: 'hidden'
                                                }}
                                            >
                                                {renderPageFace(currentSpread.leftPage, 'left', true)}
                                                <div
                                                    className="absolute inset-0"
                                                    style={{
                                                        background: `linear-gradient(270deg, rgba(0,0,0,${activeTurn.shadowOpacity}) 0%, rgba(255,255,255,${activeTurn.highlightOpacity}) 45%, rgba(0,0,0,${activeTurn.shadowOpacity * 0.6}) 100%)`
                                                    }}
                                                />
                                            </div>

                                            {/* Back of turning left leaf (becomes the previous right page!) */}
                                            <div
                                                className="absolute inset-0 rounded-r-lg overflow-hidden shadow-2xl"
                                                style={{
                                                    backfaceVisibility: 'hidden',
                                                    WebkitBackfaceVisibility: 'hidden',
                                                    transform: 'rotateY(-180deg)'
                                                }}
                                            >
                                                {renderPageFace(activeTurn.targetSpread.rightPage, 'right', true)}
                                                <div
                                                    className="absolute inset-0"
                                                    style={{
                                                        background: `linear-gradient(90deg, rgba(0,0,0,${activeTurn.shadowOpacity}) 0%, rgba(255,255,255,${activeTurn.highlightOpacity}) 50%, rgba(0,0,0,${activeTurn.shadowOpacity * 0.5}) 100%)`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Single-Page 3D Flip Mode (Mobile & Compact View — maximized screen comfort) */
                                <div
                                    className="relative overflow-visible rounded-lg transition-[width,height] duration-150"
                                    style={{
                                        width: `calc(min(92vw, 520px) * ${zoom})`,
                                        height: `calc(min(76vh, 720px) * ${zoom})`,
                                        transformStyle: 'preserve-3d'
                                    }}
                                >
                                    {/* Stationary Target/Current Page Underneath */}
                                    <div className="relative w-full h-full rounded-lg overflow-hidden shadow-inner">
                                        {renderPageFace(
                                            activeTurn && activeTurn.direction === 'next'
                                                ? activeTurn.targetSpread.rightPage
                                                : currentSpread.rightPage,
                                            'right',
                                            false
                                        )}
                                        {activeTurn && (
                                            <div
                                                className="absolute inset-0 pointer-events-none"
                                                style={{
                                                    background:
                                                        'linear-gradient(90deg, rgba(15,23,42,0.5) 0%, rgba(15,23,42,0.12) 100%)',
                                                    opacity: activeTurn.shadowOpacity
                                                }}
                                            />
                                        )}
                                    </div>

                                    {/* 3D Turning Single Leaf Hinged on Left Spine */}
                                    {activeTurn && (
                                        <div
                                            className="absolute inset-0 z-30 pointer-events-none"
                                            style={{
                                                transformOrigin: 'left center',
                                                transformStyle: 'preserve-3d',
                                                transition:
                                                    activeTurn.mode === 'anim'
                                                        ? `transform ${activeTurn.durationMs || 520}ms cubic-bezier(0.22, 1, 0.36, 1)`
                                                        : 'none',
                                                transform:
                                                    activeTurn.direction === 'next'
                                                        ? `rotateY(${activeTurn.angleDeg}deg)`
                                                        : `rotateY(${-180 + activeTurn.angleDeg}deg)`
                                            }}
                                        >
                                            <div
                                                className="absolute inset-0 rounded-lg overflow-hidden shadow-2xl"
                                                style={{
                                                    backfaceVisibility: 'hidden',
                                                    WebkitBackfaceVisibility: 'hidden'
                                                }}
                                            >
                                                {renderPageFace(
                                                    activeTurn.direction === 'next'
                                                        ? currentSpread.rightPage
                                                        : activeTurn.targetSpread.rightPage,
                                                    'right',
                                                    true
                                                )}
                                                <div
                                                    className="absolute inset-0"
                                                    style={{
                                                        background: `linear-gradient(90deg, rgba(0,0,0,${activeTurn.shadowOpacity}) 0%, rgba(255,255,255,${activeTurn.highlightOpacity}) 45%, rgba(0,0,0,${activeTurn.shadowOpacity * 0.5}) 100%)`
                                                    }}
                                                />
                                            </div>
                                            {/* Paper Reverse Texture */}
                                            <div
                                                className="absolute inset-0 rounded-lg overflow-hidden shadow-2xl"
                                                style={{
                                                    backfaceVisibility: 'hidden',
                                                    WebkitBackfaceVisibility: 'hidden',
                                                    transform: 'rotateY(180deg)',
                                                    backgroundColor: theme.pageTint || '#fffdf9'
                                                }}
                                            >
                                                <div className="w-full h-full opacity-20 scale-x-[-1]">
                                                    {renderPageFace(
                                                        activeTurn.direction === 'next'
                                                            ? currentSpread.rightPage
                                                            : activeTurn.targetSpread.rightPage,
                                                        'left',
                                                        true
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Collapsible User Bookmarks Quick List Drawer */}
            {showBookmarksPanel && (
                <div className="relative z-20 shrink-0 px-4 py-3 bg-slate-900/95 border-t border-white/10 backdrop-blur-md">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-white">
                            <Bookmark size={14} className="text-rose-400 fill-rose-400" />
                            <span>Mis marcadores ({bookmarks.length})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handleToggleBookmark(activeBookmarkTargetPageIndex)}
                                className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-200 text-[11px] font-bold transition-colors cursor-pointer"
                            >
                                {bookmarks.includes(activeBookmarkTargetPageIndex)
                                    ? `Quitar pág. ${activeBookmarkTargetPageIndex + 1}`
                                    : `+ Marcar pág. ${activeBookmarkTargetPageIndex + 1}`}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowBookmarksPanel(false)}
                                className="p-1 text-slate-400 hover:text-white rounded-lg"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {bookmarks.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2">
                            Aún no tienes páginas marcadas en este libro. Toca el icono de marcador o la cinta en la esquina superior de cualquier hoja para guardarla.
                        </p>
                    ) : (
                        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
                            {bookmarks.map((bPageIdx) => {
                                const isCurrent = currentSpread.pages.includes(bPageIdx);
                                const thumbSrc = effectivePages[bPageIdx] || '';
                                const snippet = normalizedBook.pageTexts?.[bPageIdx] || '';
                                return (
                                    <div
                                        key={`bm_${bPageIdx}`}
                                        className={`group relative shrink-0 flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                                            isCurrent
                                                ? 'bg-indigo-600/25 border-indigo-400 text-white'
                                                : 'bg-white/5 hover:bg-white/10 border-white/15 text-slate-200'
                                        }`}
                                        onClick={() => jumpToPage(bPageIdx)}
                                    >
                                        {thumbSrc && (
                                            <img loading="lazy" decoding="async"
                                                src={thumbSrc}
                                                alt={`Pág. ${bPageIdx + 1}`}
                                                className="w-10 h-14 object-cover rounded border border-white/20 bg-white shrink-0"
                                            />
                                        )}
                                        <div className="min-w-0 max-w-[140px]">
                                            <div className="text-xs font-extrabold flex items-center gap-1">
                                                <Bookmark size={11} className="text-rose-400 fill-rose-400 shrink-0" />
                                                <span>Página {bPageIdx + 1}</span>
                                            </div>
                                            {snippet && (
                                                <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
                                                    {snippet}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => handleToggleBookmark(bPageIdx, e)}
                                            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10"
                                            title="Quitar marcador"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Collapsible Thumbnail Drawer */}
            {showThumbnails && (
                <div className="relative z-20 shrink-0 px-4 py-3 bg-slate-900/95 border-t border-white/10 backdrop-blur-md">
                    <div className="flex items-center gap-3 overflow-x-auto pb-1 custom-scrollbar">
                        {effectivePages.map((thumbUrl, idx) => {
                            const isCurrent = currentSpread.pages.includes(idx);
                            const isMarked = bookmarks.includes(idx);
                            return (
                                <button
                                    key={`thumb_${idx}`}
                                    type="button"
                                    onClick={() => jumpToPage(idx)}
                                    className={`group relative shrink-0 w-16 h-22 rounded-lg overflow-hidden border-2 transition-all ${
                                        isCurrent
                                            ? 'border-indigo-400 scale-105 shadow-lg shadow-indigo-500/30'
                                            : 'border-white/15 opacity-70 hover:opacity-100 hover:border-white/40'
                                    }`}
                                >
                                    <img loading="lazy" decoding="async"
                                        src={thumbUrl}
                                        alt={`Miniatura ${idx + 1}`}
                                        className="w-full h-full object-cover bg-white"
                                    />
                                    {isMarked && (
                                        <span className="absolute top-0 right-1.5 w-3.5 h-5 bg-rose-600 flex items-center justify-center shadow" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)' }} />
                                    )}
                                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[10px] font-bold text-white">
                                        {idx + 1}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Bottom Page Slider & Status Bar (Optimized for Mobile & Desktop) */}
            <div className="relative z-20 shrink-0 flex items-center justify-between gap-2 sm:gap-4 px-2.5 sm:px-6 md:px-8 py-2.5 sm:py-3 bg-slate-900/85 border-t border-white/10 backdrop-blur-md">
                <button
                    type="button"
                    onClick={() => jumpToPage(0)}
                    disabled={currentSpreadIndex === 0}
                    className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 transition-all shrink-0"
                    title="Volver a la portada"
                >
                    <RotateCcw size={14} />
                    <span className="hidden sm:inline">Portada</span>
                </button>

                <div className="flex-1 max-w-xl flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className="hidden xs:inline text-[11px] font-bold text-slate-400 shrink-0">
                        Pág. {formatSpreadPageLabel(currentSpread, effectivePages.length)}
                    </span>
                    <input
                        type="range"
                        min={0}
                        max={Math.max(0, spreads.length - 1)}
                        value={currentSpreadIndex}
                        onChange={(e) => {
                            const nextIdx = Number(e.target.value);
                            playPageFlipSound({
                                muted: soundMuted,
                                direction: nextIdx >= currentSpreadIndex ? 'next' : 'prev'
                            });
                            setCurrentSpreadIndex(nextIdx);
                        }}
                        className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                    />
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={handlePrev}
                        disabled={!canGoPrev}
                        className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-xs font-bold transition-all"
                    >
                        Anterior
                    </button>
                    <button
                        type="button"
                        onClick={handleNext}
                        disabled={!canGoNext}
                        className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30"
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return null;
    return createPortal(modalContent, document.body);
}
