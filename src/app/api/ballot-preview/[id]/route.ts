// app/api/ballot-preview/[id]/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/db/db";
import { requireAuth } from "@/lib/helpers/requireAuth"; // <-- make sure this path is correct
import { ROLES } from "@/lib/constants";   // <-- where you define roles

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth([ROLES.ADMIN]);
  if (!authResult.authorized) return authResult.response;
  const user = authResult.user;

  const {id} = await params;
  const electionId = parseInt(id);

  const election = await db.election.findUnique({
    where: { id: electionId },
    select: {
      id: true,
      name: true,
      positions: {
        where: { isDeleted: false },
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          voteLimit: true,
          candidates: {
            where: { isDeleted: false },
            orderBy: { id: "asc" },
            select: {
              id: true,
              electionId: true,
              voterId: true,
              positionId: true,
              imageUrl: true,
              credentialUrl: true,
              party: { select: { id: true, name: true, color: true } }, // make sure "color" exists in DB
              voter: {
                select: { firstName: true, middleName: true, lastName: true, votingScopeId: true },
              },
            },
          },
        },
      },
      votingScopes: {
        where: { electionId },
        select: { id: true, name: true }, 
      }
    },
  });

  if (!election) {
    return NextResponse.json({ error: "Election not found" }, { status: 404 });
  }

  return NextResponse.json({
    electionName: election.name,
    votingScopes: election.votingScopes,
    ballotData: {
      positions: election.positions.map((p) => ({
        name: p.name,
        maxSelections: p.voteLimit,
        candidates: p.candidates.map((c) => ({
          id: String(c.id),
          name: [c.voter?.firstName, c.voter?.middleName, c.voter?.lastName]
            .filter(Boolean)
            .join(" "),
          party: c.party?.name ?? "",
          partyColor: c.party?.color ?? "#999999", // fallback if no color in DB
          credentials: "Candidate", // Default since isNew field was removed
          credentialsUrl: c.credentialUrl ?? undefined,
          img: c.imageUrl ?? "/placeholder.png",
          position: p.name, // match BallotComponentProps
          scopeId: c.voter?.votingScopeId ?? null,
        })),
      })),
    },
  });
}
