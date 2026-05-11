import Image from 'next/image';

interface AldorLogoProps {
  className?: string;
  size?: number;
}

export default function AldorLogo({ className = '', size = 40 }: AldorLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Aldor"
      width={size}
      height={size}
      className={`rounded-lg object-contain ${className}`}
      priority
    />
  );
}
