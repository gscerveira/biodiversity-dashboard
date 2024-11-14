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

    const width = 500;
    const height = 500;
    const radius = Math.min(width, height) / 3; // Reduced radius to leave more space for labels
    const labelOffset = 10; // Offset for label lines

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    const svg = d3.select('#pie-chart')
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const pie = d3.pie<[string, number]>()
      .value(d => d[1])
      .sort((a, b) => b[1] - a[1]);

    const arc = d3.arc<d3.PieArcDatum<[string, number]>>()
      .innerRadius(radius * 0.4)
      .outerRadius(radius);

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
      .style('stroke-width', '2px');

    // Add labels
    arcs.each(function(d) {
      const centroid = arc.centroid(d);
      const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
      const x = centroid[0];
      const y = centroid[1];
      
      // Calculate label position
      const labelX = x * 1.5;
      const labelY = y * 1.5;
      
      // Draw line from slice to label
      const g = d3.select(this);
      g.append('line')
        .attr('x1', x)
        .attr('y1', y)
        .attr('x2', labelX)
        .attr('y2', labelY)
        .style('stroke', '#666')
        .style('stroke-width', '1px');

      // Add label text
      const percentage = (d.data[1] / d3.sum(Array.from(data.values())) * 100).toFixed(1);
      const label = `${d.data[0]}: ${percentage}%`;
      
      g.append('text')
        .attr('transform', `translate(${labelX + (midAngle < Math.PI ? labelOffset : -labelOffset)},${labelY})`)
        .attr('text-anchor', midAngle < Math.PI ? 'start' : 'end')
        .attr('alignment-baseline', 'middle')
        .text(label)
        .style('font-size', '11px')
        .style('font-family', 'Arial');
    });

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