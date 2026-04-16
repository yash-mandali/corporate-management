-- ═══════════════════════════════════════════════════════════
--  HR RECRUITMENT MODULE — SQL SCHEMA + STORED PROCEDURES
-- ═══════════════════════════════════════════════════════════

-- ── 1. JOB POSTINGS ────────────────────────────────────────
CREATE TABLE JobPosting (
    JobId           INT IDENTITY(1,1) PRIMARY KEY,
    Title           NVARCHAR(150)  NOT NULL,
    Department      NVARCHAR(100)  NOT NULL,
    Location        NVARCHAR(100)  NOT NULL,
    JobType         NVARCHAR(50)   NOT NULL,   -- Full-Time | Part-Time | Contract | Intern
    ExperienceLevel NVARCHAR(50)   NOT NULL,   -- Junior | Mid | Senior | Lead
    SalaryMin       DECIMAL(12,2)  NULL,
    SalaryMax       DECIMAL(12,2)  NULL,
    Description     NVARCHAR(MAX)  NULL,
    Requirements    NVARCHAR(MAX)  NULL,
    Openings        INT            NOT NULL DEFAULT 1,
    Status          NVARCHAR(30)   NOT NULL DEFAULT 'Open', -- Open | Paused | Closed
    PostedDate      DATE           NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    ClosingDate     DATE           NULL,
    CreatedBy       INT            NULL,   -- FK → Users.Id
    CreatedAt       DATETIME       NOT NULL DEFAULT GETDATE(),
    UpdatedAt       DATETIME       NOT NULL DEFAULT GETDATE()
);
GO

-- ── 2. APPLICANTS ──────────────────────────────────────────
CREATE TABLE Applicant (
    ApplicantId     INT IDENTITY(1,1) PRIMARY KEY,
    JobId           INT            NOT NULL REFERENCES JobPosting(JobId),
    FullName        NVARCHAR(150)  NOT NULL,
    Email           NVARCHAR(200)  NOT NULL,
    Phone           NVARCHAR(20)   NULL,
    ResumeUrl       NVARCHAR(500)  NULL,
    CurrentCompany  NVARCHAR(150)  NULL,
    CurrentRole     NVARCHAR(150)  NULL,
    ExperienceYears DECIMAL(4,1)   NULL,
    ExpectedSalary  DECIMAL(12,2)  NULL,
    CoverNote       NVARCHAR(MAX)  NULL,
    Stage           NVARCHAR(50)   NOT NULL DEFAULT 'Applied',
    -- Applied | Screening | Interview | Offer | Hired | Rejected
    Rating          TINYINT        NULL CHECK (Rating BETWEEN 1 AND 5),
    Notes           NVARCHAR(MAX)  NULL,
    AppliedDate     DATE           NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    UpdatedAt       DATETIME       NOT NULL DEFAULT GETDATE()
);
GO

-- ── 3. INTERVIEWS ──────────────────────────────────────────
CREATE TABLE Interview (
    InterviewId     INT IDENTITY(1,1) PRIMARY KEY,
    ApplicantId     INT            NOT NULL REFERENCES Applicant(ApplicantId),
    JobId           INT            NOT NULL REFERENCES JobPosting(JobId),
    Round           TINYINT        NOT NULL DEFAULT 1,
    InterviewType   NVARCHAR(50)   NOT NULL,  -- Phone | Video | In-Person | Technical | HR
    ScheduledDate   DATE           NOT NULL,
    ScheduledTime   TIME           NOT NULL,
    DurationMins    INT            NOT NULL DEFAULT 60,
    InterviewerName NVARCHAR(150)  NULL,
    MeetingLink     NVARCHAR(500)  NULL,
    Location        NVARCHAR(200)  NULL,
    Status          NVARCHAR(30)   NOT NULL DEFAULT 'Scheduled',
    -- Scheduled | Completed | Cancelled | No-Show
    Feedback        NVARCHAR(MAX)  NULL,
    Rating          TINYINT        NULL CHECK (Rating BETWEEN 1 AND 5),
    CreatedAt       DATETIME       NOT NULL DEFAULT GETDATE(),
    UpdatedAt       DATETIME       NOT NULL DEFAULT GETDATE()
);
GO

