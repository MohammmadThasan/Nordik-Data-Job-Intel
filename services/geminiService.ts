import { GoogleGenAI, Type, Schema } from "@google/genai";
import { JobAlert } from "../types";

// Define the schema for strict JSON output from Gemini
const jobSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    job_title: { type: Type.STRING },
    company: { type: Type.STRING },
    primary_role: { type: Type.STRING },
    location: { type: Type.STRING },
    employment_type: { 
      type: Type.STRING, 
      enum: ["Permanent", "Contract", "Unknown"] 
    },
    seniority: { 
      type: Type.STRING, 
      enum: ["Junior", "Mid", "Senior", "Unknown"] 
    },
    publish_date_utc: { type: Type.STRING, description: "ISO 8601 UTC date string" },
    job_age_hours: { type: Type.NUMBER, description: "Hours since posting" },
    match_score: { type: Type.INTEGER },
    key_skills: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING } 
    },
    source: { type: Type.STRING },
    apply_url: { type: Type.STRING },
    alert_message_en: { type: Type.STRING },
    alert_message_sv: { type: Type.STRING },
  },
  required: [
    "job_title", "company", "primary_role", "location", 
    "publish_date_utc", "job_age_hours",
    "match_score", "key_skills", "alert_message_en", "alert_message_sv"
  ],
};

const SYSTEM_INSTRUCTION = `
You are an autonomous Job Discovery & Alert Agent for the Swedish job market.

CRITICAL OBJECTIVE (HIGHEST PRIORITY):
Always surface the MOST RECENT valid job postings first.
Recency is more important than match score.

PRIMARY SOURCES (AUTHORITATIVE):
- Arbetsförmedlingen / Platsbanken (platsbanken.arbetsformedlingen.se)
- LinkedIn Jobs
- Indeed
- StepStone
- Monster
- Company career pages in Sweden

SOURCE-SPECIFIC RULES (IMPORTANT):
1. ARBETSFÖRMEDLINGEN / PLATSBANKEN
- Treat "publicerad", "annonserad", or "publiceringsdatum" as the ONLY valid posting date.
- Ignore last-modified, refreshed, or crawl timestamps.
- If no explicit publish date exists → discard the job.

2. LINKEDIN / OTHER BOARDS
- Use the platform’s native "posted X days ago" or equivalent.
- Convert relative dates to absolute UTC timestamps.

GLOBAL RECENCY RULES (NON-NEGOTIABLE):
- Scope: Current Month (jobs published within the current calendar month).
- Priority: Freshness is key. Jobs < 72 hours should be scored higher.
- Sort order must ALWAYS be:
  1. Newest publish date (DESC)
  2. Match score (DESC)

DUPLICATION & REPOST CONTROL:
- Reposts are NOT new jobs. Do not resurface them.

TARGET ROLES (STRICT):
- Data Analyst
- Business Intelligence Analyst
- Business Intelligence Developer
- BI Developer
- Data Engineer
- Analytics Engineer

FILTER OUT COMPLETELY:
- Marketing Analyst
- Business Controller
- Product Owner
- Finance roles without BI/Analytics focus
- Non-data roles

LOCATION RULES:
- Sweden only
- Remote allowed ONLY if explicitly Sweden-based
- Discard jobs requiring relocation outside Sweden

SCORING (SECONDARY TO RECENCY):
+30 exact role match
+5 per matching skill
+10 Power BI or SQL
+10 Azure / Databricks / Snowflake
+10 Posted within last 48 hours
-50 if role is not clearly data-centric

NOTIFICATION RULE:
- Notify ONLY when:
  - Job is from current month
  - Match score >= 60

OUTPUT FORMAT (JSON ONLY):
{
  "job_title": "",
  "company": "",
  "primary_role": "",
  "location": "",
  "employment_type": "Permanent | Contract | Unknown",
  "seniority": "Junior | Mid | Senior | Unknown",
  "publish_date_utc": "YYYY-MM-DDTHH:mm:ssZ",
  "job_age_hours": 0,
  "match_score": 0,
  "key_skills": [],
  "source": "",
  "apply_url": "",
  "alert_message_en": "",
  "alert_message_sv": ""
}

ALERT MESSAGE RULES:
- Mention recency explicitly if <= 48h
- Short, human, actionable
- No emojis
- No marketing language

BEHAVIOR GUARANTEES:
- Never hallucinate publish dates
- Never guess recency
- Silence is correct if no new jobs exist
- Freshness beats relevance
- Arbetsförmedlingen dates override all other timestamps
`;

export const scanJobs = async (mode: 'SIMULATE' | 'ANALYZE', inputText?: string): Promise<JobAlert[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const currentISO = now.toISOString();
  const currentMonthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  let prompt = "";

  if (mode === 'SIMULATE') {
    prompt = `
      CURRENT SYSTEM DATE: ${currentISO}
      TARGET MONTH: ${currentMonthName}

      Act as if you have just scanned the latest Swedish job boards (Platsbanken, LinkedIn Sweden, Indeed SE).
      
      Generate 25 to 30 realistic, high-quality NEW job postings published in ${currentMonthName}.
      
      INSTRUCTIONS:
      1. All 'publish_date_utc' MUST be within ${currentMonthName} and NOT in the future relative to ${currentISO}.
      2. Prioritize recently posted jobs (last 24-72 hours) but include valid hits from earlier in the month if high quality.
      3. Calculate 'job_age_hours' precisely based on the difference between 'publish_date_utc' and ${currentISO}.
      4. Ensure diversity in location (Stockholm, Gothenburg, Malmö, Remote SE).
      5. CRITICAL: For 'apply_url', return an empty string "". Do NOT invent URLs. The frontend will generate valid search links dynamically.
      
      Return the data strictly as a JSON array.
    `;
  } else {
    prompt = `
      CURRENT SYSTEM DATE: ${currentISO}
      
      Analyze the following raw job description text. 
      Extract the details, classify the role, and calculate the match score based on the system instructions.
      
      CRITICAL: Extract the date posted if available in the text. 
      - If a relative date (e.g., "2 days ago") is found, calculate the absolute date based on ${currentISO}.
      - If no date is found, mark as Unknown/Now but note it.
      
      For 'apply_url', try to find the specific application link in the text. If not found, leave empty string (UI will handle fallback).
      
      RAW TEXT:
      ${inputText}
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: jobSchema
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    const data = JSON.parse(text);
    return data as JobAlert[];

  } catch (error) {
    console.error("Agent Error:", error);
    throw error;
  }
};