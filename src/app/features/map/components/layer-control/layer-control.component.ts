import { Component, Input } from '@angular/core';
import * as L from 'leaflet';
import { LayerGroup } from 'leaflet';

interface OverlayState {
  layer: LayerGroup;
  checked: boolean;
}

@Component({
  selector: 'app-layer-control',
  template: `
    <div class="layer-control">
      <h3>Base Layers</h3>
      <div *ngFor="let layer of baseLayers | keyvalue">
        <input type="radio" [id]="layer.key" name="baseLayer" [value]="layer.key" (change)="onBaseLayerChange(layer.value)">
        <label [for]="layer.key">{{ layer.key }}</label>
      </div>
      <h3>Overlays</h3>
      <div *ngFor="let overlay of overlays | keyvalue">
        <input type="checkbox" [id]="overlay.key" [checked]="isOverlayChecked(overlay.key)" (change)="onOverlayChange(overlay.key, $event)">
        <label [for]="overlay.key">{{ overlay.key }}</label>
      </div>
    </div>
  `,
  styleUrls: ['./layer-control.component.scss']
})
export class LayerControlComponent {
  @Input() map!: L.Map;
  @Input() baseLayers!: { [key: string]: L.TileLayer };
  @Input() overlays!: Record<string, OverlayState>;

  onBaseLayerChange(layer: L.TileLayer): void {
    this.map.eachLayer(l => {
      if (l instanceof L.TileLayer) {
        this.map.removeLayer(l);
      }
    });
    layer.addTo(this.map);
  }

  onOverlayChange(key: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (this.overlays[key]) {
      this.overlays[key].checked = checked;
      // Add logic to show/hide the layer on the map
    }
  }

  isOverlayChecked(key: string): boolean {
    return this.overlays[key]?.checked ?? false;
  }
}
