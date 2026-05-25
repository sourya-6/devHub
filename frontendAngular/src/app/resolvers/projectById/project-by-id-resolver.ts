import { ActivatedRoute, ResolveFn, Router } from '@angular/router';
import { Projects } from '../../services/Projects/projects';
import { inject } from '@angular/core';
import { projectTemplate, realProjectTemplate } from '../../services/Projects/projectTemplate';
import { map } from 'rxjs/operators';

export const projectByIdResolver: ResolveFn<any> = (route) => {
  const id = route.params['id'];
  
  const projectService = inject(Projects)

  return projectService.getProjectById(id).pipe(
    map(response => response.project)
  )
};
