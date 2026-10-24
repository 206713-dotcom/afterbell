import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, serverClient } from "@/lib/supabase/server";
import {
  hubSchema,
  profileSchema,
  sparkSchema,
  nearbySchema,
} from "@/lib/validation";
import { unlock, unlockPortfolio } from "@/lib/engine";
import type { AppState } from "@/lib/types";
import { sameOrigin } from "@/lib/security";
import {
  localEnabled,
  localIdentity,
  localAccounts,
} from "@/lib/local-runtime";
import type { Operation } from "@/lib/actions";
import { isSocialOperation, socialPayload } from "@/lib/social";
const envelope = z
  .object({
    op: z.string().max(40),
    payload: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();
const uuid = z.uuid();
const uuidPayload = z.object({ id: uuid });
const windowSchema = z
  .object({
    start: z.iso.datetime({ offset: true }),
    end: z.iso.datetime({ offset: true }),
  })
  .refine((w) => Date.parse(w.end) > Date.parse(w.start));
const offerSchema = z
  .object({
    label: z.string().trim().min(3).max(100),
    kind: z.enum([
      "participant",
      "tutor",
      "racket",
      "room",
      "venue",
      "facilitator",
      "projector",
    ]),
    city: z.string().min(2).max(80),
    hubId: uuid.nullable(),
    skills: z.array(z.string().max(60)).max(10),
    quantity: z.number().int().min(1).max(30),
    capacity: z.number().int().min(1).max(100),
    cost: z.number().min(0).max(5000),
    needs: z
      .array(
        z.object({
          id: z.string().max(60),
          kind: z.enum(["racket", "room", "venue", "projector"]),
          quantity: z.number().int().min(1).max(30),
        }),
      )
      .max(5),
    windows: z.array(windowSchema).min(1).max(12),
  })
  .refine(
    (o) =>
      !["participant", "tutor", "facilitator"].includes(o.kind) ||
      o.quantity === 1,
    "A person's participation capacity is one.",
  );
export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  if (localEnabled()) {
    const id = await localIdentity();
    if (!id)
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    try {
      const raw = await request.text();
      if (raw.length > 30000)
        return NextResponse.json(
          { error: "Request too large." },
          { status: 413 },
        );
      const { op, payload } = envelope.parse(JSON.parse(raw));
      return NextResponse.json(
        localAccounts().mutate(id, op as Operation, payload),
      );
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof z.ZodError
              ? e.issues[0].message
              : e instanceof Error
                ? e.message
                : "Unable to save changes.",
        },
        { status: 400 },
      );
    }
  }
  if (Number(request.headers.get("content-length") ?? 0) > 60000)
    return NextResponse.json(
      { error: "Request is too large." },
      { status: 413 },
    );
  const user = await currentUser();
  if (!user)
    return NextResponse.json(
      { error: "Log in to save changes." },
      { status: 401 },
    );
  try {
    const raw = await request.text();
    if (raw.length > 60000)
      return NextResponse.json(
        { error: "Request is too large." },
        { status: 413 },
      );
    const { op, payload } = envelope.parse(JSON.parse(raw));
    const client = await serverClient();
    if (isSocialOperation(op)) {
      const validated = socialPayload(op, payload);
      const { data, error } = await client.rpc("afterbell_social_mutate", {
        operation: op,
        payload: validated,
      });
      if (error) throw error;
      return NextResponse.json(data);
    }
    if (op === "unlock" || op === "portfolio") {
      const { data, error } = await client.rpc("afterbell_state");
      if (error || !data) throw new Error("Could not read matching inputs.");
      const state = data as AppState;
      const sparks = state.sparks.filter(
        (s) =>
          s.ownerId === user.id &&
          !["CONFIRMED", "COMPLETED", "CANCELLED"].includes(s.status),
      );
      const target =
        op === "unlock"
          ? sparks.find((s) => s.id === uuidPayload.parse(payload).id)
          : null;
      if (op === "unlock" && !target)
        return NextResponse.json(
          { error: "You can only analyze your own open Sparks." },
          { status: 403 },
        );
      const results = target
        ? [
            unlock(
              target,
              state.candidates.filter(
                (c) =>
                  !state.declines?.some(
                    (d) => d.sparkId === target.id && d.candidateId === c.id,
                  ),
              ),
              state.blocked,
            ),
          ]
        : unlockPortfolio(
            sparks,
            state.candidates,
            state.blocked,
            state.declines,
          ).proposals;
      for (const proposal of results) {
        const { error } = await client.rpc("afterbell_mutate", {
          operation: "saveProposal",
          payload: { id: proposal.sparkId, proposal },
        });
        if (error) throw error;
      }
      return NextResponse.json({ ok: true, count: results.length });
    }
    let validated: Record<string, unknown>;
    if (op === "nearby") {
      const settings = nearbySchema.parse(payload);
      const { data, error } = await client.rpc("afterbell_save_nearby", {
        payload: settings,
      });
      if (error) throw error;
      return NextResponse.json(data);
    }
    if (op === "profile") validated = profileSchema.parse(payload);
    else if (op === "createSpark") validated = sparkSchema.parse(payload);
    else if (op === "updateSpark")
      validated = {
        ...sparkSchema.parse(payload),
        ...uuidPayload.parse(payload),
      };
    else if (op === "createHub") validated = hubSchema.parse(payload);
    else if (op === "redeem")
      validated = z
        .object({ code: z.string().trim().min(8).max(80) })
        .parse(payload);
    else if (op === "respond")
      validated = z
        .object({ id: uuid, actionId: uuid, accept: z.boolean() })
        .parse(payload);
    else if (op === "report")
      validated = z
        .object({ id: uuid, reason: z.string().trim().min(10).max(1000) })
        .parse(payload);
    else if (op === "approve")
      validated = z
        .object({ id: uuid, userId: uuid, accept: z.boolean() })
        .parse(payload);
    else if (op === "approveParticipation")
      validated = z.object({ id: uuid, accept: z.boolean() }).parse(payload);
    else if (op === "approveTutor")
      validated = z
        .object({ id: uuid, userId: uuid, approved: z.boolean() })
        .parse(payload);
    else if (op === "approveHub")
      validated = z
        .object({ id: uuid, youthApproved: z.boolean() })
        .parse(payload);
    else if (op === "offer") validated = offerSchema.parse(payload);
    else if (op === "readNotifications") validated = {};
    else if (
      [
        "deleteSpark",
        "publishSpark",
        "send",
        "confirm",
        "complete",
        "cancel",
        "attendance",
        "withdraw",
        "join",
        "resolveReport",
        "block",
        "save",
        "removeOffer",
        "approveOffer",
      ].includes(op)
    )
      validated = uuidPayload.parse(payload);
    else
      return NextResponse.json(
        { error: "That operation is not available." },
        { status: 400 },
      );
    const { data, error } = await client.rpc("afterbell_mutate_v3", {
      operation: op,
      payload: validated,
    });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    if (error instanceof SyntaxError)
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "That change could not be saved.";
    console.error("Mutation rejected", message);
    return NextResponse.json(
      {
        error: message.includes("violates exclusion")
          ? "A resource or participant was just reserved for another session. Run UNLOCK again."
          : message.includes("violates")
            ? "A database rule rejected that change. Check your inputs and permissions."
            : message,
      },
      { status: 400 },
    );
  }
}
