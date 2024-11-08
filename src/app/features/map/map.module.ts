import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapRoutingModule } from './map-routing.module';
import { MapComponent } from './components/map/map.component';
import { LayerControlComponent } from './components/layer-control/layer-control.component';
import { StatisticsComponent } from './components/statistics/statistics.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    MapComponent, 
    LayerControlComponent,
    StatisticsComponent
  ],
  imports: [
    CommonModule,
    MapRoutingModule,
    FormsModule
  ],
  exports: [MapComponent]
})
export class MapModule { }
