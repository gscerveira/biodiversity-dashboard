import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private map?: L.Map;

  constructor(private http: HttpClient) { }

  getMapData(): Observable<any> {
    return this.http.get('assets/data/ITA_adm2.json');
  }

  setMap(map: L.Map) {
    this.map = map;
  }

  getMap(): L.Map {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    return this.map;
  }
}
