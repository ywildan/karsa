/**
 * Karsa — components/channel-toggle.tsx
 * ----------------------------------------------------------------------------
 * Tombol ganti channel. Label = tujuan (PRD §4.2: "Mode HP" / "Mode Desktop").
 * Form → `setChannelAction` (cookie httpOnly + redirect home).
 */

import { setChannelAction } from "@/actions/channel";
import { Button } from "@/components/button";
import { channelToggleLabel, type Channel } from "@/lib/channel";

export function ChannelToggle({ to }: { to: Channel }) {
  return (
    <form action={setChannelAction}>
      <input type="hidden" name="channel" value={to} />
      <Button type="submit" variant="outline" size="sm">
        {channelToggleLabel(to)}
      </Button>
    </form>
  );
}
