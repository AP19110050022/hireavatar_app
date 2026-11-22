export const BASE = process.env.EXPO_PUBLIC_BACKEND_URL as string;

export type Role = "presenter" | "business";
export type Plan = "per_video" | "part_time" | "full_time";

export type User = {
  user_id: string;
  email: string;
  name: string;
  picture: string;
  role: Role | null;
  business_name: string;
};

export type Presenter = {
  user_id: string;
  name: string;
  headline: string;
  bio: string;
  city: string;
  languages: string[];
  categories: string[];
  photos: string[];
  price_per_video: number;
  price_part_time: number;
  price_full_time: number;
  online: boolean;
};

export type Offer = {
  offer_id: string;
  business_id: string;
  business_name: string;
  presenter_id: string;
  presenter_name: string;
  presenter_photo: string;
  plan: Plan;
  brief: string;
  budget: number;
  status: "pending" | "accepted" | "declined";
  conversation_id: string;
  created_at: string;
};

export type Conversation = {
  conversation_id: string;
  business_id: string;
  business_name: string;
  presenter_id: string;
  presenter_name: string;
  presenter_photo: string;
  last_message: string;
  updated_at: string;
};

export type Message = {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  created_at: string;
};

export const PLANS: { key: Plan; title: string; desc: string; icon: string; priceKey: keyof Presenter; unit: string }[] = [
  { key: "per_video", title: "Per Video", desc: "One finished video, from the presenter's price", icon: "videocam-outline", priceKey: "price_per_video", unit: "/video" },
  { key: "part_time", title: "Part-time", desc: "Up to 8 videos + 1 shoot day a month", icon: "calendar-outline", priceKey: "price_part_time", unit: "/month" },
  { key: "full_time", title: "Full-time", desc: "Your dedicated face, up to 20 videos a month", icon: "ribbon-outline", priceKey: "price_full_time", unit: "/month" },
];

export const planTitle = (p: string) => PLANS.find((x) => x.key === p)?.title ?? p;

export const rupees = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export const imgUrl = (u?: string) => (!u ? "" : u.startsWith("/api/") ? `${BASE}${u}` : u);

export async function request<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body && !(init.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}/api${path}`, { ...init, headers });
  if (!res.ok) {
    let msg = `Something went wrong (${res.status})`;
    try {
      const j = await res.json();
      if (typeof j.detail === "string") msg = j.detail;
      else if (Array.isArray(j.detail)) msg = j.detail[0]?.msg ?? msg;
    } catch {}
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}
