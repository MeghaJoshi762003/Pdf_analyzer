import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadPanelComponent } from './components/upload-panel/upload-panel.component';
import { ChatInterfaceComponent } from './components/chat-interface/chat-interface.component';
import { ApiService, UploadResponse } from './services/api.service';

interface Notification {
  message: string;
  type: 'success' | 'info';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, UploadPanelComponent, ChatInterfaceComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {
  documents: string[] = [];
  notification: Notification | null = null;
  private notifTimeout: any;

  constructor(private api: ApiService) {}

  get isReady() {
    return this.documents.length > 0;
  }
  getNotificationClass() {
        if (!this.notification) return '';

        if (this.notification.type === 'success') {
          return 'bg-green-500/10 border-green-500/30 text-green-400';
        }

        if (this.notification.type === 'info') {
          return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
        }

        return '';
}

  showNotification(message: string, type: 'success' | 'info' = 'success') {
    clearTimeout(this.notifTimeout);
    this.notification = { message, type };
    this.notifTimeout = setTimeout(() => this.notification = null, 4000);
  }

  onUploadSuccess(result: UploadResponse) {
    this.documents.push(result.filename);
    this.showNotification(
      `✓ "${result.filename}" — ${result.pages} pages, ${result.chunks_created} chunks indexed`
    );
  }

  howItWorks = [
    { num: '1', text: 'Upload a PDF document' },
    { num: '2', text: 'Text is chunked & embedded into vectors' },
    { num: '3', text: 'Ask questions in natural language' },
    { num: '4', text: 'Gemini answers using only your document' },
  ];

  onReset() {
    this.api.reset().subscribe(() => {
      this.documents = [];
      this.showNotification('All documents cleared.', 'info');
      // Reload to clear chat history state
      window.location.reload();
    });
  }
}
