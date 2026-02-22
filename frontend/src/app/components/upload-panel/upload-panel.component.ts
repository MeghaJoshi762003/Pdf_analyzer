import { Component, Output, EventEmitter, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, UploadResponse } from '../../services/api.service';

@Component({
  selector: 'app-upload-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload-panel.component.html'
})
export class UploadPanelComponent {
  @Input() documents: string[] = [];
  @Output() uploadSuccess = new EventEmitter<UploadResponse>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  isDragOver = false;
  uploading = false;
  error = '';

  constructor(private api: ApiService) {}

  openFilePicker() {
    this.fileInput.nativeElement.click();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }
   getDropzoneClasses() {
    return {
      'border-blue-500 bg-blue-500/10': this.isDragOver,
      'border-slate-600 hover:border-blue-500': !this.isDragOver,
      'opacity-50 pointer-events-none': this.uploading
    };
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.processFile(file);
    input.value = '';
  }

  private processFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      this.error = 'Only PDF files are allowed.';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.error = 'File too large. Max size is 10MB.';
      return;
    }
    this.error = '';
    this.uploading = true;

    this.api.uploadPDF(file).subscribe({
      next: (result) => {
        this.uploading = false;
        this.uploadSuccess.emit(result);
      },
      error: (err) => {
        this.uploading = false;
        this.error = err.error?.detail || 'Upload failed. Please try again.';
      }
    });
  }
}

















