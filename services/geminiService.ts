
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you might show a more user-friendly error.
  // For this environment, we assume the key is always present.
  console.warn("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateAnnouncement = async (prompt: string): Promise<string> => {
  if (!API_KEY) {
    return Promise.reject(new Error("API anahtarı ayarlanmadı."));
  }

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Sen bir apartman yöneticisisin. Sakinler için aşağıdaki konuya dayalı resmi bir duyuru yaz. Duyuru açık, kibar ve Türkçe olmalı. Sadece duyuru metnini döndür, başlık veya selamlama ekleme. Konu: "${prompt}"`,
        config: {
            temperature: 0.7,
            topP: 1,
            topK: 1,
        }
    });
    
    const text = response.text;
    if (text) {
        return text.trim();
    } else {
        throw new Error("API'den geçerli bir metin yanıtı alınamadı.");
    }
  } catch (error) {
    console.error("Gemini API hatası:", error);
    throw new Error("Duyuru oluşturulurken bir hata oluştu.");
  }
};