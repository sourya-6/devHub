import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';

import { PaginatedProjectsResponse } from '../../services/Projects/projectTemplate';
import { Projects } from '../../services/Projects/projects';

export const projectResolver: ResolveFn<PaginatedProjectsResponse> = (route) => {
  const requestedPage = Number(route.queryParamMap.get('page') || 1);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const search = route.queryParamMap.get('search')?.trim() || undefined;

  return inject(Projects).getAllProjectsPaginated(page, 12, search);

};
