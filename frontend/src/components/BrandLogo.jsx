/**
 * Shared LifeTrack Brand Logo & Wordmark component.
 */
export default function BrandLogo({ id, className = 'sidebar__logo', style }) {
  return (
    <div className={className} id={id} style={style} aria-label="LifeTrack">
      <svg
        className="sidebar__logo-mark"
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M16 2C14 8 8 14 4 18C8 17 12 18 14 22C14 18 16 12 22 6C20 8 18 6 16 2Z"
          fill="#241F1A"
        />
      </svg>
      <span className="sidebar__logo-text">LifeTrack</span>
    </div>
  );
}
