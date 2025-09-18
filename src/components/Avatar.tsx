import React from 'react';
import Image from 'next/image';
import { getInitials, getAvatarColor } from '@/lib/avatar';

interface AvatarProps {
  /** User's name for generating initials */
  name: string;
  /** URL to user's profile image */
  image?: string | null;
  /** Default image to show when no profile image is available (instead of initials) */
  defaultImage?: string;
  /** Size class for the avatar (default: w-10 h-10) */
  size?: string;
  /** Text size class for initials (default: text-sm) */
  textSize?: string;
  /** Additional CSS classes */
  className?: string;
  /** Alt text for the image */
  alt?: string;
  /** Image dimensions for Next.js optimization (default: 40) */
  imageDimensions?: number;
}

/**
 * Avatar component that displays user profile image or initials fallback
 */
export const Avatar: React.FC<AvatarProps> = ({
  name,
  image,
  defaultImage,
  size = "w-10 h-10",
  textSize = "text-sm",
  className = "",
  alt,
  imageDimensions = 40,
}) => {
  const initials = getInitials(name);
  const avatarColor = getAvatarColor(name);
  const displayName = name || "User";

  if (image) {
    return (
      <div className={`${size} rounded-full overflow-hidden ${className}`}>
        <Image
          src={image}
          width={imageDimensions}
          height={imageDimensions}
          alt={alt || `${displayName}'s profile picture`}
          className="w-full h-full object-cover"
          quality={95}
          unoptimized={image.includes('s3')}
          onError={(e) => {
            // Hide image on error - will show fallback
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  // If no profile image but there's a default image (like LogomarkHD for superadmin)
  if (defaultImage) {
    return (
      <div className={`${size} rounded-full overflow-hidden ${className}`}>
        <Image
          src={defaultImage}
          width={imageDimensions}
          height={imageDimensions}
          alt={alt || "Default avatar"}
          className="w-full h-full object-cover"
          quality={95}
        />
      </div>
    );
  }

  // Fallback to initials
  return (
    <div 
      className={`${size} ${avatarColor} rounded-full flex items-center justify-center text-white font-semibold ${textSize} ${className}`}
      title={displayName}
    >
      {initials}
    </div>
  );
};

/**
 * Large avatar variant for profile pages
 */
export const AvatarLarge: React.FC<Omit<AvatarProps, 'size' | 'textSize'>> = (props) => (
  <Avatar {...props} size="w-28 h-28" textSize="text-2xl" imageDimensions={224} />
);

/**
 * Small avatar variant for lists or compact displays
 */
export const AvatarSmall: React.FC<Omit<AvatarProps, 'size' | 'textSize'>> = (props) => (
  <Avatar {...props} size="w-8 h-8" textSize="text-xs" imageDimensions={32} />
);
