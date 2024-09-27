import { Component, OnInit, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { MapService } from '../../../../core/services/map.service';

@Component({
  selector: 'app-map',
  template: '<div id="map" style="height: 600px;"></div>',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, AfterViewInit {
  private map!: L.Map;
  private baseLayers: { [key: string]: L.TileLayer } = {};
  private overlays: { [key: string]: L.LayerGroup } = {};

  constructor(private mapService: MapService) {}

  ngOnInit() {}

  ngAfterViewInit() {
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [42.674749, 12.572149],
      zoom: 6,
      zoomControl: true,
      scrollWheelZoom: true
    });

    this.addBaseLayers();
    this.addOverlays();
    this.addLayerControl();
  }

  private addBaseLayers(): void {
    this.baseLayers = {
      'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }),
      'Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      })
    };

    this.baseLayers['OpenStreetMap'].addTo(this.map);
  }

  private addOverlays(): void {
    this.mapService.getMapData().subscribe(data => {
      const geoJsonLayer = L.geoJSON(data, {
        style: () => ({
          color: '#ff7800',
          weight: 2,
          opacity: 0.65
        }),
        onEachFeature: (feature, layer) => {
          if (feature.properties && feature.properties.NAME_2) {
            layer.bindTooltip(feature.properties.NAME_2);
          }
        }
      });

      this.overlays['Regions'] = L.layerGroup([geoJsonLayer]);
      this.overlays['Regions'].addTo(this.map);
      this.map.fitBounds(geoJsonLayer.getBounds());
    });
  }

  private addLayerControl(): void {
    L.control.layers(this.baseLayers, this.overlays).addTo(this.map);
  }
}
