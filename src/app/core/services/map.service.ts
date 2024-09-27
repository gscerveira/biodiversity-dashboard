import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import * as d3 from 'd3';

@Injectable({
  providedIn: 'root'
})
export class MapService {

  constructor() { }

  getMapData(): Observable<any> {
    // For now, return a mock object
    return of(/*mock map data*/);
  }

  // More map methods will be added here
}
