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