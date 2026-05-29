import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loader.component.html',
  styles: [`
    .loader-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.4);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .loader-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  `]
})
export class LoaderComponent {
  constructor(public loadingService: LoadingService) {}
}