-- ── 4. OFFER LETTERS ───────────────────────────────────────
CREATE TABLE OfferLetter (
    OfferId         INT IDENTITY(1,1) PRIMARY KEY,
    ApplicantId     INT            NOT NULL REFERENCES Applicant(ApplicantId),
    JobId           INT            NOT NULL REFERENCES JobPosting(JobId),
    OfferDate       DATE           NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    ExpiryDate      DATE           NULL,
    OfferedSalary   DECIMAL(12,2)  NOT NULL,
    Designation     NVARCHAR(150)  NOT NULL,
    Department      NVARCHAR(100)  NOT NULL,
    JoiningDate     DATE           NULL,
    Status          NVARCHAR(30)   NOT NULL DEFAULT 'Pending',
    -- Pending | Accepted | Declined | Expired
    Notes           NVARCHAR(MAX)  NULL,
    CreatedAt       DATETIME       NOT NULL DEFAULT GETDATE(),
    UpdatedAt       DATETIME       NOT NULL DEFAULT GETDATE()
);
GO

-- ══════════════════════════════════════════════════════════
--  STORED PROCEDURES
-- ══════════════════════════════════════════════════════════

-- GET all job postings with live pipeline counts
CREATE OR ALTER PROCEDURE sp_GetAllJobPostings
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        j.*,
        COUNT(a.ApplicantId)                                        AS TotalApplicants,
        SUM(CASE WHEN a.Stage='Applied'    THEN 1 ELSE 0 END)      AS AppliedCount,
        SUM(CASE WHEN a.Stage='Screening'  THEN 1 ELSE 0 END)      AS ScreeningCount,
        SUM(CASE WHEN a.Stage='Interview'  THEN 1 ELSE 0 END)      AS InterviewCount,
        SUM(CASE WHEN a.Stage='Offer'      THEN 1 ELSE 0 END)      AS OfferCount,
        SUM(CASE WHEN a.Stage='Hired'      THEN 1 ELSE 0 END)      AS HiredCount,
        SUM(CASE WHEN a.Stage='Rejected'   THEN 1 ELSE 0 END)      AS RejectedCount
    FROM  JobPosting j
    LEFT  JOIN Applicant a ON a.JobId = j.JobId
    GROUP BY j.JobId,j.Title,j.Department,j.Location,j.JobType,j.ExperienceLevel,
             j.SalaryMin,j.SalaryMax,j.Description,j.Requirements,j.Openings,
             j.Status,j.PostedDate,j.ClosingDate,j.CreatedBy,j.CreatedAt,j.UpdatedAt
    ORDER BY j.CreatedAt DESC;
END
GO

-- CREATE job posting
CREATE OR ALTER PROCEDURE sp_CreateJobPosting
    @Title NVARCHAR(150), @Department NVARCHAR(100), @Location NVARCHAR(100),
    @JobType NVARCHAR(50), @ExperienceLevel NVARCHAR(50),
    @SalaryMin DECIMAL(12,2)=NULL, @SalaryMax DECIMAL(12,2)=NULL,
    @Description NVARCHAR(MAX)=NULL, @Requirements NVARCHAR(MAX)=NULL,
    @Openings INT=1, @ClosingDate DATE=NULL, @CreatedBy INT=NULL,
    @NewJobId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO JobPosting(Title,Department,Location,JobType,ExperienceLevel,SalaryMin,SalaryMax,Description,Requirements,Openings,ClosingDate,CreatedBy)
    VALUES(@Title,@Department,@Location,@JobType,@ExperienceLevel,@SalaryMin,@SalaryMax,@Description,@Requirements,@Openings,@ClosingDate,@CreatedBy);
    SET @NewJobId = SCOPE_IDENTITY();
END
GO

