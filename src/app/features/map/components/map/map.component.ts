import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, signal, createComponent } from '@angular/core';
import * as L from 'leaflet';
import { MapService } from '../../../../core/services/map.service';
import { FileUploadService, NetCDFDisplayOptions } from '../../../../core/services/file-upload.service';
import { Subscription } from 'rxjs';
import { StatisticsComponent } from '../statistics/statistics.component';
import 'leaflet.vectorgrid';
import 'leaflet-draw';
import { EnvironmentInjector } from '@angular/core';
import { NetCDFMetadata, NetCDFReader } from '../../../../core/services/file-upload.service';
import { NetCDFOptionsComponent } from '../netcdf-options/netcdf-options.component';

//Workaround for leaflet-draw bug
declare global {
  interface Window {
    type:any;
  }
}

window.type = '';

//Workaround for VectorGrid bug (missing fakeStop function)
L.Canvas.Tile.include({
	_onClick: function (e:any) {
		var point = this._map.mouseEventToLayerPoint(e).subtract(this.getOffset());
		var layer;
		var clickedLayer;

		for (var id in this._layers) {
			layer = this._layers[id];
			if (
				layer.options.interactive &&
				layer._containsPoint(point) &&
				!this._map._draggableMoved(layer)
			) {
				clickedLayer = layer;
			}
		}
		if (clickedLayer) {
                         // offending code used to be right here
			clickedLayer.fireEvent(e.type, undefined, true);
		}
	},
});

declare module 'leaflet' {
  export interface VectorGrid extends GridLayer {
    setFeatureStyle(id: string, style: PathOptions): this;
    resetFeatureStyle(id: string): this;
    toGeoJSON(): any;
  }
}

interface GeoJSONFeature {
  type: string;
  properties: any;
  geometry: {
    type: string;
    coordinates: any[];
  };
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('map') mapContainer!: ElementRef;
  @ViewChild(StatisticsComponent) statisticsComponent!: StatisticsComponent;

  // Map instance and layer management
  private map!: L.Map;
  private baseLayers: { [key: string]: L.TileLayer } = {};  // Base map layers (e.g., OpenStreetMap, Satellite)
  private overlays: { [key: string]: L.LayerGroup } = {};   // Optional overlay layers
  private layerControl!: L.Control.Layers;                  // UI control for layer switching
  private subscription: Subscription;                       // Subscription for file upload events
  private geoJsonLayer: L.VectorGrid | null = null;        // Current vector layer displaying GeoJSON data
  private infoControl!: L.Control;                         // Info panel control
  private infoContent = signal('Hover over a feature');    // Current content of info panel

  columns: string[] = [];
  selectedColumn: string = '';

  private colors: string[] = [
    '#1a9850',  // Dark green
    '#66bd63',  // Light green
    '#a6d96a',  // Yellow-green
    '#d9ef8b',  // Light yellow-green
    '#fee08b',  // Light yellow
    '#fdae61',  // Light orange
    '#f46d43',  // Orange
    '#d73027'   // Red
  ];

  private valueRange: [number, number] = [0, 0];
  private featureColors: Map<string, string> = new Map();
  private excludedProperties: Set<string> = new Set();
  private originalGeoJsonData: any = null;
  private drawnItems: L.FeatureGroup = new L.FeatureGroup();
  private drawControl!: L.Control.Draw;
  private currentBox: L.Rectangle | null = null;
  private isBoxFilterActive = signal(false);
  private originalFeatures: any[] = [];

