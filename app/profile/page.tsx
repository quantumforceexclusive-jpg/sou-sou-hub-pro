"use client";

import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { DashboardNav } from "@/components/DashboardNav";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera } from "lucide-react";

export default function ProfilePage() {
    const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
    const router = useRouter();

    const user = useQuery(api.users.getMe);
    const myMembership = useQuery(api.batches.getMyMembership);

    const updateProfile = useMutation(api.users.updateMyProfile);
    const generateUploadUrl = useMutation(api.users.generateUploadUrl);
    const saveProfileImage = useMutation(api.users.saveMyProfileImage);

    // Banking info
    const myBank = useQuery(api.banking.getMyBankingInfo);
    const saveMyBankingInfo = useMutation(api.banking.saveMyBankingInfo);

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // Banking state
    const [bankEditMode, setBankEditMode] = useState(false);
    const [bankSaving, setBankSaving] = useState(false);
    const [bankFirstName, setBankFirstName] = useState("");
    const [bankLastName, setBankLastName] = useState("");
    const [bankName, setBankName] = useState("");
    const [bankAccountType, setBankAccountType] = useState<"chequing" | "savings">("chequing");
    const [bankAccountNumber, setBankAccountNumber] = useState("");
    const [bankCurrency, setBankCurrency] = useState<"TTD" | "USD">("TTD");

    // Load initial bank data
    useEffect(() => {
        if (myBank) {
            setBankFirstName(myBank.firstName);
            setBankLastName(myBank.lastName);
            setBankName(myBank.bankName);
            setBankAccountType(myBank.accountType);
            setBankAccountNumber(myBank.accountNumber);
            setBankCurrency(myBank.currency);
        }
    }, [myBank]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Redirect to home if not authenticated
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/");
        }
    }, [isAuthenticated, authLoading, router]);

    // Populate form when modal opens
    useEffect(() => {
        if (user) {
            setEditName(user.name);
            setEditPhone(user.phone || "");
        }
    }, [user, isEditing]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateProfile({
                name: editName,
                phone: editPhone || undefined,
            });
            toast.success("Profile updated successfully");
            setIsEditing(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate image size (5MB max)
        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            toast.error("Image size must be less than 5MB");
            return;
        }

        setIsUploadingImage(true);
        try {
            // 1. Get short-lived upload URL
            const postUrl = await generateUploadUrl();

            // 2. Post file to URL
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });

            if (!result.ok) throw new Error("Failed to upload image");

            // 3. Get the storage ID and save to profile
            const { storageId } = await result.json();
            await saveProfileImage({ storageId });

            toast.success("Profile photo updated!");
        } catch (error) {
            toast.error("Failed to upload image");
            console.error(error);
        } finally {
            setIsUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSaveBank = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bankFirstName || !bankLastName || !bankName || !bankAccountNumber) {
            toast.error("Please fill in all banking fields.");
            return;
        }
        setBankSaving(true);
        try {
            await saveMyBankingInfo({
                firstName: bankFirstName,
                lastName: bankLastName,
                bankName: bankName,
                accountType: bankAccountType,
                accountNumber: bankAccountNumber,
                currency: bankCurrency,
            });
            toast.success("Banking info saved!");
            setBankEditMode(false);
        } catch (error) {
            toast.error("Failed to save banking info");
            console.error(error);
        } finally {
            setBankSaving(false);
        }
    };

    if (authLoading || !isAuthenticated || user === undefined) {
        return (
            <div className="min-h-screen bg-[#FFF9F3] flex flex-col">
                <DashboardNav />
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <Skeleton className="h-6 w-48" />
                    </div>
                </div>
            </div>
        );
    }

    if (user === null) {
        return null;
    }

    return (
        <div className="min-h-screen" style={{ background: "var(--background)" }}>
            <DashboardNav />

            {/* Hidden file input for native image picker */}
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageUpload}
            />

            <main className="max-w-5xl mx-auto px-6 py-10 md:py-16">
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
                    <h1
                        className="text-3xl font-bold"
                        style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", color: "var(--foreground)" }}
                    >
                        My Profile
                    </h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column - Profile Card */}
                    <div className="md:col-span-1 space-y-6">
                        <Card className="border shadow-sm pt-6" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                            <CardContent className="flex flex-col items-center text-center">
                                <div className="relative group mb-4">
                                    <Avatar className="h-28 w-28 border-4 border-white shadow-md transition-opacity">
                                        <AvatarImage src={user.profileImageUrl || ""} alt={user.name} className="object-cover" />
                                        <AvatarFallback className="text-3xl font-medium" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                                            {user.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>

                                    {/* Overlay for hovering/clicking to change photo */}
                                    <div
                                        className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                                        onClick={() => !isUploadingImage && fileInputRef.current?.click()}
                                    >
                                        {isUploadingImage ? (
                                            <Skeleton className="h-8 w-8 rounded-full bg-white/20 animate-pulse" />
                                        ) : (
                                            <Camera className="w-8 h-8 text-white" />
                                        )}
                                    </div>
                                </div>

                                <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{user.name}</h2>
                                <p className="text-sm text-muted-foreground mb-3">{user.email}</p>

                                <Badge
                                    className="mb-6 uppercase tracking-wider px-3"
                                    style={{
                                        background: user.role === 'admin' ? "var(--primary)" : "var(--secondary)",
                                        color: user.role === 'admin' ? "var(--primary-foreground)" : "var(--success-foreground)",
                                    }}
                                    variant="secondary"
                                >
                                    {user.role}
                                </Badge>

                                <div className="w-full space-y-3 mb-6">
                                    <div className="flex justify-between text-sm py-2 border-b" style={{ borderColor: "var(--border)" }}>
                                        <span className="text-muted-foreground">Phone</span>
                                        <span className="font-medium" style={{ color: "var(--foreground)" }}>{user.phone || "Not provided"}</span>
                                    </div>
                                    <div className="flex justify-between text-sm py-2 border-b" style={{ borderColor: "var(--border)" }}>
                                        <span className="text-muted-foreground">Joined</span>
                                        <span className="font-medium" style={{ color: "var(--foreground)" }}>
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <Dialog open={isEditing} onOpenChange={setIsEditing}>
                                    <DialogTrigger asChild>
                                        <Button className="w-full btn-gold">Edit Profile</Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]" style={{ background: "var(--background)", borderColor: "var(--border)" }}>
                                        <DialogHeader>
                                            <DialogTitle style={{ color: "var(--foreground)", fontFamily: "var(--font-playfair)" }}>Edit Profile</DialogTitle>
                                            <DialogDescription>
                                                Make changes to your profile details here.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <form onSubmit={handleSaveProfile} className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="name" style={{ color: "var(--foreground)" }}>Full Name</Label>
                                                <Input
                                                    id="name"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="auth-input bg-white"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="phone" style={{ color: "var(--foreground)" }}>Phone Number (Optional)</Label>
                                                <Input
                                                    id="phone"
                                                    type="tel"
                                                    value={editPhone}
                                                    onChange={(e) => setEditPhone(e.target.value)}
                                                    className="auth-input bg-white"
                                                    placeholder="+1 (555) 000-0000"
                                                />
                                            </div>
                                            <DialogFooter className="pt-4">
                                                <Button
                                                    type="submit"
                                                    disabled={isSaving}
                                                    className="btn-gold"
                                                >
                                                    {isSaving ? "Saving..." : "Save changes"}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Status & Memberships */}
                    <div className="md:col-span-2 space-y-6">
                        <Card className="border shadow-sm" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                            <CardHeader className="pb-3 border-b" style={{ borderColor: "var(--border)" }}>
                                <CardTitle style={{ color: "var(--foreground)" }}>Membership Status</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {myMembership === undefined ? (
                                    <div className="space-y-3">
                                        <Skeleton className="h-16 w-full rounded-xl" />
                                        <Skeleton className="h-16 w-full rounded-xl" />
                                    </div>
                                ) : !myMembership || myMembership.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-6">
                                        You haven't joined any batches yet.
                                    </p>
                                ) : (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {myMembership.map((m) => {
                                            const isOpen = m.batch?.status === "open";
                                            return (
                                                <div
                                                    key={m._id}
                                                    className="p-4 rounded-xl border relative overflow-hidden"
                                                    style={{
                                                        background: isOpen ? "var(--card)" : "var(--muted)",
                                                        borderColor: isOpen ? "var(--primary)" : "var(--border)",
                                                    }}
                                                >
                                                    {isOpen && (
                                                        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
                                                            <div className="absolute top-3 right-[-2.5rem] bg-[#D9A63A] text-white text-[10px] font-bold py-1 w-28 text-center rotate-45 shadow-sm">
                                                                ACTIVE
                                                            </div>
                                                        </div>
                                                    )}

                                                    <h3 className="font-semibold text-lg mb-1" style={{ color: "var(--foreground)" }}>
                                                        Batch #{m.batch?.number}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Badge variant="outline" style={{ borderColor: isOpen ? "var(--secondary)" : "", color: isOpen ? "var(--success)" : "inherit" }}>
                                                            {isOpen ? 'Open' : 'Closed'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Your Member #: <strong style={{ color: "var(--foreground)" }}>#{String(m.memberNumber).padStart(2, "0")}</strong>
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Display Name: <strong style={{ color: "var(--foreground)" }}>{m.displayName}</strong>
                                                    </p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Banking Information Card */}
                        <Card className="border shadow-sm" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between" style={{ borderColor: "var(--border)" }}>
                                <CardTitle style={{ color: "var(--foreground)" }}>Banking Information</CardTitle>
                                {myBank && !bankEditMode && (
                                    <Button onClick={() => setBankEditMode(true)} variant="outline" size="sm" className="h-8">
                                        Edit
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="pt-6">
                                {!myBank || bankEditMode ? (
                                    <form onSubmit={handleSaveBank} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label style={{ color: "var(--foreground)" }}>First Name</Label>
                                                <Input value={bankFirstName} onChange={(e) => setBankFirstName(e.target.value)} required placeholder="John" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label style={{ color: "var(--foreground)" }}>Last Name</Label>
                                                <Input value={bankLastName} onChange={(e) => setBankLastName(e.target.value)} required placeholder="Doe" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label style={{ color: "var(--foreground)" }}>Bank Name</Label>
                                            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} required placeholder="Republic Bank" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label style={{ color: "var(--foreground)" }}>Account Type</Label>
                                            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                                                <button type="button" onClick={() => setBankAccountType("chequing")}
                                                    className="flex-1 py-2 text-sm font-medium transition-all"
                                                    style={{ background: bankAccountType === "chequing" ? "var(--primary)" : "var(--card)", color: bankAccountType === "chequing" ? "var(--card)" : "var(--muted-foreground)" }}>
                                                    Chequing
                                                </button>
                                                <button type="button" onClick={() => setBankAccountType("savings")}
                                                    className="flex-1 py-2 text-sm font-medium transition-all"
                                                    style={{ background: bankAccountType === "savings" ? "var(--primary)" : "var(--card)", color: bankAccountType === "savings" ? "var(--card)" : "var(--muted-foreground)" }}>
                                                    Savings
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label style={{ color: "var(--foreground)" }}>Account Number</Label>
                                            <Input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} required className="font-mono" />
                                        </div>
                                        <div className="space-y-2 mb-4">
                                            <Label style={{ color: "var(--foreground)" }}>Currency</Label>
                                            <div className="px-3 py-2 text-sm rounded-lg border bg-gray-50 text-gray-500">
                                                {bankCurrency} (Can only be modified by admin)
                                            </div>
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <Button type="submit" className="flex-1 btn-gold" disabled={bankSaving}>
                                                {bankSaving ? "Saving..." : "Save Banking Info"}
                                            </Button>
                                            {bankEditMode && (
                                                <Button type="button" onClick={() => setBankEditMode(false)} variant="outline" className="flex-1">
                                                    Cancel
                                                </Button>
                                            )}
                                        </div>
                                    </form>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <span style={{ color: "var(--muted-foreground)" }}>Account Holder:</span>
                                        <span className="font-medium" style={{ color: "var(--foreground)" }}>{myBank.firstName} {myBank.lastName}</span>
                                        <span style={{ color: "var(--muted-foreground)" }}>Bank:</span>
                                        <span className="font-medium" style={{ color: "var(--foreground)" }}>{myBank.bankName}</span>
                                        <span style={{ color: "var(--muted-foreground)" }}>Account Type:</span>
                                        <span className="font-medium uppercase" style={{ color: "var(--foreground)" }}>{myBank.accountType}</span>
                                        <span style={{ color: "var(--muted-foreground)" }}>Account #:</span>
                                        <span className="font-medium font-mono" style={{ color: "var(--foreground)" }}>{myBank.accountNumber}</span>
                                        <span style={{ color: "var(--muted-foreground)" }}>Currency:</span>
                                        <span className="font-medium uppercase" style={{ color: "var(--foreground)" }}>{myBank.currency}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
