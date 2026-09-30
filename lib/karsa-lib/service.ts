import "server-only";

import { Prisma } from "@prisma/client";
import { z } from "zod";

import type { MobileActor } from "@/lib/mobile/auth";
import { prisma } from "@/lib/prisma";
import { notifyArticleReport } from "./notifications";

import {
  KARSA_LIB_ARTICLE_MAX_BODY,
  KARSA_LIB_ARTICLE_MAX_TITLE,
  KARSA_LIB_COMMENT_MAX_BODY,
  KARSA_LIB_PAGE_SIZE,
} from "./constants";

type Failure = { ok: false; status: number; code: string; message: string };
type Success<T> = { ok: true; data: T; status?: number };
export type LibResult<T> = Success<T> | Failure;

const fail = (status: number, code: string, message: string): Failure => ({
  ok: false,
  status,
  code,
  message,
});

const idSchema = z.string().trim().min(1).max(128);
const articleInputSchema = z.object({
  title: z.string().trim().min(3).max(KARSA_LIB_ARTICLE_MAX_TITLE),
  body: z.string().trim().min(1).max(KARSA_LIB_ARTICLE_MAX_BODY),
});
const commentInputSchema = z.object({
  body: z.string().trim().min(1).max(KARSA_LIB_COMMENT_MAX_BODY),
  parent_id: idSchema.nullish().transform((value) => value || null),
});
const requestInputSchema = z.object({
  motivation: z.string().trim().min(20).max(2_000),
  topics: z.string().trim().min(3).max(500),
  accepted_guidelines: z.literal(true),
});
const reportInputSchema = z.object({
  article_id: idSchema.optional(),
  comment_id: idSchema.optional(),
  reason: z.enum(["MISINFORMATION", "INAPPROPRIATE", "SPAM", "COPYRIGHT", "OTHER"]),
  details: z.string().trim().max(1_000).optional().transform((value) => value || null),
}).refine((value) => Boolean(value.article_id) !== Boolean(value.comment_id));

function profileMissing(actor: MobileActor) {
  return actor.lib_profile === null;
}

function canReadLib(actor: MobileActor) {
  return !actor.is_admin && actor.capabilities.view_karsa_lib;
}

function canWriteLib(actor: MobileActor) {
  return canReadLib(actor) && actor.capabilities.write_karsa_lib;
}

function requiredProfile(actor: MobileActor) {
  if (!canReadLib(actor)) return null;
  return actor.lib_profile;
}

function accessError<T>(actor: MobileActor): LibResult<T> | null {
  if (!canReadLib(actor)) {
    return fail(403, "LIB_FORBIDDEN", "Karsa Lib hanya tersedia untuk akun mahasiswa UNTIDAR.");
  }
  return null;
}

function profileError<T>(actor: MobileActor): LibResult<T> | null {
  const access = accessError<T>(actor);
  if (access) return access;
  if (profileMissing(actor)) {
    return fail(409, "LIB_PROFILE_REQUIRED", "Lengkapi profil Karsa Lib terlebih dahulu.");
  }
  return null;
}

function writerError<T>(actor: MobileActor): LibResult<T> | null {
  const profile = profileError<T>(actor);
  if (profile) return profile;
  if (!canWriteLib(actor)) {
    return fail(403, "LIB_WRITER_REQUIRED", "Fitur ini tersedia setelah akses penulis disetujui.");
  }
  return null;
}

function displayName(name: string | null | undefined, fallback: string) {
  return name?.trim() || fallback;
}

export async function getBootstrap(actor: MobileActor): Promise<LibResult<unknown>> {
  const denied = accessError(actor);
  if (denied) return denied;

  const [programs, faculties, classes] = await Promise.all([
    prisma.prodi.findMany({ where: { faculty_id: { not: null } }, select: { id: true, name: true, faculty_id: true }, orderBy: { name: "asc" } }),
    prisma.faculty.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.kelas.findMany({
      where: actor.lib_profile ? { prodi_id: actor.lib_profile.prodi_id } : undefined,
      select: { id: true, name: true, prodi_id: true, semester: { select: { name: true } } },
      orderBy: [{ semester: { name: "desc" } }, { name: "asc" }],
    }),
  ]);

  const request = await prisma.libAuthorRequest.findFirst({
    where: { user_id: actor.id },
    orderBy: { submitted_at: "desc" },
    select: { id: true, status: true, submitted_at: true, decision_note: true },
  });

  return {
    ok: true,
    data: {
      profile: actor.lib_profile,
      faculties,
      programs,
      classes,
      can_write: canWriteLib(actor),
      latest_author_request: request,
    },
  };
}

