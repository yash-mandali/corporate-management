<!-- ============portfolio prompt design============== -->
now i want to jut for check add bulb animations,
add on top corner one bulb with thred, when user pull thred thenturnon bulb and spred yello light like a sun reflection it looks better but use minor yellow reflection, add only in leptop screen not in mobile or tablet

==================================

solve this issues:
-in this  when i give tax reduxtion value and when i try to generate payroll then it still considerd as 0
-month not change on click of prevmonth and next month
-when i use signal in prevmonth and nextmonth then after generating payroll then still i show generate button insted of actions buttons like show and delete payroll
-on delete payroll open conformation delete model
-make popup model scrollable
-in salary setup section casually value changing keep disabled, user can see only, on click of update make it writable/editable
-Build a working implementation using my backend APIs in such a way that the code looks professional and optimized.

========================

me aa table me leave type ni limit api che 
ex, annaul leave ni limit 112 days che have mare evu banavu che ke jo user leave request karsee etle eni entry leave request table ma padse have check karvanu ke user e jo annaul leave ni request kare to check karvanu ke jo user annual leave ni request kare to e pela balance jove jo balance hase to j leave lai sakse, have suppose leave 2 days mi che to total balance 12 mathi 2 minus thia jase to have remianig leave 10 che to aa concept use karvanu che ane aa functionality badha user mate apply karvani che kem ke badha user requset karta hoy, badha user ni leave limits to same j hase je leave type table ma me apeliche pan badha nu leave balance alag has to apde user ne user an table ni id thi access kari skiye to avu banavu che to na mate ek leave balance karine table banaavu che

========================

-now i want to make valiaton like hr can generate payroll only after finish month so month have full data,
ex, if now current april started so hr can only generate march payroll only and between first 10 days like 1 to 10 data,
can't generate more previous month payroll like january,february only see as a history

=========================

Q: When April starts, which months should HR be able to generate payroll for?
A: Only March (the just-finished month)

Q: What happens after the 10-day window (Apr 11+)?
A: March payroll locked, but admin can override

Q: Where should this validation live?
A: Both — SP throws error + Angular disables the button

===========================

using stored procedure takes input value form users like userid, leavetypeid, and used leaves
make validatoin like userid exists in user table, leavetypeid exists in leavetype table, takes total leaved value from leavetupe table that have default_balance column. and auto calculate reminng leave from total leaves and used leaves. and execute this

leavetype id 3 have 5 default balance so make validation if user enter more than 5 used leaves then give error, 
<!-- now i have null value entry in leavetype table with record unpaid leave that supports unlimited leave so for this you don;t need to calaulate any   -->

this is my leave request page now in this i want some validations 
-in from date uer cant select before today data. ex, today 4 april so user can't select 2,3 april
-same in to date user can't select to date before from date. ex, from date is 4 april ten user can't enter 2,3 april in to date,
 and user can enter only to date only 2 month later like i select 4 april in from date so in to date user can select only till 4 june that has 2 month gap,
- make validation in both form date and to date, like user can't enter date that day have saturday or sunday
-when user select session half day then show only one date liek in from date select 10 april so in to date user can select only 10 april. in from date user cn select any date

=======================

now, in this leaverequest table when user take a leave then data get in leaverequest table,
so i need to make leave balance validation like if user take a sick leave so according to my leavebalance rules i have an limit to take a sick leave 5 in a year,
means user can take only 5 sick leave in a year,so when userr take a sick leaveof 3 days then sick leave balnce reduce 3 so remaining balance of user is 2, 
so sccording to this i want to set leave balance per leave type for all users like,
Annual Leave -	12.00
Sick Leave -8.00
Emergency-5.00
Comp Of-5.00
Unpaid Leave-NULL

so this is my leave criteria, so how to achive this,
all, users use this same leave balance but all  user can take leave according to their choice and need, so their used and remaining leave balance is different from each other, 
so i need to add this functionality so i deduct a leave charge at payroll time

===========

i don't want to make this for singlae user, i have an workflow like when user register then it data stored inn my users table with its UserId,
so now i want to make stored procedure that checks the users table and if new users added then automatically add their leavebalance data,

ok, hear i have users with role so in my plateform i have assigned role using RoleId
1-Admin
2-Employee
3-Manager
4-HR
so i want to set only for employee,manager and hr leave balance, not set leave balance for admin,

ok now users leavebalnce set, now chellenging is how to set deduction like userid 16 take and annual leave for 2 days so how to deduct leave balance from userleavebalance table,and verify if status is Approved then deduct leave balance
create sps so i can make apis of these to integrate in frontend

here i face an issue, here my emergency leave balance is 5 but when user make emergency leave request for 10 days then leave approved and in databse userleavebalance table i got value of remaining balance is -5, so this is wrong when user make request out of leave balance limit the shoow error
========================

this is my payroll table and stored procedure for generate payroll,
in this i want to calculate deduct balance of unpaid leave

Per Day Salary = Monthly Salary ÷ Total Days in Month (or Working Days)
Leave Deduction = Per Day Salary × Unpaid Leave Days

