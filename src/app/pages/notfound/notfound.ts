import { Component } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-not-found',
  imports: [],
  templateUrl: './notfound.html',
  styleUrl: './notfound.css',
})
export class Notfound {
  constructor(private location: Location) { }

  goBack() {
    this.location.back();
  }
}