import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ToastService } from '../../services/toast/toast';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.css',
})
export class ToastContainer {
  constructor(public toastService: ToastService) {}
}
