import { GoogleGenAI, Type } from "@google/genai";
import { HealthLog, AchievementContext, Reminder } from "./types";

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

// 1. Health Analysis with Structured Output
export const analyzeHealthLog = async (log: Omit<HealthLog, 'id' | 'dogId' | 'aiAnalysis'>, breed: string, age: number, imageBase64?: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
      Symptoms: ${log.symptoms.join(', ')}
      Notes: ${log.notes}
    `;

    if (imageBase64) {
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

    const parts: any[] = [{ text: promptText }];
    
    if (imageBase64) {
      parts.push({
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg' 
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        temperature: 0.4,
      }
    });

    return response.text || "Analysis unavailable.";
  } catch (error) {
    console.error("Health Analysis Error:", error);
    return "AI service temporarily unavailable. Please consult a vet if symptoms persist.";
  }
};

// 1.5 Process Health Audio (Voice to Text Notes)
export const processHealthAudio = async (audioBlob: Blob): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const audioPart = await blobToGenerativePart(audioBlob);

    const prompt = `
      You are an assistant for a dog feeder. The user is recording an audio observation about a dog's health, vet instructions, physical state, or temperature.
      Transcribe the audio accurately and format it as a concise health note. 
      Ignore filler words. 
      If specific values (like temp 102F) are mentioned, highlight them.
      Example Output: "Observed limping on left hind leg. Temperature feels normal. Appetite was low today."
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          audioPart,
          { text: prompt }
        ]
      }
    });

    return response.text || "";
  } catch (e) {
    console.error("Audio Processing Error", e);
    return "Could not transcribe audio. Please type notes manually.";
  }
};

// 2. Crime Reporting Analysis (Gemini 3 Pro for reasoning)
export const analyzeCrimeReport = async (description: string, imageBase64?: string): Promise<{ assessment: string, isCruelty: boolean, severity: string }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts: any[] = [{ text: description }];
    
    if (imageBase64) {
      parts.push({
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg' 
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: { parts },
      config: {
        systemInstruction: "You are an expert animal welfare legal assistant. Analyze for cruelty. Prioritize safety. Do not encourage vigilantism. Provide structured official steps.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            assessment: { type: Type.STRING, description: "Detailed analysis of the incident." },
            isCruelty: { type: Type.BOOLEAN, description: "Whether this constitutes potential cruelty." },
            severity: { type: Type.STRING, description: "Severity level: LOW, MEDIUM, HIGH, CRITICAL" },
            officialSteps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of recommended official actions." }
          }
        }
      }
    });

    const json = JSON.parse(response.text || '{}');
    return {
      assessment: json.assessment + "\n\n**Recommended Steps:**\n" + (json.officialSteps?.map((s: string) => `• ${s}`).join('\n') || ''),
      isCruelty: json.isCruelty,
      severity: json.severity
    };

  } catch (error) {
    console.error("Crime Analysis Error:", error);
    return { assessment: "Could not process. Please report to local authorities immediately.", isCruelty: true, severity: "UNKNOWN" };
  }
};

