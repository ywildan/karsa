"use client";

/**
 * Karsa — components/group/group-chat.tsx
 * ----------------------------------------------------------------------------
 * Pembaca chat grup (read-only) + composer palsu yang mengarahkan pengiriman
 * pesan ke APK.
 */
import * as React from "react";
import Link from "next/link";
import {
  Download,
  Lock,
  MessagesSquare,
  Pin,
  Send,
  Smartphone,
  X,
} from "lucide-react";

import { Button } from "@/components/button";
import {
  formatChatTime,
  type GroupDetailView,
  type GroupMessageView,
} from "@/lib/group-view";
import { getInitials } from "@/lib/utils";

export function GroupChat({ data }: { data: GroupDetailView }) {
  const endRef = React.useRef<HTMLDivElement>(null);
  const [lockOpen, setLockOpen] = React.useState(false);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {data.pinned_messages.length > 0 ? (
        <section className="rounded-xl border border-border bg-accent/50 p-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-accent-foreground">
            <Pin className="h-3.5 w-3.5" aria-hidden />
            Disematkan
          </p>
          <ul className="mt-2 grid gap-1.5">
            {data.pinned_messages.slice(0, 3).map((message) => (
              <li key={message.id} className="truncate text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {message.author.name}
                </span>
                : {messageStateText(message)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.group.is_locked ? (
        <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs leading-5 text-amber-800 dark:text-amber-200">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Grup sedang dikunci PJ. Pesan tetap bisa dibaca, tetapi tidak ada
          pesan baru sampai grup dibuka kembali lewat APK.
        </p>
      ) : null}

      {data.next_cursor ? (
        <p className="rounded-xl border border-dashed border-border px-3.5 py-2.5 text-center text-xs text-muted-foreground">
          Menampilkan 50 pesan terbaru. Pesan lebih lama tersedia di APK.
        </p>
      ) : null}

      {data.messages.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <MessagesSquare className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <h2 className="mt-3 text-lg font-semibold tracking-tight">
            Belum ada pesan
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Mulai percakapan dari APK. Pesan yang masuk akan muncul di sini.
          </p>
        </section>
      ) : (
        <ul className="grid gap-2.5">
          {data.messages.map((message) => (
            <li key={message.id}>
              <MessageBubble message={message} />
            </li>
          ))}
        </ul>
      )}

      <div ref={endRef} />

      <div className="sticky bottom-0 z-20 mt-2 border-t border-border bg-background/95 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLockOpen(true)}
            className="h-11 flex-1 rounded-md border border-input bg-background px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Tulis pesan...
          </button>
          <Button type="button" onClick={() => setLockOpen(true)}>
            <Send aria-hidden />
            Kirim
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Membaca bisa di web. Mengirim pesan hanya lewat APK.
        </p>
      </div>

      {lockOpen ? <ChatLockDialog onClose={() => setLockOpen(false)} /> : null}
    </div>
  );
}

function MessageBubble({ message }: { message: GroupMessageView }) {
  const own = message.is_own;
  const stateText = messageStateText(message);

  return (
    <div className={`flex ${own ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          own
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card text-foreground"
        }`}
      >
        {!own ? (
          <div className="mb-1 flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">
              {getInitials(message.author.name)}
            </span>
            <span className="text-xs font-semibold">{message.author.name}</span>
            {message.author.is_group_manager ? (
              <span className="rounded-full border border-border px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                PJ
              </span>
            ) : null}
          </div>
        ) : null}

        {message.reply_to ? (
          <div
            className={`mb-2 rounded-lg border-l-2 px-2.5 py-1.5 text-xs ${
              own
                ? "border-primary-foreground/40 bg-black/10 text-primary-foreground/80"
                : "border-primary/50 bg-muted/60 text-muted-foreground"
            }`}
          >
            <p className="font-medium">{message.reply_to.author.name}</p>
            <p className="line-clamp-2">
              {message.reply_to.state === "active"
                ? message.reply_to.text
                : "Pesan tidak tersedia"}
            </p>
          </div>
        ) : null}

        <p
          className={`whitespace-pre-wrap break-words text-sm leading-6 ${
            message.state === "active"
              ? ""
              : own
                ? "italic text-primary-foreground/70"
                : "italic text-muted-foreground"
          }`}
        >
          {stateText}
        </p>

        <div
          className={`mt-1 flex flex-wrap items-center gap-2 text-[10px] ${
            own ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          <span>{formatChatTime(message.created_at)}</span>
          {message.edited_at ? <span>· diedit</span> : null}
          {message.is_pinned ? (
            <span className="inline-flex items-center gap-0.5">
              <Pin className="h-2.5 w-2.5" aria-hidden />
              disematkan
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function messageStateText(message: GroupMessageView): string {
  if (message.state === "deleted") return "Pesan dihapus.";
  if (message.state === "hidden") {
    return message.hidden_reason
      ? `Pesan disembunyikan PJ: ${message.hidden_reason}`
      : "Pesan disembunyikan PJ.";
  }
  if (message.state === "blocked") {
    return "Pesan dari pengguna yang kamu blokir.";
  }
  return message.text ?? "";
}

function ChatLockDialog({ onClose }: { onClose: () => void }) {
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Tutup dialog"
        onClick={onClose}
        className="absolute inset-0 bg-espresso/45 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="grup-lock-title"
        className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-soft"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <Smartphone className="h-6 w-6" aria-hidden />
        </div>
        <h2
          id="grup-lock-title"
          className="mt-4 text-lg font-semibold tracking-tight"
        >
          Kirim pesan di APK
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Mengirim pesan saat ini hanya bisa dilakukan melalui APK. Unduh
          SiKarsa untuk membalas dan ikut berdiskusi di grup kelas.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button asChild className="flex-1">
            <Link href="/unduh">
              <Download aria-hidden />
              Unduh APK
            </Link>
          </Button>
          <Button
            ref={closeRef}
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            <X aria-hidden />
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
