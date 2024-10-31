import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileUploadService } from '../../../../core/services/file-upload.service';
import * as d3 from 'd3';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  dragOver = false;
  selectedFiles: File[] = [];
  fileTypes = ['Geojson(.json)', 'Zipfile (.zip) containing .shp, shx and .dbf files', 'GeoTiff (.tif, .tiff)'];
  selectedFileType = '';

  constructor(private fileUploadService: FileUploadService) {}

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(files);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(input.files);
    }
  }

  handleFiles(files: FileList) {
    this.selectedFiles = Array.from(files);
    this.processFiles();
  }

  openFileDialog() {
    this.fileInput.nativeElement.click();
  }

  /**
   * Handles different geospatial file formats with specific processing requirements:
   * - GeoJSON: Direct parsing for vector data
   * - Shapefiles: Must be processed as ZIP due to multiple required files (.shp, .dbf, .shx)
   * - GeoTIFF: Requires special handling for raster data visualization
   * 
   * File type detection is based on extension to provide immediate feedback
   * before attempting more expensive processing operations.
   */
  private processFiles() {
    if (this.selectedFiles.length > 0) {
      this.selectedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          const result = e.target.result;
          switch (this.selectedFileType) {
            case 'Geojson(.json)':
              this.processGeoJson(result);
              break;
            case 'Zipfile (.zip) containing .shp, shx and .dbf files':
              this.processShapefile(file);
              break;
            case 'GeoTiff (.tif, .tiff)':
              this.processGeoTiff(file);
              break;
            default:
              console.warn('Unsupported file type');
          }
        };
        if (this.selectedFileType === 'Geojson(.json)') {
          reader.readAsText(file);
        } else {
          reader.readAsArrayBuffer(file);
        }
      });
    }
  }

  private processGeoJson(content: string) {
    try {
      const geoJson = JSON.parse(content);
      this.fileUploadService.updateProcessedData(geoJson);
    } catch (error) {
      console.error('Error processing GeoJSON:', error);
    }
  }

  private processShapefile(file: File) {
    this.fileUploadService.processShapefile(file).subscribe(
      (geoJson) => {
        this.fileUploadService.updateProcessedData(geoJson);
      },
      (error) => {
        console.error('Error processing Shapefile:', error);
      }
    );
  }

  private processGeoTiff(file: File) {
    this.fileUploadService.processGeoTiff(file).subscribe(
      (geoJson) => {
        this.fileUploadService.updateProcessedData(geoJson);
      },
      (error) => {
        console.error('Error processing GeoTIFF:', error);
      }
    );
  }
}