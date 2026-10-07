# Design direction

CodeSage is a reading and reasoning tool. Its identity comes from connected source code, not ornamental AI effects.

## References and decisions

| Reference | Applied principle |
| --- | --- |
| [Phantom](https://phantom.com) | Lavender palette, rounded public navigation and buttons, generous card shapes |
| [Linear](https://linear.app) | Persistent workspace navigation, quiet surfaces, structured information hierarchy |
| [Cursor](https://cursor.com), [Warp](https://www.warp.dev) | Show the actual developer workflow and source context |
| [Vercel](https://vercel.com), [Resend](https://resend.com) | Crisp technical diagrams and economical product copy |
| [Anthropic](https://www.anthropic.com), [Mercury](https://mercury.com) | Editorial spacing and a restrained serif accent in the cover heading |
| [Sarvam](https://www.sarvam.ai), [LangChain](https://www.langchain.com), [Together AI](https://www.together.ai) | Organize a complex platform into comprehensible workflows |
| [MongoDB](https://www.mongodb.com), [Supabase](https://supabase.com) | Developer-oriented source inputs, technical credibility, clear feature structure |
| [OpenAI](https://openai.com), [Microsoft AI](https://microsoft.ai), [Google AI](https://ai.google) | Broad, readable sections with a clear path into the product |
| [Apple](https://www.apple.com), [Raycast](https://www.raycast.com), [Framer](https://www.framer.com) | Carefully composed product views and deliberate typography scale |
| [Stripe](https://stripe.com), [Notion](https://www.notion.com), [ElevenLabs](https://elevenlabs.io) | Explain complex capabilities through tangible, interactive examples |

Primary reference sites were reviewed through their public pages, with visual inspection of Linear and Phantom. This is a synthesis of design principles, not a reproduction of any site's branding or a claim to have audited every page or app behind these sites.

## Visual system

- Light base: `#F8F7FB`; foreground: `#282331`; dark cover: `#191522`.
- Purple: `#7C65C1`; deep purple: `#3D2F6B`; lavender: `#EAE8F5`; secondary: `#B8A9E0`.
- Light workspace is the default. Dark and system modes are complete. The serif accent appears only on the public cover to give the product its own voice.
- Inter provides interface typography; JetBrains Mono is reserved for paths, source, and technical annotations. Both are self-hosted.
- Cards use 14–24px corners. Pills are used for navigation, calls to action, and small status indicators. Code text stays on a stable dark source surface in both themes.
- Motion clarifies changes: brief route fades, restrained diagram movement, message entrances, and score transitions. Reduced-motion preferences disable nonessential movement.

## Product rules

- No invented customer trust marks, measurements, or backend status.
- Sample answers, source, and metrics have a visible environment label.
- Live errors remain errors. They never silently turn into simulated successes.
- Missing test coverage is unknown, not zero.
- Source inspection, intent, confidence, and citations have separate visual roles.
- Large graphs have focused neighborhoods and a documented rendering bound.
- Mobile chat preserves both panels using tabs; exports and graph tools remain accessible.
- Saved workspace data is browser-local; credential and API behavior is explained in Settings and the guide.
