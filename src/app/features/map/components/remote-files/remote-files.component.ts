import { Component, OnInit } from '@angular/core';
import { FileUploadService } from '../../../../core/services/file-upload.service';
import { ApiFile } from '../../../../core/interfaces/api.interface';

@Component({
  selector: 'app-remote-files',
  template: `
    <div class="remote-files-container">
      <h3>Remote Files</h3>
      <div class="file-list">
        <div *ngFor="let file of files" 
             class="file-item"
             (click)="loadFile(file)">
          <i class="fas fa-file"></i>
          <span>{{ file.filename }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .remote-files-container {
      padding: 10px;
      background: white;
      border-radius: 4px;
      box-shadow: 0 1px 5px rgba(0,0,0,0.2);
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
      
      &:hover {
        background: #f5f5f5;
      }
      
      i {
        color: #666;
      }
    }
  `]
})
export class RemoteFilesComponent implements OnInit {
  files: ApiFile[] = [];

  constructor(private fileUploadService: FileUploadService) {}

  ngOnInit() {
    this.loadRemoteFiles();
  }

  loadRemoteFiles() {
    this.fileUploadService.getRemoteFiles().subscribe({
      next: (files) => this.files = files,
      error: (error) => console.error('Error loading remote files:', error)
    });
  }

  loadFile(file: ApiFile) {
    this.fileUploadService.loadRemoteFile(file.filename).subscribe({
      next: (data) => console.log('File loaded successfully:', data),
      error: (error) => console.error('Error loading file:', error)
    });
  }
} 