-- UPDATE job posting
CREATE OR ALTER PROCEDURE sp_UpdateJobPosting
    @JobId INT, @Title NVARCHAR(150), @Department NVARCHAR(100), @Location NVARCHAR(100),
    @JobType NVARCHAR(50), @ExperienceLevel NVARCHAR(50),
    @SalaryMin DECIMAL(12,2)=NULL, @SalaryMax DECIMAL(12,2)=NULL,
    @Description NVARCHAR(MAX)=NULL, @Requirements NVARCHAR(MAX)=NULL,
    @Openings INT=1, @Status NVARCHAR(30)='Open', @ClosingDate DATE=NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE JobPosting
    SET Title=@Title, Department=@Department, Location=@Location, JobType=@JobType,
        ExperienceLevel=@ExperienceLevel, SalaryMin=@SalaryMin, SalaryMax=@SalaryMax,
        Description=@Description, Requirements=@Requirements, Openings=@Openings,
        Status=@Status, ClosingDate=@ClosingDate, UpdatedAt=GETDATE()
    WHERE JobId=@JobId;
END
GO

-- DELETE job posting
CREATE OR ALTER PROCEDURE sp_DeleteJobPosting
    @JobId INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM OfferLetter WHERE JobId=@JobId;
    DELETE FROM Interview   WHERE JobId=@JobId;
    DELETE FROM Applicant   WHERE JobId=@JobId;
    DELETE FROM JobPosting  WHERE JobId=@JobId;
END
GO

-- GET applicants (filter by job / stage)
CREATE OR ALTER PROCEDURE sp_GetApplicants
    @JobId INT=NULL, @Stage NVARCHAR(50)=NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT a.*, j.Title AS JobTitle, j.Department
    FROM   Applicant a
    JOIN   JobPosting j ON j.JobId=a.JobId
    WHERE  (@JobId IS NULL OR a.JobId=@JobId)
    AND    (@Stage IS NULL OR a.Stage=@Stage)
    ORDER  BY a.AppliedDate DESC;
END
GO

-- CREATE applicant
CREATE OR ALTER PROCEDURE sp_CreateApplicant
    @JobId INT, @FullName NVARCHAR(150), @Email NVARCHAR(200),
    @Phone NVARCHAR(20)=NULL, @CurrentCompany NVARCHAR(150)=NULL,
    @CurrentRole NVARCHAR(150)=NULL, @ExperienceYears DECIMAL(4,1)=NULL,
    @ExpectedSalary DECIMAL(12,2)=NULL, @CoverNote NVARCHAR(MAX)=NULL,
    @NewApplicantId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Applicant(JobId,FullName,Email,Phone,CurrentCompany,CurrentRole,ExperienceYears,ExpectedSalary,CoverNote)
    VALUES(@JobId,@FullName,@Email,@Phone,@CurrentCompany,@CurrentRole,@ExperienceYears,@ExpectedSalary,@CoverNote);
    SET @NewApplicantId = SCOPE_IDENTITY();
END
GO

-- UPDATE applicant stage
CREATE OR ALTER PROCEDURE sp_UpdateApplicantStage
    @ApplicantId INT, @NewStage NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Applicant SET Stage=@NewStage, UpdatedAt=GETDATE() WHERE ApplicantId=@ApplicantId;
END
GO

-- UPDATE applicant rating
CREATE OR ALTER PROCEDURE sp_UpdateApplicantRating
    @ApplicantId INT, @Rating TINYINT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Applicant SET Rating=@Rating, UpdatedAt=GETDATE() WHERE ApplicantId=@ApplicantId;
END
GO

-- GET interviews
CREATE OR ALTER PROCEDURE sp_GetInterviews
    @FromDate DATE=NULL, @ToDate DATE=NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i.*, a.FullName AS ApplicantName, a.Email AS ApplicantEmail,
           j.Title AS JobTitle, j.Department
    FROM   Interview i
    JOIN   Applicant  a ON a.ApplicantId=i.ApplicantId
    JOIN   JobPosting j ON j.JobId=i.JobId
    WHERE  (@FromDate IS NULL OR i.ScheduledDate>=@FromDate)
    AND    (@ToDate   IS NULL OR i.ScheduledDate<=@ToDate)
    ORDER  BY i.ScheduledDate, i.ScheduledTime;
