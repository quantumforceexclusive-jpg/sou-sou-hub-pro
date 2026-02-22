const fs = require('fs');
const path = require('path');

const dirs = ['app', 'components'];

const colorMap = {
    '"#1B2A4A"': '"var(--foreground)"', // Deep navy -> Foreground
    '"#FFF9F3"': '"var(--background)"', // Cream -> Background
    '"#FFFFFF"': '"var(--card)"',       // White -> Card
    '"#D9A63A"': '"var(--primary)"',    // Gold -> Primary
    '"#C4922E"': '"var(--primary)"',    // Darker Gold -> Primary
    '"#A6CAB5"': '"var(--secondary)"',  // Teal -> Secondary
    '"#2D6A4F"': '"var(--success)"',    // Emerald -> Success
    '"#64748B"': '"var(--muted-foreground)"', // Slate -> muted foreground
    '"#94A3B8"': '"var(--muted-foreground)"', // Lighter slate -> muted foreground
    '"#E2DED8"': '"var(--border)"',     // Check border
    '"#E2DED850"': '"var(--border)"',
    '"#EF4444"': '"var(--destructive)"',// Red
    '"#334155"': '"var(--border)"',     // Dark border
    '"#0F172A"': '"var(--background)"',
    '"#F1F5F9"': '"var(--foreground)"',
    '"#2D3E5E"': '"var(--foreground)"',
    '"#A6CAB515"': '"var(--secondary)"',
    '"#F0EDE8"': '"var(--muted)"',
    '"#DC2626"': '"var(--destructive)"',
    '"#FCA5A5"': '"var(--destructive)"',
    '"#D9A63A20"': '"var(--primary)"',
    '"#FFFBEB"': '"var(--muted)"',
    '"#FDE68A"': '"var(--primary)"',
    '"#92400E"': '"var(--primary)"',
    '"#22C55E"': '"var(--success)"',
    '"#0369A1"': '"var(--foreground)"',
    '"#E0F2FE"': '"var(--muted)"',
    '"#7C3AED"': '"var(--foreground)"',
    '"#F3E8FF"': '"var(--muted)"',
    '"#F8FAFC"': '"var(--muted)"',
    '"#F7F5F0"': '"var(--muted)"',
    '"#D9A63A15"': '"var(--primary)"',
    '"#A6CAB520"': '"var(--secondary)"',
    '"#FEE2E2"': '"var(--destructive)"',
    '"#FEF3C7"': '"var(--primary)"',
    '"#991B1B"': '"var(--foreground)"',
    '"#D1FAE5"': '"var(--success)"',
    '"#065F46"': '"var(--foreground)"',
    '"rgba(255,249,243,0.9)"': '"var(--background)"',
    '"#FFF9F3CC"': '"var(--background)"',
    '"#E2DED830"': '"var(--border)"',
    '"#F8F6F2"': '"var(--muted)"',
    '"#D9A63A40"': '"var(--primary)"',
    '"#2D6A4F15"': '"var(--success)"',
    '"#64748B15"': '"var(--muted)"',
    '"#D9A63A08"': '"transparent"',
    '"#E8906D"': '"var(--accent)"',
    '"linear-gradient(135deg, #FFF9F3, #FFFFFF)"': '"var(--card)"',
    '"linear-gradient(135deg, #FFFFFF 0%, #FFF9F3 100%)"': '"var(--card)"'
};

function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            for (const [hex, cssVar] of Object.entries(colorMap)) {
                if (content.includes(hex)) {
                    content = content.split(hex).join(cssVar);
                    modified = true;
                }
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    });
}

dirs.forEach(dir => processDirectory(dir));
console.log("Done refactoring extended colors.");
