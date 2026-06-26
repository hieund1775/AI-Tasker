# NEW SPECIFICATION SYSTEM SPECIFICATION DOCUMENT: AI-TASKER

This document specifies the complete new business flow for the **AI-Tasker** platform (a freelance marketplace for artificial intelligence solutions), reshaping project decomposition, project execution workflows, and dispute resolution to optimize the user experience and secure escrow funds.

---

## CHAPTER 1: WORK BREAKDOWN STRUCTURE (WBS) BY USE CASE (4 LEVELS)

The AI-Tasker system transitions entirely to a **Use-Case-Driven** model. All operations from job posting, bidding, and scheduling to execution and acceptance run under the following strict hierarchical structure:

$$\text{Project} \rightarrow \text{Use Cases (Defined by Client)} \rightarrow \text{Tasks (Decomposed by Expert)} \rightarrow \text{MiniTasks (Detailed Checklist)}$$

1. **Project**: The overall project created by the Client based on business needs.
2. **Use Cases**: The list of standardized use cases defined by the Client from requirements documents.
3. **Tasks**: Technical milestones proposed by the Expert under each Use Case to realize that Use Case (Experts cannot modify or delete the Client's original Use Cases).
4. **MiniTasks**: The smallest checklist units under each Task for the Expert to check off and report daily progress.

---

## CHAPTER 2: DETAILED PROJECT LIFECYCLE (5 PHASES)

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client
    actor Expert as Expert
    actor Admin as Admin
    participant DB as AITasker DB / System
    participant Escrow as Escrow (Project Funds)

    %% Phase 1
    Note over Client, DB: Phase 1: AI Initialization & WBS
    Client->>DB: Upload BRD/SRS & Post Job
    DB->>DB: AI scans file, auto-decomposes into Use Cases & Original Timeline
    Client->>DB: Configure Total Deadline (>= Total original timeline)

    %% Phase 2
    Note over Client, Expert: Phase 2: Dynamic Bidding & Pricing
    Expert->>DB: View original Use Cases, add Tasks & MiniTasks under them
    Expert->>DB: Fill completion days & price for each Task (Roll-up)
    alt Use Case Time Deviation < 0 (exceeded limit)
        DB-->>Expert: Red alert & ask for confirmation to request Client extension
    end
    Expert->>DB: Submit Proposal
    loop 7-day Countdown
        Note over DB: Auto-timer background execution
        DB-->>Client: Day 6: Dispatch urgent reminder to process proposal
        alt Day 7: Client has not processed
            DB->>DB: Auto-cancel proposal (Set status to Expired/Rejected)
        end
    end

    %% Phase 3
    Note over Client, Escrow: Phase 3: Hiring & Escrow
    Client->>DB: Accept Expert's Proposal
    DB->>Escrow: Fund escrow using Price & Time proposed by Expert
    DB->>DB: Archive original JobPost (Status: Done, block new applications)

    %% Phase 4
    Note over Client, Expert: Phase 4: Execution & Milestone Acceptance
    Expert->>DB: Mark 100% MiniTasks completed (Status: Checklist Completed)
    alt Flow 1: Quick Accept
        Client->>DB: Click Quick Accept -> Task becomes DONE
    alt Flow 2: Product Requested
        Client->>DB: Click Request Product -> Wait state on Client UI
        DB-->>Expert: Unlock Submit Product button
        Expert->>DB: Fill Product Link/File -> Status: Waiting for Approval
        Client->>DB: View Product -> Open Modal -> Verification
        alt Choice A: Accept
            Client->>DB: Click Accept -> Task becomes DONE
        else Choice B: Decline
            Client->>DB: Click Decline -> Enter feedback -> REWORK (Orange status)
            DB-->>Expert: Unlock Submit Product to re-submit new work
        end
    end

    %% Phase 5
    Note over Client, Escrow: Phase 5: Final Delivery & Release Payment
    Note over Expert, Client: All Tasks/Use Cases reach DONE status
    Expert->>DB: Submit Work (Upload Project Link & compressed source code archive)
    DB->>DB: Project changes status to Final Product Submitted
    Client->>DB: Click View Final Work -> Open verification modal
    Client->>DB: Click Accept Final Delivery inside modal
    Client->>DB: Click Release Payment on dashboard
    DB->>Escrow: Release EscrowBalance to Expert's Available Balance
    DB->>DB: Project closed successfully (Status: Completed)
```

### PHASE 1: JOBPOST INITIALIZATION BY AI AND USE CASE METRICS
- **Posting a Job (Client)**: When creating a job posting (`JobPost`), the Client can upload a requirements document (BRD/SRS). The system's AI automatically scans the file and decomposes it into a list of standardized `Use Cases`.
- **Set Original Parameters**: Each Use Case contains a list of specific tasks/requirements and a mandatory original timeline limit (e.g., Use Case 1 needs at most 14 days).
- **Total Time Calculation Rule**:
  - The system automatically calculates:
    $$\text{Total Original Time} = \sum \text{Time of each Use Case}$$
  - The Client can configure a Total Deadline for the `JobPost` under the strict validation rule:
    $$\text{Total Deadline} \ge \text{Total Original Time}$$

### PHASE 2: DYNAMIC BIDDING (PROPOSAL COUPLING) & 7-DAY EXPIRATION COUNTDOWN
1. **Expert Technical Analysis & Bidding**:
   - The Expert views the job posting, using the Client's Use Cases as the mandatory standard (no permission to edit or delete the Client's original Use Cases).
   - Under each Use Case, the Expert adds technical `Tasks` (milestones) and `MiniTasks` (detailed checklists).
   - The Expert enters completion days and price for each Task. The system automatically rolls up (**Roll-up**) these values to calculate the total bid price and total bid timeline.
   - **Time Deviation Logic Check for each Use Case**:
     $$\text{Deviation} = \text{Client Original Duration} - \text{Expert Proposed Duration}$$
     - If **Deviation $\ge$ 0**: Submit the proposal normally.
     - If **Deviation < 0** (Exceeding Client's limit): The system displays a red warning. The Expert must click a confirmation indicating they agree to request a timeline extension from the Client before they are allowed to submit.
2. **Auto-Cancellation and Reminders for Overdue Proposals (7-day mark)**:
   - The system runs an automated background timer starting from the proposal submission time:
     - **Day 6 (Reminder)**: If the Client has not processed the proposal, the system sends an urgent notification: *"You have a proposal from [Expert Name] expiring tomorrow. Please process it immediately before the system auto-cancels it."*
     - **Day 7 (Auto-Cancel)**: If the Client remains silent, the proposal status shifts to `expired` or `rejected`. The application is returned, allowing the Expert to apply to other jobs.

### PHASE 3: RECRUITMENT & ESCROW ACCORDING TO PROPOSED PARAMS
- **Accept Proposal**: The Client accepts the Expert's structured `Proposal`.
- **Actual Escrow Funding**: The total amount deposited into the escrow account (`escrowBalance` / Funds in Escrow) and the project timeline are determined **EXACTLY by the Price and Timeline proposed by the Expert**, replacing the Client's original configurations.
- **Archive JobPost**: After successful escrow funding, the original `JobPost` remains in the Client's All Projects list with the status **Done** (Hired) to store history, and application features are locked for all other Experts.

### PHASE 4: WORK EXECUTION & MILESTONE (TASK) ACCEPTANCE
In the workspace, the manual "Submit for Review" button without evidence is entirely removed. The acceptance flow is completely evidence-driven:
1. **Expert checks off 100% of MiniTasks** $\rightarrow$ Status changes to: **Checklist Completed**.
2. **Client Processing Options**:
   - **Flow 1 (Quick Accept)**: The Client clicks the **Quick Accept** button $\rightarrow$ The Task instantly transitions to **DONE** without requiring file uploads.
   - **Flow 2 (Inspect Deliverables)**:
     - The Client clicks **Request Product** $\rightarrow$ The Client's screen shifts to a static message: *"Waiting for Expert to submit product..."*.
     - The **Submit Product** button unlocks on the Expert's side.
     - The Expert fills in the Product Link and attaches the Product File $\rightarrow$ Status changes to **Waiting for Approval**.
     - On the Client's side, the **View Product** button lights up. Clicking it opens a Modal to inspect the work:
       - **Accept (Choice A)**: Click **Accept** $\rightarrow$ Task status transitions to **DONE**.
       - **Decline (Choice B)**: Click **Decline** $\rightarrow$ Displays a textarea to write decline feedback. Once submitted, the Task transitions to **REWORK (Orange color)**.
3. **Rework Status (Orange color)**:
   - When declined, the Expert's Task changes to the Rework status, styled in orange.
   - The **Submit Product** button unlocks on the Expert's side to submit updated deliverables.
   - The Client's screen displays a static waiting status message: *"Waiting for Expert to submit new product..."* with no redundant buttons.

### PHASE 5: OVERALL ACCEPTANCE & RELEASE PAYMENT (PROJECT RELEASE)
Once all Use Cases and Tasks reach the **DONE** status (overall project progress is exactly 100%):
- **Expert Side (Final Handover)**: The workspace displays the final handover section. The Expert must click **Submit Work** to attach the deployed project link and the compressed source code archive (.zip, .rar). The project status shifts to **Final Product Submitted**.
- **Client Side (Strict Payout Lock)**:
  - Initially, the outer **Release Payment** and **View Final Work** buttons are disabled.
  - Once the Expert submits $\rightarrow$ The **View Final Work** button is enabled. The Client clicks it to open the Modal to inspect the final deliverables.
  - Inside the Modal, the Client clicks **Accept Final Delivery** $\rightarrow$ The Modal closes, and the outer **Release Payment** button is enabled (active).
  - Clicking **Release Payment** $\rightarrow$ The system transfers the escrow balance into the Expert's Available Balance and closes the project as **Completed**.

---

## CHAPTER 3: STANDARDIZED REPORT & DISPUTE WORKFLOW

```mermaid
graph TD
    A[Reporter clicks Report] --> B[Submit report to Admin, status Pending]
    B --> C{What does Responder see?}
    C -->|Confidentiality| D[Responder sees nothing, project runs normally]
    C -->|Confidentiality| E[Reporter's Report button changes to: In Progress]
    
    B --> F[Admin reviews & Accepts dispute]
    F --> G[Project status changes to: Disputed]
    G --> H[Dashboard project card transitions to Dark Crimson style]
    G --> I[Responder's Report button changes to: Response to Accusation]
    
    G --> J{Workspace Freeze Decision}
    J -->|Flow 1: Client accuses Expert| K[Freeze all workspace activities - Read Only]
    J -->|Flow 2: Expert accuses Client| L[Selective Freeze: Only lock Release Payment & View Final Work for Client]
    
    K --> M[Evidence collection: Evidence Phase]
    L --> M
    M --> N[Admin clicks Request More Evidence -> Shows reply form to both sides]
    N --> O[Each party submits exactly once per request. Admin buttons locked until both submit]
    O --> P{Admin Supreme Ruling}
    
    P -->|Flow 1: Continue| Q[Project unfreezes back to Active status]
    P -->|Flow 1: Stop Project| R[Transfer 100% escrow balance to the innocent party, terminate project]
    
    P -->|Flow 2: Expert wins| S[Admin forces payout, transfers escrow to Expert wallet, close Completed]
    P -->|Flow 2: Client wins| T[Admin refunds escrow to Client wallet, close project]
```

### 1. Standardized Report Form Information (Confidentiality)
When a party clicks **Report** (next to the Manage Project or Update Project button on the Dashboard):
- **Publicly Shown Info**: Correct Full Names of Client and Expert, exact escrow balance (`escrowBalance`), and actual project start date (`Start Date`).
- **Hidden Confidential Info**: The `Project ID` (to prevent exposing system identifiers), the raw ticket status (`Status`), the `scope of work space` field, and the `other` field are entirely removed.

### 2. Admin Dispute Detail View
- **Report Content**: Displays information according to the mandatory structure: *Report Reason \*, Dispute Type \*, Detailed Description \*, Desired Resolution \*, and Evidence \* files*.
- **Parties Involved (Smart Interactive Tabs)**:
  - Displays **Client** and **Expert** tabs with premium active colors.
  - The tab of the party who raised the dispute first (Reporter) is selected by default when the page loads.
  - If the other party (Responder) has not yet submitted their counter-response, their tab displays a clean blank state with the message: *"Responder has not responded yet"*.

### 3. Dual Dispute Paths and Resolution

#### PATH 1: CLIENT ACCUSES EXPERT (Quality / Deadline Dispute)
- **Initialization**: Client submits the report. The Client's Report button changes to **In Progress**. Once the Admin accepts the dispute, this button is disabled.
- **Workspace Freezing**:
  - The project status shifts to **Disputed**.
  - **On the Dashboard**: Project cards on both Client and Expert dashboards display a dark crimson theme (Crimson-to-Black gradient) with a prominent border.
  - **Inside the Workspace**: A red banner is displayed at the top. All interactive elements are disabled (Read-Only Mode) to preserve the state of the project.
  - The Expert's Report button changes to **Phản hồi vi phạm (Response to Accusation)** to allow them to submit their defense.
- **Ongoing Evidence Submissions**:
  - If the Admin requires more information, they trigger a request $\rightarrow$ Status changes to `Awaiting Evidence`.
  - Both parties see a prompt to submit further evidence. Each side can submit **exactly once** per request round.
  - The Admin's ruling buttons are disabled until both sides have submitted their evidence. New evidence is appended to the Admin's view.
- **Admin Ruling Options**:
  - **Continue**: The project is unfrozen, returning to `Active` state for both parties to resume work.
  - **Stop Project**: The Admin determines the fault. 100% of the escrow balance (Funds in Escrow) is automatically transferred to the innocent party's wallet, and the project is terminated.

#### PATH 2: EXPERT ACCUSES CLIENT (Payment / Unreleased Escrow Dispute)
- **Initialization**: Expert submits a claim asserting that the Client is withholding payment despite project completion.
- **Selective Freezing**:
  - The project **is not** stopped, and checklist items remain active. Technical execution can continue.
  - Only the Client's financial buttons (**Release Payment** and **View Final Work**) are locked to freeze the escrow funds.
- **Cash Flow Decision**: The Admin decides the winning party:
  - **Expert Wins**: Admin triggers **Force Payout**, releasing escrow funds to the Expert's Available Balance, closing the project as `Completed`.
  - **Client Wins** (Expert submitted fraudulent or faulty work): Admin triggers **Force Refund**, returning escrow funds to the Client's wallet, terminating the project.
