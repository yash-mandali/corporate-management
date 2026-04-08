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

the main change i need is hr can't generate current month payroll you know payroll is generated after month 
so make a functionality like if current month 4 then hr generate march payroll, and also add validation like hr can generaete payroll in first 10 days of month, ex> if hr generate march payroll then it can generate only till to 10 april, after 10 april mkae status is locked, so if status is locked then hr can't generete payroll anymore.

```markdown

In payroll detail model, in deductin section add leave deductions(value get from getAllPayrollByMonth api response)

in leave summery section use

in payroll detail model, in earning section remove otherallowance and use allowance (value get from getAllPayrollByMonth api response)

-total taken leave (value get from this api: 'https://localhost:44346/api/Leave/getMyLeaves?id=16' takae a length of this response )

-approvedleave  (value get from this api: https://localhost:44346/api/Leave/getUserLeaveBalance?userId=16', you get usedleavebalance in response so do total of all data usedleavebalance) 

-unpaid leave (value get from generatepayroll api response)

-remaining/current leave balance (value get from https://localhost:44346/api/Leave/getUserLeaveBalance?userId=16,you get remainingleavebalance in response so do total of all data remainingleavebalance)

-days present ( value get from 'https://localhost:44346/api/Attendance/getByUserId?Id=16', get total length of data )

-days absent(for this you need to calculate in frontend,above you get total present days so first of all get a current month ex.4, get total days of current month now from this month remove all saturday,sunday count, now only you need to minus present days from remaining days so you can get absent days)

i am giveing my all api response

```

```markdown

'https://localhost:44346/api/Leave/getMyLeaves?id=16'

response::

[

  {

    "leaveRequestId": 1,

    "userId": 16,

    "managerId": 0,

    "userName": null,

    "requestType": "Annual Leave",

    "fromDate": "2026-04-09T00:00:00",

    "toDate": "2026-04-10T00:00:00",

    "totalDays": 2,

    "session": "Full Day",

    "reason": "hello",

    "handoverTo": "",

    "status": "Approved",

    "appliedOn": "2026-04-07T15:05:47.98"

  },

  {

    "leaveRequestId": 2,

    "userId": 16,

    "managerId": 0,

    "userName": null,

    "requestType": "Sick Leave",

    "fromDate": "2026-04-10T00:00:00",

    "toDate": "2026-04-13T00:00:00",

    "totalDays": 4,

    "session": "Full Day",

    "reason": "aefrtttt",

    "handoverTo": "",

    "status": "Approved",

    "appliedOn": "2026-04-07T15:06:04.427"

  },

  {

    "leaveRequestId": 3,

    "userId": 16,

    "managerId": 0,

    "userName": null,

    "requestType": "Emergency",

    "fromDate": "2026-04-09T00:00:00",

    "toDate": "2026-04-09T00:00:00",

    "totalDays": 0.5,

    "session": "Half Day",

    "reason": "ertyr",

    "handoverTo": "",

    "status": "Approved",

    "appliedOn": "2026-04-07T15:06:18.213"

  },

  {

    "leaveRequestId": 4,

    "userId": 16,

    "managerId": 0,

    "userName": null,

    "requestType": "Unpaid Leave",

    "fromDate": "2026-04-15T00:00:00",

    "toDate": "2026-04-17T00:00:00",

    "totalDays": 3,

    "session": "Full Day",

    "reason": "reeeeerwev",

    "handoverTo": "",

    "status": "Approved",

    "appliedOn": "2026-04-07T15:06:32.85"

  }

]

```





```markdown

https://localhost:44346/api/Leave/getUserLeaveBalance?userId=16

response:

[

  {

    "leavebalanceId": 2,

    "userId": 16,

    "leavetype_Id": 1,

    "totalLeaveBalance": 12,

    "usedLeaveBalance": 2,

    "remainingLeaveBalance": 10,

    "balance_year": 2026

  },

  {

    "leavebalanceId": 8,

    "userId": 16,

    "leavetype_Id": 2,

    "totalLeaveBalance": 8,

    "usedLeaveBalance": 4,

    "remainingLeaveBalance": 4,

    "balance_year": 2026

  },

  {

    "leavebalanceId": 14,

    "userId": 16,

    "leavetype_Id": 3,

    "totalLeaveBalance": 5,

    "usedLeaveBalance": 0.5,

    "remainingLeaveBalance": 4.5,

    "balance_year": 2026

  },

  {

    "leavebalanceId": 20,

    "userId": 16,

    "leavetype_Id": 4,

    "totalLeaveBalance": 5,

    "usedLeaveBalance": 0,

    "remainingLeaveBalance": 5,

    "balance_year": 2026

  }

]



```





