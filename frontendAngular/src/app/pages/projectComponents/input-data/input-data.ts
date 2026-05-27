import { CommonModule } from '@angular/common';
import { Component, signal, WritableSignal, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Comment } from '../../../services/Projects/projectTemplate';
import { Projects } from '../../../services/Projects/projects';

@Component({
  selector: 'app-input-data',
  imports: [CommonModule,FormsModule],
  templateUrl: './input-data.html',
  styleUrl: './input-data.css',
})
export class InputData {
  comment!:Comment;
  projectId:string = '';  
  commentText: WritableSignal<string> = signal('');
  @Output() commentAdded = new EventEmitter<any>();

  constructor(private route: ActivatedRoute, private projectService: Projects, private router: Router){}
  ngOnInit(){
    const projectData = this.route.snapshot.data['projectData'];
    this.comment = projectData.comments; 
    this.projectId = projectData.id; 
    

  }
  
isAddingComment = signal(false);

addComment() {

  if (!localStorage.getItem('token')) {
    alert('Please login first to post a comment');

    this.router.navigate(['/']);

    return;
  }

  const text = this.commentText().trim();

  if (!text) {
    return;
  }

  this.isAddingComment.set(true);

  this.projectService
    .addComment(this.projectId, text)
    .subscribe({

      next: (response: any) => {

        console.log('Comment added:', response);

        queueMicrotask(() => {
          this.commentText.set('');

          this.commentAdded.emit(response.comment || response);

          this.isAddingComment.set(false);
        });

      },

      error: (error) => {

        console.error('Error adding comment:', error);
        alert('Failed to add comment');

        this.isAddingComment.set(false);

      }

    });
}
}