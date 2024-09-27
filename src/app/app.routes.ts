import { Routes } from '@angular/router';
import { MapComponent } from './features/map/components/map/map.component';

export const routes: Routes = [
  { path: '', component: MapComponent },
  { path: 'map', component: MapComponent }
];
