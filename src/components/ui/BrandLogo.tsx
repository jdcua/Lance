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
      <polyline points="12 2 15 9 12 7.5 9 9 12 2" />
      <polyline points="12 22 9 15 12 16.5 15 15 12 22" />
      <polyline points="2 12 9 9 7.5 12 9 15 2 12" />
      <polyline points="22 12 15 15 16.5 12 15 9 22 12" />
    </svg>
  );
}
