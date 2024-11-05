/*
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { SharedModule } from "../../../shared/shared.module";
import { GisComponent } from './gis.component';

@NgModule({
  declarations: [
    GisComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [GisComponent]
})
export class GisModule { }

*/

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule if you're using forms
import { GisComponent } from './gis.component'; // Adjust the import path as needed

@NgModule({
  declarations: [
    GisComponent
  ],
  imports: [
    CommonModule,
    FormsModule // Include FormsModule to use ngModel, if needed
  ],
  exports: [
    GisComponent // Export the component to use it in other modules
  ]
})
export class GisModule { }