export async function createProfile(
  actor: MobileActor,
  input: unknown,
): Promise<LibResult<unknown>> {
  const denied = accessError(actor);
  if (denied) return denied;
  if (actor.lib_profile) {
    return fail(409, "LIB_PROFILE_LOCKED", "Profil Karsa Lib sudah dibuat; fakultas dan prodi tidak dapat diubah.");
  }
  const schema = z.object({
    display_name: z.string().trim().min(2).max(80),
    faculty_id: idSchema,
    prodi_id: idSchema,
    kelas_id: idSchema.nullish().transform((value) => value || null),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail(400, "INVALID_PROFILE", parsed.error.issues[0]?.message ?? "Profil tidak valid.");

  const program = await prisma.prodi.findFirst({ where: { id: parsed.data.prodi_id, faculty_id: parsed.data.faculty_id }, select: { id: true, faculty_id: true, faculty: { select: { name: true } } } });
  if (!program?.faculty_id || !program.faculty) return fail(400, "INVALID_PROGRAM", "Program studi tidak terhubung dengan fakultas yang dipilih.");
  if (parsed.data.kelas_id) {
    const classRecord = await prisma.kelas.findFirst({
      where: { id: parsed.data.kelas_id, prodi_id: parsed.data.prodi_id },
      select: { id: true },
    });
    if (!classRecord) return fail(400, "INVALID_CLASS", "Kelas harus berasal dari program studi yang dipilih.");
  }

  try {
    const profile = await prisma.libProfile.create({
      data: { user_id: actor.id, faculty: program.faculty.name, faculty_id: program.faculty_id, prodi_id: program.id, display_name: parsed.data.display_name, kelas_id: parsed.data.kelas_id },
      select: { display_name: true, faculty: true, faculty_id: true, prodi_id: true, kelas_id: true },
    });
    return { ok: true, data: profile, status: 201 };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(409, "LIB_PROFILE_LOCKED", "Profil Karsa Lib sudah pernah dibuat.");
    }
    throw error;
  }
}

export type LibFeedSort = "latest" | "trending_7d" | "trending_30d";

export async function listFeed(
  actor: MobileActor,
  options: { sort: LibFeedSort; query: string } = { sort: "latest", query: "" },
): Promise<LibResult<unknown>> {
  const denied = profileError(actor);
  if (denied) return denied;
  const profile = requiredProfile(actor)!;
  const where: Prisma.LibArticleWhereInput = {
    prodi_id: profile.prodi_id,
    status: "PUBLISHED",
    ...(options.query ? { title: { contains: options.query, mode: "insensitive" } } : {}),
  };
  const select = {
    id: true,
    title: true,
    body: true,
    published_at: true,
    updated_at: true,
    author_id: true,
    author: { select: { libProfile: { select: { display_name: true, faculty: true, prodi: { select: { name: true } } } } } },
    prodi: { select: { name: true } },
    _count: { select: { views: true, comments: true } },
  } satisfies Prisma.LibArticleSelect;

  let rankedIds: string[] | null = null;
  let periodViews: Map<string, number> | null = null;
  if (options.sort !== "latest") {
    const days = options.sort === "trending_7d" ? 7 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const titleFilter = options.query
      ? Prisma.sql`AND STRPOS(LOWER(a.title), LOWER(${options.query})) > 0`
      : Prisma.empty;
    // Hitung seluruh artikel terbit dalam prodi, bukan hanya 30 artikel terbaru.
    const ranked = await prisma.$queryRaw<Array<{ id: string; period_views: number }>>(
      Prisma.sql`
        SELECT a.id, COUNT(v.id)::int AS period_views
        FROM "LibArticle" a
        LEFT JOIN "LibArticleView" v
          ON v.article_id = a.id AND v.created_at >= ${since}
        WHERE a.prodi_id = ${profile.prodi_id}
          AND a.status = 'PUBLISHED'
          ${titleFilter}
        GROUP BY a.id, a.published_at
        ORDER BY period_views DESC, a.published_at DESC NULLS LAST, a.id DESC
        LIMIT ${KARSA_LIB_PAGE_SIZE}
      `,
    );
    rankedIds = ranked.map((row) => row.id);
    periodViews = new Map(ranked.map((row) => [row.id, row.period_views]));
  }

  if (rankedIds !== null && rankedIds.length === 0) return { ok: true, data: [] };
  const rows = await prisma.libArticle.findMany({
    where: rankedIds === null ? where : { ...where, id: { in: rankedIds } },
    ...(rankedIds === null
      ? { orderBy: [{ published_at: "desc" as const }, { id: "desc" as const }], take: KARSA_LIB_PAGE_SIZE }
      : {}),
    select,
  });
  if (rankedIds !== null) {
    const positions = new Map(rankedIds.map((id, index) => [id, index]));
    rows.sort((a, b) => (positions.get(a.id) ?? 0) - (positions.get(b.id) ?? 0));
  }
  return {
    ok: true,
    data: rows.map((row) => ({
      ...row,
      body_preview: row.body.length > 220 ? `${row.body.slice(0, 217).trimEnd()}…` : row.body,
      author: {
        id: row.author_id,
        name: displayName(row.author.libProfile?.display_name, "Mahasiswa Karsa"),
        faculty: row.author.libProfile?.faculty ?? null,
        prodi_name: row.author.libProfile?.prodi.name ?? row.prodi.name,
      },
      views: row._count.views,
      period_views: periodViews?.get(row.id),
      comments_count: row._count.comments,
      _count: undefined,
      author_id: undefined,
    })),
  };
}

export async function listVault(actor: MobileActor): Promise<LibResult<unknown>> {
  const denied = writerError(actor);
  if (denied) return denied;
  const rows = await prisma.libArticle.findMany({
    where: { author_id: actor.id },
    orderBy: [{ updated_at: "desc" }, { id: "desc" }],
    select: {
      id: true, title: true, body: true, status: true,
      published_at: true, archived_at: true, updated_at: true,
      _count: { select: { views: true, comments: true } },
    },
  });
  return { ok: true, data: rows.map((row) => ({ ...row, views: row._count.views, comments_count: row._count.comments, _count: undefined })) };
}

export async function getAuthorProfile(actor: MobileActor, authorId: string): Promise<LibResult<unknown>> {
  const denied = profileError(actor);
  if (denied) return denied;
  if (!idSchema.safeParse(authorId).success) return fail(404, "AUTHOR_NOT_FOUND", "Profil penulis tidak ditemukan.");
  const profile = requiredProfile(actor)!;
  const authorProfile = await prisma.libProfile.findUnique({
    where: { user_id: authorId },
    select: {
      user_id: true, display_name: true, faculty: true, prodi_id: true,
      prodi: { select: { name: true } }, user: { select: { image: true } },
    },
  });
  if (!authorProfile || authorProfile.prodi_id !== profile.prodi_id) {
    return fail(404, "AUTHOR_NOT_FOUND", "Profil penulis tidak ditemukan.");
  }
  const articles = await prisma.libArticle.findMany({
    where: { author_id: authorId, prodi_id: profile.prodi_id, status: "PUBLISHED" },
    orderBy: [{ published_at: "desc" }, { id: "desc" }],
    select: {
      id: true, title: true, body: true, published_at: true,
      _count: { select: { views: true, comments: true } },
    },
  });
  const serialized = articles.map((article) => ({
    ...article,
    body_preview: article.body.length > 220 ? `${article.body.slice(0, 217).trimEnd()}…` : article.body,
    views: article._count.views,
    comments_count: article._count.comments,
    _count: undefined,
  }));
  return {
    ok: true,
    data: {
      id: authorProfile.user_id,
      name: authorProfile.display_name,
      image: authorProfile.user.image,
      faculty: authorProfile.faculty,
      prodi_id: authorProfile.prodi_id,
      prodi_name: authorProfile.prodi.name,
      article_count: articles.length,
      total_views: articles.reduce((total, article) => total + article._count.views, 0),
      articles: serialized,
    },
  };
}

async function accessibleArticle(actor: MobileActor, articleId: string) {
  const profile = requiredProfile(actor);
  if (!profile || !idSchema.safeParse(articleId).success) return null;
  return prisma.libArticle.findFirst({
    where: { id: articleId, prodi_id: profile.prodi_id, status: "PUBLISHED" },
    select: {
      id: true, title: true, body: true, author_id: true, prodi_id: true,
      published_at: true, updated_at: true,
      author: { select: { image: true, libProfile: { select: { display_name: true, faculty: true, prodi: { select: { name: true } } } } } },
      prodi: { select: { name: true } },
      _count: { select: { views: true, comments: true } },
    },
  });
}

export async function readArticle(actor: MobileActor, articleId: string): Promise<LibResult<unknown>> {
  const denied = profileError(actor);
  if (denied) return denied;
  const article = await accessibleArticle(actor, articleId);
  if (!article) return fail(404, "ARTICLE_NOT_FOUND", "Artikel tidak ditemukan.");
  await prisma.libArticleView.createMany({
    data: [{ article_id: article.id, user_id: actor.id }],
    skipDuplicates: true,
  });
  const views = await prisma.libArticleView.count({ where: { article_id: article.id } });
  return {
    ok: true,
    data: {
      id: article.id,
      title: article.title,
      body: article.body,
      published_at: article.published_at,
      updated_at: article.updated_at,
      author: {
        id: article.author_id,
        name: displayName(article.author.libProfile?.display_name, "Mahasiswa Karsa"),
        image: article.author.image,
        faculty: article.author.libProfile?.faculty ?? null,
        prodi_name: article.author.libProfile?.prodi.name ?? article.prodi.name,
      },
      views,
      comments_count: article._count.comments,
      is_own: article.author_id === actor.id,
    },
  };
}

export async function createArticle(actor: MobileActor, input: unknown): Promise<LibResult<unknown>> {
  const denied = writerError(actor);
  if (denied) return denied;
  const parsed = articleInputSchema.safeParse(input);
  if (!parsed.success) return fail(400, "INVALID_ARTICLE", parsed.error.issues[0]?.message ?? "Artikel tidak valid.");
  const profile = requiredProfile(actor)!;
  const row = await prisma.libArticle.create({
    data: { author_id: actor.id, prodi_id: profile.prodi_id, ...parsed.data },
    select: { id: true, title: true, body: true, status: true, created_at: true, updated_at: true },
  });
  return { ok: true, data: row, status: 201 };
}

export async function updateArticle(actor: MobileActor, articleId: string, input: unknown): Promise<LibResult<unknown>> {
  const denied = writerError(actor);
  if (denied) return denied;
  const parsed = z.object({
    action: z.enum(["EDIT", "PUBLISH", "ARCHIVE", "RESTORE"]),
    title: z.string().trim().min(3).max(KARSA_LIB_ARTICLE_MAX_TITLE).optional(),
    body: z.string().trim().min(1).max(KARSA_LIB_ARTICLE_MAX_BODY).optional(),
  }).safeParse(input);
  if (!parsed.success) return fail(400, "INVALID_ARTICLE_ACTION", "Perubahan artikel tidak valid.");
  const article = await prisma.libArticle.findFirst({ where: { id: articleId, author_id: actor.id } });
  if (!article) return fail(404, "ARTICLE_NOT_FOUND", "Artikel tidak ditemukan di vault-mu.");

  let data: Prisma.LibArticleUpdateInput;
  switch (parsed.data.action) {
    case "EDIT": {
      if (!["DRAFT", "PUBLISHED"].includes(article.status)) return fail(409, "ARTICLE_STATE", "Artikel arsip tidak dapat diedit sebelum dipulihkan.");
      if (!parsed.data.title || !parsed.data.body) return fail(400, "ARTICLE_FIELDS_REQUIRED", "Judul dan isi wajib diisi.");
      data = { title: parsed.data.title, body: parsed.data.body };
      break;
    }
    case "PUBLISH":
      if (article.status !== "DRAFT") return fail(409, "ARTICLE_STATE", "Hanya draf yang dapat diterbitkan.");
      data = { status: "PUBLISHED", published_at: new Date(), archived_at: null };
      break;
    case "ARCHIVE":
      if (article.status !== "PUBLISHED") return fail(409, "ARTICLE_STATE", "Hanya artikel terbit yang dapat diarsipkan.");
      data = { status: "ARCHIVED", archived_at: new Date() };
      break;
    case "RESTORE":
      if (article.status !== "ARCHIVED") return fail(409, "ARTICLE_STATE", "Artikel ini tidak sedang diarsipkan.");
      data = { status: "PUBLISHED", archived_at: null };
      break;
  }
  const updated = await prisma.libArticle.update({ where: { id: article.id }, data, select: { id: true, title: true, body: true, status: true, published_at: true, archived_at: true, updated_at: true } });
  return { ok: true, data: updated };
}

export async function deleteDraft(actor: MobileActor, articleId: string): Promise<LibResult<unknown>> {
  const denied = writerError(actor);
  if (denied) return denied;
  const article = await prisma.libArticle.findFirst({ where: { id: articleId, author_id: actor.id }, select: { id: true, status: true } });
  if (!article) return fail(404, "ARTICLE_NOT_FOUND", "Artikel tidak ditemukan di vault-mu.");
  if (article.status !== "DRAFT") return fail(409, "ARTICLE_STATE", "Artikel yang pernah terbit hanya dapat diarsipkan.");
  await prisma.libArticle.delete({ where: { id: article.id } });
  return { ok: true, data: { id: article.id, deleted: true } };
}

export async function listComments(actor: MobileActor, articleId: string): Promise<LibResult<unknown>> {
  const denied = profileError(actor);
  if (denied) return denied;
  const article = await accessibleArticle(actor, articleId);
  if (!article) return fail(404, "ARTICLE_NOT_FOUND", "Artikel tidak ditemukan.");
  const rows = await prisma.libComment.findMany({
    where: { article_id: articleId, parent_id: null },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true, body: true, deleted_at: true, created_at: true, author_id: true,
      author: { select: { libProfile: { select: { display_name: true } } } },
      replies: {
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: {
          id: true, body: true, deleted_at: true, created_at: true, author_id: true,
          author: { select: { libProfile: { select: { display_name: true } } } },
        },
      },
    },
  });
  const serialize = (row: typeof rows[number] | (typeof rows[number]["replies"][number])) => ({
    id: row.id,
    body: row.deleted_at ? null : row.body,
    is_deleted: row.deleted_at !== null,
    created_at: row.created_at,
    is_own: row.author_id === actor.id,
    author: displayName(row.author.libProfile?.display_name, "Mahasiswa Karsa"),
  });
  return { ok: true, data: rows.map((row) => ({ ...serialize(row), replies: row.replies.map(serialize) })) };
}

