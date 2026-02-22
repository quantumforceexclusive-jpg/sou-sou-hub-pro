"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { LogoIcon } from "@/components/LogoIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardNav() {
    const { signOut } = useAuthActions();
    const router = useRouter();
    const user = useQuery(api.users.getMe);

    const handleSignOut = async () => {
        await signOut();
        router.push("/");
    };

    return (
        <header className="border-b sticky top-0 z-50 bg-background/90 backdrop-blur-md border-border">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => router.push("/dashboard")}
                >
                    <LogoIcon className="w-9 h-9" />
                    <span
                        className="text-xl font-semibold tracking-tight hidden sm:inline-block text-foreground"
                        style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif" }}
                    >
                        Sou Sou Hub Pro
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    {user === undefined ? (
                        <Skeleton className="h-10 w-10 rounded-full" />
                    ) : user === null ? (
                        <button
                            onClick={handleSignOut}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-red-50 bg-white"
                            style={{ color: "var(--destructive)", border: "1px solid #E2DED8" }}
                        >
                            Sign Out
                        </button>
                    ) : (
                        <>
                            {user.role === "admin" && (
                                <span
                                    className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider hidden sm:inline-block"
                                    style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                                >
                                    Admin
                                </span>
                            )}
                            <ThemeToggle />
                            <DropdownMenu>
                                <DropdownMenuTrigger className="outline-none focus:ring-2 focus:ring-ring rounded-full">
                                    <Avatar className="h-10 w-10 border border-border cursor-pointer hover:opacity-80 transition shadow-sm">
                                        <AvatarImage src={user.profileImageUrl || ""} alt={user.name} className="object-cover" />
                                        <AvatarFallback className="font-medium" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                                            {user.name?.substring(0, 2).toUpperCase() || "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 bg-popover text-popover-foreground">
                                    <DropdownMenuLabel>
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{user.name}</p>
                                            <p className="text-xs text-muted-foreground leading-none">{user.email}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="cursor-pointer"
                                        onClick={() => router.push("/profile")}
                                    >
                                        My Profile
                                    </DropdownMenuItem>
                                    {user.role === "admin" && (
                                        <DropdownMenuItem
                                            className="cursor-pointer"
                                            onClick={() => router.push("/admin")}
                                        >
                                            ⚡ Admin Panel
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem className="cursor-pointer text-muted-foreground" disabled>
                                        Settings
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                                        onClick={handleSignOut}
                                    >
                                        Sign Out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
