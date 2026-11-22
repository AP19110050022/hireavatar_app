export const BASE = (process.env.EXPO_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
export const API = `${BASE}/api`;

export type Role = "presenter" | "business";
export type Plan = "per_video" | "part_time" | "full_time";

export type User = { user_id: string; email: string; name: string; picture: string; role: Role | null; business_name: string };
export type Presenter = {
  user_id: string; name: string; headline: string; bio: string; city: string; languages: string[]; categories: string[];
  photos: string[]; price_per_video: number; price_part_time: number; price_full_time: number; online: boolean;
};
export type Offer = {
  offer_id: string; business_id: string; business_name: string; presenter_id: string; presenter_name: string; presenter_photo: string;
  plan: Plan; brief: string; budget: number; status: "pending" | "accepted" | "declined"; conversation_id: string; created_at: string;
};
export type Conversation = {
  conversation_id: string; business_id: string; business_name: string; presenter_id: string; presenter_name: string;
  presenter_photo: string; last_message: string; updated_at: string;
};
export type Message = { message_id: string; conversation_id: string; sender_id: string; text: string; created_at: string };

type Creator = Record<string, any>;
type Deal = Record<string, any>;
type WebsiteMe = { user: Record<string, any>; creator: Creator | null; business: Record<string, any> | null };

export const PLANS: { key: Plan; title: string; desc: string; icon: string; priceKey: keyof Presenter; unit: string }[] = [
  { key: "per_video", title: "Per Video", desc: "One finished video, from the presenter's price", icon: "videocam-outline", priceKey: "price_per_video", unit: "/video" },
  { key: "part_time", title: "Part-time", desc: "Up to 8 videos + 1 shoot day a month", icon: "calendar-outline", priceKey: "price_part_time", unit: "/month" },
  { key: "full_time", title: "Full-time", desc: "Your dedicated face, up to 20 videos a month", icon: "ribbon-outline", priceKey: "price_full_time", unit: "/month" },
];

export const planTitle = (p: string) => PLANS.find((x) => x.key === p)?.title ?? p;
export const rupees = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");
export const imgUrl = (u?: string) => (!u ? "" : u.startsWith("/api/") ? `${BASE}${u}` : u);

function presenter(c: Creator): Presenter {
  return {
    user_id: c.user_id,
    name: c.name || "Presenter",
    headline: c.categories?.length ? c.categories.join(" · ") : "",
    bio: c.bio || "",
    city: [c.city, c.state].filter(Boolean).join(", "),
    languages: c.languages || [],
    categories: c.categories || (c.category ? [c.category] : []),
    photos: c.photo ? [c.photo] : [],
    price_per_video: c.rate_per_video || 0,
    price_part_time: c.rate_part_time || 0,
    price_full_time: c.rate_full_time || 0,
    online: c.live !== false,
  };
}

function offer(d: Deal): Offer {
  return {
    offer_id: d.id,
    business_id: d.business_id,
    business_name: d.business_name || "Business",
    presenter_id: d.creator_id,
    presenter_name: d.creator_name || "Presenter",
    presenter_photo: d.creator_photo || "",
    plan: d.plan || "per_video",
    brief: d.brief || d.last_message || "Start a conversation",
    budget: d.price || d.counter_price || 0,
    status: d.status === "accepted" ? "accepted" : d.status === "declined" ? "declined" : "pending",
    conversation_id: d.id,
    created_at: d.created_at || d.updated_at,
  };
}

function conversation(d: Deal): Conversation {
  return {
    conversation_id: d.id,
    business_id: d.business_id,
    business_name: d.business_name || "Business",
    presenter_id: d.creator_id,
    presenter_name: d.creator_name || "Presenter",
    presenter_photo: d.creator_photo || "",
    last_message: d.last_message || (d.status === "chat" ? "Start the conversation" : d.brief || "Offer sent"),
    updated_at: d.updated_at || d.created_at,
  };
}

function message(m: Record<string, any>): Message {
  return { message_id: m.id, conversation_id: m.deal_id, sender_id: m.sender_id, text: m.text, created_at: m.created_at };
}

function member(me: WebsiteMe): User {
  const mode = me.user?.active_mode;
  return {
    user_id: me.user?.user_id,
    email: me.user?.email || "",
    name: me.user?.name || "HireAvatar member",
    picture: me.user?.image_url || "",
    role: mode === "creator" ? "presenter" : mode === "business" ? "business" : null,
    business_name: me.business?.company || "",
  };
}

async function raw<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", ...(init.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body && !(init.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 15_000);
  try {
    const res = await fetch(`${API}${path}`, { ...init, signal: init.signal ?? timeout.signal, headers });
    if (!res.ok) {
      let msg = `Something went wrong (${res.status})`;
      try {
        const body = await res.json();
        if (typeof body.detail === "string") msg = body.detail;
        else if (Array.isArray(body.detail)) msg = body.detail[0]?.msg ?? msg;
      } catch {}
      const error = new Error(msg) as Error & { status?: number };
      error.status = res.status;
      throw error;
    }
    return res.json();
  } catch (error) {
    if (timeout.signal.aborted) throw new Error("The request took too long. Please try again.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function request<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const method = init.method || "GET";
  if (path === "/me" || path === "/me/sync") return member(await raw<WebsiteMe>("/me", token)) as T;

  if (path === "/categories") {
    const creators = await raw<Creator[]>("/creators?limit=100", null);
    return Array.from(new Set(creators.flatMap((c) => c.categories || []))).sort() as T;
  }

  if (path.startsWith("/presenters")) {
    const rest = path.slice("/presenters".length);
    if (rest === "/me") {
      if (method === "PUT") {
        const me = await raw<WebsiteMe>("/me", token);
        if (!me.creator) throw new Error("Create your presenter profile on hireavatar.co first.");
        const input = JSON.parse(String(init.body || "{}"));
        const profile = {
          ...me.creator,
          name: input.name,
          photo: input.photos?.[0] || me.creator.photo,
          city: input.city,
          categories: input.categories,
          languages: input.languages,
          bio: input.bio,
          rate_per_video: input.price_per_video,
          rate_part_time: input.price_part_time,
          rate_full_time: input.price_full_time,
        };
        const saved = await raw<Creator>("/creators/me", token, { method: "PUT", body: JSON.stringify(profile) });
        return presenter(saved) as T;
      }
      const me = await raw<WebsiteMe>("/me", token);
      if (!me.creator) throw new Error("No presenter profile yet");
      return presenter(me.creator) as T;
    }
    if (rest.startsWith("?")) {
      const params = new URLSearchParams(rest.slice(1));
      const skip = Number(params.get("skip") || 0);
      const limit = Number(params.get("limit") || 20);
      params.delete("skip");
      const rows = await raw<Creator[]>(`/creators?${params.toString()}`, null);
      return rows.slice(skip, skip + limit).map(presenter) as T;
    }
    return presenter(await raw<Creator>(`/creators${rest}`, null)) as T;
  }

  if (path.startsWith("/offers")) {
    const rest = path.slice("/offers".length);
    if (!rest || rest.startsWith("?")) {
      if (method === "POST") {
        const input = JSON.parse(String(init.body || "{}"));
        const deal = await raw<Deal>("/deals", token, { method: "POST", body: JSON.stringify({ creator_id: input.presenter_id, plan: input.plan, brief: input.brief, price: input.budget, start_date: new Date().toISOString().slice(0, 10) }) });
        return offer(deal) as T;
      }
      const params = new URLSearchParams(rest.startsWith("?") ? rest.slice(1) : "");
      const status = params.get("status") || "";
      const deals = await raw<Deal[]>("/deals", token);
      return deals.filter((d) => d.status !== "chat" && (!status || d.status === status)).map(offer) as T;
    }
    const match = rest.match(/^\/([^/]+)\/respond$/);
    if (match) {
      const action = JSON.parse(String(init.body || "{}")).action;
      return offer(await raw<Deal>(`/deals/${match[1]}/action`, token, { method: "POST", body: JSON.stringify({ action }) })) as T;
    }
  }

  if (path.startsWith("/conversations")) {
    const rest = path.slice("/conversations".length);
    if (!rest) return (await raw<Deal[]>("/deals", token)).map(conversation) as T;
    const messageMatch = rest.match(/^\/([^/]+)\/messages$/);
    if (messageMatch) {
      const dealId = messageMatch[1];
      if (method === "POST") return message(await raw(`/deals/${dealId}/messages`, token, init)) as T;
      return (await raw<Record<string, any>[]>(`/deals/${dealId}/messages`, token)).map(message) as T;
    }
    return conversation(await raw<Deal>(`/deals${rest}`, token)) as T;
  }

  return raw<T>(path, token, init);
}