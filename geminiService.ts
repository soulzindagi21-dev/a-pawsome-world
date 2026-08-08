import { HealthLog, AchievementContext } from "./types";
import { supabase } from "./supabaseClient";

// Helper to encode image
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper to encode Blob (for Audio)
export const blobToGenerativePart = async (blob: Blob): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: blob.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const FUNCTIONS_URL = `${(supabase as any).supabaseUrl ?? ''}/functions/v1/ai-proxy`;

export class InsufficientCreditsError extends Error {
  constructor() {
    super('INSUFFICIENT_CREDITS');
    this.name = 'InsufficientCreditsError';
  }
}

// Every AI feature routes through this single call. The API keys live only in
// the Edge Function's environment, never in the browser, and credit spending
// is enforced there too - the client can no longer skip it by editing JS.
let lastCreditsSeen: number | null = null;
export const getLastCreditsSeen = () => lastCreditsSeen;

async function callAiProxy<T>(action: string, payload: any): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated.');

  const res = await fetch(FUNCTIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, payload }),
  });

  if (res.status === 402) throw new InsufficientCreditsError();
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `AI proxy request failed (${res.status})`);
  }

  const body = await res.json();
  if (typeof body.credits === 'number') lastCreditsSeen = body.credits;
  return body.result as T;
}

// 1. Health Analysis
export const analyzeHealthLog = async (
  log: Omit<HealthLog, 'id' | 'dogId' | 'aiAnalysis'>,
  breed: string,
  age: number,
  imageBase64?: string
): Promise<string> => {
  try {
    return await callAiProxy<string>('analyzeHealthLog', { log, breed, age, imageBase64 });
  } catch (e) {
    if (e instanceof InsufficientCreditsError) throw e;
    console.error('Health Analysis Error:', e);
    return 'AI service temporarily unavailable. Please consult a vet if symptoms persist.';
  }
};

// 1.5 Process Health Audio (Voice to Text Notes)
export const processHealthAudio = async (audioBlob: Blob): Promise<string> => {
  try {
    const part = await blobToGenerativePart(audioBlob);
    return await callAiProxy<string>('processHealthAudio', {
      audioBase64: part.inlineData.data,
      mimeType: part.inlineData.mimeType,
    });
  } catch (e) {
    if (e instanceof InsufficientCreditsError) throw e;
    console.error('Audio Processing Error', e);
    return 'Could not transcribe audio. Please type notes manually.';
  }
};

// 2. Crime Reporting Analysis
export const analyzeCrimeReport = async (
  description: string,
  imageBase64?: string
): Promise<{ assessment: string; isCruelty: boolean; severity: string }> => {
  try {
    return await callAiProxy('analyzeCrimeReport', { description, imageBase64 });
  } catch (e) {
    if (e instanceof InsufficientCreditsError) throw e;
    console.error('Crime Analysis Error:', e);
    return { assessment: 'Could not process. Please report to local authorities immediately.', isCruelty: true, severity: 'UNKNOWN' };
  }
};

// 3. Community Poll Candidate Generation
export const generatePollCandidates = async (laneData: string): Promise<any[]> => {
  try {
    return await callAiProxy('generatePollCandidates', { laneData });
  } catch (e) {
    // Not user-initiated (fires on page load) - never surface a credits error here.
    return [];
  }
};

// 4. Stray Matching (Visual Similarity with Bounding Boxes)
export const matchStrayDog = async (
  imageBase64: string
): Promise<{ text: string; features: { label: string; box_2d: number[] }[] }> => {
  try {
    return await callAiProxy('matchStrayDog', { imageBase64 });
  } catch (e) {
    if (e instanceof InsufficientCreditsError) throw e;
    console.error('Match Stray Error:', e);
    return { text: 'Could not analyze image.', features: [] };
  }
};

// 5. Generate Achievement Celebration Image
export const generateAchievementImage = async (context: AchievementContext): Promise<string | null> => {
  try {
    return await callAiProxy('generateAchievementImage', { context });
  } catch (e) {
    if (e instanceof InsufficientCreditsError) throw e;
    console.error('Image Gen Error:', e);
    return null;
  }
};

// 6. Generate Social Caption
export const generateSocialCaption = async (context: AchievementContext): Promise<string> => {
  try {
    return await callAiProxy('generateSocialCaption', { context });
  } catch (e) {
    if (e instanceof InsufficientCreditsError) throw e;
    return 'Check out my new achievement!';
  }
};

// 7. Verify Feeding Proof (Vision)
export const verifyFeedingProof = async (imageBase64: string): Promise<{ isValid: boolean; reason: string }> => {
  try {
    return await callAiProxy('verifyFeedingProof', { imageBase64 });
  } catch (e) {
    if (e instanceof InsufficientCreditsError) throw e;
    return { isValid: false, reason: 'AI Service Error' };
  }
};

// 8. Parse Vet Book (OCR + Extraction - Multi Page)
export const parseVetBook = async (
  imagesBase64: string[]
): Promise<{ history: { date: string; description: string }[]; reminders: { title: string; date: string; type: string }[] }> => {
  try {
    return await callAiProxy('parseVetBook', { imagesBase64 });
  } catch (e) {
    if (e instanceof InsufficientCreditsError) throw e;
    console.error('Vet Scan Error', e);
    return { history: [], reminders: [] };
  }
};

// 9. Maps Grounding for Local Services
export const searchLocalDogServices = async (
  query: string,
  lat: number,
  lng: number
): Promise<{ text: string; links: any[] }> => {
  try {
    return await callAiProxy('searchLocalDogServices', { query, lat, lng });
  } catch (e) {
    if (e instanceof InsufficientCreditsError) throw e;
    console.error('Maps Grounding Error:', e);
    return { text: 'Unable to find local services at the moment.', links: [] };
  }
};
