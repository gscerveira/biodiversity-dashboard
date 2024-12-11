import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import shpjs from 'shpjs';
import * as GeoTIFF from 'geotiff';
import { ApiService } from './api.service';
import { ApiResponse } from '../interfaces/api.interface';
import { ApiFile } from '../interfaces/api.interface';
import { NetCDFReader } from 'netcdfjs';
export { NetCDFReader };

export interface NetCDFVariable {
  name: string;
  dimensions: string[];
  attributes: { [key: string]: any };
}

export interface NetCDFMetadata {
  variables: NetCDFVariable[];
  times?: Date[];
  bounds?: [number, number, number, number]; // [minLat, minLon, maxLat, maxLon]
}

export interface NetCDFDisplayOptions {
  variable: string;
  timeIndex?: number;
}

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
      map((response: ApiResponse<ApiFile[]>) => {
        console.log('API Response:', response);
        
        if (Array.isArray(response)) {
          return response;
        }
        
        if (!response || response.success === false) {
          throw new Error(response?.message || 'Failed to fetch files');
        }
        
        return response.data || [];
      })
    );
  }

  loadRemoteFile(apiFile: ApiFile) {
    return this.apiService.downloadFile(apiFile.user_filename).pipe(
      switchMap(blob => {
        const file = new File([blob], apiFile.user_filename);
        if (apiFile.user_filename.endsWith('.json')) {
          return this.processGeoJsonFile(file);
        } else if (apiFile.user_filename.endsWith('.zip')) {
          return this.processShapefile(file);
        } else if (apiFile.user_filename.endsWith('.tif') || apiFile.user_filename.endsWith('.tiff')) {
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

  processNetCDF(file: File): Observable<{ metadata: NetCDFMetadata; reader: NetCDFReader }> {
    console.log('Processing NetCDF file:', file.name);
    return new Observable(observer => {
      const fileReader = new FileReader();
      
      fileReader.onload = (e: any) => {
        try {
          const buffer = e.target.result;
          const reader = new NetCDFReader(buffer);
          
          // Extract variables metadata
          const variables = reader.variables.map(v => ({
            name: v.name,
            dimensions: v.dimensions.map(String),
            attributes: v.attributes
          }));

          // Try to find coordinate variables with safer null checks
          let lats = null;
          let lons = null;

          // First try 'latitude'/'longitude'
          try {
            lats = reader.getDataVariable('latitude');
          } catch {
            // If 'latitude' fails, try 'lat'
            try {
              lats = reader.getDataVariable('lat');
            } catch {
              observer.error(new Error('No latitude variable found in NetCDF file'));
              return;
            }
          }

          try {
            lons = reader.getDataVariable('longitude');
          } catch {
            // If 'longitude' fails, try 'lon'
            try {
              lons = reader.getDataVariable('lon');
            } catch {
              observer.error(new Error('No longitude variable found in NetCDF file'));
              return;
            }
          }

          if (!lats || !lons) {
            observer.error(new Error('Missing required coordinate variables'));
            return;
          }
          
          // Calculate bounds if coordinates exist
          const latArray = Array.isArray(lats) ? lats : [lats];
          const lonArray = Array.isArray(lons) ? lons : [lons];

          const numericLats = latArray.map(Number);
          const numericLons = lonArray.map(Number);

          const bounds = [
            Math.min(...numericLats), 
            Math.min(...numericLons),
            Math.max(...numericLats), 
            Math.max(...numericLons)
          ] as [number, number, number, number];

          const metadata: NetCDFMetadata = {
            variables,
            bounds
          };

          console.log('NetCDF metadata:', metadata);
          console.log('NetCDF variables:', metadata.variables);

          observer.next({ metadata, reader });
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      };

      fileReader.readAsArrayBuffer(file);
    });
  }

  createRasterFromNetCDF(
    reader: NetCDFReader, 
    options: NetCDFDisplayOptions
  ): Observable<{ imageUrl: string; bounds: [number, number][] }> {
    return new Observable(observer => {
      try {
        const data = reader.getDataVariable(options.variable);
        const lats = reader.getDataVariable('latitude') || reader.getDataVariable('lat');
        const lons = reader.getDataVariable('longitude') || reader.getDataVariable('lon');

        if (!data || !lats || !lons) {
          throw new Error('Missing required variables');
        }

        const width = Array.isArray(lons) ? lons.length : 1;
        const height = Array.isArray(lats) ? lats.length : 1;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        const imageData = ctx.createImageData(width, height);
        const dataArray = Array.isArray(data) ? data : [data];
        
        // Calculate min/max for normalization
        let min = Number(dataArray[0]) || 0;
        let max = Number(dataArray[0]) || 0;
        for (let i = 1; i < dataArray.length; i++) {
          const value = Number(dataArray[i]);
          if (!isNaN(value)) {
            if (value < min) min = value;
            if (value > max) max = value;
          }
        }

        const range = max - min || 1;

        // Process image data with vertical flip
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            // Flip the y-coordinate by reading from bottom to top
            const sourceY = height - 1 - y;
            const sourceIndex = sourceY * width + x;
            const targetIndex = y * width + x;
            
            const value = Number(dataArray[sourceIndex]) || 0;
            const normalizedValue = ((value - min) / range) * 255;
            const idx = targetIndex * 4;
            
            imageData.data[idx] = normalizedValue;
            imageData.data[idx + 1] = normalizedValue;
            imageData.data[idx + 2] = normalizedValue;
            imageData.data[idx + 3] = 255;
          }
        }

        ctx.putImageData(imageData, 0, 0);

        // Calculate bounds
        const latArray = Array.isArray(lats) ? lats : [lats];
        const lonArray = Array.isArray(lons) ? lons : [lons];
        
        let minLat = Number(latArray[0]) || 0;
        let maxLat = Number(latArray[0]) || 0;
        let minLon = Number(lonArray[0]) || 0;
        let maxLon = Number(lonArray[0]) || 0;

        for (let i = 1; i < latArray.length; i++) {
          const lat = Number(latArray[i]);
          if (!isNaN(lat)) {
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
          }
        }

        for (let i = 1; i < lonArray.length; i++) {
          const lon = Number(lonArray[i]);
          if (!isNaN(lon)) {
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
          }
        }

        observer.next({
          imageUrl: canvas.toDataURL(),
          bounds: [[minLat, minLon], [maxLat, maxLon]]
        });
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }
}