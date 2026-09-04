export type Account = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type AccountRole = "owner" | "admin" | "member";

export type Business = {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  website: string | null;
  industry: string | null;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  website: string | null;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
};

export type Workspace = {
  id: string;
  product_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};
