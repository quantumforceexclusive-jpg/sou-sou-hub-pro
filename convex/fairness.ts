import { Id } from "./_generated/dataModel";

// ——— Fairness & Randomization Logic ———
export async function generateFairnessData() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const secretSeed = Array.from(array).map((b) => b.toString(16).padStart(2, "0")).join("");

    const encoder = new TextEncoder();
    const data = encoder.encode(secretSeed);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const commitHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return { secretSeed, commitHash };
}

export function cyrb128(str: string) {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= (h2 ^ h3 ^ h4), h2 ^= h1, h3 ^= h1, h4 ^= h1;
    return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

export function sfc32(a: number, b: number, c: number, d: number) {
    return function () {
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
        let t = (a + b | 0) + d | 0;
        d = d + 1 | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}

export async function closeBatchAndRandomize(ctx: any, batchId: Id<"batches">) {
    const batch = await ctx.db.get(batchId);
    if (!batch || batch.status === "closed") return;

    // Get members
    const members = await ctx.db
        .query("batchMembers")
        .withIndex("by_batchId", (q: any) => q.eq("batchId", batchId))
        .collect();

    if (members.length === 0) {
        // Just close it if it's empty
        await ctx.db.patch(batchId, {
            status: "closed",
            closedAt: Date.now(),
        });

        // Create next open batch
        await ctx.db.insert("batches", {
            number: batch.number + 1,
            status: "open",
            maxMembers: 50,
            frequency: batch.frequency,
            duration: batch.duration,
            amount: batch.amount ?? 1000,
            createdAt: Date.now(),
        });
        return;
    }

    // Check if any manual reservations exist
    const hasAnyReservation = members.some((m: any) => m.requestedMonthIndex != null);

    const memberCount = members.length;

    let payoutAssignmentMode = "randomized";
    let commitHashFinal = undefined;
    let secretFinal = undefined;

    if (hasAnyReservation) {
        payoutAssignmentMode = "manual_selection";
        const roundCount = Math.max(1, Math.ceil(memberCount / 12));

        // Create full list of valid slots
        const allSlots: { m: number, r: number }[] = [];
        for (let m = 1; m <= 12; m++) {
            for (let r = 1; r <= roundCount; r++) {
                allSlots.push({ m, r });
            }
        }

        // Assign reservations
        const assignedIds = new Set<string>();
        const usedSlots = new Set<string>();

        for (const member of members) {
            if (member.requestedMonthIndex) {
                await ctx.db.patch(member._id, {
                    payoutMonthIndex: member.requestedMonthIndex,
                    payoutRoundIndex: member.requestedRoundIndex,
                    payoutStatus: "pending",
                });
                assignedIds.add(member._id as string);
                usedSlots.add(`${member.requestedMonthIndex}-${member.requestedRoundIndex}`);
            }
        }

        // Remaining unreserved members
        const unassigned = members.filter((m: any) => !assignedIds.has(m._id as string));
        // Deterministic sort by memberNumber asc
        unassigned.sort((a: any, b: any) => a.memberNumber - b.memberNumber);

        // Find available slots
        const availableSlots = allSlots.filter(s => !usedSlots.has(`${s.m}-${s.r}`));

        // Fill remaining
        for (let i = 0; i < unassigned.length; i++) {
            const slot = availableSlots[i];
            await ctx.db.patch(unassigned[i]._id, {
                payoutMonthIndex: slot.m,
                payoutRoundIndex: slot.r,
                payoutStatus: "pending",
            });
        }

    } else {
        payoutAssignmentMode = "randomized";

        // Generate fairness commit hash and secret
        const { secretSeed, commitHash } = await generateFairnessData();
        secretFinal = secretSeed;
        commitHashFinal = commitHash;

        // Create PRNG seeded from secret
        const seedParts = cyrb128(secretSeed);
        const prng = sfc32(seedParts[0], seedParts[1], seedParts[2], seedParts[3]);

        // Create array [1..memberCount] and shuffle
        const months = Array.from({ length: memberCount }, (_, i) => i + 1);
        for (let i = months.length - 1; i > 0; i--) {
            const j = Math.floor(prng() * (i + 1));
            [months[i], months[j]] = [months[j], months[i]];
        }

        // Assign to members
        for (let i = 0; i < members.length; i++) {
            await ctx.db.patch(members[i]._id, {
                payoutMonth: months[i],
                payoutStatus: "pending",
            });
        }
    }

    // Set batch to closed & locked
    const batchPatchData: any = {
        status: "closed",
        payoutOrderLocked: true,
        payoutAssignmentMode,
        closedAt: Date.now(),
        cycleStartDate: Date.now(),
    };

    if (payoutAssignmentMode === "randomized" && secretFinal) {
        batchPatchData.fairnessSeedSecret = secretFinal;
        batchPatchData.fairnessSeedCommitHash = commitHashFinal;
        batchPatchData.fairnessSeedRevealed = false;
    }

    await ctx.db.patch(batchId, batchPatchData);

    // Create next batch
    await ctx.db.insert("batches", {
        number: batch.number + 1,
        status: "open",
        maxMembers: 50,
        frequency: batch.frequency,
        duration: batch.duration,
        amount: batch.amount ?? 1000,
        createdAt: Date.now(),
    });
}
