import { Component } from '@angular/core';

@Component({
  selector: 'app-backbtn',
  imports: [],
  templateUrl: './backbtn.html',
  styleUrl: './backbtn.css',
})
export class Backbtn {
  goBack() {
    window.history.back();
  }
}
