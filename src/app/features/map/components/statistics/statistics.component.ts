import { Component, Input, OnInit } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent implements OnInit {
  @Input() data: any;
  @Input() columns: string[] = [];
  
  selectedColumn: string = '';
  showModal: boolean = false;

  constructor() {}

  ngOnInit(): void {}

  onColumnSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedColumn = select.value;
  }

  calculateAreaStatistics(): void {
    if (!this.data?.features || !this.selectedColumn) return;
    
    // Group features by the selected column value and sum their areas
    const areasByValue = new Map<string, number>();
    
    this.data.features.forEach((feature: any) => {
      const value = feature.properties[this.selectedColumn];
      const area = feature.properties['AREA'] || 0;
      
      const currentArea = areasByValue.get(value) || 0;
      areasByValue.set(value, currentArea + area);
    });

    this.drawPieChart(areasByValue);
  }

  private drawPieChart(data: Map<string, number>): void {
    // Clear previous chart
    d3.select('#pie-chart').selectAll('*').remove();

    const width = 400;
    const height = 400;
    const radius = Math.min(width, height) / 2;

    const svg = d3.select('#pie-chart')
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const pie = d3.pie<[string, number]>()
      .value(d => d[1]);

    const arc = d3.arc<d3.PieArcDatum<[string, number]>>()
      .innerRadius(0)
      .outerRadius(radius);

    const arcs = svg.selectAll('arc')
      .data(pie(Array.from(data)))
      .enter()
      .append('g');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', (_, i) => d3.schemeCategory10[i % 10]);

    arcs.append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .text(d => `${d.data[0]}: ${(d.data[1] / d3.sum(Array.from(data.values())) * 100).toFixed(1)}%`);
  }
} 