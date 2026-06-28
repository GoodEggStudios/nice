export const VISUAL_BUTTON_ID = "n_visual0001";
export const VISUAL_PRIVATE_ID = "ns_visual00000000000001";
export const VISUAL_URL = "https://example.com/articles/visual-button";
export const VISUAL_CREATED_AT = "2026-06-27T12:00:00.000Z";

export interface VisualButtonStats {
  id: string;
  url: string;
  restriction: "url" | "domain" | "global";
  multi_nice: boolean;
  count: number;
  theme: "light" | "dark" | "minimal" | "mono-dark" | "mono-light";
  size: "xs" | "sm" | "md" | "lg" | "xl";
  created_at: string;
}

export function mockButtonStats(overrides: Partial<VisualButtonStats> = {}): VisualButtonStats {
  return {
    id: VISUAL_BUTTON_ID,
    url: VISUAL_URL,
    restriction: "url",
    multi_nice: false,
    count: 42,
    theme: "dark",
    size: "md",
    created_at: VISUAL_CREATED_AT,
    ...overrides,
  };
}

export function mockCreateButtonResponse(overrides: Partial<VisualButtonStats> = {}) {
  const stats = mockButtonStats(overrides);
  return {
    public_id: stats.id,
    private_id: VISUAL_PRIVATE_ID,
    url: stats.url,
    restriction: stats.restriction,
    multi_nice: stats.multi_nice,
    theme: stats.theme,
    size: stats.size,
    count: stats.count,
    created_at: stats.created_at,
    embed: {
      iframe: `<iframe src="https://api.nice.sbs/e/${stats.id}?theme=${stats.theme}&size=${stats.size}" style="border:none;width:100px;height:36px;" title="Nice button"></iframe>`,
      script: `<script src="https://api.nice.sbs/embed.js" data-button="${stats.id}" data-theme="${stats.theme}" data-size="${stats.size}" async></script>`,
    },
  };
}
