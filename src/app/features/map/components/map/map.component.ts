import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import * as d3 from 'd3';
import { MapService } from '../../../../core/services/map.service';

@Component({
  selector: 'app-map',
  template: '<div #mapContainer></div>',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  @ViewChild('mapContainer', { static: true }) private mapContainer!: ElementRef;

  private svg: any;
  private projection: any;
  private path: any;

  constructor(private mapService: MapService) {}

  ngOnInit() {
    this.initializeMap();
  }

  private initializeMap(): void {
    const width = 800;
    const height = 600;

    this.svg = d3.select(this.mapContainer.nativeElement)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    this.projection = d3.geoMercator()
      .center([12.572149, 42.674749])
      .scale(1800)
      .translate([width / 2, height / 2]);

    this.path = d3.geoPath().projection(this.projection);

    // Load and display map data
    this.mapService.getMapData().subscribe(data => {
      this.svg.selectAll('path')
        .data(data.features)
        .enter()
        .append('path')
        .attr('d', this.path)
        .attr('fill', 'none')
        .attr('stroke', '#333')
        .attr('stroke-width', 1);
    });
  }
}
