/*
import { Component, OnInit } from '@angular/core';
import { Map, View } from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM, Vector as VectorSource } from 'ol/source';
import { Style, Icon, Fill, Stroke } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Overlay } from 'ol';
import { toStringHDMS } from 'ol/coordinate';
import { Subscription } from 'rxjs';
import { StorageService } from '../../../shared/services/storage.service';
import { GraphService } from 'src/app/shared/services/graph.service';

@Component({
  selector: 'app-gis',
  templateUrl: './gis.component.html',
  styleUrls: ['./gis.component.css']
})
export class GisComponent implements OnInit {
  map: Map;
  vectorLayer: VectorLayer;
  popupOverlay: Overlay;
  subscription: Subscription = Subscription.EMPTY;
  layers = [];
  defaultLayer = 'base_nbfc';

  constructor(
    private storageService: StorageService,
    private graphService: GraphService,
  ) {}

  ngOnInit() {
    this.initMap();
    this.initPopup();
    this.loadDefaultLayer();
    this.getGeojsonList();
  }

  private initMap() {
    const baseLayer = new TileLayer({ source: new OSM() });
    this.map = new Map({
      target: 'map',
      layers: [baseLayer],
      view: new View({
        center: fromLonLat([11.266667, 42.933333]),
        zoom: 5.5
      })
    });
    this.map.on('singleclick', (evt) => this.displayPopup(evt));
  }

  private initPopup() {
    this.popupOverlay = new Overlay({
      element: document.getElementById('popup'),
    });
    this.map.addOverlay(this.popupOverlay);

    const closer = document.getElementById('popup-closer');
    closer.onclick = () => {
      this.hidePopup();
      return false;
    };
  }

  private displayPopup(evt: any) {
    const feature = this.map.forEachFeatureAtPixel(evt.pixel, (f) => f);
    const coordinate = evt.coordinate;
    const hdms = toStringHDMS(toLonLat(coordinate));
    if (feature) {
      const properties = feature.getProperties();
      const content = document.getElementById('popup-content');
      content.innerHTML = `<strong>Location</strong><br>${hdms}<br>`;
      Object.keys(properties).forEach(key => {
        if (!['icon', 'geometry'].includes(key)) {
          content.innerHTML += `<strong>${key}</strong>: ${properties[key]}<br>`;
        }
      });
      this.popupOverlay.setPosition(evt.coordinate);
      document.getElementById('popup').style.display = 'block';
    } else {
      this.hidePopup();
    }
  }

  private loadDefaultLayer() {
    const geojsonPath = `./assets/geojson/${this.defaultLayer}.geojson`;
    this.loadLayerFromUrl(geojsonPath);
  }

  getGeojsonList() {
    this.subscription = this.graphService.getFileUploaded().subscribe((res) => {
      this.layers = ["-", ...res.splice(0, 9).map((x) => x['user_filename'])]
    });
  }

  private loadLayerFromUrl(geojsonUrl: string) {
    fetch(geojsonUrl)
      .then(response => response.json())
      .then((geojsonObject) => {
        this.loadLayerFromGeoJSON(geojsonObject);
      })
      .catch(error => {
        console.error("Error loading GeoJSON: ", error);
        this.loadDefaultLayer();
      });
  }

  private loadLayerFromGeoJSON(geojsonObject: any) {
    const crs = geojsonObject.crs?.properties?.name || 'EPSG:4326';
    const features = new GeoJSON().readFeatures(geojsonObject, {
      dataProjection: crs,
      featureProjection: 'EPSG:3857'
    });

    if (this.vectorLayer) {
      this.map.removeLayer(this.vectorLayer);
    }

    const vectorSource = new VectorSource({ features });
    this.vectorLayer = new VectorLayer({
      source: vectorSource,
      style: this.styleFunction
    });
    this.map.addLayer(this.vectorLayer);
  }

  private styleFunction = (feature: any): Style => {
    const geometryType = feature.getGeometry().getType();
    switch (geometryType) {
      case 'Point':
        const iconUrlPoint = feature.get('icon');
        const iconScale = feature.get('scale') || 1;
        return new Style({
          image: new Icon({ anchor: [0.5, 1], src: iconUrlPoint, scale: iconScale })
        });

      case 'Polygon':
      case 'MultiPolygon':
        let color = feature.get('COLOR') || '#CC3300';
        color = this.addTransparency(color, 0.3);
        return new Style({
          stroke: new Stroke({ color: 'black', width: 1, lineDash: [7.5, 5] }),
          fill: new Fill({ color })
        });

      default:
        return new Style();
    }
  }

  private addTransparency(color: string, transparency: number): string {
    if (color.startsWith('rgba')) {
      return color.replace(/[\d\.]+\)$/g, `${transparency})`);
    } else if (color.startsWith('rgb')) {
      return color.replace('rgb', 'rgba').replace(')', `, ${transparency})`);
    } else {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${transparency})`;
    }
  }

  onLayerChange(event: Event) {
    const selectedLayer = (event.target as HTMLSelectElement).value;
    this.hidePopup();
    if (selectedLayer !== '-') {
      this.storageService.downloadFile('temporary', selectedLayer, '').subscribe((response) => {
        if (response.status === 200) {
          const blob: Blob = response.body;
          const reader = new FileReader();
          reader.onload = (e) => {
            const geojsonText = e.target?.result as string;
            const geojsonObject = JSON.parse(geojsonText);
            this.loadLayerFromGeoJSON(geojsonObject);
          };
          reader.readAsText(blob);
        } else {
          console.error('Error downloading the file, status:', response.status);
        }
      }, error => {
        console.error('Error downloading the file: ', error);
        this.loadDefaultLayer();
      });
    } else {
      this.loadDefaultLayer();
    }
  }

  private hidePopup() {
    const overlayElement = document.getElementById('popup');
    if (overlayElement) {
      overlayElement.style.display = 'none';
    }
    this.popupOverlay.setPosition(undefined); // Ensure overlay is removed
  }
}
*/

