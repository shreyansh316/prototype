// Color design tokens for the premium dark mode theme
export const colors = {
  // Backgrounds
  bg: '#09090B',         // Deep black — main screen background
  surface: '#18181B',    // Matte slate-gray — cards, bubbles, input bar
  surfaceHigh: '#27272A', // Slightly lighter surface — hover states

  // Brand
  primary: '#6366F1',    // Neon violet-indigo — buttons, focus rings, user bubbles
  primaryDim: '#4F46E5', // Pressed/dimmed primary

  // Text
  textPrimary: '#FAFAFA',   // Near-white — headings, main content
  textSecondary: '#A1A1AA', // Muted zinc — timestamps, placeholders
  textDim: '#52525B',       // Even more muted — subtle labels

  // Status
  online: '#22C55E',   // Green — live/active indicator
  error: '#EF4444',    // Red — errors

  // Borders
  border: '#3F3F46',   // Subtle zinc border
} as const;

export type ColorKey = keyof typeof colors;
