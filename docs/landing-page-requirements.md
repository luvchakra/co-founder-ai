# CoFounderAI — Landing Page & Authentication Requirements

Condensed from the uploaded PDF (`CoFounderAI_Landing_page_requirements.pdf`, v1.0).
Scope: marketing landing page (`/`), auth pages (`/login`, `/signup`), and post-signup
onboarding (`/onboarding`). Full copy preserved here so later stories don't need to
re-derive exact strings.

## Positioning

- Core: "Your AI Co-Founder for Customer Acquisition."
- Alt: "Build your product. CoFounderAI helps you find the customers."
- Supporting: "From figuring out your ideal customer to finding prospects, creating
  personalized outreach, and deciding what to do next — CoFounderAI works alongside you
  like a GTM co-founder."
- Position as an **AI GTM Co-Founder**, not an AI sales/email tool.

## Audience

Primary: new/early-stage founders (recently launched, first customers, limited sales
experience, no sales team, don't know their ICP, want AI help but stay in control).
Secondary: solo founders, indie hackers, small business owners, startup teams, product
builders, consultants, early B2B SaaS.

## Visual direction

Dark premium SaaS + intelligent AI interface. Deep charcoal/near-black background, white
type, one accent color (electric violet, chosen), soft gradients used sparingly,
glass-like cards, subtle glow around AI elements, fine grid texture, smooth animations,
large product screenshots (real dashboard mockups, not generic AI illustrations),
rounded modern UI. Avoid: robot imagery, corporate/enterprise look, excessive gradients,
stock photos, excessive text, "AI magic" clichés. Palette as design tokens, not
hard-coded (see `app/globals.css`'s `.landing-theme`).

## Navigation

Logo · Product · How It Works · Benefits · Pricing · FAQ | Log In · Start Free
(Start Free stays the one visually consistent primary CTA throughout.)

## Sections (in order)

1. **Hero** — H1 "Your AI Co-Founder for Getting Customers." Sub: "You built the
   product. CoFounderAI helps you find the right customers, understand why they might
   buy, and turn conversations into opportunities." CTAs: Start Free / See How It Works.
   Microcopy: "No sales team required. You stay in control. AI does the heavy lifting."
   Visual: dashboard mock — "Good morning, Founder 👋 / Your GTM plan is ready." with
   127 potential customers identified · 23 high-fit prospects · 8 buying signals
   detected · 5 prospects ready for outreach, then a prospect card (Acme Technologies,
   ICP Fit 94%, Intent High, Timing Excellent, Recommended Contact: VP Product, "Why
   now? Acme recently launched a product requiring automated identity management.",
   CTA "View Strategy →").

2. **Founder Problem** — H2 "Building the product was hard. Finding customers
   shouldn't be harder." 5 cards: "Who should I sell to?" / "Who should I contact?" /
   "Why would they care?" / "Why now?" / "What do I do next?" (each with the doc's
   supporting line).

3. **Transformation (before/after)** — BEFORE: Product built → No clear ICP → Random
   prospect list → Generic emails → Few responses → Unclear next steps. AFTER: Product
   understood → ICP identified → Best prospects discovered → Prospects researched →
   Personalized strategy → Founder-approved outreach → Conversation analyzed → Next
   action recommended. Headline: "From 'Who do I sell to?' to 'Here are the 10 people
   you should talk to next.'"

4. **How CoFounderAI Works** — 5 steps: (1) Tell Us About Your Product → product
   understanding/value prop/ICP hypotheses/use cases; (2) Discover Your Customers →
   target companies/contacts/ICP fit/company info/buying signals; (3) Understand Each
   Prospect → why them/why now/who to contact/what to say/which channel; (4) Approve &
   Reach Out → example strategy card (Email, "Recent product launch", CTA "15-minute
   discovery conversation", buttons Approve/Edit); (5) Let AI Help With the Conversation
   → analyzes sentiment/intent/stage/objections/signals, recommends next best action
   (example: implementation-effort objection → "Send a short implementation overview
   and offer a 15-minute technical discussion.").

5. **Core Benefits** — H2 "A co-founder that never stops thinking about your next
   customer." 6 cards: Know Your ICP / Find Better Prospects / Know Why They Might Buy /
   Know When to Reach Out / Send Better Outreach / Always Know What To Do Next (each
   with the doc's one-line description).

6. **Differentiation** — H2 "Not another AI email generator." Sub: "CoFounderAI thinks
   about the entire customer acquisition journey." Comparison table (Traditional AI Tool
   vs CoFounderAI): Generates emails→Understands the prospect; Uses generic
   templates→Creates prospect-specific strategy; Finds contacts→Prioritizes the right
   contacts; Sends messages→Explains why to contact them; Stops after sending→Analyzes
   the response; No context→Learns from conversations; Content assistant→GTM co-founder.
   Closing: "The goal isn't more outreach. It's more meaningful conversations."

7. **"One Prospect at a Time"** — interactive-style prospect intelligence card: Acme
   Technologies, Overall Score 92/100 (ICP Fit 94, Intent 87, Timing 91, Reachability
   95); Why This Prospect? / Why Now? / Who To Contact? (Sarah Miller, VP Engineering) /
   Recommended Channel (Email) / Recommended Angle ("Engineering scalability + reduced
   operational overhead") / Suggested CTA ("15-minute discovery call"); button "Generate
   Outreach". One of the strongest visuals on the page.

8. **Founder-Controlled AI** — H2 "AI does the thinking. You make the decisions." Flow:
   AI Researches → AI Recommends → Founder Reviews → Founder Approves → AI Learns.
   "CoFounderAI is designed to work with you — not replace your judgment."

9. **AI Provider / BYOK trust** — H2 "Bring the AI provider you trust." Copy: "Choose
   your preferred AI provider and securely connect your API key. CoFounderAI selects the
   appropriate model internally for each task." Provider cards: OpenAI, Anthropic,
   Google. No model selection exposed. "You choose the provider. CoFounderAI handles the
   intelligence layer."

10. **Security & Privacy** — Secure authentication · Workspace-level data isolation ·
    Encrypted provider credentials · No API keys exposed in the browser · Founder
    approval before outreach · Secure data storage · Auditability. H2 "Your business
    data stays yours."

11. **Pricing preview** (placeholder, not final) —
    - Free "Explore CoFounderAI": product onboarding, basic ICP, limited prospects,
      limited AI usage. CTA "Start Free".
    - Founder "Build your pipeline": full prospect discovery, research, scoring,
      outreach generation, conversation intelligence, higher limits. CTA "Start
      Building".
    - Growth "Scale customer acquisition": higher usage, advanced research, team
      capabilities, advanced analytics, priority capabilities. CTA "Get Started".

12. **Social proof** — No fabricated testimonials/logos. Use: "Built for founders who
    are building their first customer pipeline." (Real testimonial cards — name,
    company, role, photo, measurable outcome — only once they exist.)

13. **FAQ** — What exactly does CoFounderAI do? / Is this an email automation tool? /
    Does CoFounderAI send messages automatically? / Do I need a sales team? / Can I use
    my own AI provider? / Can I choose the AI model? / Can I manage multiple products? /
    Is my product data isolated from other businesses? (answers per doc, verbatim).

14. **Final CTA** — H2 "Your next customer is out there. Let's find them." Sub: "Tell
    CoFounderAI what you've built. We'll help you figure out who needs it, why they
    might care, and what to do next." CTA "Start Free". "Takes only a few minutes to get
    started."

15. **Footer** — Product (How It Works, Features, Pricing, FAQ) · Company (About,
    Contact, Blog) · Legal (Privacy, Terms, Security). "© CoFounderAI".

## Auth

Unified visual language, tab toggle "Log In | Sign Up" between the two routes.

- **Login** (`/login`): "Welcome back, Founder." / "Your next customer is waiting."
  Fields: Email, Password. CTA "Log In". "Forgot password?" link. Optional "Continue
  with Google". "Don't have an account? Create your account →".
- **Signup** (`/signup`): "Let's find your first customers." / "Create your CoFounderAI
  account and start building your customer pipeline." Fields: Name, Email, Password.
  CTA "Create Account". Optional "Continue with Google". "Already have an account? Log
  in →". No business/product info collected here — that's onboarding's job.

## Onboarding (`/onboarding`, after signup)

1. "Hey Founder 👋 What are you building?" — free-text product description.
2. "Who do you think needs it?" — free-text target audience.
3. Loading: "I'm thinking..." → "Here's what I understand about your business."
4. AI-generated Product / Problem / Target Customer / Value Proposition / Potential ICP.
   Founder: "Looks Good" or "Edit".
5. "Ready to find your first customers?" CTA "Build My Customer Pipeline →" → enters
   the actual product dashboard.

## Design principles

1. Outcome over features ("Know which prospects deserve your time.", not "AI-powered
   prospect scoring.").
2. Show, don't tell — real product UI over abstract illustration wherever possible.
3. Founder language — simple, low jargon.
4. One primary action — "Start Free" everywhere; secondary CTAs never compete visually.

## Non-functional

Mobile-first responsive (hero → CTA → product visual → problem → how it works →
benefits → differentiation → pricing → FAQ → final CTA priority order), WCAG-conscious
contrast/keyboard nav/semantic HTML/focus states/reduced-motion, fast initial load
(server-rendered, lazy-loaded below-the-fold assets, no heavy animation libs), full SEO
metadata (title/description/OG/Twitter/canonical/sitemap/robots — see `app/layout.tsx`,
`app/robots.ts`, `app/sitemap.ts`).
