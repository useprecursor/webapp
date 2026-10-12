import { actorFrom } from "@/lib/precursor/server/auth";
import { errorResponse } from "@/lib/precursor/server/http";
import { ensureMe, latestBlock, loadSnapshot, visibleTo } from "@/lib/precursor/server/repo";

export const dynamic = "force-dynamic";

/** The full state as the caller may see it. Signed-out callers get the public view the Explorer shows. */
export async function GET(req: Request) {
  try {
    const actor = await actorFrom(req);
    const { sandbox } = await loadSnapshot();
    const [me, block] = await Promise.all([actor ? ensureMe(actor, sandbox) : null, latestBlock(sandbox.block)]);
    sandbox.block = block;
    return Response.json({ sandbox: visibleTo(sandbox, me), me });
  } catch (e) {
    return errorResponse(e);
  }
}
