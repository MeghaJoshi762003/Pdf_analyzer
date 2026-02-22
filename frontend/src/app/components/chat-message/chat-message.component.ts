import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../models/chat-message.model';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-message.component.html'
})
export class ChatMessageComponent implements OnInit {
  @Input() message!: ChatMessage;

  showSources = false;
  parsedContent: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit() {
    if (this.message.role === 'assistant') {
      const html = marked.parse(this.message.content) as string;
      this.parsedContent = this.sanitizer.bypassSecurityTrustHtml(html);
    }
  }

  get isUser() {
    return this.message.role === 'user';
  }

  toggleSources() {
    this.showSources = !this.showSources;
  }
}
