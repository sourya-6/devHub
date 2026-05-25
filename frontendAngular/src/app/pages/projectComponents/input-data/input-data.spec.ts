import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputData } from './input-data';

describe('InputData', () => {
  let component: InputData;
  let fixture: ComponentFixture<InputData>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputData],
    }).compileComponents();

    fixture = TestBed.createComponent(InputData);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
