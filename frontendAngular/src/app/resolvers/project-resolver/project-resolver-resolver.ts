import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';

import { Projects } from '../../services/Projects/projects';

export const projectResolver: ResolveFn<any> = () => {

  return inject(Projects).getAllProjects();

};