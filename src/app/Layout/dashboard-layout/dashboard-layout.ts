import { Component, inject } from '@angular/core';
import { Sidebar } from "../../components/sidebar/sidebar";
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EmployeeService } from '../../services/employee-service';
import { RouterOutlet } from '@angular/router';
import { Header } from "../../components/header/header";

@Component({
  selector: 'app-dashboard-layout',
  imports: [CommonModule, ReactiveFormsModule, RouterOutlet, Sidebar, Header],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css',
})
export class DashboardLayout {
  emp = inject(EmployeeService);
}
