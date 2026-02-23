"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export function FooterDisclaimer() {
    return (
        <footer className="w-full bg-background border-t border-border py-8 px-6 sm:px-10 lg:px-16 mx-auto relative z-10">
            <div className="max-w-[1440px] mx-auto flex flex-col items-center text-center gap-4">
                {/* Short Disclaimer Line */}
                <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
                    Sou Sou Hub Pro is a management platform and does not collect, hold, or distribute funds. All financial transactions are conducted independently by batch members and administrators.
                </p>

                {/* Disclaimer Link / Modal */}
                <Dialog>
                    <DialogTrigger asChild>
                        <button className="text-xs sm:text-sm font-medium text-foreground hover:text-primary transition-colors underline underline-offset-4">
                            Disclaimer
                        </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader className="mb-4">
                            <DialogTitle className="text-2xl font-bold font-playfair sm:text-3xl text-foreground">
                                Legal Disclaimer
                            </DialogTitle>
                            <div className="w-full h-px bg-border mt-4" />
                        </DialogHeader>

                        <div className="space-y-6 text-sm sm:text-base text-foreground/90 leading-relaxed font-inter pb-4">
                            <p>
                                Sou Sou Hub Pro is a digital management and tracking platform designed to assist organizers and members in structuring and monitoring traditional rotating savings groups (“sou sou”).
                            </p>

                            <div className="space-y-2">
                                <p className="font-semibold text-foreground">The platform does not:</p>
                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                    <li>Hold, store, or manage user funds</li>
                                    <li>Process payments between members</li>
                                    <li>Act as a financial institution</li>
                                    <li>Guarantee payouts</li>
                                    <li>Provide financial, legal, or investment advice</li>
                                </ul>
                            </div>

                            <p>
                                All financial contributions and distributions are conducted independently and at the discretion of the batch administrator and members.
                            </p>

                            <div className="space-y-2">
                                <p>
                                    Sou Sou Hub Pro provides organizational tools, randomized scheduling logic, and fairness verification features but does not assume responsibility for:
                                </p>
                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                    <li>Missed payments</li>
                                    <li>Member disputes</li>
                                    <li>Financial losses</li>
                                    <li>Fraudulent activity by participants</li>
                                </ul>
                            </div>

                            <p className="font-medium text-foreground">
                                Users participate in batches at their own risk.
                            </p>

                            <p className="italic text-muted-foreground">
                                By using this platform, users acknowledge that Sou Sou Hub Pro serves strictly as a digital tracking and management tool.
                            </p>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </footer>
    );
}
