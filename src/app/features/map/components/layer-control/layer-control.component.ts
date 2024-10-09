import { Component, Input, Output, EventEmitter } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-layer-control',
  templateUrl: './layer-control.component.html',
  styleUrls: ['./layer-control.component.scss']
})
export class LayerControlComponent {
  @Input() baseLayers!: { [key: string]: L.TileLayer };
  @Input() overlays!: { [key: string]: L.LayerGroup };
  @Output() baseLayerChange = new EventEmitter<string>();
  @Output() overlayChange = new EventEmitter<{ key: string, checked: boolean }>();

  activeBaseLayer: string = 'OpenStreetMap';
  activeOverlays: { [key: string]: boolean } = {};

  constructor() {}

  onBaseLayerChange(layerKey: string): void {
    this.activeBaseLayer = layerKey;
    this.baseLayerChange.emit(layerKey);
  }

  onOverlayChange(key: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.activeOverlays[key] = checked;
    this.overlayChange.emit({ key, checked });
  }

  isOverlayChecked(key: string): boolean {
    return this.activeOverlays[key] || false;
  }
}