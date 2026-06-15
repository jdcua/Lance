export default function BrandLogo({ size = 20, className = "" }: { size?: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" x2="12" y1="3" y2="21" />
      <polyline points="8 8 12 4 16 8" />
      <polyline points="16 16 12 20 8 16" />
    </svg>
  );
}
