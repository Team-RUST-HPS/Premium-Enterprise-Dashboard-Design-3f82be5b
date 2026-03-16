Project Name: Data Processing Engine
Product Type: Enterprise EDI Mapping & Processing Platform
Goal: Design a premium web application MVP that allows users to create EDI mapping projects, define validation and processing logic, deploy pipelines, and monitor live processing.

The UI should feel like a modern enterprise data operations platform similar in quality to dashboards built by Stripe, Vercel, and Linear.

Focus on clean minimal UI, premium design, and operational clarity.

Design System

Theme: Quantum Emerald

Primary Colors

White
#FFFFFF

Dark Background
#0F172A

Neon Emerald
#10B981

Emerald Glow
#34D399

Light Gray
#F3F4F6

Error Red
#EF4444

Visual Style

Modern enterprise dashboard.

Design characteristics:

• minimal and clean
• glassmorphism panels
• neon emerald highlights
• large rounded containers
• subtle motion animations
• premium SaaS aesthetic

Container radius
48px (3rem)

Use soft shadows and glass overlays.

Typography

Headers
Space Grotesk

Body
Inter

Technical data / code
JetBrains Mono

Monospace font should be used for:

EDI paths
mapping logic
URIs
batch IDs

Layout

Sidebar width
80px

Main workspace
fluid responsive layout

Spacing
8px grid system

Use Auto Layout everywhere for component scalability.

Sidebar Navigation

Vertical sidebar with icons.

Menu items:

Home

Projects

Mapping

Validation

Processing

Deployments

Monitoring

Reports

Settings

Icons glow neon emerald on hover.

Active menu item has glass highlight.

Screen 1 — Projects Dashboard

Purpose: show all existing mapping projects.

Top header:

Title
Projects

Right side button

Create Project

Project cards grid layout.

Each card displays:

Project Name
EDI Type (837 / 835 / 270 etc)
Last Updated
Status

Statuses:

Draft
Ready
Live
Paused

Each card has actions:

Open
Edit
Delete

Cards lift slightly on hover.

Create Project Flow

When user clicks Create Project:

Open modal wizard.

Step 1

Select BA Spec.

Display list of specification documents created by Business Analysts.

Show:

Spec Name
Version
Created Date

User selects spec.

Step 2

Create Project form.

Fields:

Project Name
Partner Name
EDI Type

Click Create Project.

Redirect user to Project Workspace.

Project Workspace

Top header:

Project Name
Environment Status

Inside the project there are tabs.

Tabs:

Mapping Logic

Validation Rules

Processing Logic

Deployment

Live Monitoring

Reports

Workspace should feel minimal, clean, and premium.

Mapping Logic Window

Purpose: visualize and define mapping between source EDI and target schema.

Layout:

Two panel interface.

Left panel

Source EDI structure tree.

Example nodes:

ISA
GS
ST
BHT
CLM

Expandable hierarchy.

Right panel

Mapping canvas.

Displays visual connections between:

Source field → Target field

Example:

ISA06 → sender_id

CLM01 → claim_number

Use lines connecting fields.

AI Mapping Suggestions

Above mapping canvas show panel titled:

AI Suggested Mappings.

Example suggestions:

ISA06 → SenderID
ISA08 → ReceiverID
CLM01 → ClaimNumber

User can click Accept Suggestion.

Mapping is automatically added.

Mapping Editor Features

• drag and drop mapping
• inline transformation rules
• preview target schema
• highlight unmapped fields

Example transformations:

trim()
substring()
dateFormat()

Temporary Draft Saving

Developers can save unfinished mapping work.

Buttons:

Save Draft
Open Draft

Drafts appear in a Draft History panel.

Developer can reopen and continue later.

Validation Rules Window

Purpose: configure validation logic.

Show toggle cards for:

SNIP 1
SNIP 2
SNIP 3
SNIP 4
SNIP 5
SNIP 6
SNIP 7

Each rule group can be enabled or disabled.

Custom Rule Builder

Provide text editor where developer writes rules.

Example rules:

CLM01 != NULL

ST02 length = 4

System converts rule into backend validation pattern.

Display preview JSON.

Processing Logic Window

Purpose: configure file processing behavior.

Sections:

File Level Processing

Options:

ISA split
GS split
ST split

Record Level Processing

Options:

Transaction grouping
Claim level split
Batch grouping

Target Schema Builder

System generates schema preview based on input EDI structure.

Display structured preview.

Deployment Window

Used when project configuration is complete.

Buttons:

Validate Project

Push to Production

Deployment animation shows stages:

Preparing Service

Building Mapping Engine

Deploying Pipeline

Service Live

Status indicator becomes Live.

Live Monitoring Dashboard

Real time processing visibility.

Pipeline stages:

Validation → Translation → Delivery

Each stage shows metrics:

files processed
failures
errors

Use animated data flow between stages.

Processing Metrics

Metric cards show:

Files Received
Files Processed
Files Failed
Errors Detected

Numbers update in real time.

Error Inspection Panel

Table listing failed files.

Columns:

Batch ID
File Name
Error Type
Error Description

Users can open detailed error logs.

Reports System

Users can generate reports.

Formats:

UI dashboard report

Downloadable PDF

Report includes:

processing summary
error summary
validation statistics
file statistics

Layout must be human readable.

Storage Options

Reports and processed data can be pushed to storage.

Supported destinations:

S3
FSx
Local archive

Example destination:

s3://flowbridge/reports/projectA/report_104.pdf

Component Library

Create reusable components:

ProjectCard

MappingCanvas

ValidationToggle

ProcessingOptionCard

DeploymentStatusPanel

MetricsCard

ReportViewer

Animation System

Use subtle motion effects.

Neon glow pulse

Pipeline data flow

Glass shimmer

Hover lift animations

Processing visualization should feel like data flowing through a neural network.

Deliverables

Create clickable prototype screens for:

Projects Dashboard

Project Creation Flow

Mapping Logic Editor

Validation Rules

Processing Logic

Deployment Panel

Live Monitoring

Reports Viewer

Developer Handoff

Design components so they can easily convert to:

React components

TypeScript props

Tailwind CSS classes