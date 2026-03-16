Figma AI Prompt

Project Name: Nexus Pipeline v4.0
Product Type: Enterprise EDI Logistics Engine
Goal: Create a premium MVP web application UI that visualizes the full lifecycle of EDI data pipelines from Validation to S3 Archival.

Design the interface as a futuristic enterprise control center with glassmorphism, neon emerald highlights, and high-end SaaS dashboard aesthetics.

The UI should feel comparable in quality to dashboards built by companies like Stripe, Vercel, and Linear.

Design System
Theme

Quantum Emerald

Color Palette

Primary Background
Slate 900
#0F172A

Primary UI White
#FFFFFF

Neon Emerald Accent
#10B981

Emerald Glow
#34D399

Soft Glass Overlay
rgba(255,255,255,0.08)

Border Gray
#E5E7EB

Error Red
#EF4444

Success Emerald
#10B981

Archive Blue
#3B82F6

UI Style

Design Language:

• Futuristic glassmorphism
• Neon glow highlights
• Soft shadows
• Rounded containers
• Orbital geometry elements
• Smooth motion animations

Container style:

Border radius
48px (3rem)

Glass effect:

blur background

transparent overlay

soft neon border glow

Typography

Headers
Space Grotesk

Body Text
Inter

Data Identifiers
JetBrains Mono

Use monospace for:

EDI paths

mapping rules

batch identifiers

S3 URIs

Layout Structure

Use Auto Layout everywhere.

Responsive grid:

Desktop width:
1440 – 1600px

Sidebar:

80px width

Main dashboard:

Fluid responsive layout

Spacing system:

8px grid system

Navigation Sidebar

Vertical navigation panel.

Width:
80px

Background:
Slate 900

Icons glow neon emerald on hover.

Menu items:

Home (Core Node)

Operations

BA Logic Center

Developer Mapping

Pipeline History

Settings

Each menu item uses icon + tooltip.

Icons should resemble those from Lucide.

Active item:

glass highlight + neon emerald border.

Screen 1 — Core Node Landing Page

Create a dramatic immersive landing experience.

Center of the screen contains the Core Node.

The Core Node is a circular interface element.

Features:

• Large circular button
• Label: Initialize Pipeline
• Pulsing neon emerald glow
• Rotating concentric rings
• Small orbiting particle dots

The rings rotate slowly in opposite directions.

When clicked:

Trigger pipeline activation animation.

Processing Animation

When a pipeline is running, show a futuristic data pipeline flow visualization.

Background becomes darker.

Glass panel appears with processing stages.

Stages appear horizontally:

Validation → Translation → Downstream Delivery → S3 Archival

Each stage is represented by a glowing circular node.

State indicators:

Waiting
Gray outline

Processing
Neon emerald pulsing glow

Completed
Solid emerald checkmark

Failed
Red indicator

Connect nodes with animated data lines.

Floating EDI identifiers move through the pipeline.

Examples:

ISA > GS > ST > BHT > CLM

Identifiers use JetBrains Mono font.

Screen 2 — Operations Dashboard

Purpose: Monitor real-time pipeline operations.

Layout divided into 3 panels.

Left Panel — Batch Queue

Scrollable batch list.

Each batch card contains:

Batch ID
Partner name
Timestamp
File count
Status indicator

Status colors:

Processed = Emerald
Failed = Red
Archived = Blue
Processing = Neon emerald glow

Cards have subtle hover lift animation.

Center Panel — Pipeline Journey Visualizer

A horizontal processing pipeline.

Stages:

Validation
Translation
Downstream
S3 Archival

Each stage card displays:

processing duration
records processed
status icon

Data lines animate between nodes.

Glass container background.

Right Panel — Node Path Data Table

Display structured EDI path data.

Columns:

Batch ID
EDI Path
Mapping Logic
S3 URI
Status

Example row:

Batch: B-1042

EDI Path:
ISA > GS > ST > BHT

Mapping Logic:
837 Professional Claim

S3 URI:
s3://nexus-pipeline/archive/837/batch-1042.json

Use monospace font for paths and URIs.

Screen 3 — BA Logic Center

Workspace designed for Business Analysts.

This screen should be mostly white.

Color balance:

80% white
15% soft gray
5% neon emerald accents

Layout:

Two panels.

Left Panel — Mapping Spec Editor

Looks like structured spreadsheet.

Columns:

Source Field
Target Field
Transformation Logic
Description

Example row:

ISA06 → SenderID → trim()

Provide toolbar above table.

Toolbar buttons:

Download Excel Spec

Upload Spec

Generate Technical Mapping

Buttons:

white background + emerald border.

Right Panel — Technical Mapping Preview

Displays JSON mapping generated from BA rules.

Example:

{
  "ISA06": "sender_id",
  "ISA08": "receiver_id",
  "CLM01": "claim_number"
}

Display inside glass code container.

Monospace formatting.

Screen 4 — Developer Mapping Pane

Dark developer workspace.

Background:

Slate 900

Full width IDE style panel.

Features:

JSON editor

Syntax validation indicator.

Green check if valid.

Red underline if invalid.

Bottom action area:

Commit Logic

Deployment animation appears after click.

Deployment stages:

Uploading
Validating
Deploying
Active

Each stage shows progress indicator.

Animation System

Use subtle motion effects.

Core Node rotation

Pipeline data flow

Neon glow pulsing

Glass shimmer

Hover lift animations

Processing animation should resemble data traveling through a neural network.

Component Library

Create reusable components:

GlassCard

PipelineNode

StatusChip

BatchCard

MappingTableRow

CodeEditorPanel

DeployButton

NavigationIcon

All components should be built using Auto Layout.

Developer Handoff Requirements

Design components so they easily translate to:

React components

TypeScript props

Tailwind CSS classes

Use consistent naming conventions such as:

PipelineNodeCard

BatchQueueItem

MappingSpecTable

DeployActionButton

Responsiveness

Design layouts for:

Desktop (primary)

Tablet

Large displays

Use fluid containers and scalable grids.

Deliverables

Create clickable prototype for:

Core Node landing page

Operations dashboard

BA Logic Center

Developer Mapping IDE

The interface should feel like a premium enterprise pipeline control system with futuristic emerald glass aesthetics.