END
GO

-- CREATE interview
CREATE OR ALTER PROCEDURE sp_CreateInterview
    @ApplicantId INT, @JobId INT, @Round TINYINT=1,
    @InterviewType NVARCHAR(50), @ScheduledDate DATE, @ScheduledTime TIME,
    @DurationMins INT=60, @InterviewerName NVARCHAR(150)=NULL,
    @MeetingLink NVARCHAR(500)=NULL, @Location NVARCHAR(200)=NULL,
    @NewInterviewId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Interview(ApplicantId,JobId,Round,InterviewType,ScheduledDate,ScheduledTime,DurationMins,InterviewerName,MeetingLink,Location)
    VALUES(@ApplicantId,@JobId,@Round,@InterviewType,@ScheduledDate,@ScheduledTime,@DurationMins,@InterviewerName,@MeetingLink,@Location);
    SET @NewInterviewId = SCOPE_IDENTITY();
    -- Auto-move applicant to Interview stage
    UPDATE Applicant SET Stage='Interview', UpdatedAt=GETDATE() WHERE ApplicantId=@ApplicantId AND Stage NOT IN ('Offer','Hired','Rejected');
END
GO

-- UPDATE interview status / feedback
CREATE OR ALTER PROCEDURE sp_UpdateInterviewStatus
    @InterviewId INT, @Status NVARCHAR(30), @Feedback NVARCHAR(MAX)=NULL, @Rating TINYINT=NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Interview SET Status=@Status, Feedback=@Feedback, Rating=@Rating, UpdatedAt=GETDATE()
    WHERE InterviewId=@InterviewId;
END
GO

-- GET offer letters
CREATE OR ALTER PROCEDURE sp_GetOfferLetters
AS
BEGIN
    SET NOCOUNT ON;
    SELECT o.*, a.FullName AS ApplicantName, a.Email AS ApplicantEmail, j.Title AS JobTitle
    FROM   OfferLetter o
    JOIN   Applicant  a ON a.ApplicantId=o.ApplicantId
    JOIN   JobPosting j ON j.JobId=o.JobId
    ORDER  BY o.CreatedAt DESC;
END
GO

-- CREATE offer letter
CREATE OR ALTER PROCEDURE sp_CreateOfferLetter
    @ApplicantId INT, @JobId INT, @OfferedSalary DECIMAL(12,2),
    @Designation NVARCHAR(150), @Department NVARCHAR(100),
    @OfferDate DATE=NULL, @ExpiryDate DATE=NULL, @JoiningDate DATE=NULL,
    @Notes NVARCHAR(MAX)=NULL, @NewOfferId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    IF @OfferDate IS NULL SET @OfferDate = CAST(GETDATE() AS DATE);
    INSERT INTO OfferLetter(ApplicantId,JobId,OfferedSalary,Designation,Department,OfferDate,ExpiryDate,JoiningDate,Notes)
    VALUES(@ApplicantId,@JobId,@OfferedSalary,@Designation,@Department,@OfferDate,@ExpiryDate,@JoiningDate,@Notes);
    SET @NewOfferId = SCOPE_IDENTITY();
    UPDATE Applicant SET Stage='Offer', UpdatedAt=GETDATE() WHERE ApplicantId=@ApplicantId AND Stage NOT IN ('Hired','Rejected');
END
GO

-- UPDATE offer status
CREATE OR ALTER PROCEDURE sp_UpdateOfferStatus
    @OfferId INT, @Status NVARCHAR(30)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE OfferLetter SET Status=@Status, UpdatedAt=GETDATE() WHERE OfferId=@OfferId;
    -- If accepted → move applicant to Hired
    IF @Status = 'Accepted'
        UPDATE Applicant SET Stage='Hired', UpdatedAt=GETDATE()
        WHERE ApplicantId = (SELECT ApplicantId FROM OfferLetter WHERE OfferId=@OfferId);
END
GO