import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, signal } from '@angular/core';
import * as L from 'leaflet';
import { MapService } from '../../../../core/services/map.service';
import { FileUploadService } from '../../../../core/services/file-upload.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('map') mapContainer!: ElementRef;

  private map!: L.Map;
  private baseLayers: { [key: string]: L.TileLayer } = {};
  private overlays: { [key: string]: L.LayerGroup } = {};
  private layerControl!: L.Control.Layers;
  private subscription: Subscription;
  private geoJsonLayer: L.GeoJSON | null = null;
  private infoControl!: L.Control;
  private infoContent = signal('Hover over a feature');

  columns: string[] = [];
  selectedColumn: string = '';

  private colorScale: any;
  private valueRange: [number, number] = [0, 0];
  private featureColors: Map<string, string> = new Map();

  constructor(
    private mapService: MapService,
    private fileUploadService: FileUploadService
  ) {
    this.subscription = this.fileUploadService.processedData$.subscribe(data => {
      if (data) {
        this.addGeoJsonLayer(data);
        this.extractColumns(data);
      }
    });

    // Initialize the info control with the current content
    this.updateInfoControl();
  }

  ngOnInit() { }

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private initMap(): void {
    this.map = L.map('map-container', {
      center: [42.674749, 12.572149],
      zoom: 6,
      zoomControl: true,
      scrollWheelZoom: true,
      renderer: L.canvas()
    });

    this.addBaseLayers();
    this.addOverlays();
    this.addLayerControl();
    this.addFileUploadControl();
    this.addInfoControl();
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

  private addLayerControl(): void {
    this.layerControl = L.control.layers(this.baseLayers, this.overlays).addTo(this.map);
  }

  private addFileUploadControl(): void {
    const FileUploadControl = L.Control.extend({
      onAdd: (map: L.Map) => {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        container.innerHTML = `
          <input type="file" id="file-input" style="display: none;" multiple>
          <button id="upload-button" style="width: 100px; height: 30px;">Upload File</button>
        `;

        L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);

        setTimeout(() => {
          const uploadButton = document.getElementById('upload-button');
          const fileInput = document.getElementById('file-input') as HTMLInputElement;

          if (uploadButton && fileInput) {
            uploadButton.onclick = () => {
              fileInput.click();
            };

            fileInput.onchange = (event) => {
              const files = (event.target as HTMLInputElement).files;
              if (files && files.length > 0) {
                const file = files[0];
                if (file.name.endsWith('.json')) {
                  this.processGeoJson(file);
                } else if (file.name.endsWith('.zip')) {
                  this.fileUploadService.processShapefile(file).subscribe(
                    (geoJson) => this.addGeoJsonLayer(geoJson),
                    (error) => console.error('Error processing Shapefile:', error)
                  );
                } else if (file.name.endsWith('.tif') || file.name.endsWith('.tiff')) {
                  this.processGeoTiff(file);
                } else {
                  console.warn('Unsupported file type');
                }
              }
            };
          }
        }, 0);

        return container;
      }
    });

    new FileUploadControl({ position: 'topright' }).addTo(this.map);
  }

  private processGeoJson(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const geoJson = JSON.parse(e.target.result);
        this.addGeoJsonLayer(geoJson);
      } catch (error) {
        console.error('Error processing GeoJSON:', error);
      }
    };
    reader.readAsText(file);
  }

  private onEachFeature(feature: any, layer: L.Layer): void {
    layer.on({
      mouseover: (e: L.LeafletMouseEvent) => {
        const layer = e.target;
        layer.setStyle({
          weight: 5,
          color: '#666',
          dashArray: '',
          fillOpacity: 0.7
        });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
          layer.bringToFront();
        }
        this.updateInfoControl(layer.feature.properties);
      },
      mouseout: (e: L.LeafletMouseEvent) => {
        const layer = e.target;
        this.geoJsonLayer?.resetStyle(layer);
        this.updateInfoControl();
      },
      click: (e: L.LeafletMouseEvent) => {
        this.map.fitBounds(e.target.getBounds());
      }
    });
  }

  private addGeoJsonLayer(geoJsonData: any) {
    if (this.geoJsonLayer) {
      this.map.removeLayer(this.geoJsonLayer);
    }

    this.geoJsonLayer = L.geoJSON(geoJsonData, {
      style: (feature) => this.styleFeature(feature),
      onEachFeature: (feature, layer) => this.onEachFeature(feature, layer),
      coordsToLatLng: (coords: any) => {
        return L.latLng(
          Number(coords[1].toFixed(4)),
          Number(coords[0].toFixed(4))
        );
      }
    }).addTo(this.map);

    this.overlays['Uploaded Data'] = L.layerGroup([this.geoJsonLayer]);
    this.overlays['Uploaded Data'].addTo(this.map);
    this.map.fitBounds(this.geoJsonLayer.getBounds());

    this.layerControl.addOverlay(this.overlays['Uploaded Data'], 'Uploaded Data');
    this.extractColumns(geoJsonData);
    this.addColumnSelectionControl();
  }

  private styleFeature(feature: any): L.PathOptions {
    if (this.selectedColumn && feature.properties[this.selectedColumn]) {
      const value = feature.properties[this.selectedColumn];
      const featureId = feature.properties.id || JSON.stringify(feature.properties);
      
      // Get existing color or generate new one
      let color = this.featureColors.get(featureId);
      if (!color) {
        color = this.getColor(value);
        this.featureColors.set(featureId, color);
      }
      
      return {
        fillColor: color,
        weight: 2,
        opacity: 1,
        color: '#666',
        dashArray: '3',
        fillOpacity: 0.7
      };
    }
    return {
      color: '#6b8e23',  // Default olive green color
      weight: 2,
      opacity: 0.65
    };
  }

  private getColor(value: number): string {
    // Environmental/Geospatial color scheme
    const colors = [
      '#1a9850',  // Dark green
      '#66bd63',  // Light green
      '#a6d96a',  // Yellow-green
      '#d9ef8b',  // Light yellow-green
      '#fee08b',  // Light yellow
      '#fdae61',  // Light orange
      '#f46d43',  // Orange
      '#d73027'   // Red
    ];

    // Calculate the position in the color range
    const normalizedValue = (value - this.valueRange[0]) / (this.valueRange[1] - this.valueRange[0]);
    const index = Math.min(Math.floor(normalizedValue * (colors.length - 1)), colors.length - 1);
    return colors[index];
  }

  private processGeoTiff(file: File) {
    this.fileUploadService.processGeoTiff(file).subscribe(
      (result) => {
        this.addGeoTiffLayer(result.imageUrl, result.bounds);
      },
      (error) => {
        console.error('Error processing GeoTIFF:', error);
      }
    );
  }

  private addGeoTiffLayer(imageUrl: string, bounds: L.LatLngBoundsExpression) {
    const imageOverlay = L.imageOverlay(imageUrl, bounds);
    this.overlays['GeoTIFF'] = L.layerGroup([imageOverlay]);
    this.overlays['GeoTIFF'].addTo(this.map);
    this.map.fitBounds(bounds);
    // Update the layer control
    this.layerControl.addOverlay(this.overlays['GeoTIFF'], 'GeoTIFF');
  }

  private highlightFeature(e: L.LeafletMouseEvent) {
    const layer = e.target;
    layer.setStyle({
      weight: 5,
      color: '#666',
      dashArray: '',
      fillOpacity: 0.7
    });
    layer.bringToFront();
    this.updateInfoControl(layer.feature.properties);
  }

  private resetHighlight(e: L.LeafletMouseEvent) {
    if (this.geoJsonLayer) {
      this.geoJsonLayer.resetStyle(e.target);
    }
    this.updateInfoControl();
  }

  private zoomToFeature(e: L.LeafletMouseEvent) {
    this.map.fitBounds(e.target.getBounds());
  }

  private updateInfoControl(props?: any): void {
    if (!this.map) {
      console.warn('Map is not initialized yet.');
      return;
    }
    
    let content = '<h4>Feature Information</h4>';
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        content += `<b>${key}</b>: ${value}<br>`;
      }
    } else {
      content = 'Hover over a feature';
    }

    this.infoContent.set(content);

    // Update the info control directly
    const infoControlContainer = this.map.getContainer().querySelector('.info');
    if (infoControlContainer) {
      infoControlContainer.innerHTML = this.infoContent();
    }
  }

  private extractColumns(geoJsonData: any) {
    if (geoJsonData.features && geoJsonData.features.length > 0) {
      this.columns = Object.keys(geoJsonData.features[0].properties);
    }
  }

  onColumnSelect(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedColumn = selectElement.value;
    this.featureColors.clear(); // Clear existing color mappings
    if (this.geoJsonLayer) {
      const geoJsonData = this.geoJsonLayer.toGeoJSON();
      this.calculateValueRange(geoJsonData);
      this.updateMapStyles();
    }
  }

  private addInfoControl(): void {
    const container = L.DomUtil.create('div', 'info');

    const InfoControl = L.Control.extend({
      options: {
        position: 'bottomleft'
      },
      onAdd: (map: L.Map) => {
        return container;
      }
    });

    new InfoControl().addTo(this.map);

    // Set the initial content of the info control
    container.innerHTML = `<h4>Feature Information</h4>${this.infoContent()}`;
  }

  private updateMapStyles(): void {
    if (this.geoJsonLayer) {
      this.geoJsonLayer.setStyle((feature) => this.styleFeature(feature));
    }
  }

  private addColumnSelectionControl(): void {
    const ColumnSelectionControl = L.Control.extend({
      onAdd: (map: L.Map) => {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        const select = L.DomUtil.create('select', 'column-select', container);
        select.innerHTML = '<option value="">Select a column</option>' +
          this.columns.map(column => `<option value="${column}">${column}</option>`).join('');

        L.DomEvent.on(select, 'change', (e: Event) => {
          this.onColumnSelect(e);
        });

        return container;
      }
    });

    new ColumnSelectionControl({ position: 'topright' }).addTo(this.map);
  }

  private calculateValueRange(geoJsonData: any): void {
    if (this.selectedColumn && geoJsonData.features) {
      const values = geoJsonData.features
        .map((f: any) => parseFloat(f.properties[this.selectedColumn]))
        .filter((v: number) => !isNaN(v));
      
      this.valueRange = [
        Math.min(...values),
        Math.max(...values)
      ];
    }
  }
}
