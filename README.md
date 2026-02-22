# Sou Sou Hub Pro

A modern web application for managing Sou-Sou savings groups (batches). Built with **Next.js 16**, **TypeScript**, **Tailwind CSS v4**, **shadcn/ui**, and **Convex** (database + authentication).

## Features

- 🔐 **Secure Auth** — Email/password with Convex Auth (sign up + sign in)
- 📊 **Batch Management** — Create, join, and manage sou-sou savings batches
- 👥 **Sequential Member Numbering** — Race-condition-safe member assignment (#01–#50)
- 🔄 **Realtime Updates** — Convex reactivity shows live batch changes
- 🛡️ **Admin Controls** — Admins can close batches early
- 🌴 **Beautiful UI** — Warm, premium Caribbean fintech design

## Getting Started

### Prerequisites

- **Node.js 18+**
- **npm**
- **Convex account** — [Sign up at convex.dev](https://convex.dev)

### 1. Install Dependencies

```bash
cd sou-sou-hub-pro
npm install
```

### 2. Initialize Convex

Run this command and follow the prompts to create a new Convex project:

```bash
npx convex dev
```

This will:
- Authenticate with your Convex account (opens browser)
- Create a new project
- Push your schema and functions
- Generate the `convex/_generated/` directory
- Populate your `.env.local` with `NEXT_PUBLIC_CONVEX_URL`

### 3. Set up Auth Environment Variable

After Convex is initialized, you need to set the `AUTH_SECRET` environment variable. Generate one:

```bash
npx convex env set AUTH_SECRET $(openssl rand -base64 32)
```

Or on Windows PowerShell:
```powershell
$secret = [Convert]::ToBase64String((1..32 | % { Get-Random -Max 256 }) -as [byte[]])
npx convex env set AUTH_SECRET $secret
```

### 4. Run the Dev Server

In **two separate terminals**:

**Terminal 1: Convex**
```bash
npx convex dev
```

**Terminal 2: Next.js**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
sou-sou-hub-pro/
├── app/
│   ├── globals.css              # Design system + brand styles
│   ├── layout.tsx               # Root layout with fonts + provider
│   ├── page.tsx                 # Landing page (hero + auth card)
│   ├── ConvexClientProvider.tsx  # Convex auth provider wrapper
│   └── dashboard/
│       └── page.tsx             # Dashboard with batch cards
├── components/
│   ├── AuthCard.tsx             # Sign-in/sign-up auth form
│   ├── LogoIcon.tsx             # SVG logo component
│   ├── PalmLeaves.tsx           # Decorative palm leaf SVGs
│   └── ui/                     # shadcn/ui components
├── convex/
│   ├── schema.ts               # Database schema (users, batches, batchMembers)
│   ├── auth.ts                 # Convex Auth configuration
│   ├── auth.config.ts          # Auth provider config
│   ├── http.ts                 # HTTP router for auth routes
│   ├── users.ts                # User queries/mutations
│   └── batches.ts              # Batch queries/mutations
└── ...
```

## Batch System Rules

1. **Batch #1** starts as `Open`
2. Max **50 members** per batch
3. When a batch hits 50 → auto-closes → creates next batch as `Open`
4. Admin can close a batch early → next batch auto-created
5. Members get sequential numbers: `Name #01`, `Name #02`, etc.
6. A user can only be in **one open batch** at a time

## Making a User Admin

In the Convex Dashboard, navigate to your `users` table and edit the user's `role` field from `"member"` to `"admin"`.
