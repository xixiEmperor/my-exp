import styles from './SiteIcon.module.scss';

// 图标使用本地 SVG 结构，按钮的可访问名称由外层控件提供。
const icons = {
  brand: (
    <>
      <path d="M5 3h11l5 5v14H5zM16 3v6h5M9 8v10M13 13h4M13 17h4"></path>
    </>
  ),
  arrow: (
    <>
      <path d="M4 12h16m-6-6 6 6-6 6"></path>
    </>
  ),
  'arrow-left': (
    <>
      <path d="M20 12H4m6-6-6 6 6 6"></path>
    </>
  ),
  'arrow-up': (
    <>
      <path d="M6 18 18 6M6 6h12v12"></path>
    </>
  ),
  down: (
    <>
      <path d="M12 4v16m-5-5 5 5 5-5"></path>
    </>
  ),
  chevron: (
    <>
      <path d="m9 5 7 7-7 7"></path>
    </>
  ),
  book: (
    <>
      <path d="M3 4h6l3 2 3-2h6v15h-6l-3 2-3-2H3zM12 6v15"></path>
    </>
  ),
  code: (
    <>
      <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16"></path>
    </>
  ),
  server: (
    <>
      <rect x="3" y="3" width="18" height="7" rx="2"></rect>
      <rect x="3" y="14" width="18" height="7" rx="2"></rect>
      <path d="M7 6.5h.01M7 17.5h.01M16 6.5h2M16 17.5h2"></path>
    </>
  ),
  spark: (
    <>
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"></path>
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9"></circle>
      <ellipse cx="12" cy="12" rx="4" ry="9"></ellipse>
      <path d="M3 12h18"></path>
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1"></rect>
      <rect x="14" y="3" width="7" height="7" rx="1"></rect>
      <rect x="3" y="14" width="7" height="7" rx="1"></rect>
      <rect x="14" y="14" width="7" height="7" rx="1"></rect>
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M12 6v6l4 2"></path>
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5"></circle>
      <path d="m16 16 4 4"></path>
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12M6 18 18 6"></path>
    </>
  ),
  menu: (
    <>
      <path d="M4 6h16M4 12h16M4 18h16"></path>
    </>
  ),
  list: (
    <>
      <path d="M9 6h11M9 12h11M9 18h7M4 6h.01M4 12h.01M4 18h.01"></path>
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2"></rect>
      <path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"></path>
    </>
  ),
  check: (
    <>
      <path d="m5 12 4 4L19 6"></path>
    </>
  ),
  link: (
    <>
      <path d="m10 14 4-4m-5 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 0 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"></path>
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M12 11v6m0-10v.01"></path>
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="13" rx="2"></rect>
      <path d="M15 8V3H3v13h5"></path>
    </>
  ),
};
export type IconName = keyof typeof icons;

interface Props {
  name: IconName;
}

export default function SiteIcon({ name }: Props) {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {icons[name]}
    </svg>
  );
}
