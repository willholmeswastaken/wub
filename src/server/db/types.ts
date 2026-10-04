export type LinkRecord = {
  short_code: string;
  url: string;
  title: string | null;
  userId: string | null;
  created_at: Date;
  click_count: number;
  last_clicked: Date | null;
  expires_at: Date | null;
  claim_token: string | null;
};

export type NewLink = {
  short_code: string;
  url: string;
  userId?: string;
  expires_at: Date | null;
  claim_token?: string | null;
};

export type GuestLinkClaim = {
  shortCode: string;
  claimToken: string;
};

export type ClickSummary = {
  timestamp: Date | null;
  country: string | null;
  device: string | null;
  city: string | null;
  browser: string | null;
  os: string | null;
};

export type LinkSnapshot = Pick<
  LinkRecord,
  "userId" | "url" | "short_code" | "created_at"
>;
