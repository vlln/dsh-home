/** 卡片标题左侧的统一图标：16px 视框、描边 1.2–1.4、只用 currentColor。
 * 每个内置类型都必须有一个，缺一个就会让那一行标题看起来比邻居少点什么。 */
import type { ReactNode } from 'react'

function Glyph({ children }: { children: ReactNode }) {
  return <svg className="dsh-w-glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true">{children}</svg>
}

export function IconTodo() {
  return <Glyph>
    <rect x="2.6" y="2.6" width="10.8" height="10.8" rx="2.6" stroke="currentColor" strokeWidth="1.2" />
    <path d="M5.4 8.1 7.2 10l3.4-3.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </Glyph>
}

export function IconPlan() {
  return <Glyph>
    <path d="M4 3v10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M4 4.6h8M4 8h8M4 11.4h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="4" cy="8" r="1.3" fill="currentColor" stroke="none" />
  </Glyph>
}

export function IconCalendar() {
  return <Glyph>
    <rect x="2.6" y="3.6" width="10.8" height="9.8" rx="2" stroke="currentColor" strokeWidth="1.2" />
    <path d="M2.6 6.6h10.8M5.6 2.4v2.4M10.4 2.4v2.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="5.6" cy="9.4" r=".9" fill="currentColor" stroke="none" />
    <circle cx="8" cy="9.4" r=".9" fill="currentColor" stroke="none" />
    <circle cx="10.4" cy="9.4" r=".9" fill="currentColor" stroke="none" />
  </Glyph>
}

export function IconHabit() {
  return <Glyph>
    <circle cx="8" cy="8" r="5.6" stroke="currentColor" strokeWidth="1.2" />
    <path d="M5.6 8.2 7.3 9.9l3.3-3.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </Glyph>
}

export function IconTimer() {
  return <Glyph>
    <circle cx="8" cy="8.8" r="5.2" stroke="currentColor" strokeWidth="1.2" />
    <path d="M8 6.2v2.8l1.8 1.2M6.4 2.4h3.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </Glyph>
}

export function IconPomodoro() {
  return <Glyph>
    <circle cx="8" cy="9" r="4.8" stroke="currentColor" strokeWidth="1.2" />
    <path d="M8 4.2c.2-1.1.9-1.8 1.9-2M9.9 4.5c.9-.7 1.9-.7 2.7-.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </Glyph>
}

export function IconCountdown() {
  return <Glyph>
    <path d="M4.4 2.4h7.2M4.4 13.6h7.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M5.2 2.6c0 2.6 1.2 4 2.8 5.4-1.6 1.4-2.8 2.8-2.8 5.4M10.8 2.6c0 2.6-1.2 4-2.8 5.4 1.6 1.4 2.8 2.8 2.8 5.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </Glyph>
}

export function IconPicture() {
  return <Glyph>
    <rect x="2.4" y="3.4" width="11.2" height="9.2" rx="2" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="5.8" cy="6.4" r="1.1" stroke="currentColor" strokeWidth="1.1" />
    <path d="m3.4 11.4 3.2-3 2.1 2 1.7-1.5 2.2 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </Glyph>
}

export function IconQuote() {
  return <Glyph>
    <path d="M3.4 9.6c0-2.6 1.1-4.4 3.3-5.2M3.4 9.6h2.4V12H3.4V9.6ZM9.6 9.6c0-2.6 1.1-4.4 3.3-5.2M9.6 9.6h2.4V12H9.6V9.6Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </Glyph>
}

export function IconUsage() {
  return <Glyph>
    <circle cx="8" cy="8" r="5.4" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.2" />
    <path d="M8 2.6v2.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </Glyph>
}

export function IconBalance() {
  return <Glyph>
    <rect x="2.4" y="4.2" width="11.2" height="8.2" rx="2.2" stroke="currentColor" strokeWidth="1.2" />
    <path d="M2.4 6.8h11.2" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="10.8" cy="9.9" r="1" fill="currentColor" stroke="none" />
  </Glyph>
}

export function IconActivity() {
  return <Glyph>
    <rect x="2.4" y="2.4" width="3" height="3" rx=".8" stroke="currentColor" strokeWidth="1.1" />
    <rect x="6.5" y="2.4" width="3" height="3" rx=".8" stroke="currentColor" strokeWidth="1.1" />
    <rect x="10.6" y="2.4" width="3" height="3" rx=".8" stroke="currentColor" strokeWidth="1.1" />
    <rect x="2.4" y="6.5" width="3" height="3" rx=".8" stroke="currentColor" strokeWidth="1.1" />
    <rect x="6.5" y="6.5" width="3" height="3" rx=".8" fill="currentColor" stroke="none" />
    <rect x="10.6" y="6.5" width="3" height="3" rx=".8" stroke="currentColor" strokeWidth="1.1" />
    <rect x="2.4" y="10.6" width="3" height="3" rx=".8" stroke="currentColor" strokeWidth="1.1" />
    <rect x="6.5" y="10.6" width="3" height="3" rx=".8" stroke="currentColor" strokeWidth="1.1" />
    <rect x="10.6" y="10.6" width="3" height="3" rx=".8" fill="currentColor" stroke="none" />
  </Glyph>
}

export function IconBars() {
  return <Glyph>
    <path d="M3 12.4V8.6M6.3 12.4V5.2M9.7 12.4V7.4M13 12.4V3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </Glyph>
}
