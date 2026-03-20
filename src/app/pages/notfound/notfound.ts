import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  templateUrl: './notfound.html',
  styleUrl: './notfound.css',
})
export class Notfound {
  constructor(private location: Location) { }

  goBack() {
    this.location.back();
  }
}