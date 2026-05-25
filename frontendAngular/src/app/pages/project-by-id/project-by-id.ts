import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import {
  projectTemplate,

} from '../../services/Projects/projectTemplate';
import { CommonModule } from '@angular/common';
import { Projects } from '../../services/Projects/projects';
import { Comment } from '../projectComponents/comment/comment';
import { SocketService } from '../../services/socket';


@Component({
  selector: 'app-project-by-id',
  imports: [CommonModule, Comment],
  templateUrl: './project-by-id.html',
  styleUrl: './project-by-id.css',
})
export class ProjectById {
  project!: projectTemplate
  likeCount: number = 0;
  isLiked: boolean = false;
  currentUserId: string = '';
  private sseConnected = false;

  constructor(
    private route: ActivatedRoute,
    private projectService: Projects,
    private socketService: SocketService,
    private router: Router
  ) { }

  ngOnInit() {
    const projectData = this.route.snapshot.data['projectData'];
    this.project = projectData;
    this.likeCount = this.project.likes?.length || 0;

    // Get current user ID from localStorage (should be stored during login)
    this.currentUserId = localStorage.getItem('userId') || '';

    // Check if current user has already liked this project
    if (this.project.likes && this.currentUserId) {
      this.isLiked = this.project.likes.some((like: any) => {

        if (typeof like === 'string') {
          return like === this.currentUserId;
        }

        return like._id === this.currentUserId;
      });
    }

    this.setupSocket();

    console.log(this.project);
  }

  ngOnDestroy() {
    if (this.project?._id) {
      this.socketService.disconnect();
      this.sseConnected = false;
    }
  }

  setupSocket() {
    if (!this.project._id || this.sseConnected) return;

    this.socketService.connectToProject(this.project._id);
    this.sseConnected = true;
    this.socketService.onLikesUpdated((data: any) => {
      if (data.projectId === this.project._id) {
        this.project.likes = data.likes || [];
        this.likeCount = typeof data.totalLikes === 'number' ? data.totalLikes : this.project.likes.length;
        this.isLiked = this.project.likes.some((like: any) => like?.toString?.() === this.currentUserId || like === this.currentUserId);
      }
    });
  }

  toggleLike() {
    console.log('Toggle like clicked');

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first to like this project');
      this.setupLoginRedirect();
      return;
    }

    const projectId = this.project._id;
    if (!projectId) {
      console.error('Project ID not found');
      return;
    }

    // Optimistic update: toggle like immediately
    const wasLiked = this.isLiked;
    const previousLikeCount = this.likeCount;
    const previousLikes = [...this.project.likes];

    if (this.isLiked) {
      this.project.likes = this.project.likes.filter(like => like?.toString?.() !== this.currentUserId && like !== this.currentUserId);
      this.likeCount--;
    } else {
      this.project.likes.push(this.currentUserId);
      this.likeCount++;
    }
    this.isLiked = !this.isLiked;

    this.projectService.toggleLike(projectId).subscribe({
      next: (response: any) => {
        console.log('Like toggled:', response);
        // Confirm from server (already updated optimistically)
      },
      error: (error) => {
        console.error('Error toggling like:', error);
        // Revert optimistic update on error
        this.isLiked = wasLiked;
        this.likeCount = previousLikeCount;
        this.project.likes = previousLikes;
      }
    });
  }

  setupLoginRedirect() {
    this.router.navigate(['/']);
  }



}