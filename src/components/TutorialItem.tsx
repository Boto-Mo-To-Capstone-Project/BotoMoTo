"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import Image, { StaticImageData } from "next/image";
import CustomSlider from "./CustomSlider";

interface Detail {
  text: string;
  subDetails?: Detail[];
}

interface ImageItem {
  src: string | StaticImageData;
  alt: string;
}

export interface TutorialItemProps {
  title: string;
  description: Detail[];
  images: ImageItem[];
}

export default function TutorialItem({ title, description, images }: TutorialItemProps) {
  return (
    <div className="space-y-6">
      {/* Title */}
      <p className="text-dxs font-semibold">{title}</p>

      {/* Recursive description (multiple root items) */}
      <div className="space-y-2">
        {description.map((d, i) => (
          <DescriptionLevel key={i} detail={d} />
        ))}
      </div>

      {/* Screenshot carousel */}
      {images.length > 0 && (
        <CustomSlider images={images} />
      )}
    </div>
  );
}

/* Recursive description renderer */
function DescriptionLevel({ detail }: { detail: Detail }) {

  return (
    <div className="pl-4">
      <div className="flex gap-3 items-start">
        <span className="text-xl font-bold text-gray">•</span>
        <span className="text-lg text-gray">{detail.text}</span>
      </div>
        

      {detail.subDetails && (
        <div className="mt-2 space-y-2">
          {detail.subDetails.map((sub, i) => (
            <DescriptionLevel key={i} detail={sub} />
          ))}
        </div>
      )}
    </div>
  );
}
