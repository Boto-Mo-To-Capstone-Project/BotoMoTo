"use client";
import { useState } from "react";
import Image, { StaticImageData } from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SliderProps {
  images: { src: string | StaticImageData; alt: string }[];
}

export default function CustomSlider({ images }: SliderProps) {
  const [current, setCurrent] = useState(0);

  const prevSlide = () => {
    setCurrent((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative w-full max-w-full mx-auto overflow-hidden rounded-lg border-2 border-gray-500 bg-black">
      {/* Slides */}
      <div
        className="flex transition-transform duration-500"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {images.map((img, idx) => (
          <div key={idx} className="w-full flex-shrink-0 flex items-center justify-center">
            <Image
              src={img.src}
              alt={img.alt}
              width={800}
              height={400}
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {/* Show controls only if more than 1 image */}
      {images.length > 1 && (
        <>
          {/* Navigation buttons */}
          <button
            onClick={prevSlide}
            className="text-primary absolute left-2 top-1/3 sm:top-2/5 bg-white/70 p-3 rounded-full shadow"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextSlide}
            className="text-primary absolute right-2 top-1/3 sm:top-2/5 bg-white/70 p-3 rounded-full shadow"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`w-3 h-3 rounded-full ${
                  idx === current ? "bg-primary" : "bg-gray-400"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
