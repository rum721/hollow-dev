export type MemoryCategory = 'people' | 'events' | 'emotions' | 'preferences';

export interface MemoryEntry {
  id: string;
  category: MemoryCategory;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
