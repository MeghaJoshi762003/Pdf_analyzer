import { SourceChunk } from '../services/api.service';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceChunk[];
}
