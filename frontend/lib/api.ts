export type VideoStatus = "pending" | "extracting" | "transcribing" | "embedding" | "ready" | "failed";

export interface VideoListItem {
  id: string;
  title: string;
  status: VideoStatus;
  duration_seconds: number | null;
  created_at: string;
  summary?: string | null;
  thumbnail_url?: string | null;
}

export interface Chapter {
  id: number;
  title: string;
  summary: string;
  start_seconds: number;
  end_seconds: number;
  order_index: number;
}

export interface VideoDetail extends VideoListItem {
  video_url?: string | null;
  transcript?: { full_text: string; language?: string | null } | null;
  chapters: Chapter[];
}

export interface SearchResult {
  chunk_id: number;
  video_id: string;
  video_title: string;
  text: string;
  start_seconds: number;
  end_seconds: number;
  relevance_score: number;
}

export interface ProgressMessage {
  status: string;
  percent: number;
  message: string;
}

export interface UserProfile {
  id: number;
  email: string;
  credits_remaining: number;
  created_at: string;
}

export interface CreditHistoryItem {
  id: number;
  delta: number;
  reason: string;
  created_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getHeaders(token?: string, extra?: HeadersInit): HeadersInit {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra
  };
}

export async function apiFetch<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: getHeaders(token, init?.headers),
    cache: "no-store"
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function loginUser(email: string, password: string): Promise<AuthToken> {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  const response = await fetch(`${API_URL}/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error((await response.text()) || "Unable to sign in");
  }

  return response.json() as Promise<AuthToken>;
}

export async function registerUser(email: string, password: string): Promise<UserProfile> {
  return apiFetch<UserProfile>("/auth/register", undefined, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });
}

export async function updateProfile(email: string, token: string): Promise<UserProfile> {
  return apiFetch<UserProfile>("/auth/me", token, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email })
  });
}

export async function changePassword(currentPassword: string, nextPassword: string, token: string): Promise<void> {
  await apiFetch("/auth/change-password", token, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: nextPassword
    })
  });
}

export function uploadVideo(
  file: File,
  token: string,
  onProgress: (percent: number) => void
): Promise<{ id: string; status: VideoStatus; title: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/videos`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(xhr.responseText || `Upload failed with ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  });
}

export async function streamQa(
  videoId: string,
  question: string,
  token: string,
  onChunk: (chunk: string) => void
) {
  const response = await fetch(
    `${API_URL}/qa/${videoId}?${new URLSearchParams({ q: question }).toString()}`,
    { headers: getHeaders(token) }
  );
  if (!response.ok || !response.body) {
    throw new Error(await response.text());
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

export function progressSocket(videoId: string, token: string) {
  const url = new URL(`${API_URL.replace(/^http/, "ws")}/videos/${videoId}/progress`);
  url.searchParams.set("token", token);
  return new WebSocket(url.toString());
}
