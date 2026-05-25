

import { Component, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ScrollingModule } from '@angular/cdk/scrolling';

import {
  projectTemplate,
  realProjectTemplate
} from '../../services/Projects/projectTemplate';

@Component({
  selector: 'app-all-projects',
  standalone:true,
  imports: [CommonModule, FormsModule, RouterLink, ScrollingModule],
  templateUrl: './all-projects.html',
  styleUrl: './all-projects.css',
})
export class AllProjects implements OnInit {

  projects: projectTemplate[] = [];
  searchQuery = '';

  loading:boolean = true;
  itemsPerRow = 3;

  constructor(private route:ActivatedRoute) {}

  ngOnInit()  {
    const data:realProjectTemplate = this.route.snapshot.data['projectsData'];
    console.log(data);
    
    this.projects = data.projects;
    this.loading = false
  }

  get filteredProjects(): projectTemplate[] {
    const query = this.searchQuery.trim().toLowerCase();

    if (!query) {
      return this.projects;
    }

    return this.projects.filter((project) => this.matchesSearchQuery(project, query));
  }

  // Group filtered projects into rows for virtual scrolling
  get projectRows(): projectTemplate[][] {
    const filtered = this.filteredProjects;
    const rows: projectTemplate[][] = [];
    for (let i = 0; i < filtered.length; i += this.itemsPerRow) {
      rows.push(filtered.slice(i, i + this.itemsPerRow));
    }
    return rows;
  }

  private matchesSearchQuery(project: projectTemplate, query: string): boolean {
    const searchableFields = [
      project.title,
      project.description,
      project.liveLink,
      project.gitHubLink,
      project.tags?.join(' ')
    ];

    return searchableFields.some((field) => field?.toLowerCase().includes(query));
  }

}
