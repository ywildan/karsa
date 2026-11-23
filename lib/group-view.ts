/**
 * Karsa — lib/group-view.ts
 * ----------------------------------------------------------------------------
 * Tipe & formatter tampilan grup web. Service grup mengembalikan `unknown`;
 * halaman memakai tipe ini untuk membaca data yang sudah diserialisasi.
 */
export type GroupMessageState = "active" | "deleted" | "hidden" | "blocked";

export interface GroupLastMessageView {
  id: string;
  state: GroupMessageState;
  text: string | null;
  created_at: Date | string;
  author: { id: string; name: string };
}

export interface GroupSummaryView {
  id: string;
  matkul: { name: string; code: string | null };
  kelas: {
    name: string;
    prodi: { name: string };
    semester: { name: string };
  };
  pj: { id: string; name: string; image: string | null };
  member_count: number;
  is_manager: boolean;
  is_locked: boolean;
  last_message: GroupLastMessageView | null;
}

export interface GroupReplyView {
  id: string;
  state: GroupMessageState;
  text: string | null;
  author: { id: string; name: string; is_group_manager: boolean };
}

export interface GroupMessageView {
  id: string;
  state: GroupMessageState;
  text: string | null;
  hidden_reason: string | null;
  edited_at: Date | string | null;
  created_at: Date | string;
  is_pinned: boolean;
  is_own: boolean;
  author: { id: string; name: string; is_group_manager: boolean };
  reply_to: GroupReplyView | null;
}

export interface GroupDetailView {
  group: {
    id: string;
    matkul: { name: string; code: string | null };
    kelas: {
      name: string;
      prodi: { name: string };
      semester: { name: string };
    };
    pj: { id: string; name: string };
    is_manager: boolean;
    is_locked: boolean;
  };
  messages: GroupMessageView[];
  pinned_messages: GroupMessageView[];
  next_cursor: string | null;
}

export function groupLastMessagePreview(
  last: GroupLastMessageView | null,
): string {
  if (!last) return "Belum ada pesan.";
  if (last.state === "deleted") return "Pesan terakhir dihapus.";
  if (last.state === "hidden") return "Pesan terakhir disembunyikan.";
  if (last.state === "blocked") return "Pesan terakhir diblokir.";
  const text = (last.text ?? "").trim();
  return `${last.author.name}: ${text}`;
}

/** `23 Nov 2026, 14.32 WIB` — deterministik untuk server & client. */
export function formatChatTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Jakarta",
  }).format(date)} WIB`;
}