export async function createComment(actor: MobileActor, articleId: string, input: unknown): Promise<LibResult<unknown>> {
  const denied = profileError(actor);
  if (denied) return denied;
  const parsed = commentInputSchema.safeParse(input);
  if (!parsed.success) return fail(400, "INVALID_COMMENT", parsed.error.issues[0]?.message ?? "Komentar tidak valid.");
  const article = await accessibleArticle(actor, articleId);
  if (!article) return fail(404, "ARTICLE_NOT_FOUND", "Artikel tidak ditemukan.");
  if (parsed.data.parent_id) {
    const parent = await prisma.libComment.findFirst({
      where: { id: parsed.data.parent_id, article_id: articleId, parent_id: null, deleted_at: null },
      select: { id: true },
    });
    if (!parent) return fail(400, "INVALID_REPLY_TARGET", "Balasan harus merujuk komentar utama yang masih tersedia.");
  }
  const comment = await prisma.libComment.create({
    data: { article_id: articleId, author_id: actor.id, ...parsed.data },
    select: { id: true, body: true, parent_id: true, created_at: true },
  });
  return { ok: true, data: { ...comment, is_own: true, author: actor.lib_profile!.display_name }, status: 201 };
}

export async function deleteComment(actor: MobileActor, commentId: string): Promise<LibResult<unknown>> {
  const denied = profileError(actor);
  if (denied) return denied;
  const comment = await prisma.libComment.findFirst({
    where: { id: commentId, author_id: actor.id, deleted_at: null, article: { prodi_id: actor.lib_profile!.prodi_id, status: "PUBLISHED" } },
    select: { id: true },
  });
  if (!comment) return fail(404, "COMMENT_NOT_FOUND", "Komentar tidak ditemukan atau sudah dihapus.");
  await prisma.libComment.update({
    where: { id: commentId },
    data: { body: null, deleted_at: new Date(), deleted_by_id: actor.id, deleted_reason: "Dihapus oleh pemilik komentar" },
  });
  return { ok: true, data: { id: commentId, deleted: true } };
}

