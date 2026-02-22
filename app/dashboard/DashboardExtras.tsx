"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export function DashboardStatsRow() {
    const statsList = useQuery(api.batches.getMyMembershipAndDashboardStats);

    const [timeLeft, setTimeLeft] = useState("");

    // Use the latest batch the user is in (usually the first one returned or we can sort)
    const stats = statsList && statsList.length > 0 ? statsList[statsList.length - 1] : null;

    // Countdown logic
    useEffect(() => {
        if (!stats || !stats.nextPayoutDate) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const diff = stats.nextPayoutDate! - now;
            if (diff <= 0) {
                setTimeLeft("Payout due!");
                clearInterval(interval);
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / 1000 / 60) % 60);

            let s = "";
            if (days > 0) s += `${days}d `;
            if (hours > 0) s += `${hours}h `;
            s += `${minutes}m`;
            setTimeLeft(s);
        }, 1000);

        return () => clearInterval(interval);
    }, [stats?.nextPayoutDate]);

    if (!statsList || statsList.length === 0 || !stats) return null;

    return (
        <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl p-5 border bg-white" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Cycle Progress</p>
                <h3 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
                    Month {stats.currentMonthOfCycle} <span className="text-sm font-normal text-gray-400">of {stats.memberCount}</span>
                </h3>
            </div>
            <div className="rounded-2xl p-5 border bg-white" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Next Payout</p>
                <h3 className="text-xl font-bold truncate" style={{ color: "var(--foreground)" }}>
                    {stats.nextPayoutMember || "All Paid!"}
                </h3>
            </div>
            <div className="rounded-2xl p-5 border bg-white" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Total Pool</p>
                <h3 className="text-xl font-bold" style={{ color: "var(--success)" }}>
                    ${stats.totalMonthlyPool.toLocaleString()}
                </h3>
            </div>
            <div className="rounded-2xl p-5 border bg-white" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Next Release</p>
                <h3 className="text-xl font-bold" style={{ color: "var(--primary)" }}>
                    {stats.nextPayoutDate ? timeLeft || "Calculating..." : "N/A"}
                </h3>
            </div>
        </div>
    );
}

export function BatchSchedule({ batchId, isAdmin }: { batchId: Id<"batches">, isAdmin: boolean }) {
    const schedule = useQuery(api.batches.getBatchPayoutSchedule, { batchId });
    const markPaid = useMutation(api.batches.adminMarkPayoutPaid);

    if (!schedule || schedule.length === 0) return null;

    const handleMarkPaid = async (payoutMonth: number) => {
        try {
            await markPaid({ batchId, payoutMonth });
            toast.success("Marked paid successfully.");
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    return (
        <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>Payout Schedule</h4>
            <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                <table className="w-full text-left text-xs">
                    <thead style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
                        <tr>
                            <th className="px-3 py-2 font-medium">Month</th>
                            <th className="px-3 py-2 font-medium">Member</th>
                            <th className="px-3 py-2 font-medium">Status</th>
                            {isAdmin && <th className="px-3 py-2 font-medium text-right">Admin</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                        {schedule.map((row) => (
                            <tr key={row.displayName} style={{ background: row.payoutStatus === "paid" ? "var(--muted)" : "transparent" }}>
                                <td className="px-3 py-2 font-medium" style={{ color: "var(--foreground)" }}>{row.payoutMonth ?? "-"}</td>
                                <td className="px-3 py-2" style={{ color: "var(--muted-foreground)" }}>{row.displayName}</td>
                                <td className="px-3 py-2">
                                    {row.payoutStatus === "paid" ? (
                                        <span className="text-green-600 font-medium">Paid</span>
                                    ) : (
                                        <span className="text-amber-600 font-medium">{row.payoutMonth ? "Pending" : "Waiting for close"}</span>
                                    )}
                                </td>
                                {isAdmin && (
                                    <td className="px-3 py-2 text-right">
                                        {row.payoutStatus !== "paid" && row.payoutMonth ? (
                                            <button onClick={() => handleMarkPaid(row.payoutMonth!)} className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded">
                                                Mark Paid
                                            </button>
                                        ) : null}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <FairnessPanel batchId={batchId} isAdmin={isAdmin} />
        </div>
    );
}

function FairnessPanel({ batchId, isAdmin }: { batchId: Id<"batches">, isAdmin: boolean }) {
    const fairness = useQuery(api.batches.getFairnessVerification, { batchId });
    const reveal = useMutation(api.batches.adminRevealFairnessSeed);

    if (!fairness) return null;

    return (
        <div className="mt-4 p-3 rounded-lg border bg-slate-50" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">⚖️</span>
                <h4 className="text-sm font-semibold text-slate-700">Fairness & Transparency</h4>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
                <p>
                    <span className="font-semibold text-slate-800">Commitment Hash: </span>
                    <span className="font-mono text-[10px] break-all bg-slate-200 px-1 py-0.5 rounded">{fairness.commitHash}</span>
                </p>

                {fairness.isRevealed ? (
                    <>
                        <p>
                            <span className="font-semibold text-emerald-700">Seed Revealed: </span>
                            <span className="font-mono text-[10px] break-all bg-emerald-50 px-1 py-0.5 rounded text-emerald-700">{fairness.seed}</span>
                        </p>
                        <p className="italic text-slate-500 mt-2">{fairness.verificationInstructions}</p>
                    </>
                ) : (
                    <p className="italic text-slate-500">Seed not revealed yet. Commitment hash guarantees schedule was locked deterministically at close.</p>
                )}

                {isAdmin && !fairness.isRevealed && (
                    <button onClick={() => reveal({ batchId })}
                        className="mt-2 text-xs bg-slate-200 hover:bg-slate-300 transition-all text-slate-700 font-medium px-3 py-1.5 rounded-lg w-full">
                        Reveal Verification Seed
                    </button>
                )}
            </div>
        </div>
    );
}
