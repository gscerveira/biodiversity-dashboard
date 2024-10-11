import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
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

  constructor(
    private mapService: MapService,
    private fileUploadService: FileUploadService
  ) {
    this.subscription = this.fileUploadService.processedData$.subscribe(data => {
      if (data) {
        this.addGeoJsonLayer(data);
      }
    });
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
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [42.674749, 12.572149],
      zoom: 6,
      zoomControl: true,
      scrollWheelZoom: true
    });

    this.addBaseLayers();
    this.addOverlays();
    this.addLayerControl();
    this.addFileUploadControl();
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
    if (feature.properties && feature.properties.NAME_2) {
      layer.bindTooltip(feature.properties.NAME_2, { permanent: false, direction: 'center' });
    }
  }

  private addGeoJsonLayer(geoJsonData: any) {
    const geoJsonLayer = L.geoJSON(geoJsonData, {
      style: () => ({
        color: '#ff7800',
        weight: 2,
        opacity: 0.65
      }),
      onEachFeature: this.onEachFeature.bind(this)
    });

    this.overlays['Uploaded Data'] = L.layerGroup([geoJsonLayer]);
    this.overlays['Uploaded Data'].addTo(this.map);
    this.map.fitBounds(geoJsonLayer.getBounds());

    // Update the layer control
    this.layerControl.addOverlay(this.overlays['Uploaded Data'], 'Uploaded Data');
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
}