export async function submitAuthorRequest(actor: MobileActor, input: unknown): Promise<LibResult<unknown>> {
  const denied = profileError(actor);
  if (denied) return denied;
  if (canWriteLib(actor)) return fail(409, "ALREADY_AUTHOR", "Akunmu sudah memiliki akses penulis.");
  const parsed = requestInputSchema.safeParse(input);
  if (!parsed.success) return fail(400, "INVALID_AUTHOR_REQUEST", parsed.error.issues[0]?.message ?? "Permohonan tidak valid.");
  const pending = await prisma.libAuthorRequest.findFirst({ where: { user_id: actor.id, status: "PENDING" }, select: { id: true } });
  if (pending) return fail(409, "REQUEST_PENDING", "Permohonanmu sedang ditinjau.");
  const request = await prisma.libAuthorRequest.create({
    data: { user_id: actor.id, motivation: parsed.data.motivation, topics: parsed.data.topics },
    select: { id: true, status: true, submitted_at: true },
  });
  return { ok: true, data: request, status: 201 };
}

export async function submitReport(actor: MobileActor, input: unknown): Promise<LibResult<unknown>> {
  const denied = profileError(actor);
  if (denied) return denied;
  const parsed = reportInputSchema.safeParse(input);
  if (!parsed.success) return fail(400, "INVALID_REPORT", "Laporan tidak valid.");
  const profile = requiredProfile(actor)!;
  let articleId = parsed.data.article_id;
  if (parsed.data.comment_id) {
    const comment = await prisma.libComment.findFirst({
      where: { id: parsed.data.comment_id, article: { prodi_id: profile.prodi_id, status: "PUBLISHED" } },
      select: { article_id: true },
    });
    if (!comment) return fail(404, "REPORT_TARGET_NOT_FOUND", "Komentar tidak ditemukan.");
    articleId = comment.article_id;
  }
  const article = articleId ? await accessibleArticle(actor, articleId) : null;
  if (!article) return fail(404, "REPORT_TARGET_NOT_FOUND", "Artikel tidak ditemukan.");

  try {
    const report = await prisma.libReport.create({
      data: {
        article_id: parsed.data.article_id ?? null,
        comment_id: parsed.data.comment_id ?? null,
        reporter_id: actor.id,
        reason: parsed.data.reason,
        details: parsed.data.details,
      },
      select: { id: true, status: true, created_at: true },
    });
    await notifyArticleReport({
      reportId: report.id,
      articleTitle: article.title,
      reporterName: actor.lib_profile!.display_name,
      reporterEmail: actor.email,
      reason: parsed.data.reason,
      details: parsed.data.details,
    });
    return { ok: true, data: report, status: 201 };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(409, "REPORT_ALREADY_SENT", "Kamu sudah mengirim laporan untuk konten ini.");
    }
    throw error;
  }
}
