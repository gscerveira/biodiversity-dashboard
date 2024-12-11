import { Component, OnInit, signal } from '@angular/core';
import { FileUploadService } from '../../../../core/services/file-upload.service';
import { ApiFile } from '../../../../core/interfaces/api.interface';

@Component({
  selector: 'app-remote-files',
  template: `
    <div class="remote-files-dropdown">
      <button class="dropdown-toggle" (click)="isOpen = !isOpen">
        <i class="fas fa-folder"></i>
        Remote Files
        <i class="fas fa-chevron-down" [class.rotated]="isOpen"></i>
      </button>
      
      <div class="dropdown-menu" *ngIf="isOpen">
        <div class="file-list">
          <div *ngFor="let file of files()" 
               class="file-item"
               (click)="loadFile(file)">
            <i class="fas fa-file"></i>
            <span class="file-name">{{ file.user_filename }}</span>
            <small>{{ formatFileSize(file.size) }}</small>
          </div>
          <div *ngIf="files().length === 0" class="no-files">
            No files available
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .remote-files-dropdown {
      position: absolute;
      top: 10px;
      left: 50px;
      z-index: 1000;
      min-width: 200px;
    }

    .dropdown-toggle {
      width: 100%;
      padding: 8px 12px;
      background: white;
      border: none;
      border-radius: 4px;
      box-shadow: 0 1px 5px rgba(0,0,0,0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      
      &:hover {
        background: #f8f8f8;
      }

      .fa-chevron-down {
        margin-left: auto;
        transition: transform 0.2s ease;
        
        &.rotated {
          transform: rotate(180deg);
        }
      }
    }

    .dropdown-menu {
      margin-top: 5px;
      background: white;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      max-height: 300px;
      overflow-y: auto;
    }

    .file-list {
      padding: 5px;
    }

    .file-item {
      padding: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      border-radius: 4px;
      font-size: 13px;
      
      &:hover {
        background: #f5f5f5;
      }

      .file-name {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      i {
        color: #666;
        width: 16px;
      }

      small {
        color: #999;
        font-size: 11px;
      }
    }

    .no-files {
      padding: 8px;
      color: #666;
      text-align: center;
      font-style: italic;
      font-size: 13px;
    }
  `]
})
export class RemoteFilesComponent implements OnInit {
  files = signal<ApiFile[]>([]);
  isOpen = false;

  constructor(private fileUploadService: FileUploadService) {}

  ngOnInit() {
    this.loadRemoteFiles();
  }

  loadRemoteFiles() {
    this.fileUploadService.getRemoteFiles().subscribe({
      next: (files) => {
        this.files.set(files);
      },
      error: (error) => {
        console.error('Error loading files:', error);
        this.files.set([]);
      }
    });
  }

  loadFile(file: ApiFile) {
    this.fileUploadService.loadRemoteFile(file).subscribe({
      next: (data) => {
        this.fileUploadService.updateProcessedData(data);
        this.isOpen = false; // Close dropdown after selection
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