import { Routes } from '@angular/router';
import { LoginPage } from './pages/login-page/login-page';
import { ProjectById } from './pages/project-by-id/project-by-id';
import { AllProjects } from './pages/all-projects/all-projects';
import { authGuard } from './guards/auth.guard';
import { projectResolver } from './resolvers/project-resolver/project-resolver-resolver';
import { projectByIdResolver } from './resolvers/projectById/project-by-id-resolver';
 


export const routes: Routes = [
  { path: '', component: LoginPage },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./pages/auth-callback/auth-callback').then((m) => m.AuthCallback),
  },
  { path: 'dashbord', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    component: AllProjects,
    resolve: { projectsData: projectResolver },
    canActivate: [authGuard],
  },
  {
    path: 'add-project',
    loadComponent: () =>
      import('./pages/add-project/add-project').then((m) => m.AddProject),
    canActivate: [authGuard],
  },
  { path: 'project/:id', component: ProjectById, resolve: { projectData: projectByIdResolver } },
];
