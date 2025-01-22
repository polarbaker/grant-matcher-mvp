import { calculateSimilarity } from '../utils/similarity';

describe('Similarity Calculation', () => {
  test('should return high similarity for similar texts', () => {
    const text1 = 'AI-powered healthcare solution for early disease detection';
    const text2 = 'Healthcare technology using artificial intelligence for disease screening';
    
    const similarity = calculateSimilarity(text1, text2);
    expect(similarity).toBeGreaterThan(0.15);
  });

  test('should return low similarity for different texts', () => {
    const text1 = 'AI-powered healthcare solution for early disease detection';
    const text2 = 'Sustainable agriculture practices for organic farming';
    
    const similarity = calculateSimilarity(text1, text2);
    expect(similarity).toBeLessThan(0.1);
  });

  test('should handle empty strings', () => {
    const text1 = '';
    const text2 = 'Healthcare technology';
    
    const similarity = calculateSimilarity(text1, text2);
    expect(similarity).toBe(0);
  });

  test('should be case insensitive', () => {
    const text1 = 'HEALTHCARE TECHNOLOGY';
    const text2 = 'healthcare technology';
    
    const similarity = calculateSimilarity(text1, text2);
    expect(similarity).toBeGreaterThan(0.9);
  });

  test('should handle special characters', () => {
    const text1 = 'healthcare & technology solutions!';
    const text2 = 'healthcare and technology solutions';
    
    const similarity = calculateSimilarity(text1, text2);
    expect(similarity).toBeGreaterThan(0.7);
  });
});
