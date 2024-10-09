import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import * as L from 'leaflet';
import { MapService } from '../../../../core/services/map.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, AfterViewInit {
  @ViewChild('map') mapContainer!: ElementRef;
  
  private map!: L.Map;
  private baseLayers: { [key: string]: L.TileLayer } = {};
  private overlays: { [key: string]: L.LayerGroup } = {};

  constructor(private mapService: MapService) {}

  ngOnInit() {}

  ngAfterViewInit() {
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
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
        onEachFeature: this.onEachFeature.bind(this)
      });

      this.overlays['Regions'] = L.layerGroup([geoJsonLayer]);
      this.overlays['Regions'].addTo(this.map);
      this.map.fitBounds(geoJsonLayer.getBounds());
    });
  }

  private onEachFeature(feature: any, layer: L.Layer): void {
    if (feature.properties && feature.properties.NAME_2) {
      layer.bindTooltip(feature.properties.NAME_2, { permanent: false, direction: 'center' });
      layer.on({
        mouseover: (e) => this.highlightFeature(e),
        mouseout: (e) => this.resetHighlight(e),
        click: (e) => this.zoomToFeature(e)
      });
    }
  }

  private highlightFeature(e: L.LeafletEvent): void {
    const layer = e.target;
    layer.setStyle({
      weight: 5,
      color: '#666',
      dashArray: '',
      fillOpacity: 0.7
    });
  }

  private resetHighlight(e: L.LeafletEvent): void {
    const layer = e.target;
    layer.setStyle({
      weight: 2,
      color: '#ff7800',
      dashArray: '',
      fillOpacity: 0.7
    });
  }

  private zoomToFeature(e: L.LeafletEvent): void {
    this.map.fitBounds(e.target.getBounds());
  }

  private addLayerControl(): void {
    L.control.layers(this.baseLayers, this.overlays).addTo(this.map);
  }
}