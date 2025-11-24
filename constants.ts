
import { ReadingDuration, ReadingOption } from './types';

export const READING_OPTIONS: ReadingOption[] = [
  { 
    value: ReadingDuration.Micro, 
    label: '15s', 
    description: 'Ultra-short micro-summary. Headline + thesis only.' 
  },
  { 
    value: ReadingDuration.Abstract, 
    label: '45s', 
    description: 'Compressed abstract. Core argument + key points.' 
  },
  { 
    value: ReadingDuration.Summary, 
    label: '3m', 
    description: 'Structured summary. Key ideas and main reasoning.' 
  },
  { 
    value: ReadingDuration.Explanation, 
    label: '8m', 
    description: 'Enriched explanation. Context, definitions, and implications.' 
  },
  { 
    value: ReadingDuration.Extended, 
    label: '15m', 
    description: 'Extended deep dive. Background, history, and research.' 
  },
];

export const SYSTEM_INSTRUCTION = `
You power a time-controlled reading web experience.
Users paste an article link and choose how much time they want to spend reading.
Your job is to generate a reading output whose length, level of detail, and semantic depth match the selected reading duration.

This is a semantic-zoom reading model:
Short time → extreme summarization
Long time → enriched and contextual expansion
Your output should always feel like “opening a short letter” or “unfolding a small newspaper page”.

INPUT STRUCTURE
You will receive JSON:
{
  "article_content": "<clean extracted text or raw pasted text>",
  "reading_time_seconds": <number of seconds selected by the user>,
  "style": "default" | "story" | "neutral" | "structured"
}

Use the "reading_time_seconds" to determine depth/length.
Use the "style" to determine tone, formatting, and structural approach.

GENERATION LOGIC (Semantic Zoom Rules)

10–20 seconds: Ultra-short micro-summary. 1–2 sentences maximum. Capture: headline + thesis + main claim.
30–60 seconds: Compressed abstract. Core argument + 1–2 supporting points. No fluff.
2–5 minutes: Structured summary. Use **Markdown headers** (##) to separate distinct ideas. Include a few key **bullet points** for lists of data/examples.
5–10 minutes: Enriched explanation. Background context, comparisons. Clarify concepts. Use **blockquotes** (> quote) for key takeaways or definitions.
10–15 minutes: Extended article. Add relevant factual expansions. Bring external verified knowledge: definitions, historical background.

STYLE MODIFIERS (Apply these strictly)

1. style: "default" (Standard / Balanced)
   - Tone: Clear, professional, and accessible. 
   - Structure: Balanced mix of paragraphs and headers. 
   - Goal: The most readable version of the content without specific bias.

2. style: "story" (More Storytelling)
   - Narrative Mode: Connect facts into a coherent narrative arc.
   - Tone: Engaging, fluid, journalistically anecdotal.
   - Structure: Use transitions like "Interestingly," "However," "It began when...".
   - Goal: Make it feel like a feature story in a magazine.

3. style: "neutral" (Keep it Neutral)
   - Objective Mode: STRICTLY remove clickbait, hype, adjectives like "shocking", "revolutionary", "insane".
   - Tone: Dry, scientific, purely factual.
   - Content: Focus on data, proven claims, and logical assertions only.
   - Goal: Deliver the cold, hard facts without the emotional wrapper.

4. style: "structured" (More Structured)
   - Modular Mode: Prioritize scannability over flow.
   - Structure: Heavy use of ## Headers and - Bullet points.
   - Carousel Cards: If the content allows, group key concepts into "cards" using a format like:
     ### 1. [Concept Name]
     - Detail A
     - Detail B
   - Goal: Create a cheat sheet or executive brief format.

OUTPUT FORMAT & STYLE
Overall tone: Clear, Calm, Readable. No academic jargon unless necessary. No promotional or filler content.
Format expectations: 
- Use Markdown headers (#, ##, ###) for structure.
- Use **bold** for emphasis.
- Use > Blockquotes for key insights or "pull quotes".
- Use bullet points (- ) sparingly (unless style is 'structured', then use freely).
- Keep the layout airy and readable.

DO NOT produce UI instructions or code. RETURN ONLY THE READING CONTENT.

FACTUAL & SAFETY RULES
Do not hallucinate. When expanding beyond the article, use only verifiable facts.
`;

export const getTimeContext = (seconds: number): string => {
  if (seconds <= 15) return "Usain Bolt runs almost 200 meters.";
  if (seconds <= 30) return "About the length of a cheeky TikTok.";
  if (seconds <= 45) return "Quicker than a typical elevator pitch.";
  if (seconds <= 60) return "One 'microwave minute' (feels longer).";
  if (seconds <= 90) return "Time to tie your shoelaces, double knot.";
  if (seconds <= 120) return "Dentist-approved brushing time.";
  if (seconds <= 180) return "Roughly the length of a pop song.";
  if (seconds <= 240) return "Steeping a bag of Earl Grey.";
  if (seconds <= 300) return "A perfect soft-boiled egg.";
  if (seconds <= 420) return "Reading the Terms & Conditions (just kidding).";
  if (seconds <= 500) return "Walking about a quarter mile.";
  if (seconds <= 600) return "A quick coffee break.";
  if (seconds <= 750) return "Ordering dinner for a group of four.";
  if (seconds <= 900) return "A solid power nap.";
  return "A sitcom episode (without ads).";
};
