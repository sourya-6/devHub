import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { projectResolverResolver } from './project-resolver-resolver';

describe('projectResolverResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) =>
    TestBed.runInInjectionContext(() => projectResolverResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
