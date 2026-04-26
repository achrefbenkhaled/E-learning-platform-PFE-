# LearnHub Design System

## Philosophy
Neo-brutalist dark theme with cartoonized elements. Bold, playful, high-contrast.
Inspired by Skool.com's community feel but with a dark, edgy aesthetic.

---

## Color Palette

### Backgrounds
| Token | Value | Usage |
|-------|-------|-------|
| `bg-dark` | `#0a0a0a` | Page backgrounds, main canvas |
| `bg-card` | `#111111` | Card backgrounds |
| `bg-card-hover` | `#1a1a1a` | Card hover state |
| `bg-surface` | `#161616` | Sidebar, navbar, elevated surfaces |
| `bg-input` | `#1a1a1a` | Input field backgrounds |
| `bg-overlay` | `rgba(0,0,0,0.7)` | Modal backdrops |

### Accent Colors
| Token | Value | Usage |
|-------|-------|-------|
| `yellow-400` | `#FACC15` | Primary accent, CTAs, highlights |
| `yellow-500` | `#EAB308` | Hover state for primary |
| `yellow-400/10` | — | Subtle accent backgrounds |
| `yellow-400/20` | — | Badge backgrounds |

### Text
| Token | Value | Usage |
|-------|-------|-------|
| `white` | `#FFFFFF` | Primary headings |
| `gray-300` | `#D1D5DB` | Body text |
| `gray-400` | `#9CA3AF` | Secondary text |
| `gray-500` | `#6B7280` | Muted text, timestamps |
| `gray-600` | `#4B5563` | Disabled text |

### Status Colors
| Token | Value | Usage |
|-------|-------|-------|
| `green-400` | `#4ADE80` | Success, online, completed |
| `red-400` | `#F87171` | Error, danger, destructive |
| `blue-400` | `#60A5FA` | Info, links, secondary accent |
| `purple-400` | `#C084FC` | Badges, special items |

### Border
| Token | Value | Usage |
|-------|-------|-------|
| `gray-800` | `#1F2937` | Subtle borders |
| `gray-700` | `#374151` | Emphasized borders |
| `yellow-400` | — | Active/focus borders |

---

## Neo-Brutalist Effects

### Box Shadows
```
shadow-brutal:      4px 4px 0px 0px rgba(250,204,21,0.3)
shadow-brutal-sm:   2px 2px 0px 0px rgba(250,204,21,0.2)
shadow-brutal-lg:   6px 6px 0px 0px rgba(250,204,21,0.4)
shadow-brutal-hard: 4px 4px 0px 0px #FACC15
```

### Borders
```
border-brutal:   border-2 border-gray-700
border-accent:   border-2 border-yellow-400/30
border-focus:    border-2 border-yellow-400
```

### Rotation & Tilt (for playfulness)
```
rotate-[-2deg]   — Subtle tilt on decorative elements
rotate-[1deg]    — Cards on hover
hover:rotate-0   — Untilt on hover for interaction feedback
```

---

## Typography

### Font
System stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

### Scale
| Class | Size | Weight | Usage |
|-------|------|--------|-------|
| `text-4xl font-black` | 36px | 900 | Page titles |
| `text-2xl font-bold` | 24px | 700 | Section titles |
| `text-xl font-bold` | 20px | 700 | Card titles |
| `text-lg font-semibold` | 18px | 600 | Subheadings |
| `text-base` | 16px | 400 | Body text |
| `text-sm` | 14px | 400 | Secondary text, labels |
| `text-xs` | 12px | 500 | Badges, timestamps |

---

## Components

### Card
```jsx
className="bg-[#111111] border-2 border-gray-800 rounded-2xl p-6
           hover:border-yellow-400/30 hover:shadow-[4px_4px_0px_0px_rgba(250,204,21,0.3)]
           transition-all duration-300"
```

### Button — Primary
```jsx
className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-xl
           border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
           hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]
           active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
           transition-all duration-150"
```

### Button — Secondary
```jsx
className="px-6 py-3 bg-transparent text-gray-300 font-semibold rounded-xl
           border-2 border-gray-700 hover:border-yellow-400/50 hover:text-yellow-400
           transition-all duration-200"
```

### Button — Danger
```jsx
className="px-6 py-3 bg-red-500/10 text-red-400 font-semibold rounded-xl
           border-2 border-red-500/30 hover:bg-red-500/20 hover:border-red-400
           transition-all duration-200"
```

### Input
```jsx
className="w-full px-4 py-3 bg-[#1a1a1a] text-white border-2 border-gray-800
           rounded-xl placeholder-gray-600 focus:border-yellow-400 focus:outline-none
           transition-colors duration-200"
```

### Badge
```jsx
className="px-3 py-1 text-xs font-bold rounded-lg bg-yellow-400/10 text-yellow-400
           border border-yellow-400/20"
```

### Navbar
```
Fixed top, h-16, bg-[#0a0a0a]/95 backdrop-blur-md
Border bottom: border-b border-gray-800
Logo: yellow-400 accent square with rotation
```

### Sidebar
```
Fixed left, w-64, bg-[#0a0a0a]
Active item: bg-yellow-400/10 text-yellow-400 border-l-2 border-yellow-400
Inactive: text-gray-400 hover:text-white hover:bg-white/5
```

---

## Spacing
| Token | Value | Usage |
|-------|-------|-------|
| `gap-4` | 16px | Between grid items |
| `gap-6` | 24px | Between card sections |
| `p-6` | 24px | Card padding |
| `p-8` | 32px | Page section padding |
| `mb-8` | 32px | Section margins |
| `rounded-xl` | 12px | Buttons, inputs |
| `rounded-2xl` | 16px | Cards, modals |

---

## Animation (GSAP)
- Page enter: `fadeIn + translateY(20px)` over 0.6s
- Cards stagger: 0.1s delay between each card
- Hover lift: `translateY(-4px)` with shadow increase
- Button press: `translateX(2px) translateY(2px)` with shadow shrink
- Progress bars: animate width from 0 to value
- Number counters: GSAP `to()` for counting up stats

---

## Icons
Using `lucide-react` for consistent, clean icons throughout.
Size: `w-5 h-5` default, `w-4 h-4` small, `w-6 h-6` large.
Color: inherits text color via `currentColor`.

---

## Layout Structure
```
┌─────────────────────────────────────────┐
│ Navbar (fixed top, z-50, h-16)          │
├──────────┬──────────────────────────────┤
│ Sidebar  │ Main Content                 │
│ (w-64,   │ (pt-16 lg:pl-64)            │
│ fixed)   │ ┌──────────────────────────┐ │
│          │ │ p-6 lg:p-8              │ │
│          │ │ Page content here       │ │
│          │ └──────────────────────────┘ │
└──────────┴──────────────────────────────┘
Background: bg-[#0a0a0a]
```
