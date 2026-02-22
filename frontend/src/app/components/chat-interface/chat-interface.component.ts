import {
  Component, Input, OnChanges, SimpleChanges,
  ViewChild, ElementRef, AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ChatMessage } from '../../models/chat-message.model';
import { ChatMessageComponent } from '../chat-message/chat-message.component';

const SUGGESTED_QUESTIONS = [
  'Summarize the main points of this document',
  'What are the key findings?',
  'List the important dates mentioned',
  'What conclusions were drawn?',
];

@Component({
  selector: 'app-chat-interface',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatMessageComponent],
  templateUrl: './chat-interface.component.html'
})
export class ChatInterfaceComponent implements AfterViewChecked {
  @Input() isReady = false;
  @ViewChild('messageList') messageList!: ElementRef;
  @ViewChild('inputBox') inputBox!: ElementRef;

  messages: ChatMessage[] = [];
  input = '';
  loading = false;
  suggestedQuestions = SUGGESTED_QUESTIONS;

  constructor(private api: ApiService) {}

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom() {
    try {
      const el = this.messageList?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  sendMessage(question?: string) {
    const q = question || this.input.trim();
    if (!q || this.loading || !this.isReady) return;

    this.input = '';
    this.messages.push({ role: 'user', content: q });
    this.loading = true;

    this.api.query(q).subscribe({
      next: (result) => {
        this.messages.push({
          role: 'assistant',
          content: result.answer,
          sources: result.sources
        });
        this.loading = false;
        setTimeout(() => this.inputBox?.nativeElement?.focus(), 50);
      },
      error: (err) => {
        this.messages.push({
          role: 'assistant',
          content: `Sorry, something went wrong: ${err.error?.detail || err.message}`,
          sources: []
        });
        this.loading = false;
      }
    });
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
