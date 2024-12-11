import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    return this.http.get<ApiResponse<ApiFile[]>>(
      `${this.baseUrl}/graph/files/uploaded`,
      { headers: this.headers }
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