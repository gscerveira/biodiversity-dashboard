import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NetCDFMetadata, NetCDFDisplayOptions } from '../../../../core/services/file-upload.service';

@Component({
  selector: 'app-netcdf-options',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="netcdf-options-container">
      <h3>NetCDF Options</h3>
      
      <div class="options-form">
        <div class="form-group">
          <label for="variable">Select Variable:</label>
          <select id="variable" [(ngModel)]="selectedVariable" (change)="updateOptions()">
            <option value="">Choose a variable</option>
            <option *ngFor="let variable of metadata?.variables" [value]="variable.name">
              {{ variable.name }} - {{ getVariableDescription(variable) }}
            </option>
          </select>
        </div>

        <div class="form-actions">
          <button class="confirm-button" (click)="confirmSelection()" [disabled]="!selectedVariable">
            Visualize Data
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .netcdf-options-container {
      padding: 15px;
      
      h3 {
        margin: 0 0 15px 0;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
      }
    }

    .options-form {
      .form-group {
        margin-bottom: 15px;
        
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        
        select {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
      }
    }

    .form-actions {
      .confirm-button {
        width: 100%;
        padding: 8px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;

        &:hover {
          background: #45a049;
        }

        &:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }
      }
    }
  `]
})
export class NetCDFOptionsComponent {
  @Input() set metadata(value: NetCDFMetadata | undefined) {
    console.log('Metadata received:', value);
    this._metadata = value;
  }
  get metadata(): NetCDFMetadata | undefined {
    return this._metadata;
  }
  private _metadata?: NetCDFMetadata;
  @Output() optionsSelected = new EventEmitter<NetCDFDisplayOptions>();

  selectedVariable: string = '';

  updateOptions() {
    if (this.selectedVariable) {
      const options: NetCDFDisplayOptions = {
        variable: this.selectedVariable
      };
      this.optionsSelected.emit(options);
    }
  }

  confirmSelection() {
    this.updateOptions();
  }

  getVariableDescription(variable: any): string {
    const longName = variable.attributes?.find((attr: any) => attr.name === 'long_name')?.value;
    const units = variable.attributes?.find((attr: any) => attr.name === 'units')?.value;
    
    if (longName && units) {
      return `${longName} (${units})`;
    } else if (longName) {
      return longName;
    }
    return '';
  }
} 