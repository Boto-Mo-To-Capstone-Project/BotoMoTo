"use client";
import { useEffect, useState } from "react";
import Image, { StaticImageData } from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface SliderProps {
  images: { src: string | StaticImageData; alt: string }[];
}

export default function CustomSlider({ images }: SliderProps) {
  const [current, setCurrent] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const prevIndex = (index: number) => {
    return index === 0 ? images.length - 1 : index - 1;
  };

  const nextIndex = (index: number) => {
    return index === images.length - 1 ? 0 : index + 1;
  };

  const prevSlide = () => {
    setCurrent((prev) => prevIndex(prev));
  };

  const nextSlide = () => {
    setCurrent((prev) => nextIndex(prev));
  };

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setIsViewerOpen(true);
  };

  const closeViewer = () => {
    setIsViewerOpen(false);
  };

  useEffect(() => {
    if (!isViewerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsViewerOpen(false);
      }

      if (event.key === "ArrowLeft" && images.length > 1) {
        setViewerIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      }

      if (event.key === "ArrowRight" && images.length > 1) {
        setViewerIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isViewerOpen, images.length]);

  return (
    <>
      <div className="relative w-full max-w-full mx-auto overflow-hidden rounded-lg border-2 border-gray-500 bg-black">
        {/* Slides */}
        <div
          className="flex transition-transform duration-500"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {images.map((img, idx) => (
            <div key={idx} className="w-full flex-shrink-0 flex items-center justify-center">
              <button
                type="button"
                onClick={() => openViewer(idx)}
                className="w-full cursor-zoom-in"
                aria-label={`Open image ${idx + 1} in viewer`}
              >
                <div className="relative w-full h-[240px] sm:h-[340px] md:h-[440px] lg:h-[520px] bg-gray-300">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    sizes="100vw"
                    className="object-contain"
                  />
                </div>
              </button>
            </div>
          ))}
        </div>

        {/* Show controls only if more than 1 image */}
        {images.length > 1 && (
          <>
            {/* Navigation buttons */}
          <button
            type="button"
            onClick={prevSlide}
            className="text-primary absolute left-2 top-1/3 sm:top-2/5 bg-white/70 p-3 rounded-full shadow"
            aria-label="Previous image"
          >
              <ChevronLeft className="w-5 h-5" />
            </button>
          <button
            type="button"
            onClick={nextSlide}
            className="text-primary absolute right-2 top-1/3 sm:top-2/5 bg-white/70 p-3 rounded-full shadow"
            aria-label="Next image"
          >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrent(idx)}
                  className={`w-3 h-3 rounded-full ${
                    idx === current ? "bg-primary" : "bg-gray-400"
                  }`}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal-like image viewer */}
      {isViewerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 p-4 sm:p-8 flex items-center justify-center"
          onClick={closeViewer}
        >
          <div className="relative w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={closeViewer}
              className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-2 text-primary shadow"
              aria-label="Close image viewer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative rounded-lg overflow-hidden border border-white/40 bg-black">
              <Image
                src={images[viewerIndex].src}
                alt={images[viewerIndex].alt}
                width={1400}
                height={900}
                className="w-full h-auto max-h-[85vh] object-contain"
              />
            </div>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setViewerIndex((prev) => prevIndex(prev))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-primary bg-white/85 p-3 rounded-full shadow"
                  aria-label="Previous image in viewer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewerIndex((prev) => nextIndex(prev))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-primary bg-white/85 p-3 rounded-full shadow"
                  aria-label="Next image in viewer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
