import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectById } from './project-by-id';

describe('ProjectById', () => {
  let component: ProjectById;
  let fixture: ComponentFixture<ProjectById>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectById],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectById);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
