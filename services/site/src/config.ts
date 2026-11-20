/**
 * Application-wide constants and configuration
 */
export const config = {
  consoleMarketingEnabled: import.meta.env.VITE_CONSOLE_MARKETING_ENABLED === "true",

  // Base URL. GitHub Pages is the primary host (https://quanlhk-fsc-hag.github.io/AI-Q). Canonical URLs, share
  // cards and the sitemap use this origin+path. A project site under /AI-Q/ still needs a Vite base and a path
  // prefix for full deployment; keep that in mind when deploying.
  baseUrl: "https://quanlhk-fsc-hag.github.io/AI-Q",

  // GitHub
  github: {
    // AI-Q's own repository: the header, release and changelog links point here. The stars and contributor
    // numbers below and the build scripts' API calls (script/github-snapshot.ts, script/contributor-faces.ts,
    // lib/changelog-releases.ts) still read the upstream repository, which is where the history comes from.
    repoUrl: "https://github.com/QuanLHK-FSC-HAG/AI-Q",
    starsFormatted: {
      compact: "220K",
      full: "220,000",
    },
  },

  // Social links
  social: {
    twitter: "https://github.com/QuanLHK-FSC-HAG/AI-Q",
    discord: "https://github.com/QuanLHK-FSC-HAG/AI-Q/discussions",
  },

  // Static stats (used on landing page)
  stats: {
    contributors: "1,000+",
    contributorsCompact: "1K+",
    commits: "20,000",
    monthlyUsers: "22M",
  },
} as const
