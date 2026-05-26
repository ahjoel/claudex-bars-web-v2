import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoaderComponent } from './shared/components/loader/loader.component';
import { SnackbarComponent } from './shared/components/snackbar/snackbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoaderComponent, SnackbarComponent],
  template: `
    <app-loader></app-loader>
    <app-snackbar></app-snackbar>
    <router-outlet></router-outlet>
  `,
  styles: []
})
export class App {
  title = 'claudex-bars-web-v2';
}
