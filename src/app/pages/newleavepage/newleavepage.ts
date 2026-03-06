import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ɵInternalFormsSharedModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Authservice } from '../../services/Auth-service/authservice';
import { LeaveService } from '../../services/leave-service/leave-service'
import { ToastrService } from 'ngx-toastr';
import { Backbtn } from "../../components/backbtn/backbtn";

@Component({
  selector: 'app-newleavepage',
  imports: [ɵInternalFormsSharedModule, ReactiveFormsModule, Backbtn],
  templateUrl: './newleavepage.html',
  styleUrl: './newleavepage.css',
})
export class Newleavepage {
  leaveForm!: FormGroup;
  message = signal('');
  userid = signal<null | any>(null);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: Authservice,
    private leaveService: LeaveService,
    private toast: ToastrService,
    
  ) { }

  ngOnInit() {
    const userId = this.auth.getUserId()
    console.log(userId);
    this.userid.set(userId);

    this.leaveForm = this.fb.group({
      UserId: [this.userid(), Validators.required],
      requestType: ['', Validators.required],
      fromDate: ['', Validators.required],
      toDate: ['', Validators.required],
      session: ['', Validators.required],
      reason: ['', Validators.required],
      handoverTo: ['']
    })
  }

  submitLeave() {
    const data = this.leaveForm.value;
    console.log(data);
    if (this.leaveForm.invalid) {
      console.log("invalid from"); 
      this.toast.error("Please fill in all required fields.");
      return;
    } else {
      this.leaveService.createNewLeave(data).subscribe({
        next: res => {
          this.message.set(res.message);
          this.toast.success(this.message() || "Request submitted successfully!");
          this.leaveForm.reset();
          this.router.navigate(['/dashboard/Leavepage'])
        },
        error: err => {
          this.message.set(err.error.message)
          this.toast.error(this.message() || "Network Error")
        }
      })
    }
  }

  goBack() {
    this.router.navigate(['/dashboard/Leavepage']);
  }
  reset() {
    this.leaveForm.reset();
  }
}
