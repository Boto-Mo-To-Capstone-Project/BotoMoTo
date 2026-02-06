import React, { useState, useEffect } from 'react';
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const initials = getInitials(name);
  const avatarColor = getAvatarColor(name);
  const displayName = name || "User";

  // Generate signed URL for S3 keys on component mount
  useEffect(() => {
    console.log('Avatar useEffect - image:', image);
    
    // Reset state when image prop changes
    setImageUrl(null);
    setLoading(false);
    
    if (!image) {
      console.log('No image provided');
      return;
    }

    // If it's already a valid URL (contains ://) - Google, Facebook, HTTP URLs
    if (image.includes('://')) {
      console.log('✅ Using as external URL (Google/Facebook/HTTP):', image);
      setImageUrl(image);
      return;
    }

    // If it's an S3 key (contains "/" but no "://")
    if (image.includes('/')) {
      console.log('🔑 Detected S3 key, generating signed URL...');
      setLoading(true);
      
      fetch('/api/storage/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: image })
      })
      .then(res => {
        console.log('Signed URL response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('Signed URL response data:', data);
        if (data.success && data.data?.url) {
          console.log('✅ Setting signed URL:', data.data.url);
          setImageUrl(data.data.url);
        } else {
          console.log('❌ Failed to get signed URL, falling back to initials');
          setImageUrl(null);
        }
      })
      .catch(error => {
        console.error('❌ Error generating signed URL:', error);
        setImageUrl(null);
      })
      .finally(() => setLoading(false));
    } else {
      // It's some other format (simple filename), use as-is
      console.log('✅ Using as simple filename:', image);
      setImageUrl(image);
    }
  }, [image]);

  // Show loading state for S3 keys
  if (loading) {
    return (
      <div className={`${size} rounded-full ${avatarColor} animate-pulse ${className}`}>
        <div className="w-full h-full rounded-full bg-gray-300"></div>
      </div>
    );
  }

  if (imageUrl) {
    console.log('Rendering Image with URL:', imageUrl);
    return (
      <div className={`${size} rounded-full overflow-hidden ${className}`}>
        <Image
          src={imageUrl}
          width={imageDimensions}
          height={imageDimensions}
          alt={alt || `${displayName}'s profile picture`}
          className="w-full h-full object-cover"
          quality={95}
          unoptimized={imageUrl.includes("s3")} // Don't optimize S3 signed URLs
          onError={() => {
            console.log('Image failed to load, falling back to initials');
            // Fallback to initials on error
            setImageUrl(null);
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
