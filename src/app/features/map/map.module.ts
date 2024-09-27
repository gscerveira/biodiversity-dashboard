import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapRoutingModule } from './map-routing.module';
import { MapComponent } from './components/map/map.component';
import { LayerControlComponent } from './components/layer-control/layer-control.component';



@NgModule({
  declarations: [MapComponent, LayerControlComponent],
  imports: [
    CommonModule,
    MapRoutingModule
  ]
})
export class MapModule { }