when hr generate payroll then auto calculate this 
you can take unpaid leave balance of perticular user using this querie,
select sum(TotalDays) as unpaidleaves from LeaveRequests where userid=16 and RequestType = 'Unpaid Leave',
do this

======================

in frontend user can see all details that you can used after generate payroll
when hr view details after generate payroll then take leave related data from leavebalance api,
in approved leaves sum of all type of usedleavebalance,
in leave balance change to remaining leave balance and in this sum of all type of remainingleavebalance

use less code prefere apis

==========================

In payroll detail model, in deductin section add leave deductions(value get from getAllPayrollByMonth api response)
in leave summery section use
in payroll detail model, in earning section remove otherallowance and use allowance (value get from getAllPayrollByMonth api response)

-total taken leave (value get from this api: 'https://localhost:44346/api/Leave/getMyLeaves?id=16' takae a length of this response )

-approvedleave  (value get from this api: https://localhost:44346/api/Leave/getUserLeaveBalance?userId=16', you get usedleavebalance in response so do total of all data usedleavebalance) 

-unpaid leave (value get from generatepayroll api response)

remaining/current leave balance (value get from https://localhost:44346/api/Leave/getUserLeaveBalance?userId=16,you get remainingleavebalance in response so do total of all data remainingleavebalance)

days present ( value get from 'https://localhost:44346/api/Attendance/getByUserId?Id=16', get total length of data )

days absent(for this you need to calculate in frontend,above you get total present days so first of all get a current month ex.4, get total days of current month now from this month remove all saturday,sunday count, now only you need to minus present days from remaining days so you can get absent days)

i am giveing my all api response

====================================

in open job detail mode data overlap on other component so didn't visible properly so make it scrollable.
when i open pipline tab then it dosen't fit in screen so fix it and make it responsive.
and pipeline tab is looking god or required?
use another ui for see candidated per jobs, i given you api for getcandidatebyjobid so you can get applicants of perticular job.
also use another ui for pipline tab
and for changing applicant status don't use like dropdown for changing status it looks simple and unproffesioanl so make it more proffesional and with ux,  use default apis, after i'll give you apis then you need to change only apis
===================================

here i have an isuue file uploded succesfully, but according to system hr need to see applied candidates resumes on portal,
HR should see/download resumes in UI
you given everywhere moce stages of applicant status, this is not looking good.
you get resumeurl in my getcandidatebyjobid api response

=======================================

i am working on creating a hrms portal in .net core and angular,  four roles employee,hr,manager,admin in portal,facilities like checkin,checkout, take leave, submit daily timesheet, payroll, recruitment .
i have this all facilities, now in this i face an issue like if employee can take an leave or checkin/checkout, approve timesheet or many
other facilities, if employeee do then if hr open portal then hr can see these updateds, therwise not, so it is not a good thing and production ready, 
so i think we cam add email service for all functionalities so hr,manager,admin can get updates quickly, 
here also one issue for all facilities many email service i need to create so what the way to fix it.

=======================================

i want to make notification system like if users checkin then manager,hr and admin recives notification,
if employee apply leave then manager,hr,admin ercives notification, whn timeshhet submit then receive notification, if hr approve leave then employee recives notification, if hr post job then manager,employee receives notification, and many thingd that need updates to all roles, so how to achive it.    

=====================================
chatgpt context prompt for notification related 

“I’m building HRMS with .NET Core + Dapper + Stored Procedures.
I’ve implemented recruitment, leave, file upload, and notifications.”

=====================================================================================

notification functionality added in:(tested)
checkin, checkout, take leave, managerapprove/managerReject/hrReject/hrApprove leaves, submit/approve/reject timesheet, publish/open/onhold/closed job, generatePayroll, MarkAspaid,

(without tested)
generatepayroll, markAsPaid

changes needed in codes::
take leave -- only assigned manager can notified  -- done
ManagerRejectLeave -- only perticular employee can get notified  --done

===================

========================
open job claud prompt::notused
in this when i put job onhold then i saw publish job button , but according to hrms afte onhold saw resume job status,open or publish bith status are same but publish job first time, and open job called after onhold job,
so add resume button when job on hold,when hr click on resume job then after show all actoins button like after publishing a job.

===============
✔️ Recommended Flow
Employee applies for leave
🔔 Notify Manager
Manager approves/rejects
🔔 If approved → Notify HR
🔔 If rejected → Notify Employee
HR reviews (final approval step)
🔔 Notify Employee (final status)
🔔 Optionally notify Manager (for visibility)

==========================================
-show only top latest  10 notifications only and show only unread notification, if user mark as read then it not shows,so basically show latest ten notification those IsRead=0
- on click of markallread  i have api ->   markAllAsRead(userId: number) {
    return this.http.put(`${this.markAllAsReadApi}?UserId=${userId}`, {});
  }
-so use this and enable markall read functionality.

ok, i need some change
notification unread hse to notiiation tab ma batavse bhale game e date ni hoy pan after markasread or markallasread karya pachi aajno divas notification tab ma batava joi  like ex. 16april nu=i notification marka s read kari to e notificatoin tab ma batavse only on 16 april, on 17 april it not visible in notification tab,

here i got css issue read notification shows dot and side vertical line ,according to design after  markasread remove dot and side linne
================================