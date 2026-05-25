import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { projectByIdResolver } from './project-by-id-resolver';

describe('projectByIdResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) =>
    TestBed.runInInjectionContext(() => projectByIdResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