import { FormBuilder, Validators } from '@angular/forms';
// import { HmscService } from './hmsc-services/hmsc.service';
import { debounce, interval, Subject, Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { StorageService } from '../../../shared/services/storage.service';
import {
  SERVICE,
  ServiceDescription,
  ServiceDescriptionService,
} from 'src/app/shared/services/service-description.service';
import { GraphService } from 'src/app/shared/services/graph.service';

import { Component, OnInit } from '@angular/core';
import { Map, View } from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM, Vector as VectorSource } from 'ol/source';
import { Style, Icon, Fill, Stroke } from 'ol/style';
import { fromLonLat, transform, toLonLat } from 'ol/proj';
import { Overlay } from 'ol';
import { toStringHDMS } from 'ol/coordinate'
import { XYZ } from 'ol/source'

import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import { get as getProjection } from 'ol/proj';
import excludedProps from 'src/assets/excluded-properties.json';

// Access the array within the object
const excludedPropertiesArray = excludedProps.excludedProperties;

/*
import { Component, OnInit } from '@angular/core';
import { Map, View } from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM, Vector as VectorSource } from 'ol/source';
import { Style, Icon, Fill, Stroke } from 'ol/style';
import { fromLonLat, transform } from 'ol/proj';
import { Overlay } from 'ol';
import { toStringHDMS } from 'ol/coordinate';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import { get as getProjection } from 'ol/proj';
import { ToastrService } from 'ngx-toastr';
import { StorageService } from '../../../shared/services/storage.service';
import { GraphService } from 'src/app/shared/services/graph.service';
*/
@Component({
  selector: 'app-gis',
  templateUrl: './gis.component.html',
  styleUrls: ['./gis.component.css']
})
export class GisComponent implements OnInit {
  map: Map;
  vectorLayer: VectorLayer;
  popupOverlay: Overlay;
  layers = [];
  defaultLayer = 'base_nbfc';

  constructor(
    private notify: ToastrService,
    private storageService: StorageService,
    private graphService: GraphService
  ) {}

  ngOnInit() {
    this.registerProjections();
    this.initMap();
    this.initPopup();
    this.loadDefaultLayer();
    this.getGeojsonList();
  }

  private registerProjections() {
    // Register EPSG:25833
    proj4.defs('EPSG:25833', '+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs');
    register(proj4);
  }

  private initMap() {
    //const transformedCenter = transform([500000, 6500000], 'EPSG:25833', 'EPSG:3857');
    const baseLayer = new TileLayer({ source: new OSM() });

    this.map = new Map({
      target: 'map',
      layers: [baseLayer],
      view: new View({
        projection: 'EPSG:3857',
        center: fromLonLat([11.266667, 42.933333]),
        zoom: 5.5
      })
    });

    this.map.on('singleclick', (evt) => this.displayPopup(evt));
  }

