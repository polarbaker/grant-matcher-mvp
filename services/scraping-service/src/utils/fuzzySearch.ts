import Fuse from 'fuse.js';
import { Grant } from '../types/grant.types';

export function fuzzySearch(grants: Grant[], searchTerm: string, threshold = 0.4): Grant[] {
  const options = {
    keys: ['title', 'description'],
    includeScore: true,
    threshold,
  };

  const fuse = new Fuse(grants, options);
  const results = fuse.search(searchTerm);
  return results.map(result => result.item);
}