// 3. Community Poll Candidate Generation
export const generatePollCandidates = async (laneData: string): Promise<any[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 3 fictional "Community Pup" candidates for a neighborhood described as: "${laneData}". 
      Return JSON array with properties: name, breed, slogan.`,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    return JSON.parse(response.text || '[]');
  } catch (e) {
    return [];
  }
};

// 4. Stray Matching (Visual Similarity with Bounding Boxes)
export const matchStrayDog = async (imageBase64: string): Promise<{ text: string; features: { label: string; box_2d: number[] }[] }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Analyze this dog image for a 'Lost & Found' database.
      1. Provide a concise summary of Breed Mix, Distinctive Markings, Estimated Age, and Visual Health.
      2. Identify the bounding boxes for the dog's Face and any other distinctive features (e.g., "White Spot", "Injured Leg", "Collar", "Tail").
      
      Return JSON with:
      - analysis: string
      - features: array of objects { label: string, box_2d: [ymin, xmin, ymax, xmax] } where coordinates are normalized 0-1000.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            features: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  box_2d: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER }
                  }
                }
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return { 
      text: result.analysis || "Analysis failed.", 
      features: result.features || [] 
    };
  } catch (e) {
    console.error("Match Stray Error:", e);
    return { text: "Could not analyze image.", features: [] };
  }
};

// 5. Generate Achievement Celebration Image (Gemini 3 Pro Image)
export const generateAchievementImage = async (context: AchievementContext): Promise<string | null> => {
  try {
    const proAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      A hyper-realistic, celebratory 3D trophy image for a dog welfare achievement.
      Achievement: ${context.achievement.title} - ${context.achievement.description}.
      Theme: Warm, golden hour lighting, cute dogs in background celebrating, high quality, 4k render.
      Text on trophy: "${context.achievement.title}".
      Style: Pixar-style animation meets realistic textures.
    `;

    const response = await proAi.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Image Gen Error:", e);
    return null;
  }
};

// 6. Generate Social Caption
export const generateSocialCaption = async (context: AchievementContext): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Write a heartwarming, emoji-rich social media caption for a dog welfare achievement.
      User: ${context.userName}
      Achievement: ${context.achievement.title} (${context.achievement.description})
      Tone: Exciting, Community-focused, Inspiring.
      Hashtags: #PawsomeWorld #DogWelfare
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });

    return response.text || "Check out my new achievement!";
  } catch (e) {
    return "Check out my new achievement!";
  }
};

// 7. Verify Feeding Proof (Vision)
export const verifyFeedingProof = async (imageBase64: string): Promise<{ isValid: boolean; reason: string }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Analyze this image. Does it show a person feeding a dog or a dog eating food/drinking water?
      Return JSON: { "isValid": boolean, "reason": string }
      Reason should be short (e.g. "Dog detected eating food").
      If not valid, explain why (e.g. "No dog detected", "Too blurry").
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || '{ "isValid": false, "reason": "Analysis failed" }');
  } catch (e) {
    return { isValid: false, reason: "AI Service Error" };
  }
};

// 8. Parse Vet Book (OCR + Extraction - Multi Page)
export const parseVetBook = async (imagesBase64: string[]): Promise<{ history: { date: string, description: string }[], reminders: { title: string, date: string, type: string }[] }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const parts: any[] = imagesBase64.map(img => ({
      inlineData: { data: img, mimeType: 'image/jpeg' }
    }));

    const prompt = `
      Analyze these images of veterinary records or prescriptions (could be multiple pages). 
      Extract:
      1. Past medical history (Vaccines given, Surgeries, Checkups) with dates.
      2. Future reminders (Next Due dates, Follow-ups).
      
      Return consolidated JSON.
    `;
    
    parts.push({ text: prompt });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: parts
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            history: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING, description: "YYYY-MM-DD or approx date" },
                  description: { type: Type.STRING }
                }
              }
            },
            reminders: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  date: { type: Type.STRING, description: "YYYY-MM-DD" },
                  type: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || '{ "history": [], "reminders": [] }');
  } catch (e) {
    console.error("Vet Scan Error", e);
    return { history: [], reminders: [] };
  }
};

// 9. Maps Grounding for Local Services
export const searchLocalDogServices = async (query: string, lat: number, lng: number): Promise<{ text: string, links: any[] }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Note: Maps grounding specifically requires Gemini 2.5 series
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find the following dog-related services near my current coordinates (${lat}, ${lng}): ${query}. 
      Return a helpful descriptive summary. 
      You MUST provide specific names and highlights of the places found.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      },
    });

    const text = response.text || "No results found.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const links = chunks
      .filter((c: any) => c.maps && c.maps.uri)
      .map((c: any) => ({
        uri: c.maps.uri,
        title: c.maps.title || "Grounded Location"
      }));

    return { text, links };
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return { text: "Unable to find local services at the moment.", links: [] };
  }
}