  private initPopup() {
    this.popupOverlay = new Overlay({
      element: document.getElementById('popup')
    });
    this.map.addOverlay(this.popupOverlay);

    const closer = document.getElementById('popup-closer');
    closer.onclick = () => {
      this.popupOverlay.setPosition(undefined);
      document.getElementById('popup').style.display = 'none';
      return false;
    };
  }

  private displayPopup(evt: any) {
    const feature = this.map.forEachFeatureAtPixel(evt.pixel, (f) => f);
    const coordinate = evt.coordinate;
    const hdms = toStringHDMS(transform(coordinate, 'EPSG:3857', 'EPSG:4326'));

    if (feature) {
      const properties = feature.getProperties();
      const content = document.getElementById('popup-content');

      content.innerHTML = `<strong>Location</strong>: ${hdms}<br>`;
      Object.keys(properties).forEach(key => {
        if (!excludedPropertiesArray.includes(key)) {
          content.innerHTML += `<strong>${key}</strong>: ${properties[key]}<br>`;
        }
      });
      this.popupOverlay.setPosition(evt.coordinate);
      document.getElementById('popup').style.display = 'block';
    } else {
      this.popupOverlay.setPosition(undefined);
    }
  }

  private loadDefaultLayer() {
    const geojsonPath = `./assets/geojson/${this.defaultLayer}.geojson`;
    this.loadLayerFromUrl(geojsonPath);
  }

  getGeojsonList() {
    this.graphService.getFileUploaded().subscribe((res) => {
      this.layers = ["-", ...res.splice(0, 9).map((x) => x['user_filename'])];
    });
  }

  private loadLayerFromUrl(geojsonUrl: string) {
    fetch(geojsonUrl)
      .then(response => response.json())
      .then((geojsonObject) => {
        this.loadLayerFromGeoJSON(geojsonObject);
      })
      .catch(error => {
        console.error("Error loading GeoJSON: ", error);
        this.loadDefaultLayer();
      });
  }

  private loadLayerFromGeoJSON(geojsonObject: any) {
    const crs = geojsonObject.crs?.properties?.name || 'EPSG:4326';
    const features = new GeoJSON().readFeatures(geojsonObject, {
      dataProjection: crs,
      featureProjection: 'EPSG:3857'
    });

    if (this.vectorLayer) {
      this.map.removeLayer(this.vectorLayer);
    }

    const vectorSource = new VectorSource({ features });
    this.vectorLayer = new VectorLayer({
      source: vectorSource,
      style: this.styleFunction
    });
    this.map.addLayer(this.vectorLayer);
  }

  private styleFunction = (feature: any): Style => {
    const geometryType = feature.getGeometry().getType();
    switch (geometryType) {
      case 'Point':
        const iconUrlPoint = feature.get('icon');
        const iconScale = feature.get('scale') || 1;
        return new Style({
          image: new Icon({ anchor: [0.5, 1], src: iconUrlPoint, scale: iconScale })
        });

      case 'Polygon':
      case 'MultiPolygon':
        let color = feature.get('COLOR') || '#CC3300';
        color = this.addTransparency(color, 0.3);
        return new Style({
          stroke: new Stroke({ color: 'black', width: 1, lineDash: [7.5, 5] }),
          fill: new Fill({ color })
        });

      default:
        return new Style();
    }
  };

  private addTransparency(color: string, transparency: number): string {
    if (color.startsWith('rgba')) {
      return color.replace(/[\d\.]+\)$/g, `${transparency})`);
    } else if (color.startsWith('rgb')) {
      return color.replace('rgb', 'rgba').replace(')', `, ${transparency})`);
    } else {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${transparency})`;
    }
  }

  onLayerChange(event: Event) {
    const selectedLayer = (event.target as HTMLSelectElement).value;
    this.hidePopup();
    if (selectedLayer !== '-') {
      this.storageService.downloadFile('temporary', selectedLayer, '').subscribe((response) => {
        if (response.status === 200) {
          const blob: Blob = response.body;
          const reader = new FileReader();
          reader.onload = (e) => {
            const geojsonText = e.target?.result as string;
            const geojsonObject = JSON.parse(geojsonText);
            this.loadLayerFromGeoJSON(geojsonObject);
          };
          reader.readAsText(blob);
        } else {
          console.error('Error downloading the file, status:', response.status);
        }
      }, error => {
        console.error('Error downloading the file: ', error);
        this.loadDefaultLayer();
      });
    } else {
      this.loadDefaultLayer();
    }
  }

  private hidePopup() {
    const overlayElement = document.getElementById('popup');
    if (overlayElement) {
      overlayElement.style.display = 'none';
    }
  }
}
