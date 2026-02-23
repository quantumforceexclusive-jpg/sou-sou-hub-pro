"use client";

import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DashboardNav } from "@/components/DashboardNav";
import { toast } from "sonner";
import { LogoIcon } from "@/components/LogoIcon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminPage() {
    const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
    const router = useRouter();

    const adminAccess = useQuery(api.admin.checkAdminAccess);
    const allProfiles = useQuery(api.admin.listAllProfiles);
    const batches = useQuery(api.batches.listBatches);
    const adminBank = useQuery(api.banking.getAdminBankAccount);
    const openBatch = useQuery(api.batches.getOpenBatch);

    const updateUserRole = useMutation(api.admin.updateUserRole);
    const deleteUser = useMutation(api.admin.deleteUser);
    const generateLeaveCode = useMutation(api.admin.generateLeaveCode);
    const generateSignUpInviteCode = useMutation(api.admin.generateSignUpInviteCode);
    const adminUpdateBatchSettings = useMutation(api.batches.adminUpdateBatchSettings);
    const adminCloseBatch = useMutation(api.batches.adminCloseBatch);
    const adminCreateBatch = useMutation(api.batches.adminCreateBatch);
    const adminHandleLeaveRequest = useMutation(api.batches.adminHandleLeaveRequest);
    const saveAdminBankAccount = useMutation(api.banking.saveAdminBankAccount);
    const updateAdminCurrency = useMutation(api.banking.updateAdminCurrency);
    const adminVerifyPayment = useMutation(api.banking.adminVerifyPayment);

    // Role editing
    const [editingRole, setEditingRole] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<"member" | "admin" | "moderator">("member");
    const [savingRole, setSavingRole] = useState(false);
    const [deletingUserId, setDeletingUserId] = useState<Id<"profiles"> | null>(null);

    // Leave / Invite code generation
    const [generatingCode, setGeneratingCode] = useState(false);
    const [generatedCodes, setGeneratedCodes] = useState<{ code: string; batchNumber: number }[]>([]);
    const [generatingInviteCode, setGeneratingInviteCode] = useState(false);
    const [generatedInviteCodes, setGeneratedInviteCodes] = useState<string[]>([]);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // Batch settings
    const [editingBatch, setEditingBatch] = useState<string | null>(null);
    const [batchFrequency, setBatchFrequency] = useState<"weekly" | "monthly">("monthly");
    const [batchDuration, setBatchDuration] = useState(12);
    const [savingBatch, setSavingBatch] = useState(false);
    const [creatingBatch, setCreatingBatch] = useState(false);

    // Active tab
    const [activeTab, setActiveTab] = useState<"roles" | "batches" | "codes" | "inviteCodes" | "requests" | "banking" | "payments">("roles");

    // Banking state
    const [bankFirstName, setBankFirstName] = useState("");
    const [bankLastName, setBankLastName] = useState("");
    const [bankName, setBankName] = useState("");
    const [bankAccountType, setBankAccountType] = useState<"chequing" | "savings">("chequing");
    const [bankAccountNumber, setBankAccountNumber] = useState("");
    const [bankCurrency, setBankCurrency] = useState<"TTD" | "USD">("TTD");
    const [bankConversionRate, setBankConversionRate] = useState(6.78);
    const [savingBank, setSavingBank] = useState(false);
    const [bankEditMode, setBankEditMode] = useState(false);

    // Load existing bank data
    useEffect(() => {
        if (adminBank) {
            setBankFirstName(adminBank.firstName);
            setBankLastName(adminBank.lastName);
            setBankName(adminBank.bankName);
            setBankAccountType(adminBank.accountType);
            setBankAccountNumber(adminBank.accountNumber);
            setBankCurrency(adminBank.currency);
            setBankConversionRate(adminBank.conversionRate);
        }
    }, [adminBank]);

    // Redirect logic
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/");
            return;
        }
        if (adminAccess !== undefined && !adminAccess.isAdmin) {
            router.push(adminAccess.isAuthenticated ? "/dashboard" : "/");
        }
    }, [authLoading, isAuthenticated, adminAccess, router]);

    const handleUpdateRole = async (userId: Id<"profiles">) => {
        setSavingRole(true);
        try {
            const result = await updateUserRole({ userId, role: selectedRole });
            toast.success(`${result.name} is now a ${result.newRole}!`);
            setEditingRole(null);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update role");
        } finally {
            setSavingRole(false);
        }
    };

    const handleDeleteUser = async (userId: Id<"profiles">, userName: string) => {
        if (!confirm(`Are you sure you want to completely delete ${userName} and all their records? This cannot be undone.`)) return;
        setDeletingUserId(userId);
        try {
            await deleteUser({ userId });
            toast.success(`${userName} has been successfully deleted.`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete user");
        } finally {
            setDeletingUserId(null);
        }
    };

    const handleGenerateCode = async (batchId: Id<"batches">) => {
        setGeneratingCode(true);
        try {
            const result = await generateLeaveCode({ batchId });
            setGeneratedCodes((prev) => [result, ...prev]);
            toast.success(`Leave code generated for Batch #${result.batchNumber}`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to generate code");
        } finally {
            setGeneratingCode(false);
        }
    };

    const handleGenerateInviteCode = async () => {
        setGeneratingInviteCode(true);
        try {
            const result = await generateSignUpInviteCode();
            setGeneratedInviteCodes((prev) => [result.code, ...prev]);
            toast.success(`Sign-up invite code generated!`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to generate invite code");
        } finally {
            setGeneratingInviteCode(false);
        }
    };

    const handleCopyCode = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCode(code);
            toast.success("Code copied to clipboard!");
            setTimeout(() => setCopiedCode(null), 3000);
        } catch {
            toast.error("Failed to copy. Please select and copy manually.");
        }
    };

    const handleSaveBatchSettings = async (batchId: Id<"batches">) => {
        setSavingBatch(true);
        try {
            await adminUpdateBatchSettings({ batchId, frequency: batchFrequency, duration: batchDuration });
            toast.success("Batch settings updated!");
            setEditingBatch(null);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update batch");
        } finally {
            setSavingBatch(false);
        }
    };

    const handleCloseBatch = async (batchId: Id<"batches">) => {
        try {
            const result = await adminCloseBatch({ batchId });
            toast.success(`Batch #${result.closedBatchNumber} closed. Batch #${result.newBatchNumber} is now open!`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to close batch");
        }
    };

    const handleCreateBatch = async () => {
        setCreatingBatch(true);
        try {
            const result = await adminCreateBatch();
            toast.success(`Batch #${result.number} created manually!`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create batch");
        } finally {
            setCreatingBatch(false);
        }
    };

    const handleLeaveDecision = async (requestId: Id<"leaveRequests">, decision: "approved" | "denied") => {
        try {
            await adminHandleLeaveRequest({ requestId, decision });
            toast.success(decision === "approved" ? "Leave approved. Member removed." : "Leave request denied.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to process request");
        }
    };

    // Loading states
    if (authLoading || adminAccess === undefined) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
                <div className="flex items-center gap-3">
                    <LogoIcon className="w-10 h-10" />
                    <div className="animate-pulse text-lg font-medium" style={{ color: "var(--foreground)" }}>Loading...</div>
                </div>
            </div>
        );
    }

    if (!adminAccess.isAdmin) {
        return null; // Redirect will handle
    }

    const openBatches = batches?.filter(b => b.status === "open") ?? [];

    const tabs = [
        { id: "roles" as const, label: "Role Management", icon: "👤" },
        { id: "batches" as const, label: "Batch Settings", icon: "📦" },
        { id: "banking" as const, label: "Banking", icon: "🏦" },
        { id: "payments" as const, label: "Payments", icon: "💳" },
        { id: "inviteCodes" as const, label: "Invite Codes", icon: "🔑" },
        { id: "codes" as const, label: "Leave Codes", icon: "🔐" },
        { id: "requests" as const, label: "Leave Requests", icon: "📋" },
    ];

    const handleSaveBank = async () => {
        if (!bankFirstName || !bankLastName || !bankName || !bankAccountNumber) {
            toast.error("Please fill in all banking fields.");
            return;
        }
        setSavingBank(true);
        try {
            await saveAdminBankAccount({
                firstName: bankFirstName,
                lastName: bankLastName,
                bankName: bankName,
                accountType: bankAccountType,
                accountNumber: bankAccountNumber,
                currency: bankCurrency,
                conversionRate: bankConversionRate,
            });
            toast.success("Bank account saved!");
            setBankEditMode(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to save");
        } finally {
            setSavingBank(false);
        }
    };

    const handleCurrencyToggle = async (newCurrency: "TTD" | "USD") => {
        setBankCurrency(newCurrency);
        if (adminBank) {
            try {
                await updateAdminCurrency({ currency: newCurrency, conversionRate: bankConversionRate });
                toast.success(`Currency switched to ${newCurrency}`);
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Failed");
            }
        }
    };

    const handleVerifyPayment = async (userId: Id<"profiles">, batchId: Id<"batches">, verified: boolean) => {
        try {
            const result = await adminVerifyPayment({ userId, batchId, verified });
            toast.success(verified ? `${result.name} verified for payment!` : `${result.name} payment unverified.`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update");
        }
    };

    return (
        <div className="min-h-screen" style={{ background: "var(--background)" }}>
            <DashboardNav />

            <main className="max-w-6xl mx-auto px-6 py-10">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="flex items-center gap-2 text-sm font-medium mb-4 transition-all hover:opacity-80"
                        style={{ color: "var(--muted-foreground)" }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
                        </svg>
                        Back to Dashboard
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: "var(--primary)" }}>
                            <span className="text-white text-lg">⚡</span>
                        </div>
                        <h1 className="text-3xl font-bold"
                            style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", color: "var(--foreground)" }}>
                            Admin Panel
                        </h1>
                    </div>
                    <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                        Manage roles, batch configurations, and encrypted leave codes.
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1 p-1 rounded-xl mb-8 overflow-x-auto"
                    style={{ background: "var(--border)" }}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                            style={{
                                background: activeTab === tab.id ? "var(--card)" : "transparent",
                                color: activeTab === tab.id ? "var(--foreground)" : "var(--muted-foreground)",
                                boxShadow: activeTab === tab.id ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                            }}>
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ===== TAB: Role Management ===== */}
                {activeTab === "roles" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>All Members</h2>
                            <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                                {allProfiles?.length ?? 0} users
                            </span>
                        </div>

                        {!allProfiles ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {allProfiles.map((profile) => (
                                    <div key={profile._id}
                                        className="rounded-xl p-5 border transition-all hover:shadow-md"
                                        style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <Avatar className="h-12 w-12 border" style={{ borderColor: "var(--border)" }}>
                                                    <AvatarImage src={profile.profileImageUrl || ""} alt={profile.name} className="object-cover" />
                                                    <AvatarFallback className="text-sm font-medium"
                                                        style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                                                        {profile.name.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="font-semibold truncate" style={{ color: "var(--foreground)" }}>
                                                        {profile.name}
                                                    </p>
                                                    <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                                                        {profile.email} · {profile.membershipCount} batch(es)
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                {editingRole === profile._id ? (
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            value={selectedRole}
                                                            onChange={(e) => setSelectedRole(e.target.value as "member" | "admin" | "moderator")}
                                                            className="text-xs rounded-lg border px-3 py-2"
                                                            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
                                                            <option value="member">Member</option>
                                                            <option value="moderator">Moderator</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                        <button onClick={() => handleUpdateRole(profile._id)} disabled={savingRole}
                                                            className="px-3 py-2 rounded-lg text-xs font-semibold"
                                                            style={{ background: "var(--primary)", color: "var(--card)" }}>
                                                            {savingRole ? "..." : "Save"}
                                                        </button>
                                                        <button onClick={() => setEditingRole(null)}
                                                            className="px-3 py-2 rounded-lg text-xs border"
                                                            style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
                                                            ✕
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider"
                                                            style={{
                                                                background: profile.role === "admin" ? "var(--primary)"
                                                                    : profile.role === "moderator" ? "var(--muted)"
                                                                        : "var(--secondary)",
                                                                color: profile.role === "admin" ? "var(--primary-foreground)"
                                                                    : profile.role === "moderator" ? "var(--foreground)"
                                                                        : "var(--success-foreground)",
                                                            }}>
                                                            {profile.role}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingRole(profile._id);
                                                                    setSelectedRole(profile.role as "member" | "admin" | "moderator");
                                                                }}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:bg-gray-50"
                                                                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
                                                                Edit Role
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteUser(profile._id, profile.name)}
                                                                disabled={deletingUserId === profile._id}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:bg-red-50"
                                                                style={{ borderColor: "var(--destructive)", color: "var(--destructive)" }}>
                                                                {deletingUserId === profile._id ? "..." : "Delete"}
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ===== TAB: Batch Settings ===== */}
                {activeTab === "batches" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>Batch Configuration</h2>
                            <button onClick={handleCreateBatch} disabled={creatingBatch}
                                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                                style={{ background: "var(--success)", color: "var(--success-foreground)" }}>
                                {creatingBatch ? "Creating..." : "➕ Add Next Batch Manually"}
                            </button>
                        </div>

                        {!batches ? (
                            <Skeleton className="h-40 w-full rounded-xl" />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {batches.map((batch) => {
                                    const isOpen = batch.status === "open";
                                    const freq = batch.frequency ?? "monthly";
                                    const dur = batch.duration ?? 12;

                                    return (
                                        <div key={batch._id} className="rounded-xl p-6 border"
                                            style={{
                                                background: isOpen ? "var(--card)" : "var(--muted)",
                                                borderColor: isOpen ? "var(--primary)" : "var(--border)",
                                            }}>
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                                                    Batch #{batch.number}
                                                </h3>
                                                <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase"
                                                    style={{
                                                        background: isOpen ? "var(--success)" : "var(--muted)",
                                                        color: isOpen ? "var(--success-foreground)" : "var(--muted-foreground)",
                                                    }}>
                                                    {isOpen ? "Open" : "Closed"}
                                                </span>
                                            </div>

                                            {/* Current settings */}
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="px-3 py-1.5 rounded-lg text-xs font-medium"
                                                    style={{ background: "var(--muted)", color: "var(--foreground)" }}>
                                                    {freq === "monthly" ? "📅 Monthly" : "📅 Weekly"}
                                                </span>
                                                <span className="px-3 py-1.5 rounded-lg text-xs font-medium"
                                                    style={{ background: "var(--muted)", color: "var(--foreground)" }}>
                                                    {dur} {freq === "monthly" ? "months" : "weeks"}
                                                </span>
                                                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                                                    · {batch.memberCount}/{batch.maxMembers} members
                                                </span>
                                            </div>

                                            {isOpen && editingBatch === batch._id ? (
                                                <div className="space-y-4 p-4 rounded-xl" style={{ background: "var(--muted)" }}>
                                                    {/* Frequency Toggle */}
                                                    <div>
                                                        <label className="block text-xs font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>Frequency</label>
                                                        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                                                            <button onClick={() => setBatchFrequency("weekly")}
                                                                className="flex-1 py-3 text-sm font-medium transition-all"
                                                                style={{
                                                                    background: batchFrequency === "weekly" ? "var(--primary)" : "var(--card)",
                                                                    color: batchFrequency === "weekly" ? "var(--card)" : "var(--muted-foreground)",
                                                                }}>
                                                                Weekly
                                                            </button>
                                                            <button onClick={() => setBatchFrequency("monthly")}
                                                                className="flex-1 py-3 text-sm font-medium transition-all"
                                                                style={{
                                                                    background: batchFrequency === "monthly" ? "var(--primary)" : "var(--card)",
                                                                    color: batchFrequency === "monthly" ? "var(--card)" : "var(--muted-foreground)",
                                                                }}>
                                                                Monthly
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Duration */}
                                                    <div>
                                                        <label className="block text-xs font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>
                                                            Duration ({batchFrequency === "monthly" ? "months" : "weeks"})
                                                        </label>
                                                        <div className="flex items-center gap-3">
                                                            <input type="range" min={1} max={batchFrequency === "monthly" ? 12 : 52}
                                                                value={batchDuration}
                                                                onChange={(e) => setBatchDuration(Number(e.target.value))}
                                                                className="flex-1" style={{ accentColor: "var(--primary)" }} />
                                                            <span className="px-4 py-2 rounded-lg text-sm font-bold min-w-[80px] text-center"
                                                                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                                                                {batchDuration} {batchFrequency === "monthly" ? "mo" : "wk"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 pt-2">
                                                        <button onClick={() => handleSaveBatchSettings(batch._id)} disabled={savingBatch}
                                                            className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                                                            style={{ background: "var(--primary)", color: "var(--card)" }}>
                                                            {savingBatch ? "Saving..." : "Save Settings"}
                                                        </button>
                                                        <button onClick={() => setEditingBatch(null)}
                                                            className="flex-1 py-2.5 rounded-lg text-sm font-medium border"
                                                            style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : isOpen ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingBatch(batch._id);
                                                            setBatchFrequency(freq as "weekly" | "monthly");
                                                            setBatchDuration(dur);
                                                        }}
                                                        className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all hover:bg-gray-50"
                                                        style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
                                                        ⚙ Edit Settings
                                                    </button>
                                                    <button onClick={() => handleCloseBatch(batch._id)}
                                                        className="py-2.5 px-4 rounded-lg text-sm font-medium transition-all hover:bg-red-50"
                                                        style={{ color: "var(--destructive)", border: "1px solid #FCA5A5" }}>
                                                        Close
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ===== TAB: Invite Codes ===== */}
                {activeTab === "inviteCodes" && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>
                                Sign-Up Invite Codes
                            </h2>
                            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                                Generate one-time use invite codes required for new members to register.
                            </p>
                        </div>

                        {/* Generate section */}
                        <div className="rounded-xl p-6 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                            <h3 className="text-base font-semibold mb-4" style={{ color: "var(--foreground)" }}>
                                Generate New Invite Code
                            </h3>
                            <button
                                onClick={handleGenerateInviteCode}
                                disabled={generatingInviteCode}
                                className="px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:shadow-md"
                                style={{
                                    background: "var(--primary)",
                                    color: "var(--card)",
                                    opacity: generatingInviteCode ? 0.6 : 1,
                                }}>
                                {generatingInviteCode ? "Generating..." : "🔑 Generate Sign-Up Code"}
                            </button>
                        </div>

                        {/* Generated codes display */}
                        {generatedInviteCodes.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
                                    Generated Codes (this session)
                                </h3>
                                {generatedInviteCodes.map((code, i) => (
                                    <div key={i} className="rounded-xl p-5 border flex items-center justify-between gap-4"
                                        style={{ background: "var(--muted)", borderColor: "var(--primary)" }}>
                                        <div>
                                            <p className="font-mono text-lg font-bold tracking-widest" style={{ color: "var(--foreground)" }}>
                                                {code}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleCopyCode(code)}
                                            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                                            style={{
                                                background: copiedCode === code ? "var(--success)" : "var(--primary)",
                                                color: "var(--card)",
                                            }}>
                                            {copiedCode === code ? "✓ Copied" : "Copy"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <SignUpInviteCodeHistory />
                    </div>
                )}

                {/* ===== TAB: Leave Codes ===== */}
                {activeTab === "codes" && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>
                                Leave Code Generator
                            </h2>
                            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                                Generate encrypted leave codes to share with members who want to leave a batch.
                            </p>
                        </div>

                        {/* Generate section */}
                        <div className="rounded-xl p-6 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                            <h3 className="text-base font-semibold mb-4" style={{ color: "var(--foreground)" }}>
                                Generate New Code
                            </h3>
                            {openBatches.length === 0 ? (
                                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No open batches.</p>
                            ) : (
                                <div className="flex flex-wrap gap-3">
                                    {openBatches.map((batch) => (
                                        <button
                                            key={batch._id}
                                            onClick={() => handleGenerateCode(batch._id)}
                                            disabled={generatingCode}
                                            className="px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:shadow-md"
                                            style={{
                                                background: "var(--primary)",
                                                color: "var(--card)",
                                                opacity: generatingCode ? 0.6 : 1,
                                            }}>
                                            {generatingCode ? "Generating..." : `🔐 Generate for Batch #${batch.number}`}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Generated codes display */}
                        {generatedCodes.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
                                    Generated Codes (this session)
                                </h3>
                                {generatedCodes.map((entry, i) => (
                                    <div key={i} className="rounded-xl p-5 border flex items-center justify-between gap-4"
                                        style={{ background: "var(--muted)", borderColor: "var(--primary)" }}>
                                        <div>
                                            <p className="text-xs font-medium mb-1" style={{ color: "var(--primary)" }}>
                                                Batch #{entry.batchNumber}
                                            </p>
                                            <p className="font-mono text-lg font-bold tracking-widest" style={{ color: "var(--foreground)" }}>
                                                {entry.code}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleCopyCode(entry.code)}
                                            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                                            style={{
                                                background: copiedCode === entry.code ? "var(--success)" : "var(--primary)",
                                                color: "var(--card)",
                                            }}>
                                            {copiedCode === entry.code ? "✓ Copied" : "Copy"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Code history per batch */}
                        {openBatches.map((batch) => (
                            <LeaveCodeHistory key={batch._id} batchId={batch._id} batchNumber={batch.number} />
                        ))}
                    </div>
                )}

                {/* ===== TAB: Leave Requests ===== */}
                {activeTab === "requests" && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>Leave Requests</h2>
                        {openBatches.length === 0 ? (
                            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No open batches.</p>
                        ) : (
                            openBatches.map((batch) => (
                                <LeaveRequestsPanel
                                    key={batch._id}
                                    batchId={batch._id}
                                    batchNumber={batch.number}
                                    onDecision={handleLeaveDecision}
                                />
                            ))
                        )}
                    </div>
                )}

                {/* ===== TAB: Banking ===== */}
                {activeTab === "banking" && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>Admin Bank Account</h2>
                            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                                Set your default bank account. Members will see these details when making payments.
                            </p>
                        </div>

                        {/* Currency toggle */}
                        <div className="rounded-xl p-6 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--foreground)" }}>Account Currency</h3>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                                    <button onClick={() => handleCurrencyToggle("TTD")}
                                        className="px-6 py-3 text-sm font-semibold transition-all"
                                        style={{ background: bankCurrency === "TTD" ? "var(--primary)" : "var(--card)", color: bankCurrency === "TTD" ? "var(--card)" : "var(--muted-foreground)" }}>
                                        🇹🇹 TTD
                                    </button>
                                    <button onClick={() => handleCurrencyToggle("USD")}
                                        className="px-6 py-3 text-sm font-semibold transition-all"
                                        style={{ background: bankCurrency === "USD" ? "var(--primary)" : "var(--card)", color: bankCurrency === "USD" ? "var(--card)" : "var(--muted-foreground)" }}>
                                        🇺🇸 USD
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span style={{ color: "var(--muted-foreground)" }}>Conversion Rate:</span>
                                    <span className="font-medium" style={{ color: "var(--foreground)" }}>1 USD =</span>
                                    <input type="number" step="0.01" min={0.01} value={bankConversionRate}
                                        onChange={(e) => setBankConversionRate(Number(e.target.value))}
                                        className="w-20 px-2 py-1.5 text-sm rounded-lg border text-center font-semibold"
                                        style={{ borderColor: "var(--border)", color: "var(--primary)" }} />
                                    <span className="font-medium" style={{ color: "var(--foreground)" }}>TTD</span>
                                </div>
                            </div>
                            {adminBank && !bankEditMode && (
                                <button onClick={async () => {
                                    try {
                                        await updateAdminCurrency({ currency: bankCurrency, conversionRate: bankConversionRate });
                                        toast.success("Conversion rate updated!");
                                    } catch (error) {
                                        toast.error(error instanceof Error ? error.message : "Failed");
                                    }
                                }}
                                    className="px-4 py-2 rounded-lg text-xs font-semibold"
                                    style={{ background: "var(--primary)", color: "var(--card)" }}>
                                    Save Rate
                                </button>
                            )}
                        </div>

                        {/* Bank details form */}
                        <div className="rounded-xl p-6 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Bank Details</h3>
                                {adminBank && !bankEditMode && (
                                    <button onClick={() => setBankEditMode(true)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                                        style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>Edit</button>
                                )}
                            </div>

                            {!adminBank || bankEditMode ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>First Name</label>
                                            <input type="text" value={bankFirstName} onChange={(e) => setBankFirstName(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-xl border text-sm"
                                                style={{ borderColor: "var(--border)", color: "var(--foreground)" }} placeholder="John" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Last Name</label>
                                            <input type="text" value={bankLastName} onChange={(e) => setBankLastName(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-xl border text-sm"
                                                style={{ borderColor: "var(--border)", color: "var(--foreground)" }} placeholder="Doe" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Bank Name</label>
                                        <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-xl border text-sm"
                                            style={{ borderColor: "var(--border)", color: "var(--foreground)" }} placeholder="Republic Bank" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Account Type</label>
                                        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                                            <button onClick={() => setBankAccountType("chequing")}
                                                className="flex-1 py-2.5 text-sm font-medium transition-all"
                                                style={{ background: bankAccountType === "chequing" ? "var(--primary)" : "var(--card)", color: bankAccountType === "chequing" ? "var(--card)" : "var(--muted-foreground)" }}>
                                                Chequing
                                            </button>
                                            <button onClick={() => setBankAccountType("savings")}
                                                className="flex-1 py-2.5 text-sm font-medium transition-all"
                                                style={{ background: bankAccountType === "savings" ? "var(--primary)" : "var(--card)", color: bankAccountType === "savings" ? "var(--card)" : "var(--muted-foreground)" }}>
                                                Savings
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Account Number</label>
                                        <input type="text" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-xl border text-sm font-mono"
                                            style={{ borderColor: "var(--border)", color: "var(--foreground)" }} placeholder="1234567890" />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button onClick={handleSaveBank} disabled={savingBank}
                                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                                            style={{ background: "var(--primary)", color: "var(--card)", opacity: savingBank ? 0.6 : 1 }}>
                                            {savingBank ? "Saving..." : "Save Bank Account"}
                                        </button>
                                        {bankEditMode && (
                                            <button onClick={() => setBankEditMode(false)}
                                                className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
                                                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>Cancel</button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <span style={{ color: "var(--muted-foreground)" }}>Name:</span>
                                    <span className="font-medium" style={{ color: "var(--foreground)" }}>{adminBank.firstName} {adminBank.lastName}</span>
                                    <span style={{ color: "var(--muted-foreground)" }}>Bank:</span>
                                    <span className="font-medium" style={{ color: "var(--foreground)" }}>{adminBank.bankName}</span>
                                    <span style={{ color: "var(--muted-foreground)" }}>Account Type:</span>
                                    <span className="font-medium uppercase" style={{ color: "var(--foreground)" }}>{adminBank.accountType}</span>
                                    <span style={{ color: "var(--muted-foreground)" }}>Account #:</span>
                                    <span className="font-medium font-mono" style={{ color: "var(--foreground)" }}>{adminBank.accountNumber}</span>
                                    <span style={{ color: "var(--muted-foreground)" }}>Currency:</span>
                                    <span className="font-medium" style={{ color: "var(--foreground)" }}>
                                        {adminBank.currency} <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>(1 USD = {adminBank.conversionRate} TTD)</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ===== TAB: Payments ===== */}
                {activeTab === "payments" && (
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>Payment Verification</h2>
                            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                                Mark users as paid before they can join the current open batch.
                            </p>
                        </div>

                        {openBatch ? (
                            <PaymentVerificationPanel
                                batchId={openBatch._id}
                                batchNumber={openBatch.number}
                                onVerify={handleVerifyPayment}
                            />
                        ) : (
                            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No open batch.</p>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

// ——— Sub-components ———

function SignUpInviteCodeHistory() {
    const codes = useQuery(api.admin.listSignUpInviteCodes);

    if (!codes || codes.length === 0) return null;

    return (
        <div className="rounded-xl p-5 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
                Sign-up Code History
            </h4>
            <div className="space-y-2">
                {codes.map((c) => (
                    <div key={c._id} className="flex items-center justify-between text-xs py-2 border-b last:border-b-0"
                        style={{ borderColor: "var(--border)" }}>
                        <div className="flex items-center gap-3">
                            <span className="font-mono font-medium tracking-wider" style={{ color: "var(--foreground)" }}>
                                {c.code}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {c.used ? (
                                <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: "var(--destructive)", color: "var(--destructive-foreground)" }}>
                                    Used{c.usedByName ? ` by ${c.usedByName}` : ""}
                                </span>
                            ) : (
                                <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: "var(--success)", color: "var(--success-foreground)" }}>
                                    Available
                                </span>
                            )}
                            <span style={{ color: "var(--muted-foreground)" }}>
                                {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function LeaveCodeHistory({ batchId, batchNumber }: { batchId: Id<"batches">; batchNumber: number }) {
    const codes = useQuery(api.admin.listLeaveCodes, { batchId });

    if (!codes || codes.length === 0) return null;

    return (
        <div className="rounded-xl p-5 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
                Batch #{batchNumber} — Code History
            </h4>
            <div className="space-y-2">
                {codes.map((c) => (
                    <div key={c._id} className="flex items-center justify-between text-xs py-2 border-b last:border-b-0"
                        style={{ borderColor: "var(--border)" }}>
                        <div className="flex items-center gap-3">
                            <span className="font-mono font-medium tracking-wider" style={{ color: "var(--foreground)" }}>
                                {c.code}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {c.used ? (
                                <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: "var(--destructive)", color: "var(--destructive-foreground)" }}>
                                    Used{c.usedByName ? ` by ${c.usedByName}` : ""}
                                </span>
                            ) : (
                                <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: "var(--success)", color: "var(--success-foreground)" }}>
                                    Available
                                </span>
                            )}
                            <span style={{ color: "var(--muted-foreground)" }}>
                                {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function LeaveRequestsPanel({
    batchId,
    batchNumber,
    onDecision,
}: {
    batchId: Id<"batches">;
    batchNumber: number;
    onDecision: (requestId: Id<"leaveRequests">, decision: "approved" | "denied") => Promise<void>;
}) {
    const leaveRequests = useQuery(api.batches.getLeaveRequests, { batchId });
    const [processingId, setProcessingId] = useState<string | null>(null);

    const pendingRequests = leaveRequests?.filter((r) => r.status === "pending") ?? [];

    if (pendingRequests.length === 0) {
        return (
            <div className="rounded-xl p-5 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <h4 className="text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
                    Batch #{batchNumber}
                </h4>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>No pending leave requests.</p>
            </div>
        );
    }

    const handleClick = async (requestId: Id<"leaveRequests">, decision: "approved" | "denied") => {
        setProcessingId(requestId);
        await onDecision(requestId, decision);
        setProcessingId(null);
    };

    return (
        <div className="rounded-xl p-5 border" style={{ background: "var(--muted)", borderColor: "var(--primary)" }}>
            <h4 className="text-sm font-semibold mb-4" style={{ color: "var(--primary)" }}>
                Batch #{batchNumber} — {pendingRequests.length} pending request(s)
            </h4>
            <div className="space-y-3">
                {pendingRequests.map((req) => (
                    <div key={req._id} className="flex items-center justify-between p-3 rounded-xl bg-white border"
                        style={{ borderColor: "var(--primary)" }}>
                        <div>
                            <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{req.userName}</p>
                            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{req.userEmail}</p>
                            {req.reason && (
                                <p className="text-xs mt-1 italic" style={{ color: "var(--muted-foreground)" }}>&ldquo;{req.reason}&rdquo;</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleClick(req._id, "approved")} disabled={processingId === req._id}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                style={{ background: "var(--success)", color: "var(--success-foreground)" }}>
                                Approve
                            </button>
                            <button onClick={() => handleClick(req._id, "denied")} disabled={processingId === req._id}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                style={{ background: "var(--destructive)", color: "var(--card)" }}>
                                Deny
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PaymentVerificationPanel({
    batchId,
    batchNumber,
    onVerify,
}: {
    batchId: Id<"batches">;
    batchNumber: number;
    onVerify: (userId: Id<"profiles">, batchId: Id<"batches">, verified: boolean) => void;
}) {
    const statuses = useQuery(api.banking.listPaymentStatuses, { batchId });

    if (!statuses) {
        return (
            <div className="rounded-xl p-5 border animate-pulse flex items-center justify-center h-32"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <span className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>Loading...</span>
            </div>
        );
    }

    if (statuses.length === 0) {
        return (
            <div className="rounded-xl p-5 border text-center"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <span className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>No users found.</span>
            </div>
        );
    }

    const unverified = statuses.filter((s) => !s.verified);
    const verified = statuses.filter((s) => s.verified);

    return (
        <div className="rounded-xl p-6 border space-y-6"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div>
                <h3 className="text-base font-semibold mb-3" style={{ color: "var(--foreground)" }}>
                    Pending Verification ({unverified.length})
                </h3>
                {unverified.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>All users verified!</p>
                ) : (
                    <div className="space-y-3">
                        {unverified.map((u) => (
                            <div key={u._id} className="flex items-center justify-between p-3 rounded-lg border"
                                style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
                                <div>
                                    <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{u.name}</p>
                                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{u.email}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {u.isAlreadyMember && (
                                        <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">Joined</span>
                                    )}
                                    <button onClick={() => onVerify(u._id, batchId, true)}
                                        className="px-4 py-1.5 rounded-lg text-xs font-semibold"
                                        style={{ background: "var(--primary)", color: "var(--card)" }}>
                                        Mark Paid
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-base font-semibold mb-3" style={{ color: "var(--foreground)" }}>
                    Verified Paid ({verified.length})
                </h3>
                {verified.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No users verified yet.</p>
                ) : (
                    <div className="space-y-3">
                        {verified.map((u) => (
                            <div key={u._id} className="flex items-center justify-between p-3 rounded-lg border"
                                style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-100 text-green-600">
                                        ✓
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{u.name}</p>
                                        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{u.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {u.isAlreadyMember && (
                                        <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">Joined</span>
                                    )}
                                    <button onClick={() => onVerify(u._id, batchId, false)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                                        style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
                                        Unverify
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
