import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  projectTemplate,

} from '../../services/Projects/projectTemplate';
import { CommonModule } from '@angular/common';
import { Projects } from '../../services/Projects/projects';
import { Comment } from '../projectComponents/comment/comment';
import { SocketService } from '../../services/socket';


@Component({
  selector: 'app-project-by-id',
  imports: [CommonModule, RouterLink, Comment],
  templateUrl: './project-by-id.html',
  styleUrl: './project-by-id.css',
})
export class ProjectById {
  project!: projectTemplate
  likeCount: number = 0;
  currentUserId: string = '';
  private sseConnected = false;
  private lastLikeClickAt = 0;
  private likeRequestInFlight = false;

  constructor(
    private route: ActivatedRoute,
    private projectService: Projects,
    private socketService: SocketService,
    private router: Router
  ) { }

  ngOnInit() {
    const projectData = this.route.snapshot.data['projectData'];
    this.project = projectData;
    this.likeCount = this.project.likeCount || 0;

    // Get current user ID from localStorage (should be stored during login)
    this.currentUserId = localStorage.getItem('userId') || '';

    // Check if current user has already liked this project
    this.setupSocket();

    console.log(this.project);
  }

  ngOnDestroy() {
    if (this.project?.id) {
      this.socketService.disconnect();
      this.sseConnected = false;
    }
  }

  setupSocket() {
    if (!this.project.id || this.sseConnected) return;

    this.socketService.connectToProject(this.project.id);
    this.sseConnected = true;
    this.socketService.onLikesUpdated((data: any) => {
      if (data.projectId === this.project.id) {
        this.likeCount = typeof data.likeCount === 'number' ? data.likeCount : this.likeCount;
        this.project.likeCount = this.likeCount;
      }
    });
  }

  toggleLike() {
    const now = Date.now();
    // Ignore rapid repeat taps/clicks within 400ms.
    if (now - this.lastLikeClickAt < 400) {
      return;
    }
    this.lastLikeClickAt = now;

    // Prevent overlapping toggle requests.
    if (this.likeRequestInFlight) {
      return;
    }

    console.log('Toggle like clicked');

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first to like this project');
      this.setupLoginRedirect();
      return;
    }

    const projectId = this.project.id;
    if (!projectId) {
      console.error('Project ID not found');
      return;
    }

    this.likeRequestInFlight = true;

    this.projectService.toggleLike(projectId).subscribe({
      next: (response: any) => {
        console.log('Like toggled:', response);

        if (typeof response?.likeCount === 'number') {
          this.likeCount = response.likeCount;
          this.project.likeCount = response.likeCount;
        } else {
          this.likeCount = this.project.likeCount || 0;
        }

        if (typeof response?.likedByMe === 'boolean') {
          this.project.likedByMe = response.likedByMe;
        }

        this.likeRequestInFlight = false;
      },
      error: (error) => {
        console.error('Error toggling like:', error);
        this.likeRequestInFlight = false;
      }
    });
  }

  setupLoginRedirect() {
    this.router.navigate(['/']);
  }

  get isLiked(): boolean {
    return !!this.project?.likedByMe;
  }



}
