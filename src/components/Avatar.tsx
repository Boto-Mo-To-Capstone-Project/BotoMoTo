import React from 'react';
import Image from 'next/image';
import { getInitials, getAvatarColor } from '@/lib/avatar';

interface AvatarProps {
  /** User's name for generating initials */
  name: string;
  /** URL to user's profile image */
  image?: string | null;
  /** Size class for the avatar (default: w-10 h-10) */
  size?: string;
  /** Text size class for initials (default: text-sm) */
  textSize?: string;
  /** Additional CSS classes */
  className?: string;
  /** Alt text for the image */
  alt?: string;
}

/**
 * Avatar component that displays user profile image or initials fallback
 */
export const Avatar: React.FC<AvatarProps> = ({
  name,
  image,
  size = "w-10 h-10",
  textSize = "text-sm",
  className = "",
  alt,
}) => {
  const initials = getInitials(name);
  const avatarColor = getAvatarColor(name);
  const displayName = name || "User";

  if (image) {
    return (
      <div className={`${size} rounded-full overflow-hidden ${className}`}>
        <Image
          src={image}
          width={40}
          height={40}
          alt={alt || `${displayName}'s profile picture`}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Hide image on error - will show initials fallback
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

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
  <Avatar {...props} size="w-28 h-28" textSize="text-2xl" />
);

/**
 * Small avatar variant for lists or compact displays
 */
export const AvatarSmall: React.FC<Omit<AvatarProps, 'size' | 'textSize'>> = (props) => (
  <Avatar {...props} size="w-8 h-8" textSize="text-xs" />
);
