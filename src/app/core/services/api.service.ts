import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiFile, ApiResponse } from '../interfaces/api.interface';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.api.baseUrl;
  private readonly headers: HttpHeaders;

  constructor(private http: HttpClient) {
    this.headers = new HttpHeaders()
      .set('Authorization', `Bearer ${environment.api.auth.token}`);
  }

  getUploadedFiles(): Observable<ApiResponse<ApiFile[]>> {
    console.log('Making API request to:', `${this.baseUrl}/graph/files/uploaded`);
    console.log('Using headers:', this.headers);
    
    return this.http.get<ApiFile[] | ApiResponse<ApiFile[]>>(
      `${this.baseUrl}/graph/files/uploaded`,
      { headers: this.headers }
    ).pipe(
      map(response => {
        // If response is an array, wrap it in ApiResponse format
        if (Array.isArray(response)) {
          return {
            data: response,
            success: true
          };
        }
        return response;
      }),
      tap(response => console.log('Processed API response:', response)),
      catchError(error => {
        console.error('API Error:', error);
        throw error;
      })
    );
  }

  downloadFile(filename: string): Observable<Blob> {
    const params = {
      filename: '',
      object_path: filename,
      bucket_name: 'temporary',
      isOutput: false
    };

    return this.http.get(
      `${this.baseUrl}/storage/objects/download/temporary`,
      {
        headers: this.headers,
        params,
        responseType: 'blob'
      }
    );
  }
} 