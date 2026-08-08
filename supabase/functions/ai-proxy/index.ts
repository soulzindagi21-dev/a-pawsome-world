// Supabase Edge Function: ai-proxy
//
// Single entry point for every AI feature. Runs server-side so that
// GEMINI_API_KEY / OPENAI_API_KEY never reach the browser, and so credit
// spending is enforced here (authoritative) instead of trusted from the client.
//
// Deploy with:
//   supabase functions deploy ai-proxy
// Secrets (server-side only, never exposed to the browser):
//   supabase secrets set GEMINI_API_KEY=... OPENAI_API_KEY=...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Gemini REST helper (avoids bundling the full SDK into the Deno function)
// ---------------------------------------------------------------------------
async function callGemini(model: string, parts: any[], opts: {
  systemInstruction?: string;
  responseSchema?: any;
  responseMimeType?: string;
  temperature?: number;
  tools?: any[];
  toolConfig?: any;
} = {}) {
  const body: any = {
    contents: [{ role: 'user', parts }],
  };
  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }
  const generationConfig: any = {};
  if (opts.temperature !== undefined) generationConfig.temperature = opts.temperature;
  if (opts.responseMimeType) generationConfig.responseMimeType = opts.responseMimeType;
  if (opts.responseSchema) generationConfig.responseSchema = opts.responseSchema;
  if (Object.keys(generationConfig).length) body.generationConfig = generationConfig;
  if (opts.tools) body.tools = opts.tools;
  if (opts.toolConfig) body.toolConfig = opts.toolConfig;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini request failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

function geminiText(resp: any): string {
  return resp?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
}

