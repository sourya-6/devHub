import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { addProjectTemplate, projectTemplate, realProjectTemplate } from './projectTemplate';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Projects {
  constructor(private http:HttpClient){}
  url:string = environment.backendUrl

  
  getAllProjects(page: number = 1, limit: number = 10, search?: string):Observable<realProjectTemplate>{
    let url = `${this.url}/project/?page=${page}&limit=${limit}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    return this.http.get<realProjectTemplate>(url);
  }

  createProject(projectData:addProjectTemplate):Observable<any>{
    const token = localStorage.getItem('token');
    const formData = new FormData();

    formData.append('title', projectData.title);
    formData.append('description', projectData.description);

    if (projectData.liveLink) {
      formData.append('liveLink', projectData.liveLink);
    }

    if (projectData.gitHubLink) {
      formData.append('gitHubLink', projectData.gitHubLink);
    }

    if (projectData.tags) {
      formData.append('tags', projectData.tags);
    }

    if (projectData.image) {
      formData.append('image', projectData.image);
    }

    return this.http.post(`${this.url}/project`, formData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  getProjectById(id:Number):Observable<{project:projectTemplate}>{
    const token = localStorage.getItem("token");
    return this.http.get<{project: projectTemplate}>(`${this.url}/project/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    })
  }

  toggleLike(id:string){
    const token = localStorage.getItem("token");
    return this.http.patch(`${this.url}/project/${id}/like`,{},{
      headers:{
        Authorization: `Bearer ${token}`
      }
    })
  }

  // Comment Route
  addComment(projectId:string, commentText:string):Observable<any>{
    const token = localStorage.getItem("token");
    console.log(token);
    
    return this.http.post(`${this.url}/project/${projectId}/comments`,{text:commentText},{
      headers:{
        Authorization: `Bearer ${token}`
      }
    })
  }

  // Edit Comment
  editComment(projectId:string, commentId:string, updatedText:string):Observable<any>{
    const token = localStorage.getItem("token");
    return this.http.patch(`${this.url}/project/${projectId}/comments/${commentId}`,{updatedText},{
      headers:{
        Authorization: `Bearer ${token}`
      }
    })
  }

  // Delete Comment
  deleteComment(projectId:string, commentId:string):Observable<any>{
    const token = localStorage.getItem("token");
    return this.http.delete(`${this.url}/project/${projectId}/comments/${commentId}`,{
      headers:{
        Authorization: `Bearer ${token}`
      }
    })
  }

  // Add Reply to Comment
  addReply(projectId:string, commentId:string, replyText:string):Observable<any>{
    const token = localStorage.getItem("token");
    return this.http.post(`${this.url}/project/${projectId}/comments/${commentId}/reply`,{text:replyText},{
      headers:{
        Authorization: `Bearer ${token}`
      }
    })
  }

  // Edit Reply
  editReply(projectId:string, commentId:string, replyId:string, updatedText:string):Observable<any>{
    const token = localStorage.getItem("token");
    return this.http.patch(`${this.url}/project/${projectId}/comments/${commentId}/reply/${replyId}`,{updatedText},{
      headers:{
        Authorization: `Bearer ${token}`
      }
    })
  }

  // Delete Reply
  deleteReply(projectId:string, commentId:string, replyId:string):Observable<any>{
    const token = localStorage.getItem("token");
    return this.http.delete(`${this.url}/project/${projectId}/comments/${commentId}/reply/${replyId}`,{
      headers:{
        Authorization: `Bearer ${token}`
      }
    })
  }
  
}
