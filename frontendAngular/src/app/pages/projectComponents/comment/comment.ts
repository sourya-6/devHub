import { Component, ViewChild, ViewContainerRef, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { projectTemplate } from '../../../services/Projects/projectTemplate';
import type { Comment as ProjectComment } from '../../../services/Projects/projectTemplate';
import { Projects } from '../../../services/Projects/projects';
import { SocketService } from '../../../services/socket';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import { InputData } from '../input-data/input-data';


@Component({
  selector: 'app-comment',
  imports: [CommonModule, FormsModule],
  templateUrl: './comment.html',
  styleUrl: './comment.css',
})
export class Comment implements OnInit, OnDestroy {
  project!:projectTemplate
  likeCount: number = 0;
  isLiked: boolean = false;
  currentUserId: string = '';
  comments = signal<ProjectComment[]>([]);
  commentCount = computed(() => this.comments().length);
  expandedReplies = signal<{[key: string]: boolean}>({});
  replyTexts = signal<{[key: string]: string}>({});
  editingReplyId = signal<{[key: string]: string | null}>({});
  editReplyTexts = signal<{[key: string]: string}>({});
  loadingReplies = signal<{[key: string]: boolean}>({});
  editingCommentId = signal<string | null>(null);
  editCommentText = signal<{[key: string]: string}>({});
  loadingComments = signal<{[key: string]: boolean}>({});
  private sseConnected = false;

  constructor(
    private route: ActivatedRoute, 
    private projectService: Projects,
    private socketService: SocketService,
    private router: Router
  ) { }

  @ViewChild('inputData', { read: ViewContainerRef }) inputDataComponent!: ViewContainerRef;
  ngOnInit(){
    const projectData = this.route.snapshot.data['projectData'];
    this.project = projectData;
    this.comments.set(this.project.comments ?? []);
    this.likeCount = this.project.likes?.length || 0;
    
    
    this.currentUserId = localStorage.getItem('userId') || '';
    
  
    if (this.project.likes && this.currentUserId) {
      this.isLiked = this.project.likes.includes(this.currentUserId);
    }
    
    
    this.setupSocket(); 
    
    console.log(this.project);
  }

  ngOnDestroy() {
    
    if (this.project._id) {
      this.socketService.disconnect();
      this.sseConnected = false;
    }
  }

  setupSocket() {
    if (!this.project._id|| this.sseConnected) return;

    // Connect to SSE stream for this project
    this.socketService.connectToProject(this.project._id);
    this.sseConnected = true;
    
    // Listen for comment updates
    this.socketService.onCommentsUpdated((data: any) => {
      console.log('Comments updated:', data);
      if (data.projectId === this.project._id) {
        this.comments.set([...(data.comments || [])]);
        this.loadingReplies.set({});
      }
    });

    this.socketService.onRepliesUpdated((data: any) => {
      if (data.projectId === this.project._id) {
        const comments = data.comments || [];
        this.comments.set([...comments]);
        this.loadingReplies.set({});
      }
    });

    this.socketService.onLikesUpdated((data: any) => {
      if (data.projectId === this.project._id) {
        this.project.likes = [...(data.likes || this.project.likes || [])];
        this.likeCount = typeof data.totalLikes === 'number' ? data.totalLikes : this.project.likes.length;
        this.isLiked = this.project.likes.some((like: any) => like?.toString?.() === this.currentUserId || like === this.currentUserId);
      }
    });
  }

  
  getValidComments() {
    return this.comments().filter(c => c._id);
  }

 
  getValidReplies(comment: any) {
    return (comment.replies || []).filter((r: any) => r._id);
  }

  async addComment(){
    if (!localStorage.getItem('token')) {
      alert('Please login first to add a comment');
      this.router.navigate(['/']);
      return;
    }

    this.inputDataComponent.clear()
    const { InputData } = await import('../input-data/input-data');
    const componentRef = this.inputDataComponent.createComponent(InputData);
    
    // Listen for the actual comment object and prepend it instantly
    componentRef.instance.commentAdded.subscribe((newComment: any) => {
      if (newComment && newComment._id) {
        // Prepend new comment to the list for instant UI update
        this.comments.update((current) => [newComment, ...current]);
      }
      this.inputDataComponent.clear();
    });
  }

 
  toggleReplyInput(commentId: string | undefined) {
    if (!commentId) return;
    const key = `reply-${commentId}`;
    const current = this.expandedReplies();
    const nextValue = !current[key];
    this.expandedReplies.set({ ...current, [key]: nextValue });
    if (!nextValue) {
      const currentTexts = this.replyTexts();
      this.replyTexts.set({ ...currentTexts, [key]: '' });
    }
  }

  addReply(commentId: string | undefined) {
    if (!localStorage.getItem('token')) {
      alert('Please login first to add a reply');
      this.router.navigate(['/']);
      return;
    }

    if (!commentId) {
      alert('Invalid comment');
      return;
    }
    const key = `reply-${commentId}`;
    const replyText = this.replyTexts()[key]?.trim();

    if (!replyText) {
      alert('Reply cannot be empty');
      return;
    }

    // Optimistic update: add reply immediately
    const comment = this.comments().find(c => c._id === commentId);
    if (comment) {
      comment.replies.push({
        _id: 'temp-' + Date.now(),
        user: { _id: this.currentUserId } as any,
        text: replyText,
        createdAt: new Date()
      });
      this.comments.set([...this.comments()]);
    }

    // Set loading state
    this.loadingReplies.set({ ...this.loadingReplies(), [key]: true });
    const startTime = Date.now();

    this.projectService.addReply(this.project._id, commentId, replyText).subscribe({
      next: (response: any) => {
        console.log('Reply added:', response);
        // Ensure minimum loading duration (300ms)
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 300 - elapsed);

        setTimeout(() => {
          // Update the comment with the new reply from server when available
          const comment = this.comments().find(c => c._id === commentId);
          const serverReplies = response?.comment?.replies;

          if (comment && Array.isArray(serverReplies)) {
            comment.replies = [...serverReplies];
            this.comments.set([...this.comments()]);
          }

          this.replyTexts.set({ ...this.replyTexts(), [key]: '' });
          this.expandedReplies.set({ ...this.expandedReplies(), [key]: false });
          this.loadingReplies.set({ ...this.loadingReplies(), [key]: false });
        }, delay);
      },
      error: (error) => {
        console.error('Error adding reply:', error);
        alert('Failed to add reply');
        // Revert optimistic update on error
        if (comment) {
          comment.replies = comment.replies.filter(r => !r._id?.startsWith('temp-'));
          this.comments.set([...this.comments()]);
        }
        // Ensure minimum loading duration (300ms)
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 300 - elapsed);

        setTimeout(() => {
          // Clear loading state
          this.loadingReplies.set({ ...this.loadingReplies(), [key]: false });
        }, delay);
      }
    });
  }

  toggleEditReply(commentId: string | undefined, replyId: string | undefined) {
    if (!commentId || !replyId) return;
    const key = `edit-${commentId}-${replyId}`;
    const currentEditing = this.editingReplyId();
    const currentTexts = this.editReplyTexts();
    if (currentEditing[commentId] === replyId) {
      this.editingReplyId.set({ ...currentEditing, [commentId]: null });
      const nextTexts = { ...currentTexts };
      delete nextTexts[key];
      this.editReplyTexts.set(nextTexts);
    } else {
      this.editingReplyId.set({ ...currentEditing, [commentId]: replyId });
      // Find and populate the reply text for editing
      const comment = this.comments().find(c => c._id === commentId);
      if (comment) {
        const reply = comment.replies.find(r => r._id === replyId);
        if (reply) {
          this.editReplyTexts.set({ ...currentTexts, [key]: reply.text });
        }
      }
    }
  }

  updateReply(commentId: string | undefined, replyId: string | undefined) {
    if (!localStorage.getItem('token')) {
      alert('Please login first to update a reply');
      this.router.navigate(['/']);
      return;
    }

    if (!commentId || !replyId) {
      alert('Invalid comment or reply');
      return;
    }
    const key = `edit-${commentId}-${replyId}`;
    const updatedText = this.editReplyTexts()[key]?.trim();

    if (!updatedText) {
      alert('Reply cannot be empty');
      return;
    }

    // Optimistic update: update reply immediately
    const comment = this.comments().find(c => c._id === commentId);
    const reply = comment?.replies.find(r => r._id === replyId);
    const originalText = reply?.text;
    if (reply) {
      reply.text = updatedText;
      this.comments.set([...this.comments()]);
    }

    // Set loading state
    const loadingKey = `reply-${replyId}`;
    this.loadingReplies.set({ ...this.loadingReplies(), [loadingKey]: true });
    const startTime = Date.now();

    this.projectService.editReply(this.project._id, commentId, replyId, updatedText).subscribe({
      next: (response: any) => {
        console.log('Reply updated:', response);
        // Ensure minimum loading duration (300ms)
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 300 - elapsed);

        setTimeout(() => {
          // Confirm update (already done optimistically)
          this.editingReplyId.set({ ...this.editingReplyId(), [commentId!]: null });
          const nextTexts = { ...this.editReplyTexts() };
          delete nextTexts[key];
          this.editReplyTexts.set(nextTexts);
          // Clear loading state
          this.loadingReplies.set({ ...this.loadingReplies(), [loadingKey]: false });
        }, delay);
      },
      error: (error) => {
        console.error('Error updating reply:', error);
        alert('Failed to update reply');
        // Revert optimistic update on error
        if (reply && originalText) {
          reply.text = originalText;
          this.comments.set([...this.comments()]);
        }
        // Ensure minimum loading duration (300ms)
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 300 - elapsed);

        setTimeout(() => {
          // Clear loading state
          this.loadingReplies.set({ ...this.loadingReplies(), [loadingKey]: false });
        }, delay);
      }
    });
  }

  deleteReply(commentId: string | undefined, replyId: string | undefined) {
    if (!localStorage.getItem('token')) {
      alert('Please login first to delete a reply');
      this.router.navigate(['/']);
      return;
    }

    if (!commentId || !replyId) {
      alert('Invalid comment or reply');
      return;
    }
    if (!confirm('Are you sure you want to delete this reply?')) {
      return;
    }

    // Optimistic update: remove reply immediately
    const comment = this.comments().find(c => c._id === commentId);
    const deletedReply = comment?.replies.find(r => r._id === replyId);
    if (comment) {
      comment.replies = comment.replies.filter(r => r._id !== replyId);
      this.comments.set([...this.comments()]);
    }

    // Set loading state
    const loadingKey = `reply-${replyId}`;
    this.loadingReplies.set({ ...this.loadingReplies(), [loadingKey]: true });
    const startTime = Date.now();

    this.projectService.deleteReply(this.project._id, commentId, replyId).subscribe({
      next: (response: any) => {
        console.log('Reply deleted:', response);
        // Ensure minimum loading duration (300ms)
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 300 - elapsed);

        setTimeout(() => {
          // Clear loading state
          this.loadingReplies.set({ ...this.loadingReplies(), [loadingKey]: false });
        }, delay);
      },
      error: (error) => {
        console.error('Error deleting reply:', error);
        alert('Failed to delete reply');
        // Revert optimistic update on error
        if (comment && deletedReply) {
          comment.replies.push(deletedReply);
          this.comments.set([...this.comments()]);
        }
        // Ensure minimum loading duration (300ms)
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 300 - elapsed);

        setTimeout(() => {
          // Clear loading state
          this.loadingReplies.set({ ...this.loadingReplies(), [loadingKey]: false });
        }, delay);
      }
    });
  }

  toggleEditComment(commentId: string | undefined) {
    if (!commentId) return;
    const currentEditing = this.editingCommentId();
    const currentTexts = this.editCommentText();
    if (currentEditing === commentId) {
      this.editingCommentId.set(null);
      const nextTexts = { ...currentTexts };
      delete nextTexts[commentId];
      this.editCommentText.set(nextTexts);
    } else {
      this.editingCommentId.set(commentId);
      const comment = this.comments().find(c => c._id === commentId);
      if (comment) {
        this.editCommentText.set({ ...currentTexts, [commentId]: comment.text });
      }
    }
  }

  updateComment(commentId: string | undefined) {
    if (!localStorage.getItem('token')) {
      alert('Please login first to update a comment');
      this.router.navigate(['/']);
      return;
    }

    if (!commentId) {
      alert('Invalid comment');
      return;
    }

    const updatedText = this.editCommentText()[commentId]?.trim();
    if (!updatedText) {
      alert('Comment cannot be empty');
      return;
    }

    const comment = this.comments().find(c => c._id === commentId);
    const originalText = comment?.text;
    if (comment) {
      comment.text = updatedText;
      this.comments.set([...this.comments()]);
    }

    this.loadingComments.set({ ...this.loadingComments(), [commentId]: true });
    const startTime = Date.now();

    this.projectService.editComment(this.project._id, commentId, updatedText).subscribe({
      next: (response: any) => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 300 - elapsed);

        setTimeout(() => {
          this.editingCommentId.set(null);
          const nextTexts = { ...this.editCommentText() };
          delete nextTexts[commentId];
          this.editCommentText.set(nextTexts);
          this.loadingComments.set({ ...this.loadingComments(), [commentId]: false });
        }, delay);
      },
      error: (error) => {
        console.error('Error updating comment:', error);
        alert('Failed to update comment');
        if (comment && originalText) {
          comment.text = originalText;
          this.comments.set([...this.comments()]);
        }
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 300 - elapsed);

        setTimeout(() => {
          this.loadingComments.set({ ...this.loadingComments(), [commentId]: false });
        }, delay);
      }
    });
  }

  deleteComment(commentId: string | undefined) {
    if (!localStorage.getItem('token')) {
      alert('Please login first to delete a comment');
      this.router.navigate(['/']);
      return;
    }

    if (!commentId) {
      alert('Invalid comment');
      return;
    }

    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    const originalComments = [...this.comments()];
    
    this.comments.set(this.comments().filter(c => c._id !== commentId));

    this.loadingComments.set({ ...this.loadingComments(), [commentId]: true });
    const startTime = Date.now();

    this.projectService.deleteComment(this.project._id, commentId).subscribe({
      next: (response: any) => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 300 - elapsed);

        setTimeout(() => {
          this.loadingComments.set({ ...this.loadingComments(), [commentId]: false });
        }, delay);
      },
      error: (error) => {
        console.error('Error deleting comment:', error);
        alert('Failed to delete comment');
        this.comments.set(originalComments);
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 300 - elapsed);

        setTimeout(() => {
          this.loadingComments.set({ ...this.loadingComments(), [commentId]: false });
        }, delay);
      }
    });
  }

  isCurrentUserComment(userId: string | undefined): boolean {
    if (!userId) return false;
    return userId === this.currentUserId;
  }
}
