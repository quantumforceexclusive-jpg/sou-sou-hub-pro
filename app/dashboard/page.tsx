"use client";

import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { DashboardStatsRow, BatchSchedule } from "./DashboardExtras";
import { Id } from "@/convex/_generated/dataModel";
import { DashboardNav } from "@/components/DashboardNav";
import { toast } from "sonner";
import { LogoIcon } from "@/components/LogoIcon";

export default function DashboardPage() {
    const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
    const router = useRouter();

    const user = useQuery(api.users.getMe);
    const batches = useQuery(api.batches.listBatches);
    const myMembership = useQuery(api.batches.getMyMembership);
    const openBatch = useQuery(api.batches.getOpenBatch);
    const adminBank = useQuery(api.banking.getAdminBankAccount);
    const adminContacts = useQuery(api.admin.getAdminContacts);

    // Payment status for the open batch
    const myPaymentStatus = useQuery(
        api.banking.getMyPaymentStatus,
        openBatch ? { batchId: openBatch._id } : "skip"
    );

    const ensureInitialBatch = useMutation(api.batches.ensureInitialBatch);
    const joinOpenBatch = useMutation(api.batches.joinOpenBatch);
    const adminCloseBatch = useMutation(api.batches.adminCloseBatch);
    const adminUpdateBatchSettings = useMutation(api.batches.adminUpdateBatchSettings);
    const adminDeleteBatch = useMutation(api.batches.adminDeleteBatch);
    const verifyLeaveCode = useMutation(api.admin.verifyLeaveCode);

    const [joiningBatch, setJoiningBatch] = useState(false);
    const [closingBatch, setClosingBatch] = useState(false);
    const [deletingBatchId, setDeletingBatchId] = useState<Id<"batches"> | null>(null);
    const [initialized, setInitialized] = useState(false);

    // Leave code dialog state
    const [leaveDialogBatchId, setLeaveDialogBatchId] = useState<Id<"batches"> | null>(null);
    const [leaveCode, setLeaveCode] = useState("");
    const [verifyingCode, setVerifyingCode] = useState(false);

    // Payment info dialog
    const [showPaymentInfo, setShowPaymentInfo] = useState(false);

    // Admin batch settings state
    const [editingSettings, setEditingSettings] = useState<string | null>(null);
    const [settingsFrequency, setSettingsFrequency] = useState<"weekly" | "monthly">("monthly");
    const [settingsDuration, setSettingsDuration] = useState(12);
    const [settingsAmount, setSettingsAmount] = useState(1000);
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/");
        }
    }, [isAuthenticated, authLoading, router]);

    useEffect(() => {
        if (isAuthenticated && user && !initialized) {
            ensureInitialBatch()
                .then(() => setInitialized(true))
                .catch(console.error);
        }
    }, [isAuthenticated, user, initialized, ensureInitialBatch]);

    const handleJoinBatch = async () => {
        setJoiningBatch(true);
        try {
            const result = await joinOpenBatch();
            toast.success(`Successfully joined as ${result.displayName}! 🎉`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to join batch";
            if (message === "PAYMENT_NOT_VERIFIED") {
                setShowPaymentInfo(true);
            } else {
                toast.error(message);
            }
        } finally {
            setJoiningBatch(false);
        }
    };

    const openLeaveDialog = (batchId: Id<"batches">) => {
        setLeaveDialogBatchId(batchId);
        setLeaveCode("");
    };

    const handleVerifyLeaveCode = async () => {
        if (!leaveDialogBatchId || !leaveCode.trim()) {
            toast.error("Please enter the leave code from your admin.");
            return;
        }
        setVerifyingCode(true);
        try {
            await verifyLeaveCode({ batchId: leaveDialogBatchId, code: leaveCode.trim() });
            toast.success("You have successfully left the batch.");
            setLeaveDialogBatchId(null);
            setLeaveCode("");
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Invalid code.");
        } finally {
            setVerifyingCode(false);
        }
    };

    const handleCloseBatch = async (batchId: Id<"batches">) => {
        setClosingBatch(true);
        try {
            const result = await adminCloseBatch({ batchId });
            toast.success(`Batch #${result.closedBatchNumber} closed. Batch #${result.newBatchNumber} is now open! ✅`);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to close batch");
        } finally {
            setClosingBatch(false);
        }
    };

    const handleSaveBatchSettings = async (batchId: Id<"batches">) => {
        setSavingSettings(true);
        try {
            await adminUpdateBatchSettings({ batchId, frequency: settingsFrequency, duration: settingsDuration, amount: settingsAmount });
            toast.success("Batch settings updated!");
            setEditingSettings(null);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to update settings");
        } finally {
            setSavingSettings(false);
        }
    };

    const handleDeleteBatch = async (batchId: Id<"batches">) => {
        if (!confirm("Are you absolutely sure you want to completely delete this batch and all of its associated records? This cannot be undone.")) return;
        setDeletingBatchId(batchId);
        try {
            await adminDeleteBatch({ batchId });
            toast.success("Batch deleted successfully.");
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to delete batch");
        } finally {
            setDeletingBatchId(null);
        }
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
                <div className="flex items-center gap-3">
                    <LogoIcon className="w-10 h-10" />
                    <div className="animate-pulse text-lg font-medium" style={{ color: "var(--foreground)" }}>Loading...</div>
                </div>
            </div>
        );
    }

    const isInOpenBatch = myMembership?.some((m) => m.batch?.status === "open");
    const isAdmin = user?.role === "admin";
    const isPaid = myPaymentStatus?.verified === true;

    return (
        <div className="min-h-screen" style={{ background: "var(--background)" }}>
            <DashboardNav />

            {/* ——— Leave Code Dialog ——— */}
            {leaveDialogBatchId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border"
                        style={{ background: "var(--background)", borderColor: "var(--border)" }}>
                        <div className="text-center mb-6">
                            <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4"
                                style={{ background: "var(--primary)" }}>
                                <span className="text-2xl">🔐</span>
                            </div>
                            <h3 className="text-xl font-bold" style={{ color: "var(--foreground)", fontFamily: "var(--font-playfair)" }}>
                                Request Leave Code
                            </h3>
                            <p className="text-sm mt-2" style={{ color: "var(--muted-foreground)" }}>
                                Contact an admin to receive your encrypted leave code.
                            </p>
                        </div>

                        {/* Admin Contact Information */}
                        {adminContacts && adminContacts.length > 0 && (
                            <div className="mb-6 rounded-xl border p-4 space-y-3" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                                <p className="text-xs font-semibold uppercase tracking-wider text-center" style={{ color: "var(--primary)" }}>
                                    Admin Contacts
                                </p>
                                <div className="space-y-3">
                                    {adminContacts.map((admin, idx) => (
                                        <div key={idx} className="text-sm border-b last:border-0 pb-2 last:pb-0" style={{ borderColor: "var(--border)" }}>
                                            <div className="font-medium" style={{ color: "var(--foreground)" }}>{admin.name}</div>
                                            <div style={{ color: "var(--muted-foreground)" }}>{admin.email}</div>
                                            <div style={{ color: "var(--muted-foreground)" }}>{admin.phone}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mb-6">
                            <input type="text" value={leaveCode}
                                onChange={(e) => setLeaveCode(e.target.value.toUpperCase())}
                                placeholder="SSH-XXXX-XXXX-XXXX-XXXX"
                                className="w-full p-3 rounded-xl border text-center tracking-widest font-mono text-lg"
                                style={{ borderColor: "var(--primary)", color: "var(--foreground)", background: "var(--card)" }}
                                autoFocus />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setLeaveDialogBatchId(null); setLeaveCode(""); }}
                                className="flex-1 py-3 rounded-xl text-sm font-medium border"
                                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>Cancel</button>
                            <button onClick={handleVerifyLeaveCode}
                                disabled={verifyingCode || !leaveCode.trim()}
                                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                                style={{ background: !leaveCode.trim() ? "var(--border)" : "var(--destructive)", color: "var(--card)", opacity: verifyingCode ? 0.6 : 1 }}>
                                {verifyingCode ? "Verifying..." : "Confirm Leave"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ——— Payment Required Dialog ——— */}
            {showPaymentInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border"
                        style={{ background: "var(--background)", borderColor: "var(--border)" }}>
                        <div className="text-center mb-6">
                            <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4"
                                style={{ background: "var(--destructive)" }}>
                                <span className="text-2xl">💳</span>
                            </div>
                            <h3 className="text-xl font-bold" style={{ color: "var(--foreground)", fontFamily: "var(--font-playfair)" }}>
                                Payment Required
                            </h3>
                            <p className="text-sm mt-2" style={{ color: "var(--muted-foreground)" }}>
                                Your payment must be verified by an admin before you can join this batch.
                                Please make a payment to the account below and contact your admin.
                            </p>
                        </div>

                        {adminBank ? (
                            <div className="rounded-xl p-4 mb-6 space-y-2" style={{ background: "var(--card)", border: "1px solid #E2DED8" }}>
                                <div className="text-center mb-3">
                                    <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
                                        style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                                        Admin Bank Details
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span style={{ color: "var(--muted-foreground)" }}>Name:</span>
                                    <span className="font-medium" style={{ color: "var(--foreground)" }}>
                                        {adminBank.firstName} {adminBank.lastName}
                                    </span>
                                    <span style={{ color: "var(--muted-foreground)" }}>Bank:</span>
                                    <span className="font-medium" style={{ color: "var(--foreground)" }}>{adminBank.bankName}</span>
                                    <span style={{ color: "var(--muted-foreground)" }}>Account Type:</span>
                                    <span className="font-medium uppercase" style={{ color: "var(--foreground)" }}>{adminBank.accountType}</span>
                                    <span style={{ color: "var(--muted-foreground)" }}>Account #:</span>
                                    <span className="font-medium font-mono" style={{ color: "var(--foreground)" }}>{adminBank.accountNumber}</span>
                                    <span style={{ color: "var(--muted-foreground)" }}>Currency:</span>
                                    <span className="font-medium" style={{ color: "var(--foreground)" }}>
                                        {adminBank.currency}
                                        {adminBank.currency === "USD" && (
                                            <span className="text-xs ml-1" style={{ color: "var(--muted-foreground)" }}>
                                                (1 USD = {adminBank.conversionRate} TTD)
                                            </span>
                                        )}
                                        {adminBank.currency === "TTD" && (
                                            <span className="text-xs ml-1" style={{ color: "var(--muted-foreground)" }}>
                                                (1 USD = {adminBank.conversionRate} TTD)
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl p-4 mb-6 text-center" style={{ background: "var(--primary)" }}>
                                <p className="text-sm" style={{ color: "var(--primary)" }}>
                                    Admin bank details not yet configured. Please contact your admin directly.
                                </p>
                            </div>
                        )}

                        <button onClick={() => setShowPaymentInfo(false)}
                            className="w-full py-3 rounded-xl text-sm font-semibold"
                            style={{ background: "var(--primary)", color: "var(--card)" }}>
                            Got It
                        </button>
                    </div>
                </div>
            )}

            <main className="max-w-7xl mx-auto px-6 py-10">
                {/* Welcome */}
                <div className="mb-10">
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2"
                        style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", color: "var(--foreground)" }}>
                        Welcome{user?.name ? `, ${user.name}` : ""}! 👋
                    </h1>
                    <p className="text-base" style={{ color: "var(--muted-foreground)" }}>
                        Manage your sou-sou batches and memberships below.
                    </p>
                </div>

                <DashboardStatsRow />

                {/* My Memberships */}
                {myMembership && myMembership.length > 0 && (
                    <div className="mb-10">
                        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--foreground)" }}>My Memberships</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {myMembership.map((m) => (
                                <div key={m._id} className="rounded-2xl p-5 border"
                                    style={{ background: "var(--card)", borderColor: "#D9A63A30", boxShadow: "0 2px 12px rgba(217,166,58,0.08)" }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold" style={{ color: "var(--foreground)" }}>{m.displayName}</span>
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                                            style={{ background: m.batch?.status === "open" ? "var(--secondary)" : "var(--border)", color: m.batch?.status === "open" ? "var(--success)" : "var(--muted-foreground)" }}>
                                            Batch #{m.batch?.number}
                                        </span>
                                    </div>
                                    <p className="text-sm mb-1" style={{ color: "var(--muted-foreground)" }}>
                                        Member #{String(m.memberNumber).padStart(2, "0")} · Joined {new Date(m.joinedAt).toLocaleDateString()}
                                    </p>
                                    {m.batch && (
                                        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                                            {(m.batch.frequency ?? "monthly") === "monthly" ? "📅 Monthly" : "📅 Weekly"} · {m.batch.duration ?? 12} {(m.batch.frequency ?? "monthly") === "monthly" ? "months" : "weeks"}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Batch Cards */}
                <div className="mb-10">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>Sou-Sou Batches</h2>
                        {openBatch && (
                            <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                                Current open batch: <strong>Batch #{openBatch.number}</strong>
                            </span>
                        )}
                    </div>

                    {!batches || batches.length === 0 ? (
                        <div className="text-center py-16 rounded-2xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                            <p style={{ color: "var(--muted-foreground)" }}>No batches yet. They will appear shortly...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {batches.map((batch) => {
                                const isOpen = batch.status === "open";
                                const isFull = batch.memberCount >= batch.maxMembers;
                                const progressPercent = Math.min((batch.memberCount / batch.maxMembers) * 100, 100);
                                const isMemberOfThis = myMembership?.some(m => m.batchId === batch._id);
                                const canJoin = isOpen && !isInOpenBatch && !isFull && !isMemberOfThis;

                                return (
                                    <div key={batch._id} className="rounded-2xl p-6 border transition-all hover:shadow-lg"
                                        style={{
                                            background: isOpen ? "var(--card)" : "var(--muted)",
                                            borderColor: isOpen ? "var(--primary)" : "var(--border)",
                                            boxShadow: isOpen ? "0 4px 20px rgba(217,166,58,0.1)" : "0 1px 4px rgba(0,0,0,0.04)",
                                        }}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-playfair)", color: "var(--foreground)" }}>
                                                Batch #{batch.number}
                                            </h3>
                                            <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
                                                style={{ background: isOpen ? "var(--success)" : "var(--muted)", color: isOpen ? "var(--success-foreground)" : "var(--muted-foreground)" }}>
                                                {isOpen ? "Open" : "Closed"}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                                            <span className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: "var(--muted)", color: "var(--foreground)" }}>
                                                {(batch.frequency ?? "monthly") === "monthly" ? "Monthly" : "Weekly"}
                                            </span>
                                            <span className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: "var(--muted)", color: "var(--foreground)" }}>
                                                {batch.duration ?? 12} {(batch.frequency ?? "monthly") === "monthly" ? "months" : "weeks"}
                                            </span>
                                        </div>

                                        <div className="mb-3">
                                            <div className="flex items-baseline justify-between mb-1.5">
                                                <span className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>Members</span>
                                                <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                                                    {batch.memberCount} <span style={{ color: "var(--muted-foreground)" }}>/ {batch.maxMembers}</span>
                                                </span>
                                            </div>
                                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                                                <div className="h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${progressPercent}%`, background: isOpen ? "linear-gradient(90deg, var(--secondary), var(--primary))" : "var(--muted-foreground)" }} />
                                            </div>
                                        </div>

                                        <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
                                            Created {new Date(batch.createdAt).toLocaleDateString()}
                                            {batch.closedAt && ` · Closed ${new Date(batch.closedAt).toLocaleDateString()}`}
                                        </p>

                                        {/* Payout Calculation Display */}
                                        <div className="mb-4 p-3 rounded-lg border text-sm" style={{ background: "var(--muted)", borderColor: "var(--border)" }}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span style={{ color: "var(--muted-foreground)" }}>Contribution ({(batch.frequency ?? "monthly") === "weekly" ? "Weekly" : "Monthly"})</span>
                                                <span className="font-semibold" style={{ color: "var(--foreground)" }}>${batch.amount ?? 1000}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 mt-2 border-t" style={{ borderColor: "var(--border)" }}>
                                                <span style={{ color: "var(--muted-foreground)" }}>Total {(batch.frequency ?? "monthly") === "weekly" ? "Weekly" : "Monthly"} Pool</span>
                                                <span className="font-bold" style={{ color: "var(--success)" }}>
                                                    ${(batch.amount ?? 1000) * batch.memberCount}
                                                    <span className="text-xs font-normal ml-1" style={{ color: "var(--muted-foreground)" }}>
                                                        (${batch.amount ?? 1000} × {batch.memberCount} members)
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 mt-2 border-t" style={{ borderColor: "var(--border)" }}>
                                                <span style={{ color: "var(--muted-foreground)" }}>Total Cycle Volume</span>
                                                <span className="font-bold" style={{ color: "var(--primary)" }}>
                                                    ${(batch.amount ?? 1000) * batch.memberCount * (batch.duration ?? 12)}
                                                    <span className="text-xs font-normal ml-1" style={{ color: "var(--muted-foreground)" }}>
                                                        (× {batch.duration ?? 12} {(batch.frequency ?? "monthly") === "weekly" ? "weeks" : "months"})
                                                    </span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Join Button — checks payment */}
                                        {canJoin && (
                                            <div className="space-y-2">
                                                {isPaid ? (
                                                    <button id={`join-batch-${batch.number}`} onClick={handleJoinBatch} disabled={joiningBatch}
                                                        className="btn-gold w-full py-2.5 rounded-lg text-sm font-semibold">
                                                        {joiningBatch ? "Joining..." : "Join Batch"}
                                                    </button>
                                                ) : (
                                                    <div>
                                                        <button onClick={() => setShowPaymentInfo(true)}
                                                            className="w-full py-2.5 rounded-lg text-sm font-semibold border-2 transition-all hover:shadow-md"
                                                            style={{ borderColor: "var(--primary)", color: "var(--primary)", background: "transparent" }}>
                                                            💳 Make Payment to Join
                                                        </button>
                                                        <p className="text-xs text-center mt-1.5" style={{ color: "var(--muted-foreground)" }}>
                                                            Payment must be verified by admin
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Member actions */}
                                        {isOpen && isMemberOfThis && (
                                            <div className="space-y-2">
                                                <div className="text-center py-2.5 rounded-lg text-sm font-medium"
                                                    style={{ background: "var(--secondary)", color: "var(--success)" }}>
                                                    ✓ You&apos;re a member
                                                </div>
                                                <button onClick={() => openLeaveDialog(batch._id)}
                                                    className="w-full py-2 rounded-lg text-xs font-medium border transition-all hover:bg-red-50"
                                                    style={{ color: "var(--destructive)", borderColor: "var(--destructive)" }}>
                                                    Request to Leave Batch
                                                </button>
                                            </div>
                                        )}

                                        {isOpen && isFull && !isMemberOfThis && (
                                            <div className="text-center py-2.5 rounded-lg text-sm font-medium"
                                                style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
                                                Batch Full
                                            </div>
                                        )}

                                        {/* Admin settings */}
                                        {isAdmin && (
                                            <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                                                {editingSettings === batch._id ? (
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Frequency</span>
                                                            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                                                                <button onClick={() => setSettingsFrequency("weekly")}
                                                                    className="px-3 py-1.5 text-xs font-medium transition-all"
                                                                    style={{ background: settingsFrequency === "weekly" ? "var(--primary)" : "transparent", color: settingsFrequency === "weekly" ? "var(--card)" : "var(--muted-foreground)" }}>Weekly</button>
                                                                <button onClick={() => setSettingsFrequency("monthly")}
                                                                    className="px-3 py-1.5 text-xs font-medium transition-all"
                                                                    style={{ background: settingsFrequency === "monthly" ? "var(--primary)" : "transparent", color: settingsFrequency === "monthly" ? "var(--card)" : "var(--muted-foreground)" }}>Monthly</button>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Duration</span>
                                                            <div className="flex items-center gap-2">
                                                                <input type="number" min={1} max={52} value={settingsDuration}
                                                                    onChange={(e) => setSettingsDuration(Number(e.target.value))}
                                                                    className="w-16 px-2 py-1.5 text-xs rounded-lg border text-center"
                                                                    style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
                                                                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                                                                    {settingsFrequency === "monthly" ? "months" : "weeks"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Amount ($)</span>
                                                            <div className="flex items-center gap-2">
                                                                <input type="number" min={1} value={settingsAmount}
                                                                    onChange={(e) => setSettingsAmount(Number(e.target.value))}
                                                                    className="w-24 px-2 py-1.5 text-xs rounded-lg border text-center"
                                                                    style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleSaveBatchSettings(batch._id)} disabled={savingSettings}
                                                                className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
                                                                style={{ background: "var(--primary)", color: "var(--card)" }}>
                                                                {savingSettings ? "Saving..." : "Save"}
                                                            </button>
                                                            <button onClick={() => setEditingSettings(null)}
                                                                className="flex-1 py-1.5 rounded-lg text-xs font-medium border"
                                                                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>Cancel</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        {isOpen && (
                                                            <button onClick={() => { setEditingSettings(batch._id); setSettingsFrequency(batch.frequency ?? "monthly"); setSettingsDuration(batch.duration ?? 12); setSettingsAmount(batch.amount ?? 1000); }}
                                                                className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:bg-gray-50 border"
                                                                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
                                                                ⚙ Edit Setup
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleDeleteBatch(batch._id)}
                                                            disabled={deletingBatchId === batch._id}
                                                            className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:bg-red-50 border"
                                                            style={{ borderColor: "var(--destructive)", color: "var(--destructive)" }}>
                                                            🗑 {deletingBatchId === batch._id ? "Deleting..." : "Delete Batch"}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {!isOpen && (
                                            <BatchSchedule batchId={batch._id} isAdmin={isAdmin} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Admin Section */}
                {isAdmin && openBatch && (
                    <div className="mb-10">
                        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--foreground)" }}>Admin Controls</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="rounded-2xl p-6 border"
                                style={{ background: "var(--card)", borderColor: "var(--border)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                                <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
                                    Close Batch #{openBatch.number} early and create a new one.
                                </p>
                                <button onClick={() => handleCloseBatch(openBatch._id)} disabled={closingBatch}
                                    className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all"
                                    style={{ background: closingBatch ? "var(--border)" : "var(--destructive)", color: "var(--card)", opacity: closingBatch ? 0.6 : 1 }}>
                                    {closingBatch ? "Closing..." : `Close Batch #${openBatch.number}`}
                                </button>
                            </div>
                            <div className="rounded-2xl p-6 border"
                                style={{ background: "var(--card)", borderColor: "var(--border)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                                <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
                                    Full administration panel for roles, payments, codes, and banking.
                                </p>
                                <button onClick={() => router.push("/admin")}
                                    className="btn-gold px-6 py-2.5 rounded-lg text-sm font-semibold">
                                    Open Admin Panel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
