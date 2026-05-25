import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Projects } from '../../services/Projects/projects';

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

  constructor(
    private projectService: Projects,
    private router: Router
  ) {}

  onImageChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.imageFile = target.files && target.files.length > 0 ? target.files[0] : null;
  }

  createProject() {
    if (!this.title.trim() || !this.description.trim()) {
      alert('Title and description are required');
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
        this.router.navigate(['/dashbord']);
      },
      error: (error) => {
        console.error('Error creating project:', error);
        alert('Failed to create project');
      }
    });
  }
}
