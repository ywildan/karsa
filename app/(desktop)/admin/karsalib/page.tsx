import type { Metadata } from "next";
import { BookOpenText, CircleCheck, Clock3, MessageCircleWarning, Users } from "lucide-react";

import {
  decideLibAuthorRequestAction,
  resolveLibReportAction,
  revokeLibAuthorAction,
} from "@/actions/karsa-lib-admin";
import { AdminNav } from "@/components/admin-nav";
import { requireAdmin } from "@/lib/auth-helpers";
import { formatDateTimeWib, formatNumber } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Kelola Karsa Lib" };

export default async function KarsaLibAdminPage() {
  await requireAdmin();
  const [requests, writers, reports, articles, stats] = await Promise.all([
    prisma.libAuthorRequest.findMany({
      where: { status: "PENDING" }, orderBy: { submitted_at: "asc" }, take: 100,
      select: { id: true, motivation: true, topics: true, submitted_at: true, user: { select: { name: true, email: true, libProfile: { select: { display_name: true, faculty: true, prodi: { select: { name: true } } } } } } },
    }),
    prisma.libAuthorAccess.findMany({
      where: { revoked_at: null }, orderBy: { granted_at: "desc" }, take: 100,
      select: { user_id: true, granted_at: true, user: { select: { email: true, libProfile: { select: { display_name: true, faculty: true, prodi: { select: { name: true } } } } } } },
    }),
    prisma.libReport.findMany({
      where: { status: "PENDING" }, orderBy: { created_at: "asc" }, take: 100,
      select: {
        id: true, reason: true, details: true, created_at: true, article_id: true, comment_id: true,
        reporter: { select: { email: true, libProfile: { select: { display_name: true } } } },
        article: { select: { title: true, author: { select: { libProfile: { select: { display_name: true } } } } } },
        comment: { select: { body: true, article: { select: { title: true } }, author: { select: { libProfile: { select: { display_name: true } } } } } },
      },
    }),
    prisma.libArticle.findMany({
      orderBy: { updated_at: "desc" }, take: 50,
      select: { id: true, title: true, status: true, updated_at: true, prodi: { select: { name: true } }, author: { select: { libProfile: { select: { display_name: true } } } }, _count: { select: { views: true, comments: true } } },
    }),
    Promise.all([
      prisma.libArticle.count({ where: { status: "PUBLISHED" } }),
      prisma.libArticle.count({ where: { status: "ARCHIVED" } }),
      prisma.libAuthorRequest.count({ where: { status: "PENDING" } }),
      prisma.libReport.count({ where: { status: "PENDING" } }),
    ]),
  ]);

  const cards = [
    { label: "Artikel terbit", value: stats[0], icon: BookOpenText },
    { label: "Artikel diarsipkan", value: stats[1], icon: BookOpenText },
    { label: "Permohonan penulis", value: stats[2], icon: Users },
    { label: "Laporan ditinjau", value: stats[3], icon: MessageCircleWarning },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <AdminNav />
      <header>
        <p className="text-sm font-medium text-primary">Kelola Karsa Lib</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Artikel, penulis, dan laporan</h1>
        <p className="mt-1 text-sm text-muted-foreground">Kelola akses menulis dan tinjau konten yang dibagikan di Karsa Lib.</p>
      </header>

      <section aria-label="Ringkasan Karsa Lib" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => { const Icon = card.icon; return <div key={card.label} className="rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between text-muted-foreground"><span className="text-xs">{card.label}</span><Icon className="h-4 w-4" aria-hidden /></div><p className="mt-2 text-2xl font-semibold">{formatNumber(card.value)}</p></div>; })}
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-semibold">Permohonan penulis</h2><p className="mt-1 text-xs text-muted-foreground">Setujui permohonan untuk membuka fitur menulis dan vault.</p></div><Clock3 className="h-5 w-5 text-muted-foreground" /></div>
        {requests.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">Tidak ada permohonan yang menunggu.</p> : <div className="divide-y divide-border">{requests.map((request) => {
          const profile = request.user.libProfile;
          return <div key={request.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_1fr_auto] lg:items-start">
            <div><p className="font-medium">{profile?.display_name || request.user.name || "Mahasiswa"}</p><p className="text-xs text-muted-foreground">{request.user.email}</p><p className="mt-1 text-xs text-muted-foreground">{profile?.prodi.name || "Prodi belum diatur"}{profile?.faculty ? ` · ${profile.faculty}` : ""}</p><p className="mt-2 text-[11px] text-muted-foreground">Diajukan {formatDateTimeWib(request.submitted_at)}</p></div>
            <div className="space-y-2 text-sm"><p><span className="font-medium">Alasan:</span> {request.motivation}</p><p><span className="font-medium">Topik:</span> {request.topics}</p></div>
            <div className="flex gap-2"><form action={decideLibAuthorRequestAction}><input type="hidden" name="id" value={request.id} /><input type="hidden" name="decision" value="APPROVE" /><button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"><CircleCheck className="h-4 w-4" />Setujui</button></form><form action={decideLibAuthorRequestAction}><input type="hidden" name="id" value={request.id} /><input type="hidden" name="decision" value="REJECT" /><button className="h-9 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent">Tolak</button></form></div>
          </div>;
        })}</div>}
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4"><h2 className="font-semibold">Penulis aktif</h2><p className="mt-1 text-xs text-muted-foreground">Cabut akses jika pengguna tidak lagi perlu menerbitkan artikel.</p></div>
        {writers.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">Belum ada penulis aktif.</p> : <div className="divide-y divide-border">{writers.map((writer) => <div key={writer.user_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"><div><p className="text-sm font-medium">{writer.user.libProfile?.display_name || writer.user.email}</p><p className="text-xs text-muted-foreground">{writer.user.libProfile?.prodi.name || writer.user.email} · Akses sejak {formatDateTimeWib(writer.granted_at)}</p></div><form action={revokeLibAuthorAction}><input type="hidden" name="user_id" value={writer.user_id} /><button className="h-8 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent">Cabut akses</button></form></div>)}</div>}
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4"><h2 className="font-semibold">Laporan yang menunggu</h2><p className="mt-1 text-xs text-muted-foreground">Hapus komentar atau arsipkan artikel hanya setelah meninjau laporan.</p></div>
        {reports.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">Tidak ada laporan yang menunggu.</p> : <div className="divide-y divide-border">{reports.map((report) => {
          const isComment = report.comment_id !== null;
          const targetTitle = report.article?.title || report.comment?.article.title || "Artikel";
          const content = isComment ? report.comment?.body || "Komentar sudah dihapus" : report.article?.title || "Artikel tidak ditemukan";
          return <div key={report.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-primary">{isComment ? "Laporan komentar" : "Laporan artikel"} · {report.reason}</p><p className="mt-1 text-sm font-medium">{content}</p><p className="mt-1 text-xs text-muted-foreground">Artikel: {targetTitle} · Pelapor: {report.reporter.libProfile?.display_name || report.reporter.email} · {formatDateTimeWib(report.created_at)}</p>{report.details ? <p className="mt-2 text-xs text-muted-foreground">{report.details}</p> : null}</div>
            <div className="flex gap-2"><form action={resolveLibReportAction}><input type="hidden" name="id" value={report.id} /><input type="hidden" name="decision" value="REMOVE" /><button className="h-9 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">{isComment ? "Hapus komentar" : "Arsipkan artikel"}</button></form><form action={resolveLibReportAction}><input type="hidden" name="id" value={report.id} /><input type="hidden" name="decision" value="DISMISS" /><button className="h-9 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent">Tolak laporan</button></form></div>
          </div>;
        })}</div>}
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4"><h2 className="font-semibold">Artikel terbaru</h2><p className="mt-1 text-xs text-muted-foreground">Draf terlihat oleh admin untuk kebutuhan pengelolaan.</p></div>
        {articles.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">Belum ada artikel.</p> : <div className="divide-y divide-border">{articles.map((article) => <div key={article.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"><div><p className="text-sm font-medium">{article.title}</p><p className="text-xs text-muted-foreground">{article.author.libProfile?.display_name || "Penulis"} · {article.prodi.name} · {article._count.views} pembaca · {article._count.comments} komentar · diperbarui {formatDateTimeWib(article.updated_at)}</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold">{article.status === "PUBLISHED" ? "Terbit" : article.status === "ARCHIVED" ? "Arsip" : "Draf"}</span></div>)}</div>}
      </section>
      <p className="text-xs text-muted-foreground">Laporan artikel juga dikirim ke email pengelola jika konfigurasi email sudah dipasang.</p>
    </main>
  );
}