```markdown



https://localhost:44346/api/Payroll/getAllPayrollByMonth?month=3

{

  "message": "payroll data",

  "data": [

    {

      "payrollId": 4,

      "userId": 15,

      "salaryStructureId": 8,

      "userName": "jahil bhai",

      "month": 3,

      "year": 2026,

      "basicSalary": 50000,

      "allowances": 22000,

      "grossSalary": 72000,

      "pf": 6000,

      "taxDeduction": 100,

      "unpaidLeaveDays": 0,

      "leaveDeduction": 0,

      "totalDeductions": 6100,

      "netSalary": 65900,

      "status": "Generated",

      "generatedDate": "2026-04-07T15:29:37.713"

    }

  ]

}

```
https://localhost:44346/api/Attendance/getByUserId?Id=16
response::
[
  {
    "aId": 33,
    "userId": 16,
    "managerId": 0,
    "date": "2026-04-06T00:00:00",
    "day": "Monday",
    "checkIn": "11:39:33.8633333",
    "checkOut": "23:00:00",
    "hours": "11:21",
    "isCheckIn": true,
    "isCheckOut": true,
    "status": "Late",
    "createdOn": "2026-04-06T11:39:33.863"
  },
  {
    "aId": 32,
    "userId": 16,
    "managerId": 0,
    "date": "2026-04-04T00:00:00",
    "day": "Saturday",
    "checkIn": "12:43:47.1733333",
    "checkOut": "23:00:00",
    "hours": "10:17",
    "isCheckIn": true,
    "isCheckOut": true,
    "status": "Late",
    "createdOn": "2026-04-04T12:43:47.177"
  },
  {
    "aId": 30,
    "userId": 16,
    "managerId": 0,
    "date": "2026-04-03T00:00:00",
    "day": "Friday",
    "checkIn": "14:16:18.4300000",
    "checkOut": "23:00:00",
    "hours": "08:44",
    "isCheckIn": true,
    "isCheckOut": true,
    "status": "Present",
    "createdOn": "2026-04-03T14:16:18.43"
  },
  {
    "aId": 29,
    "userId": 16,
    "managerId": 0,
    "date": "2026-03-30T00:00:00",
    "day": "Monday",
    "checkIn": "11:21:53.8833333",
    "checkOut": "23:00:00",
    "hours": "11:39",
    "isCheckIn": true,
    "isCheckOut": true,
    "status": "Present",
    "createdOn": "2026-03-30T11:21:53.883"
  },
  {
    "aId": 28,
    "userId": 16,
    "managerId": 0,
    "date": "2026-03-26T00:00:00",
    "day": "Thursday",
    "checkIn": "10:57:28.4033333",
    "checkOut": "23:00:00",
    "hours": "12:03",
    "isCheckIn": true,
    "isCheckOut": true,
    "status": "Present",
    "createdOn": "2026-03-26T10:57:28.403"
  },
  {
    "aId": 20,
    "userId": 16,
    "managerId": 0,
    "date": "2026-03-25T00:00:00",
    "day": "Wednesday",
    "checkIn": "10:12:39.8100000",
    "checkOut": "18:10:33.9900000",
    "hours": "07:58",
    "isCheckIn": true,
    "isCheckOut": true,
    "status": "Present",
    "createdOn": "2026-03-25T10:12:39.81"
  },
  {
    "aId": 17,
    "userId": 16,
    "managerId": 0,
    "date": "2026-03-24T00:00:00",
    "day": "Tuesday",
    "checkIn": "10:20:17.8900000",
    "checkOut": "23:00:00",
    "hours": "12:40",
    "isCheckIn": true,
    "isCheckOut": true,
    "status": "Present",
    "createdOn": "2026-03-24T10:20:17.89"
  },
  {
    "aId": 15,
    "userId": 16,
    "managerId": 0,
    "date": "2026-03-23T00:00:00",
    "day": "Monday",
    "checkIn": "10:28:48.2633333",
    "checkOut": "23:00:00",
    "hours": "12:32",
    "isCheckIn": true,
    "isCheckOut": true,
    "status": "Present",
    "createdOn": "2026-03-23T10:28:48.263"
  },
  {
    "aId": 12,
    "userId": 16,
    "managerId": 0,
    "date": "2026-03-20T00:00:00",
    "day": "Friday",
    "checkIn": "10:37:54.9433333",
    "checkOut": "23:00:00",
    "hours": "12:23",
    "isCheckIn": true,
    "isCheckOut": true,
    "status": "Present",
    "createdOn": "2026-03-20T10:37:54.943"
  },
  {
    "aId": 10,
    "userId": 16,
    "managerId": 0,
    "date": "2026-03-19T00:00:00",
    "day": "Thursday",
    "checkIn": "10:34:13.1966667",
    "checkOut": "14:57:28.3433333",
    "hours": "04:23",
    "isCheckIn": true,
    "isCheckOut": true,
    "status": "Present",
    "createdOn": "2026-03-19T10:34:13.197"
  },
  {
    "aId": 9,
    "userId": 16,
    "managerId": 0,
    "date": "2026-03-18T00:00:00",
    "day": "Wednesday",
    "checkIn": "10:21:04.0133333",
    "checkOut": "18:38:05.9466667",
    "hours": "08:17",
    "isCheckIn": true,
    "isCheckOut": true,
    "status": "Present",
    "createdOn": "2026-03-18T10:21:04.013"
  },
  {
    "aId": 8,
    "userId": 16,
    "managerId": 0,
    "date": "2026-03-17T00:00:00",
    "day": "Tuesday",
    "checkIn": "10:12:41.4066667",
    "checkOut": "23:00:00",
    "hours": "12:48",
    "isCheckIn": true,
    "isCheckOut": true,
    "status": "Present",
    "createdOn": "2026-03-17T10:12:41.407"
  },
  {
    "aId": 7,
    "userId": 16,
    "managerId": 0,
    "date": "2026-03-16T00:00:00",
    "day": "Monday",
    "checkIn": "10:23:32.7933333",
    "checkOut": "18:53:00.7000000",
    "hours": "08:30",
    "isCheckIn": true,
    "isCheckOut": true,
    "status": "Present",
    "createdOn": "2026-03-16T10:23:32.793"
  },
  {
    "aId": 6,
    "userId": 16,
    "managerId": 0,
    "date": "2026-03-13T00:00:00",
    "day": "Friday",
    "checkIn": "10:21:15.2000000",
    "checkOut": "23:00:00",
    "hours": "12:39",
    "isCheckIn": true,
    "isCheckOut": true,
    "status": "Present",
    "createdOn": "2026-03-13T10:21:15.2"
  },
  {
    "aId": 4,
    "userId": 16,
    "managerId": 0,
    "date": "2026-03-12T00:00:00",
    "day": "Thursday",
    "checkIn": "11:01:05.9866667",
    "checkOut": "14:48:20.1833333",
    "hours": "03:47",
    "isCheckIn": true,
    "isCheckOut": true,
    "status": "Present",
    "createdOn": "2026-03-12T11:01:05.987"
  },
  {
    "aId": 3,
    "userId": 16,
    "managerId": 0,
    "date": "2026-03-11T00:00:00",
    "day": "Wednesday",
    "checkIn": "13:39:05.9333333",
    "checkOut": "23:00:00",
    "hours": "09:21",
    "isCheckIn": true,
    "isCheckOut": true,
    "status": "Present",
    "createdOn": "2026-03-11T13:39:05.933"
  },
  {
    "aId": 1,
    "userId": 16,
    "managerId": 0,
    "date": "2026-03-10T00:00:00",
    "day": "Tuesday",
    "checkIn": "18:54:38.8766667",
    "checkOut": "18:54:46.2533333",
    "hours": "00:00",
    "isCheckIn": true,
    "isCheckOut": true,
    "status": "Present",
    "createdOn": "2026-03-10T18:54:38.877"
  }
]


====================
<!-- portfolio prompt -->
-in admin page in reccent inquiries show top 3 inquires.
=========================
in payroll detail model , leaves summery section in total leaves taken show taken leaves per month like if hr genertae payroll for march then show only that leaves that leave applied in march, same as approved/used leaves count total approved leaves at perticular month,

on click of generate and generateAll payroll open a popum model for conformation,

