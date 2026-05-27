

import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterLink
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ScrollingModule } from '@angular/cdk/scrolling';

import {
  projectTemplate,
  PaginatedProjectsResponse
} from '../../services/Projects/projectTemplate';

@Component({
  selector: 'app-all-projects',
  standalone:true,
  imports: [CommonModule, FormsModule, RouterLink, ScrollingModule],
  templateUrl: './all-projects.html',
  styleUrl: './all-projects.css',
})
export class AllProjects implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly onboardingStorageKey = 'devhub.onboarding.complete';

  projects: projectTemplate[] = [];
  searchQuery = '';
  showOnboarding = false;

  loading:boolean = true;
  pageLoading = false;
  errorMessage = '';
  itemsPerRow = 3;

  // Pagination
  currentPage = 1;
  pageSize = 12;
  totalPages = 1;
  paginationData: PaginatedProjectsResponse | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit()  {
    this.updateItemsPerRow();
    this.showOnboarding = localStorage.getItem(this.onboardingStorageKey) !== 'true';

    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationStart && this.isDashboardUrl(event.url)) {
        this.pageLoading = !this.loading;
        this.errorMessage = '';
      }

      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.pageLoading = false;
      }

      if (event instanceof NavigationError) {
        this.errorMessage = 'Projects could not be loaded.';
      }
    });

    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      const resolvedProjects = data['projectsData'] as PaginatedProjectsResponse | undefined;
      if (!resolvedProjects) {
        this.loading = false;
        this.pageLoading = false;
        this.errorMessage = 'Projects could not be loaded.';
        return;
      }

      this.applyProjectsResponse(resolvedProjects);
      this.syncSearchFromUrl();
      this.loading = false;
      this.pageLoading = false;
      this.errorMessage = '';
    });
  }

  onSearch() {
    this.goToPage(1);
  }

  nextPage() {
    if (this.canNextPage()) {
      this.goToPage(this.currentPage + 1);
    }
  }

  prevPage() {
    if (this.canPrevPage()) {
      this.goToPage(this.currentPage - 1);
    }
  }

  canNextPage(): boolean {
    return !this.pageLoading && (this.paginationData?.pagination.hasNextPage ?? false);
  }

  canPrevPage(): boolean {
    return !this.pageLoading && (this.paginationData?.pagination.hasPrevPage ?? false);
  }

  @HostListener('window:resize')
  onResize() {
    this.updateItemsPerRow();
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

  private updateItemsPerRow() {
    const width = window.innerWidth;
    if (width < 640) {
      this.itemsPerRow = 1;
    } else if (width < 1024) {
      this.itemsPerRow = 2;
    } else {
      this.itemsPerRow = 3;
    }
  }

  private goToPage(page: number) {
    this.pageLoading = true;
    const search = this.searchQuery.trim();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page,
        search: search || null,
      },
    }).then((navigated) => {
      if (!navigated) {
        this.pageLoading = false;
      }
    }).catch(() => {
      this.pageLoading = false;
      this.errorMessage = 'Projects could not be loaded.';
    });
  }

  private syncSearchFromUrl() {
    this.searchQuery = this.route.snapshot.queryParamMap.get('search') || '';
  }

  private isDashboardUrl(url: string): boolean {
    return url.startsWith('/dashboard') || url.startsWith('/dashbord');
  }

  private applyProjectsResponse(response: PaginatedProjectsResponse) {
    this.paginationData = response;
    this.projects = response.data || [];
    this.currentPage = response.pagination?.page || 1;
    this.totalPages = response.pagination?.totalPages || 1;
  }

  dismissOnboarding() {
    this.showOnboarding = false;
  }

  completeOnboarding() {
    localStorage.setItem(this.onboardingStorageKey, 'true');
    this.showOnboarding = false;
  }

}
