import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.css',
})
export class ThemeToggle {
  constructor(public theme: ThemeService) {}

  get isDark() {
    return this.theme.currentTheme() === 'dark';
  }

  toggle() {
    this.theme.toggleTheme();
  }
}