async function callOpenAI(messages: any[], model = 'gpt-4o', temperature = 0.4) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model, temperature, messages }),
  });
  if (!res.ok) throw new Error(`OpenAI request failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI returned an empty response.');
  return text;
}

// ---------------------------------------------------------------------------
// Prompt builders (ported from geminiService.ts)
// ---------------------------------------------------------------------------
function buildHealthPrompt(log: any, breed: string, age: number, hasImage: boolean) {
  let promptText = `
    Act as a veterinary triage AI. Analyze this health log for a ${age}-year-old ${breed}.

    Vitals:
    Appetite: ${log.appetite}/10
    Water Intake: ${log.waterIntake}/10
    Energy: ${log.energy}/10
    Pain Level: ${log.painLevel}/10
    Stool: ${log.stoolQuality}
    Vomit Count: ${log.vomitCount}
    Breathing Issues: ${log.breathingDifficulty}
    Limping: ${log.isLimping}
    Itching: ${log.isItching}
    Symptoms: ${(log.symptoms || []).join(', ')}
    Notes: ${log.notes}
  `;
  if (hasImage) {
    promptText += `\n\n**Visual Analysis Required:** An image has been provided. Analyze the image for any visible signs of illness, injury, skin conditions, or abnormalities (e.g., stool quality, wounds, posture). Incorporate these visual findings into your assessment.`;
  }
  promptText += `
    Output format (Markdown):
    ## Triage Assessment
    **Urgency:** [LOW/MEDIUM/HIGH/EMERGENCY]
    **Risk Score:** [0-100]

    ## Potential Issues
    * [List potential causes based on breed/age/symptoms/image]

    ## Action Plan
    1. [Immediate step]
    2. [Monitoring instruction]
    3. [Vet question]

    **Disclaimer:** Not a medical diagnosis.
  `;
  return promptText;
}

// ---------------------------------------------------------------------------
// Action handlers - each mirrors a function that used to live in geminiService.ts
// ---------------------------------------------------------------------------
const handlers: Record<string, (payload: any) => Promise<any>> = {
  async analyzeHealthLog(payload) {
    const { log, breed, age, imageBase64 } = payload;
    const promptText = buildHealthPrompt(log, breed, age, !!imageBase64);

    if (OPENAI_API_KEY) {
      try {
        const content: any[] = [{ type: 'text', text: promptText }];
        if (imageBase64) {
          content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } });
        }
        return await callOpenAI([
          { role: 'system', content: 'You are a veterinary triage AI assisting a dog feeder/owner.' },
          { role: 'user', content },
        ]);
      } catch (e) {
        console.warn('OpenAI health analysis failed, falling back to Gemini:', e);
      }
    }

    const parts: any[] = [{ text: promptText }];
    if (imageBase64) parts.push({ inlineData: { data: imageBase64, mimeType: 'image/jpeg' } });
    const resp = await callGemini('gemini-3-flash-preview', parts, { temperature: 0.4 });
    return geminiText(resp) || 'Analysis unavailable.';
  },

  async processHealthAudio(payload) {
    const { audioBase64, mimeType } = payload;
    const prompt = `
      You are an assistant for a dog feeder. The user is recording an audio observation about a dog's health, vet instructions, physical state, or temperature.
      Transcribe the audio accurately and format it as a concise health note.
      Ignore filler words.
      If specific values (like temp 102F) are mentioned, highlight them.
      Example Output: "Observed limping on left hind leg. Temperature feels normal. Appetite was low today."
    `;
    const resp = await callGemini('gemini-3-flash-preview', [
      { inlineData: { data: audioBase64, mimeType: mimeType || 'audio/webm' } },
      { text: prompt },
    ]);
    return geminiText(resp);
  },

  async analyzeCrimeReport(payload) {
    const { description, imageBase64 } = payload;
    const parts: any[] = [{ text: description }];
    if (imageBase64) parts.push({ inlineData: { data: imageBase64, mimeType: 'image/jpeg' } });

    const resp = await callGemini('gemini-3-pro-preview', parts, {
      systemInstruction: 'You are an expert animal welfare legal assistant. Analyze for cruelty. Prioritize safety. Do not encourage vigilantism. Provide structured official steps.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          assessment: { type: 'STRING' },
          isCruelty: { type: 'BOOLEAN' },
          severity: { type: 'STRING' },
          officialSteps: { type: 'ARRAY', items: { type: 'STRING' } },
        },
      },
    });
    const jsonResult = JSON.parse(geminiText(resp) || '{}');
    return {
      assessment: (jsonResult.assessment || '') + '\n\n**Recommended Steps:**\n' + (jsonResult.officialSteps?.map((s: string) => `• ${s}`).join('\n') || ''),
      isCruelty: jsonResult.isCruelty,
      severity: jsonResult.severity,
    };
  },

  async generatePollCandidates(payload) {
    const { laneData } = payload;
    const resp = await callGemini('gemini-3-flash-preview', [{
      text: `Generate 3 fictional "Community Pup" candidates for a neighborhood described as: "${laneData}". Return JSON array with properties: name, breed, slogan.`,
    }], { responseMimeType: 'application/json' });
    return JSON.parse(geminiText(resp) || '[]');
  },

  async matchStrayDog(payload) {
    const { imageBase64 } = payload;
    const prompt = `
      Analyze this dog image for a 'Lost & Found' database.
      1. Provide a concise summary of Breed Mix, Distinctive Markings, Estimated Age, and Visual Health.
      2. Identify the bounding boxes for the dog's Face and any other distinctive features (e.g., "White Spot", "Injured Leg", "Collar", "Tail").

      Return JSON with:
      - analysis: string
      - features: array of objects { label: string, box_2d: [ymin, xmin, ymax, xmax] } where coordinates are normalized 0-1000.
    `;
    const resp = await callGemini('gemini-3-flash-preview', [
      { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
      { text: prompt },
    ], {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          analysis: { type: 'STRING' },
          features: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { label: { type: 'STRING' }, box_2d: { type: 'ARRAY', items: { type: 'NUMBER' } } },
            },
          },
        },
      },
    });
    const result = JSON.parse(geminiText(resp) || '{}');
    return { text: result.analysis || 'Analysis failed.', features: result.features || [] };
  },

  async generateAchievementImage(payload) {
    const { context } = payload;
    const prompt = `
      A hyper-realistic, celebratory 3D trophy image for a dog welfare achievement.
      Achievement: ${context.achievement.title} - ${context.achievement.description}.
      Theme: Warm, golden hour lighting, cute dogs in background celebrating, high quality, 4k render.
      Text on trophy: "${context.achievement.title}".
      Style: Pixar-style animation meets realistic textures.
    `;
    const resp = await callGemini('gemini-3-pro-image-preview', [{ text: prompt }]);
    const parts = resp?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  },

  async generateSocialCaption(payload) {
    const { context } = payload;
    const prompt = `
      Write a heartwarming, emoji-rich social media caption for a dog welfare achievement.
      User: ${context.userName}
      Achievement: ${context.achievement.title} (${context.achievement.description})
      Tone: Exciting, Community-focused, Inspiring.
      Hashtags: #PawsomeWorld #DogWelfare
    `;
    const resp = await callGemini('gemini-3-flash-preview', [{ text: prompt }]);
    return geminiText(resp) || 'Check out my new achievement!';
  },

  async verifyFeedingProof(payload) {
    const { imageBase64 } = payload;
    const prompt = `
      Analyze this image. Does it show a person feeding a dog or a dog eating food/drinking water?
      Return JSON: { "isValid": boolean, "reason": string }
      Reason should be short (e.g. "Dog detected eating food").
      If not valid, explain why (e.g. "No dog detected", "Too blurry").
    `;
    const resp = await callGemini('gemini-3-flash-preview', [
      { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
      { text: prompt },
    ], { responseMimeType: 'application/json' });
    return JSON.parse(geminiText(resp) || '{ "isValid": false, "reason": "Analysis failed" }');
  },

  async parseVetBook(payload) {
    const { imagesBase64 } = payload;
    const parts: any[] = imagesBase64.map((img: string) => ({ inlineData: { data: img, mimeType: 'image/jpeg' } }));
    parts.push({
      text: `
      Analyze these images of veterinary records or prescriptions (could be multiple pages).
      Extract:
      1. Past medical history (Vaccines given, Surgeries, Checkups) with dates.
      2. Future reminders (Next Due dates, Follow-ups).

      Return consolidated JSON.
    `,
    });
    const resp = await callGemini('gemini-3-flash-preview', parts, {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          history: { type: 'ARRAY', items: { type: 'OBJECT', properties: { date: { type: 'STRING' }, description: { type: 'STRING' } } } },
          reminders: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, date: { type: 'STRING' }, type: { type: 'STRING' } } } },
        },
      },
    });
    return JSON.parse(geminiText(resp) || '{ "history": [], "reminders": [] }');
  },

  async searchLocalDogServices(payload) {
    const { query, lat, lng } = payload;
    const resp = await callGemini('gemini-2.5-flash', [{
      text: `Find the following dog-related services near my current coordinates (${lat}, ${lng}): ${query}. Return a helpful descriptive summary. You MUST provide specific names and highlights of the places found.`,
    }], {
      tools: [{ googleMaps: {} }],
      toolConfig: { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } },
    });
    const text = geminiText(resp) || 'No results found.';
    const chunks = resp?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const links = chunks
      .filter((c: any) => c.maps?.uri)
      .map((c: any) => ({ uri: c.maps.uri, title: c.maps.title || 'Grounded Location' }));
    return { text, links };
  },
};

// Extra credit cost per action (defaults to 1)
const ACTION_COST: Record<string, number> = {
  generateAchievementImage: 1,
  generateSocialCaption: 1, // client calls image+caption together = 2 total
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return json({ error: 'Not authenticated' }, 401);

  let action: string, payload: any;
  try {
    const body = await req.json();
    action = body.action;
    payload = body.payload;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const handler = handlers[action];
  if (!handler) return json({ error: `Unknown action: ${action}` }, 400);

  // Authoritative, server-side credit spend - the caller cannot bypass this
  // by editing client-side JS, unlike the old approach.
  const cost = ACTION_COST[action] ?? 1;
  const { data: newBalance, error: spendError } = await supabase.rpc('spend_credits', {
    p_user_id: user.id,
    p_amount: cost,
  });

  if (spendError) return json({ error: 'Credit check failed' }, 500);
  if (newBalance === -1) return json({ error: 'INSUFFICIENT_CREDITS' }, 402);

  try {
    const result = await handler(payload);
    return json({ result, credits: newBalance });
  } catch (e) {
    console.error(`Action "${action}" failed:`, e);
    return json({ error: 'AI service temporarily unavailable.' }, 502);
  }
});
