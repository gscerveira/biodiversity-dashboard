import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import shpjs from 'shpjs';
import * as GeoTIFF from 'geotiff';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private processedDataSubject = new BehaviorSubject<any>(null);
  processedData$ = this.processedDataSubject.asObservable();

  constructor(private apiService: ApiService) {}

  updateProcessedData(data: any) {
    this.processedDataSubject.next(data);
  }

  processShapefile(file: File): Observable<any> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        shpjs(e.target.result).then(geojson => {
          observer.next(geojson);
          observer.complete();
        }).catch(error => {
          observer.error(error);
        });
      };
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Processes GeoTIFF files by converting them to a web-friendly format.
   * GeoTIFF data needs to be transformed into an RGBA format that browsers can display,
   * while preserving the geographic bounds information for proper map overlay positioning.
   * Single-band raster data is converted to grayscale for visualization.
   */
  processGeoTiff(file: File): Observable<any> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        try {
          if (!e.target || !e.target.result) {
            throw new Error('Failed to read file');
          }
          const arrayBuffer = e.target.result as ArrayBuffer;
          const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
          const image = await tiff.getImage();
          const bbox = image.getBoundingBox();
          const imageData = await image.readRasters();

          const canvas = document.createElement('canvas');
          canvas.width = image.getWidth();
          canvas.height = image.getHeight();
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Could not get canvas context');
          }

          const imageDataRGBA = new Uint8ClampedArray(canvas.width * canvas.height * 4);
          const data = imageData[0];
          const isArrayLike = (arr: any): arr is { length: number } =>
            arr && typeof arr.length === 'number';

          for (let i = 0; i < (isArrayLike(data) ? data.length : 0); i++) {
            const value = isArrayLike(data) ? data[i] : 0;
            const index = i * 4;
            imageDataRGBA[index] = value;
            imageDataRGBA[index + 1] = value;
            imageDataRGBA[index + 2] = value;
            imageDataRGBA[index + 3] = 255;
          }

          const imgData = new ImageData(imageDataRGBA, canvas.width, canvas.height);
          ctx.putImageData(imgData, 0, 0);

          observer.next({
            imageUrl: canvas.toDataURL(),
            bounds: [[bbox[1], bbox[0]], [bbox[3], bbox[2]]] as [number, number][]
          });
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  getRemoteFiles() {
    return this.apiService.getUploadedFiles().pipe(
      map(response => response.data)
    );
  }

  loadRemoteFile(filename: string) {
    return this.apiService.downloadFile(filename).pipe(
      switchMap(blob => {
        const file = new File([blob], filename);
        if (filename.endsWith('.json')) {
          return this.processGeoJsonFile(file);
        } else if (filename.endsWith('.zip')) {
          return this.processShapefile(file);
        } else if (filename.endsWith('.tif') || filename.endsWith('.tiff')) {
          return this.processGeoTiff(file);
        }
        throw new Error('Unsupported file type');
      })
    );
  }

  private processGeoJsonFile(file: File): Observable<any> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const geoJson = JSON.parse(e.target.result);
          observer.next(geoJson);
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      };
      reader.readAsText(file);
    });
  }
}