  constructor(
    private mapService: MapService,
    private fileUploadService: FileUploadService,
    private injector: EnvironmentInjector
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

    this.mapService.setMap(this.map);

    this.addBaseLayers();
    this.addOverlays();
    this.addLayerControl();
    this.addFileUploadControl();
    this.addInfoControl();
    this.initializeDrawControls();
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
        const container = L.DomUtil.create('div', 'map-controls-container');
        
        // Create main controls group
        const controlsGroup = L.DomUtil.create('div', 'control-group', container);
        controlsGroup.innerHTML = `
          <input type="file" id="file-input" style="display: none;" multiple>
          <div class="control-buttons">
            <button id="upload-button" class="control-button">
              <i class="fas fa-upload"></i> Upload File
            </button>
            <button id="statistics-button" class="control-button">
              <i class="fas fa-chart-pie"></i> Statistics
            </button>
            <button id="toggle-filter" class="control-button" ${!this.currentBox ? 'disabled' : ''}>
              ${this.isBoxFilterActive() ? 'Show All' : 'Filter Box'}
            </button>
          </div>
        `;

        L.DomEvent.disableClickPropagation(controlsGroup);

        setTimeout(() => {
          const uploadButton = document.getElementById('upload-button');
          const fileInput = document.getElementById('file-input') as HTMLInputElement;
          const statisticsButton = document.getElementById('statistics-button');
          const toggleButton = document.getElementById('toggle-filter');

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
                } else if (file.name.endsWith('.nc')) {
                  this.fileUploadService.processNetCDF(file).subscribe({
                    next: ({ metadata, reader }) => {
                      this.showNetCDFOptionsDialog(metadata, reader);
                    },
                    error: (error) => console.error('Error processing NetCDF:', error)
                  });
                }
              }
            };
          }

          if (statisticsButton) {
            statisticsButton.onclick = () => {
              this.showStatistics();
            };
          }

          if (toggleButton) {
            toggleButton.onclick = () => {
              if (this.isBoxFilterActive()) {
                this.isBoxFilterActive.set(false);
                this.resetFilter();
              } else {
                this.isBoxFilterActive.set(true);
                this.filterDataByBox();
              }
              toggleButton.textContent = this.isBoxFilterActive() ? 'Show All' : 'Filter Box';
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
        this.showPropertySelectionPopup(geoJson);
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
        if (this.geoJsonLayer && this.isVectorGrid(this.geoJsonLayer)) {
          const featureId = this.getFeatureId(layer.feature.properties);
          this.geoJsonLayer.setFeatureStyle(featureId, {
            weight: 5,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.7
          });
        }
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
          layer.bringToFront();
        }
        this.updateInfoControl(layer.feature.properties);
      },
      mouseout: (e: L.LeafletMouseEvent) => {
        const layer = e.target;
        if (this.geoJsonLayer && this.isVectorGrid(this.geoJsonLayer)) {
          const featureId = this.getFeatureId(layer.feature.properties);
          this.geoJsonLayer.resetFeatureStyle(featureId);
        }
        this.updateInfoControl();
      },
      click: (e: L.LeafletMouseEvent) => {
        this.map.fitBounds(e.target.getBounds());
      }
    });
  }

  private addGeoJsonLayer(geoJsonData: any, addControls: boolean = true) {
    // Store the original GeoJSON data if this is not a filtered view
    if (addControls) {
      this.originalGeoJsonData = geoJsonData;
    }

    if (this.geoJsonLayer) {
      this.map.removeLayer(this.geoJsonLayer);
      // Remove from layer control if it exists
      this.layerControl.removeLayer(this.geoJsonLayer);
    }

    // Calculate value range if a column is selected
    if (this.selectedColumn) {
      this.calculateValueRange(geoJsonData);
    }

    const getFeatureStyle = (properties: any) => {
      if (this.selectedColumn && properties[this.selectedColumn] !== undefined) {
        const value = parseFloat(properties[this.selectedColumn]);
        if (!isNaN(value)) {
          const normalizedValue = (value - this.valueRange[0]) / (this.valueRange[1] - this.valueRange[0]);
          const colorIndex = Math.min(Math.floor(normalizedValue * (this.colors.length - 1)), this.colors.length - 1);
          return {
            fill: true,
            fillColor: this.colors[colorIndex],
            fillOpacity: 0.7,
            stroke: true,
            color: '#666',
            weight: 1,
            opacity: 1,
            dashArray: '3'
          };
        }
      }
      return {
        fill: true,
        fillColor: '#6b8e23',
        fillOpacity: 0.7,
        stroke: true,
        color: '#666',
        weight: 1,
        opacity: 1
      };
    };

    // Configure vector grid options
    const vectorGridOptions = {
      maxZoom: 18,
      tolerance: 3,
      debug: 0,
      rendererFactory: L.canvas.tile,
      vectorTileLayerStyles: {
        sliced: (properties: any) => getFeatureStyle(properties)
      },
      interactive: true,
      getFeatureId: (feature: any) => this.getFeatureId(feature.properties)
    };

    // Create and configure the vector grid layer
    this.geoJsonLayer = (L.vectorGrid as any).slicer(geoJsonData, vectorGridOptions);

    // Always attach event handlers
    if (this.geoJsonLayer) {
      this.attachLayerEventHandlers(this.geoJsonLayer, getFeatureStyle);
    }

    // Add layer to map and layer control
    if (this.geoJsonLayer) {
      this.geoJsonLayer.addTo(this.map);
      const layerName = this.isBoxFilterActive() ? 'Filtered Data' : 'Uploaded Data';
      this.overlays[layerName] = L.layerGroup([this.geoJsonLayer as any]);
      this.layerControl.addOverlay(this.overlays[layerName], layerName);
    }

    // Update bounds
    const bounds = L.geoJSON(geoJsonData).getBounds();
    this.map.fitBounds(bounds);

    // Update controls only if needed
    if (addControls) {
      this.extractColumns(geoJsonData);
      this.addColumnSelectionControl();
    }
  }

  private attachLayerEventHandlers(layer: L.VectorGrid, getFeatureStyle: (properties: any) => L.PathOptions): void {
    layer
      .on('mouseover', (e: any) => {
        const properties = e.layer.properties;
        this.updateInfoControl(properties);
        if (properties) {
          const featureId = this.getFeatureId(properties);
          const currentStyle = getFeatureStyle(properties);
          layer.setFeatureStyle(featureId, {
            ...currentStyle,
            weight: 3,
            fillOpacity: 0.9
          });
        }
      })
      .on('mouseout', (e: any) => {
        if (e.layer.properties) {
          const featureId = this.getFeatureId(e.layer.properties);
          const currentStyle = getFeatureStyle(e.layer.properties);
          layer.setFeatureStyle(featureId, currentStyle);
        }
        this.updateInfoControl();
      })
      .on('click', (e: any) => {
        if (e.layer.properties) {
          const bounds = L.geoJSON(e.layer).getBounds();
          this.map.fitBounds(bounds);
        }
      });
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
    // Color scheme
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
    if (this.geoJsonLayer && this.isVectorGrid(this.geoJsonLayer)) {
      const featureId = this.getFeatureId(e.target.feature.properties);
      this.geoJsonLayer.resetFeatureStyle(featureId);
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
        if (!this.excludedProperties.has(key)) {
          content += `<b>${key}</b>: ${value}<br>`;
        }
      }
    } else {
      content = 'Hover over a feature';
    }

    this.infoContent.set(content);

    const infoControlContainer = this.map.getContainer().querySelector('.info');
    if (infoControlContainer) {
      infoControlContainer.innerHTML = this.infoContent();
    }
  }

  private extractColumns(geoJsonData: any) {
    if (geoJsonData.features && geoJsonData.features.length > 0) {
      this.columns = Object.keys(geoJsonData.features[0].properties)
        .filter(col => !this.excludedProperties.has(col));
    }
  }

  onColumnSelect(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedColumn = selectElement.value;
    this.featureColors.clear();
    if (this.originalGeoJsonData) {
      this.calculateValueRange(this.originalGeoJsonData);
      
      // Remove existing layer and recreate it with new styles
      if (this.geoJsonLayer) {
        this.map.removeLayer(this.geoJsonLayer);
      }
      this.addGeoJsonLayer(this.originalGeoJsonData, false);
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
    if (!this.geoJsonLayer || !this.originalGeoJsonData) return;

    // Recalculate value range
    this.calculateValueRange(this.originalGeoJsonData);
    
    // Clear existing colors
    this.featureColors.clear();

    // Update styles for each feature
    this.originalGeoJsonData.features.forEach((feature: any) => {
      const featureId = this.getFeatureId(feature.properties);
      const style = this.styleFeature(feature);
      this.geoJsonLayer?.setFeatureStyle(featureId, style);
    });
  }

  private addColumnSelectionControl(): void {
    const PropertySelectionControl = L.Control.extend({
      onAdd: (map: L.Map) => {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        const select = L.DomUtil.create('select', 'column-select', container);
        
        // Get only the non-excluded properties
        const availableProperties = this.columns.filter(col => !this.excludedProperties.has(col));
        
        select.innerHTML = '<option value="">Select a property</option>' +
          availableProperties.map(prop => `<option value="${prop}">${prop}</option>`).join('');

        L.DomEvent.on(select, 'change', (e: Event) => {
          this.onColumnSelect(e);
        });

        L.DomEvent.disableClickPropagation(container);
        return container;
      }
    });

    new PropertySelectionControl({ position: 'topright' }).addTo(this.map);
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

  private showStatistics(): void {
    if (this.statisticsComponent) {
      this.statisticsComponent.showModal = true;
      // Calculate statistics with current data when modal is opened
      this.statisticsComponent.calculateStatistics();
    }
  }

  get currentGeoJsonData(): any {
    return this.originalGeoJsonData || null;
  }

  private showPropertySelectionPopup(geoJsonData: any): void {
    const center = this.map.getCenter();
    const popup = L.popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: 400,
      className: 'property-selection-popup'
    })
      .setLatLng(center)
      .setContent(this.createPropertySelectionContent(geoJsonData))
      .openOn(this.map);

    // Prevent popup from closing when clicking inside it
    const container = popup.getElement();
    if (container) {
      L.DomEvent.disableClickPropagation(container);
    }
  }

  private createPropertySelectionContent(geoJsonData: any): HTMLElement {
    const container = L.DomUtil.create('div', 'property-selection-container');
    const properties = Object.keys(geoJsonData.features[0].properties);
    
    container.innerHTML = `
      <h3>Select Properties to Display</h3>
      <div class="property-list">
        ${properties.map(prop => `
          <div class="property-item">
            <input type="checkbox" id="prop-${prop}" checked>
            <label for="prop-${prop}">${prop}</label>
          </div>
        `).join('')}
      </div>
      <button id="confirm-properties" class="confirm-button">Confirm Selection</button>
    `;

    setTimeout(() => {
      const confirmButton = container.querySelector('#confirm-properties');
      if (confirmButton) {
        confirmButton.addEventListener('click', () => {
          const excludedProps = properties.filter(prop => {
            const checkbox = container.querySelector(`#prop-${prop}`) as HTMLInputElement;
            return checkbox && !checkbox.checked;
          });
          this.excludedProperties = new Set(excludedProps);
          this.map.closePopup();
          this.addGeoJsonLayer(geoJsonData);
          // Remove existing column selection control if it exists
          const existingControl = document.querySelector('.column-select');
          if (existingControl) {
            existingControl.remove();
          }
          // Add new column selection control with filtered properties
          this.addColumnSelectionControl();
        });
      }
    });

    return container;
  }

  private isVectorGrid(layer: any): layer is L.VectorGrid {
    return layer && 'setFeatureStyle' in layer && 'resetFeatureStyle' in layer;
  }

  private getFeatureId(properties: any): string {
    return properties.id || JSON.stringify(properties);
  }

  private initializeDrawControls(): void {
    // Create feature group for drawn items and add to map
    this.drawnItems = new L.FeatureGroup();
    this.map.addLayer(this.drawnItems);

    const drawOptions: L.Control.DrawConstructorOptions = {
      position: 'topright',
      draw: {
        polygon: false,
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false,
        rectangle: {
          shapeOptions: {
            color: '#97009c',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.2
          },
          metric: true
        }
      },
      edit: {
        featureGroup: this.drawnItems,
        remove: true,
        edit: false
      }
    };

    this.drawControl = new L.Control.Draw(drawOptions);
    this.map.addControl(this.drawControl);

    // Handle draw start - disable other layer interactions
    this.map.on(L.Draw.Event.DRAWSTART, () => {
      // Disable VectorGrid interactions
      if (this.geoJsonLayer) {
        this.map.removeLayer(this.geoJsonLayer);
      }
      // Store current overlays state
      Object.values(this.overlays).forEach(layer => {
        if (layer.getLayers) {
          layer.getLayers().forEach((sublayer: any) => {
            if (sublayer.options) {
              sublayer.options.interactive = false;
            }
          });
        }
      });
    });

    // Handle draw stop - restore layer interactions
    this.map.on(L.Draw.Event.DRAWSTOP, () => {
      // Re-enable VectorGrid
      if (this.geoJsonLayer) {
        this.map.addLayer(this.geoJsonLayer);
      }
      // Restore overlays interaction
      Object.values(this.overlays).forEach(layer => {
        if (layer.getLayers) {
          layer.getLayers().forEach((sublayer: any) => {
            if (sublayer.options) {
              sublayer.options.interactive = true;
            }
          });
        }
      });
    });

    // Handle creation of new drawn items
    this.map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      
      // Remove previous box if it exists
      if (this.currentBox) {
        this.drawnItems.removeLayer(this.currentBox);
      }
      
      // Store the new box
      if (e.layerType === 'rectangle') {
        this.currentBox = layer as L.Rectangle;
      }
      
      // Add the layer to the feature group
      this.drawnItems.addLayer(layer);
      
      // Enable the filter button
      const toggleButton = document.getElementById('toggle-filter');
      if (toggleButton) {
        toggleButton.removeAttribute('disabled');
      }
    });

    // Handle removal of drawn items
    this.map.on(L.Draw.Event.DELETED, (e: any) => {
      const layers = e.layers;
      layers.eachLayer((layer: any) => {
        if (layer === this.currentBox) {
          this.currentBox = null;
          const toggleButton = document.getElementById('toggle-filter');
          if (toggleButton) {
            toggleButton.setAttribute('disabled', '');
          }
        }
      });
    });
  }

  private filterDataByBox(): void {
    if (!this.currentBox || !this.originalGeoJsonData) return;

    const boxBounds = this.currentBox.getBounds();
    const filteredFeatures = this.originalGeoJsonData.features.filter((feature: any) => {
      const coordinates = feature.geometry.coordinates;
      
      // Handle different geometry types
      if (feature.geometry.type === 'Point') {
        return boxBounds.contains(L.latLng(coordinates[1], coordinates[0]));
      } else if (feature.geometry.type === 'Polygon') {
        // Check if any point of the polygon is within the box
        return coordinates[0].some((coord: number[]) => 
          boxBounds.contains(L.latLng(coord[1], coord[0]))
        );
      }
      return false;
    });

    const filteredGeoJson = {
      type: 'FeatureCollection',
      features: filteredFeatures
    };

    // Update the map with filtered data
    this.addGeoJsonLayer(filteredGeoJson, false);

    // Always update statistics component data, regardless of modal state
    if (this.statisticsComponent) {
      this.statisticsComponent.data = filteredGeoJson;
      // Only calculate if modal is open
      if (this.statisticsComponent.showModal) {
        this.statisticsComponent.calculateStatistics();
      }
    }
  }

  private resetFilter(): void {
    if (this.originalGeoJsonData) {
      // Remove filtered layer from control if it exists
      if (this.overlays['Filtered Data']) {
        this.layerControl.removeLayer(this.overlays['Filtered Data']);
        delete this.overlays['Filtered Data'];
      }
      this.addGeoJsonLayer(this.originalGeoJsonData, false);
      
      // Always update statistics component data, regardless of modal state
      if (this.statisticsComponent) {
        this.statisticsComponent.data = this.originalGeoJsonData;
        // Only calculate if modal is open
        if (this.statisticsComponent.showModal) {
          this.statisticsComponent.calculateStatistics();
        }
      }
    }
  }

  private showNetCDFOptionsDialog(metadata: NetCDFMetadata, reader: NetCDFReader): void {
    const center = this.map.getCenter();
    const popup = L.popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: 400,
      className: 'netcdf-options-popup'
    })
      .setLatLng(center)
      .setContent(this.createNetCDFOptionsContent(metadata, reader))
      .openOn(this.map);

    const container = popup.getElement();
    if (container) {
      L.DomEvent.disableClickPropagation(container);
    }
  }

  private createNetCDFOptionsContent(metadata: NetCDFMetadata, reader: NetCDFReader): HTMLElement {
    const container = L.DomUtil.create('div', 'netcdf-options-container');
    
    // Create component with proper Angular bootstrapping
    const componentRef = createComponent(NetCDFOptionsComponent, {
      environmentInjector: this.injector,
      hostElement: container
    });

    // Set metadata and subscribe to options
    componentRef.instance.metadata = metadata;
    componentRef.instance.optionsSelected.subscribe((options: NetCDFDisplayOptions) => {
      this.fileUploadService.createRasterFromNetCDF(reader, options).subscribe({
        next: (rasterData) => {
          this.addGeoTiffLayer(rasterData.imageUrl, rasterData.bounds);
          this.map.closePopup();
        },
        error: (error) => console.error('Error creating raster:', error)
      });
    });

    // Trigger change detection
    componentRef.changeDetectorRef.detectChanges();

    return container;
  }
}

