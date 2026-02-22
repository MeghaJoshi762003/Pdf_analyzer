import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UploadResponse {
  message: string;
  chunks_created: number;
  pages: number;
  filename: string;
}

export interface SourceChunk {
  content: string;
  source: string;
  page: string;
}

export interface QueryResponse {
  answer: string;
  sources: SourceChunk[];
}

export interface DocumentsResponse {
  documents: string[];
  count: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  uploadPDF(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadResponse>(`${this.base}/upload`, formData);
  }

  query(question: string): Observable<QueryResponse> {
    return this.http.post<QueryResponse>(`${this.base}/query`, { question });
  }

  getDocuments(): Observable<DocumentsResponse> {
    return this.http.get<DocumentsResponse>(`${this.base}/documents`);
  }

  reset(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/reset`);
  }

  health(): Observable<any> {
    return this.http.get(`${this.base}/health`);
  }
}
