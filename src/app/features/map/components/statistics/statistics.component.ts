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

    const width = 600;
    const height = 500;
    const radius = Math.min(width, height) / 3;
    const legendWidth = 150;  // Width reserved for legend

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    const svg = d3.select('#pie-chart')
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${(width - legendWidth) / 2},${height / 2})`);

    const pie = d3.pie<[string, number]>()
      .value(d => d[1])
      .sort((a, b) => b[1] - a[1]);

    const arc = d3.arc<d3.PieArcDatum<[string, number]>>()
      .innerRadius(radius * 0.4)
      .outerRadius(radius);

    // Add tooltip
    const tooltip = d3.select('#pie-chart')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

    // Add slices
    const arcs = svg.selectAll('arc')
      .data(pie(Array.from(data)))
      .enter()
      .append('g')
      .attr('class', 'slice');

    arcs.append('path')
      .attr('d', arc)
      .style('fill', (_, i) => colorScale(i.toString()))
      .style('stroke', 'white')
      .style('stroke-width', '2px')
      .on('mouseover', function(event, d) {
        const percentage = (d.data[1] / d3.sum(Array.from(data.values())) * 100).toFixed(1);
        tooltip.transition()
          .duration(200)
          .style('opacity', .9);
        tooltip.html(`${d.data[0]}: ${percentage}%`)
          .style('left', (event.pageX) + 'px')
          .style('top', (event.pageY - 28) + 'px');
        
        d3.select(this)
          .style('opacity', 0.7);
      })
      .on('mouseout', function() {
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
        
        d3.select(this)
          .style('opacity', 1);
      });

    // Add legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${radius * 1.5}, ${-height/3})`);

    const legendItems = legend.selectAll('.legend-item')
      .data(Array.from(data))
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (_, i) => `translate(0, ${i * 20})`);

    legendItems.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .style('fill', (_, i) => colorScale(i.toString()));

    legendItems.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .text(d => {
        const percentage = (d[1] / d3.sum(Array.from(data.values())) * 100).toFixed(1);
        return `${d[0]} (${percentage}%)`;
      })
      .style('font-size', '12px');

    // Add title
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -height/2 + 20)
      .attr('class', 'chart-title')
      .text('Area Distribution')
      .style('font-size', '16px')
      .style('font-weight', 'bold');
  }
} 