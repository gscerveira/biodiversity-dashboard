import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayerControlComponent } from './layer-control.component';

describe('LayerControlComponent', () => {
  let component: LayerControlComponent;
  let fixture: ComponentFixture<LayerControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayerControlComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LayerControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
