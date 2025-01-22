import natural from 'natural';
const TfIdf = natural.TfIdf;

export function calculateSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;

  // Preprocess texts
  const processText = (text: string): string[] => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  };

  const words1 = processText(text1);
  const words2 = processText(text2);

  if (words1.length === 0 || words2.length === 0) return 0;

  // Calculate TF-IDF vectors
  const tfidf = new TfIdf();
  tfidf.addDocument(words1);
  tfidf.addDocument(words2);

  // Get vectors
  const vector1: number[] = [];
  const vector2: number[] = [];

  // Create a set of all unique terms
  const terms = new Set([...words1, ...words2]);

  terms.forEach(term => {
    vector1.push(tfidf.tfidf(term, 0));
    vector2.push(tfidf.tfidf(term, 1));
  });

  // Calculate cosine similarity
  const dotProduct = vector1.reduce((sum, value, i) => sum + value * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, value) => sum + value * value, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, value) => sum + value * value, 0));

  if (magnitude1 === 0 || magnitude2 === 0) return 0;

  return dotProduct / (magnitude1 * magnitude2);
}
