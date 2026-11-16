/**
 * Single source of truth for identity + links.
 * Change it here, it changes everywhere (header, footer, metadata, JSON-LD).
 */
export const site = {
  name: "Roya Vosoughi",
  slogan: "Reclaim your time",
  /** The person — the brand is her own name. Used for authorship / JSON-LD Person. */
  founder: "Roya Vosoughi",
  domain: "royavosoughi.com",
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://royavosoughi.com",
  email: "Roya.vosoughii@gmail.com",
  social: {
    /** Empty until the LinkedIn profile exists — every use hides itself when blank. */
    linkedin: "",
    github: "https://github.com/RoyaVosoughi",
    instagram: "https://www.instagram.com/Roya.vosoughii",
  },
} as const;

/**
 * Opens a Gmail compose window to the site's address. A plain mailto: does
 * nothing on computers without a mail app set up, so the footer and contact
 * page use this web link instead.
 */
export const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(site.email)}`;

/** Brand palette, mirrored from app/globals.css for use in TS (OG image, charts, email). */
export const brandColors = {
  canvas: "#F5EBE0",
  ink: "#1E1E1E",
  cobalt: "#0047AB",
  mist: "#EBDFD1",
  inkSoft: "#2E2E2E",
  fog: "#B8B0A6",
  cobaltLight: "#7FA6E8",
  amber: "#E3A72F",
} as const;
