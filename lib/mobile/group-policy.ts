export const GROUP_EDIT_WINDOW_MS = 15 * 60 * 1000;
export const GROUP_AUTO_HIDE_REPORTS = 3;

type GroupActor = {
  id: string;
  kelas_id: string | null;
  is_admin: boolean;
};

export function canUseMobileGroups(
  actor: GroupActor,
): actor is GroupActor & { kelas_id: string } {
  return !actor.is_admin && actor.kelas_id !== null;
}

export function isGroupManager(actorId: string, managerId: string): boolean {
  return actorId === managerId;
}

export function canSendToGroup(
  actorId: string,
  managerId: string,
  lockedAt: Date | null,
): boolean {
  return lockedAt === null || isGroupManager(actorId, managerId);
}

export function canEditGroupMessage(input: {
  actorId: string;
  authorId: string;
  createdAt: Date;
  deletedAt: Date | null;
  hiddenAt: Date | null;
  now: Date;
}): boolean {
  return (
    input.actorId === input.authorId &&
    input.deletedAt === null &&
    input.hiddenAt === null &&
    input.createdAt.getTime() + GROUP_EDIT_WINDOW_MS > input.now.getTime()
  );
}

export function shouldAutoHideReportedMessage(
  openReportCount: number,
  hiddenAt: Date | null,
): boolean {
  return hiddenAt === null && openReportCount >= GROUP_AUTO_HIDE_REPORTS;
}

export function canResolveGroupReport(
  actorId: string,
  managerId: string,
  messageAuthorId: string,
): boolean {
  return isGroupManager(actorId, managerId) && actorId !== messageAuthorId;
}
