Validation Report Module (UI Design)

Location in product:

Project → Reports → Data Validation Report

Each project has its own reports.

Example:

Projects
   └ Claims_837
        └ Reports
              └ Validation Reports
1️⃣ Report Overview Panel (Top Summary)

This is the executive summary.

Use large metric cards.

Cards:

• Total Files Processed
• Files Passed Validation
• Files Failed
• Warnings Detected
• SNIP Violations

Example layout

---------------------------------------------------
Files Processed | Passed | Failed | Warnings | SNIP
---------------------------------------------------

Each card clickable → opens filtered view.

Color system

Green → Passed
Red → Failed
Yellow → Warning

2️⃣ File-Level Validation Table

Shows each processed file.

Columns:

File Name
File Type (EDI / XML / JSON / CSV)
Processing Timestamp
Status
Error Count
SNIP Violations

Example:

File Name        Type    Status   Errors  SNIP
claim_104.edi    EDI     Failed   12      3
claim_105.xml    XML     Passed   0       0

Clicking a file opens detailed validation breakdown.

3️⃣ Granular Error Explorer (Core Feature)

When a file is opened, display a multi-level structured view.

Hierarchy

File
 └ Loop
      └ Segment
           └ Element

Example UI:

ISA Loop
   GS Segment
      ST Segment
         ST02 Element → Error
Error Details Panel

When selecting an element error, show details:

Error ID
Error Message
SNIP Level
Segment Name
Element Name
Position in File
Expected Value
Actual Value

Example

Error ID: VAL-203
SNIP Level: 3
Segment: CLM
Element: CLM01
Error Message: Claim Number Missing
Expected: Non-null value
Actual: NULL
4️⃣ Non-Technical Summary (BA Friendly)

Above the technical section include simple explanations.

Example:

Issue Summary

3 claims are missing claim numbers.
2 segments contain invalid date format.
1 member ID does not match expected pattern.

This helps BA / BPaaS teams quickly understand issues.

5️⃣ Error Heatmap Visualization

A simple visual showing where errors occur most often.

Example:

Segment      Errors
CLM          ███████
NM1          ███
REF          ██

This helps identify systematic mapping issues.

6️⃣ Report Export Panel

Users should export reports easily.

Buttons:

Download PDF
Download CSV
Download JSON

PDF should be human readable.

JSON should be machine readable.

7️⃣ Custom Data Export Builder (Very Important Feature)

Allow users to define which fields go to database.

UI Section:

Custom Export Configuration

Fields selection interface.

Example UI:

Select fields to export:

[ ] File Name
[ ] Claim Number
[ ] Error ID
[ ] Error Message
[ ] SNIP Level
[ ] Segment
[ ] Element
JSON Structure Designer

Allow user to configure JSON structure.

Example UI mapping:

Field Mapping

ClaimNumber → claim_id
ErrorMessage → error_message
SNIPLevel → snip_level

Allow:

Custom field names
Hardcoded values
Data type selection

Example configuration

claim_id : string
error_count : integer
status : "FAILED"

Generated JSON preview:

{
  "claim_id": "12345",
  "error_message": "Claim Number Missing",
  "snip_level": 3,
  "status": "FAILED"
}

Backend will use this config to push to DB.

8️⃣ CSV Output Builder (Downstream Integration)

Some downstream systems require CSV.

Provide CSV Structure Designer.

Example UI:

Column Name      Source Field
Claim_ID         CLM01
Error_Message    ErrorMessage
SNIP_Level       SNIPLevel

Preview output:

Claim_ID,Error_Message,SNIP_Level
12345,Claim Number Missing,3

User can reorder columns.

9️⃣ ACK Sending Panel

Inside report window add Acknowledgement actions.

Buttons:

Send 997 ACK
Send 999 ACK
Send Custom ACK

Show status:

ACK Sent
ACK Pending
ACK Failed

🔟 Archival Options Panel

Allow report archival.

Destinations:

S3
FSx
Local Storage

Example UI:

Archive Destination

[✓] S3
[ ] FSx
[ ] Local

Destination URI:
s3://flowbridge/reports/claims_project/
Suggested Layout
-------------------------------------------------------
Report Summary
-------------------------------------------------------

File Validation Table

-------------------------------------------------------

File Details Panel
   ├ Error Explorer
   ├ Technical Error Details
   └ Business Friendly Summary

-------------------------------------------------------

Export Options
   ├ PDF
   ├ CSV
   ├ JSON

-------------------------------------------------------

Custom Export Builder
CSV Builder

-------------------------------------------------------

ACK Sending Panel
Archival Options
UX Principles for This Screen

Keep it:

• structured
• searchable
• filterable
• readable by non-technical users

Add:

Search errors
Filter by SNIP level
Filter by segment
Filter by file

Very Powerful Enhancement (Later)

Add "AI Error Explanation".

Example:

Error: CLM01 Missing

AI Explanation:
This claim record does not contain a claim identifier.
Check upstream system or mapping logic.

This feature can significantly help BPaaS teams resolve issues faster.