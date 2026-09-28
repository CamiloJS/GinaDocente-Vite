// src/components/ImageCarousel.jsx
import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from './Icons.jsx';

export const ImageCarousel = ({ images = [], onImageClick, isDarkMode, compact = false, className = '' }) => {
  // Filtrar URLs válidas
  const validImages = Array.isArray(images) 
    ? images.filter(img => typeof img === 'string' && img.trim().length > 0)
    : (typeof images === 'string' && images.trim().length > 0 ? [images] : []);

  if (validImages.length === 0) return null;

  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef(null);
  const isSingle = validImages.length === 1;

  React.useEffect(() => {
    if (validImages.length > 0 && currentIndex >= validImages.length) {
      setCurrentIndex(Math.max(0, validImages.length - 1));
    }
  }, [validImages.length, currentIndex]);

  const scrollToIndex = (index) => {
    if (index < 0 || index >= validImages.length) return;
    setCurrentIndex(index);
    if (scrollRef.current) {
      const container = scrollRef.current;
      const width = container.clientWidth;
      container.scrollTo({
        left: index * width,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const width = container.clientWidth;
      if (width > 0) {
        const newIndex = Math.round(container.scrollLeft / width);
        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < validImages.length) {
          setCurrentIndex(newIndex);
        }
      }
    }
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    scrollToIndex(currentIndex - 1);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    scrollToIndex(currentIndex + 1);
  };

  return (
    <div className={`relative group/carousel w-full rounded-2xl overflow-hidden border border-gray-200/80 dark:border-gray-700/80 shadow-sm select-none ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} ${className}`}>
      
      {/* Contenedor deslizante Horizontal Snap */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        data-carousel-track="true"
        className="flex w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-none no-scrollbar items-center"
        style={{ 
          scrollSnapType: 'x mandatory', 
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {validImages.map((url, idx) => (
          <div 
            key={idx} 
            className="w-full shrink-0 snap-center snap-always flex items-center justify-center relative cursor-pointer bg-black/5 dark:bg-black/20"
            style={{ minWidth: '100%' }}
            onClick={() => onImageClick && onImageClick(url)}
          >
            <img 
              src={url}
              alt={`Imagen ${idx + 1}`}
              loading="lazy"
              decoding="async"
              className={`w-full object-contain ${compact ? 'max-h-72 sm:max-h-80' : 'max-h-[480px] sm:max-h-[540px]'} transition-transform duration-200 hover:scale-[1.008]`}
            />
          </div>
        ))}
      </div>

      {/* Si hay múltiples imágenes: Indicador Contador Superior (1/4) */}
      {!isSingle && (
        <div className="absolute top-3 right-3 z-10 pointer-events-none">
          <span className="bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
            {currentIndex + 1}/{validImages.length}
          </span>
        </div>
      )}

      {/* Flechas de Navegación Estilo Instagram */}
      {!isSingle && currentIndex > 0 && (
        <button
          type="button"
          onClick={handlePrev}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-md shadow-lg transition-all hover:scale-110 flex items-center justify-center opacity-80 group-hover/carousel:opacity-100 cursor-pointer"
          title="Anterior imagen"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {!isSingle && currentIndex < validImages.length - 1 && (
        <button
          type="button"
          onClick={handleNext}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-md shadow-lg transition-all hover:scale-110 flex items-center justify-center opacity-80 group-hover/carousel:opacity-100 cursor-pointer"
          title="Siguiente imagen"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Puntos Indicadores de Paginación Estilo Instagram */}
      {!isSingle && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1 rounded-full bg-black/30 backdrop-blur-xs">
          {validImages.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => { e.stopPropagation(); scrollToIndex(idx); }}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                currentIndex === idx 
                  ? 'w-4 h-1.5 bg-white shadow-sm' 
                  : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
              }`}
              title={`Ir a imagen ${idx + 1}`}
            />
          ))}
        </div>
      )}

    </div>
  );
};

export default ImageCarousel;
