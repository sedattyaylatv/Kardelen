const { createClient } = (window as any).supabase;

const supabaseUrl = 'https://pxshlvlbjteutjyvhfmf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4c2hsdmxianRldXRqeXZoZm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNzgyNjAsImV4cCI6MjA4MDg1NDI2MH0.2sZHrgl6In8D-FeELguZQojjOe0BlDx7tvOFZgSqskY';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and anon key are required.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const formatSupabaseError = (error: any, context: string): string => {
  // Handle network errors specifically
  if (error && typeof error.message === 'string' && error.message.includes('Failed to fetch')) {
    return `${context} yüklenirken bir ağ hatası oluştu. Bu durum genellikle Supabase projesindeki CORS ayarlarından kaynaklanır. Lütfen Supabase panelinizde 'API Settings' > 'CORS origins' bölümüne doğru URL'in eklendiğinden emin olun.`;
  }

  let errorMessage = 'Bilinmeyen bir sorun oluştu.';

  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (error && typeof error === 'object') {
    // This will catch Supabase/PostgREST error objects
    const parts: string[] = [];
    if (typeof error.message === 'string' && error.message.trim() !== '') {
      parts.push(error.message);
    }
    // Supabase often puts useful info in 'details'
    if (typeof error.details === 'string' && error.details.trim() !== '') {
      parts.push(`Detaylar: ${error.details}`);
    }
    // And sometimes a 'hint'
    if (typeof error.hint === 'string' && error.hint.trim() !== '') {
      parts.push(`İpucu: ${error.hint}`);
    }
    
    if (parts.length > 0) {
      errorMessage = parts.join(' | ');
    } else {
      try {
        // Fallback for unusual error objects
        const stringified = JSON.stringify(error);
        if (stringified !== '{}') {
          errorMessage = stringified;
        }
      } catch (e) {
        errorMessage = 'Okunamayan bir hata nesnesiyle karşılaşıldı.';
      }
    }
  }

  return `${context} sırasında bir hata oluştu: ${errorMessage}`;
};
