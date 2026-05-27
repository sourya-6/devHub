import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Projects } from '../../services/Projects/projects';
import { ToastService } from '../../services/toast/toast';

@Component({
  selector: 'app-add-project',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './add-project.html',
  styleUrl: './add-project.css',
})
export class AddProject {
  title = '';
  description = '';
  liveLink = '';
  gitHubLink = '';
  tags = '';
  imageFile: File | null = null;
  errorMessage = '';

  constructor(
    private projectService: Projects,
    private router: Router,
    private toastService: ToastService
  ) {}

  onImageChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.imageFile = target.files && target.files.length > 0 ? target.files[0] : null;
  }

  createProject() {
    this.errorMessage = '';

    if (!this.title.trim() || !this.description.trim()) {
      this.errorMessage = 'Title and description are required';
      return;
    }

    this.projectService.createProject({
      title: this.title.trim(),
      description: this.description.trim(),
      liveLink: this.liveLink.trim(),
      gitHubLink: this.gitHubLink.trim(),
      tags: this.tags.trim(),
      image: this.imageFile,
    }).subscribe({
      next: () => {
        this.toastService.success('Project created successfully');
        this.router.navigate(['/dashbord']);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error creating project:', error);
        const message = this.getCreateProjectErrorMessage(error);
        this.errorMessage = message;
        this.toastService.error(message);
      }
    });
  }

  private getCreateProjectErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 409) {
      return 'There is already a project with this title name';
    }

    const serverMessage = error.error?.message;
    if (Array.isArray(serverMessage)) {
      return serverMessage.join(', ');
    }

    return serverMessage || 'Failed to create project';
  }
}
