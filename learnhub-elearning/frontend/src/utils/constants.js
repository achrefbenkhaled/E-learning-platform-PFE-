// Course categories (CourseBrowser, CreateCourse, EditCourse)
export const COURSE_CATEGORIES = [
  'Development', 'Business', 'Design', 'Marketing', 'Science', 'Language', 'Music', 'Other',
];

// Course levels (CourseBrowser, CreateCourse, EditCourse)
export const COURSE_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

// Community post category colors (PostCard, PostDetail)
export const CATEGORY_COLORS = {
  discussion: 'badge-blue',
  question: 'badge-accent',
  announcement: 'badge-purple',
  resource: 'badge-green',
};

// API base URL — single source of truth
const envUrl = import.meta.env.VITE_API_URL;
export const API_BASE_URL = envUrl && envUrl.length > 0
  ? envUrl
  : `${window.location.protocol}//${window.location.hostname}:5000`;

// Anti-cheat app base URL
const antiCheatEnv = import.meta.env.VITE_ANTICHEAT_URL;
export const ANTICHEAT_BASE_URL = antiCheatEnv && antiCheatEnv.length > 0 ? antiCheatEnv : 'http://localhost:3001';
