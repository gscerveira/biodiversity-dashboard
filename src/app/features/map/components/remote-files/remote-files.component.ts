import { Component, OnInit, signal } from '@angular/core';
import { FileUploadService } from '../../../../core/services/file-upload.service';
import { ApiFile } from '../../../../core/interfaces/api.interface';

@Component({
  selector: 'app-remote-files',
  template: `
    <div class="remote-files-container">
      <h3>Remote Files</h3>
      <div class="file-list">
        <div *ngFor="let file of files()" 
             class="file-item"
             (click)="loadFile(file)">
          <i class="fas fa-file"></i>
          <span>{{ file.user_filename }}</span>
          <small>{{ formatFileSize(file.size) }}</small>
        </div>
        <div *ngIf="files().length === 0" class="no-files">
          No files available
        </div>
      </div>
    </div>
  `,
  styles: [`
    .remote-files-container {
      position: absolute;
      top: 10px;
      left: 10px;
      padding: 10px;
      background: white;
      border-radius: 4px;
      box-shadow: 0 1px 5px rgba(0,0,0,0.2);
      z-index: 1000;
      min-width: 250px;
    }
    
    .file-list {
      max-height: 300px;
      overflow-y: auto;
    }
    
    .file-item {
      padding: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid #eee;
      
      &:hover {
        background: #f5f5f5;
      }
      
      i {
        color: #666;
      }

      small {
        color: #999;
        margin-left: auto;
      }
    }

    .no-files {
      padding: 8px;
      color: #666;
      text-align: center;
      font-style: italic;
    }
  `]
})
export class RemoteFilesComponent implements OnInit {
  files = signal<ApiFile[]>([]);

  constructor(private fileUploadService: FileUploadService) {}

  ngOnInit() {
    this.loadRemoteFiles();
  }

  loadRemoteFiles() {
    this.fileUploadService.getRemoteFiles().subscribe({
      next: (files) => {
        this.files.set(files);
        console.log('Files loaded:', files); // Debug log
      },
      error: (error) => {
        console.error('Error loading remote files:', error);
        this.files.set([]); // Set empty array on error
      }
    });
  }

  loadFile(file: ApiFile) {
    this.fileUploadService.loadRemoteFile(file.filename).subscribe({
      next: (data) => {
        this.fileUploadService.updateProcessedData(data);
        console.log('File loaded successfully:', file.user_filename);
      },
      error: (error) => console.error('Error loading file:', error)
    });
  }

  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
} 