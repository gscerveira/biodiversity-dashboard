import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  constructor(private http: HttpClient) { }

  getMapData(): Observable<any> {
    return this.http.get('assets/data/ITA_adm2.json');
  }
}
