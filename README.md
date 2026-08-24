# NetSage Advisor

Build a complete, functional web application called NetSage AI.

This is a real academic project for Applied AI + Network Troubleshooting. It is NOT a simple UI prototype.

The application is an AI-assisted troubleshooting helper for Cisco Packet Tracer/networking lab problems.

==================================================

CORE PURPOSE
==================================================

A user should be able to enter:

Network troubleshooting symptom

Topology notes

Device information

Cisco show-command outputs

Additional notes

NetSage AI should analyze the information and produce a structured troubleshooting diagnosis containing:

Root cause

Confidence

OSI layer

Evidence from the provided show-command output

Next Cisco command to run

Fix steps

Severity

Concept/issue type

Every AI diagnosis MUST require human review before being considered final.

The reviewer must be able to:

Accept

Edit

Reject

the AI diagnosis.

Do NOT automatically mark AI diagnoses as accepted.

==================================================
2. TECHNOLOGY

Use:

React

TypeScript

Vite

Tailwind CSS

Supabase for database/storage where appropriate

Secure server-side functions for AI API calls

Modular reusable components

Keep the code clean and understandable because students will continue developing it manually.

Do NOT put secret API keys in frontend code.

Use environment variables/secrets for API keys.

==================================================
3. APPLICATION PAGES

Create these main pages:

Dashboard

New Diagnosis

Cases

Diagnosis Details

Rule Checker

Human Review

Responsible AI Log

Settings/API Configuration

Use a persistent sidebar navigation.

==================================================
4. DASHBOARD

Create a real dashboard based on stored case/review data.

Display:

Total cases

Cases diagnosed

Accepted diagnoses

Edited diagnoses

Rejected diagnoses

AI-human agreement rate

Number of corrected AI diagnoses

Show issue distribution for:

VLAN

Gateway

DHCP

DNS

Routing

ACL

NAT

Wireless

Include:

Issue-type chart

Severity chart

Review-status chart

Recent troubleshooting cases table

IMPORTANT:

Dashboard numbers must be calculated from actual stored data.

Do NOT generate random statistics.

==================================================
5. NEW DIAGNOSIS

Create a form with:

Case ID
Symptom
Topology Notes
Device Information
Show Command Output
Additional Notes

Example:

Symptom:
"PC gets an IP address but cannot reach a server in VLAN 30. Gateway ping works."

Topology:
"PC → Access Switch → Router → Server"

Show output:

show ip route
show access-lists
show interfaces trunk

Add a large:

"Diagnose Network Issue"

button.

==================================================
6. AI DIAGNOSIS

When the user submits a case, send the information to a secure backend AI function.

The AI must return structured JSON.

Use this exact logical schema:

{
"root_cause": "",
"confidence": 0,
"osi_layer": "",
"evidence": [],
"next_command": "",
"fix_steps": [],
"severity": "",
"concept": ""
}

The application must validate the AI response before displaying it.

If the AI returns invalid JSON or missing required fields:

Show an error

Do not pretend the diagnosis succeeded

Allow the user to retry

==================================================
7. AI PROMPT

Use a strict system prompt similar to:

"You are NetSage AI, a Cisco networking troubleshooting assistant.

Analyze only the information and evidence provided by the user.

Do not invent show-command output.

Identify the most likely network fault.

Use actual evidence from the supplied show-command output.

If the evidence is insufficient, explicitly state that additional evidence is required.

Recommend the next Cisco command that would help confirm the diagnosis.

Return ONLY valid JSON using this structure:

{
root_cause: string,
confidence: number,
osi_layer: string,
evidence: string[],
next_command: string,
fix_steps: string[],
severity: string,
concept: string
}

Confidence must be between 0 and 100.

Do not claim certainty when the evidence is insufficient."

Include 2–3 worked examples in the prompt so the model learns the expected format.

==================================================
8. DIAGNOSIS RESULT PAGE

Display the AI result clearly.

Sections:

AI Diagnosis

Root Cause
Confidence
OSI Layer
Severity
Concept

Evidence

Show the exact evidence used by the AI.

Next Command

Show the recommended Cisco command.

Fix Steps

Display the recommended steps in order.

Add a warning:

"AI-generated diagnosis — human review required."

Then provide:

Accept
Edit
Reject

buttons.

==================================================
9. HUMAN REVIEW

The reviewer must be able to review every AI diagnosis.

Options:

ACCEPTED
EDITED
REJECTED

If EDITED or REJECTED is selected:

Require a review comment explaining the correction/rejection.

Store:

Case ID

AI diagnosis

Review decision

Human correction

Review comment

Reviewer

Timestamp

Never overwrite the original AI diagnosis.

Keep the original AI response and the human-reviewed result separately.

==================================================
10. RESPONSIBLE AI LOG

Create a dedicated page showing AI mistakes/corrections.

Display:

Case ID
Original AI Diagnosis
Human Decision
Human Correction
Reason
Final Diagnosis
Timestamp

The project requires at least 5 cases where AI was corrected by a human.

Add a counter:

"Corrected AI Cases: X / 5"

Make it easy to identify cases where:

AI was edited
AI was rejected

==================================================
11. CASE MANAGEMENT

Create a Cases page.

Each case should contain:

Case ID

Symptom

Topology

Show output

Expected fault

OSI layer

Concept

Severity

AI diagnosis

Human review status

Allow filtering by:

Issue type
Severity
Review status

Add search.

The application must be designed to accept at least 30 troubleshooting cases.

Do NOT hard-code the application around one sample case.

==================================================
12. CASE DATA

Initially include a small number of clearly labeled demonstration cases so the application can be tested.

Create the database/schema so that our team can later import the actual 30+ cases supplied separately.

Do not invent that the demonstration cases are real collected lab cases.

Provide a way to add/import cases.

The required issue categories are:

VLAN

Gateway

DHCP

DNS

Routing

ACL

NAT

Wireless

==================================================
13. RULE CHECKER

Create a real Rule Checker module.

The project requires deterministic checks for common configuration mistakes.

The checker should be architected separately from the AI.

Support these checks:

Duplicate IP addresses

Wrong subnet masks

Gateway mismatch

Interface down

Missing VLAN

Missing routes

The checker should return structured results such as:

{
"check": "",
"status": "PASS | FAIL | WARNING",
"evidence": "",
"explanation": ""
}

IMPORTANT:

Do not fake deterministic checks.

Implement actual deterministic logic where possible.

Keep the checker modular so additional network checks can be added later.

==================================================
14. PYTHON RULE CHECKER

The project specification specifically requires a Python script for deterministic checks.

Therefore:

Create a Python backend/service/module for the rule checker.

It should eventually receive relevant network configuration/show output and perform deterministic checks.

The frontend should communicate with this backend securely.

Do not place Python logic inside the React frontend.

If the current Lovable environment cannot directly execute Python, clearly separate the interface/API contract so that the Python checker can be connected later without rewriting the frontend.

==================================================
15. DATABASE

Create a proper database schema for:

cases
diagnoses
reviews
rule_check_results
responsible_ai_logs

Relationships should preserve:

Case
→ AI Diagnosis
→ Rule Check
→ Human Review
→ Final Result

Do not destroy previous AI results when a human edits them.

==================================================
16. REAL DATA BEHAVIOR

Do NOT use:

Random statistics

Fake changing numbers

Fake AI responses presented as real AI

Fake review records

Fake success messages

If an external AI API is not configured, clearly show:

"AI service not configured."

Provide a configuration mechanism using environment variables.

==================================================
17. ERROR HANDLING

Handle:

Empty inputs

Invalid AI responses

API errors

Database errors

Network errors

Missing show output

Insufficient evidence

Show useful error messages.

Never silently fail.

==================================================
18. SECURITY

Never expose AI API keys in browser/client code.

Use server-side functions/environment secrets.

Validate user input.

Do not execute arbitrary Cisco commands.

The application only analyzes text/show-command output.

==================================================
19. UI DESIGN

Create a professional network-engineering dashboard.

Style:

Dark navy/charcoal base

Subtle blue accent

White/light text

Clean cards

Clear tables

Professional charts

Good spacing

Responsive layout

Avoid:

Neon cyberpunk

Excessive gradients

Fake futuristic AI effects

Excessive animations

The application should look like a real network operations/troubleshooting tool.

==================================================
20. DEMONSTRATION CASE

Include this demonstration case:

Symptom:
"PC gets an IP address but cannot reach a server in VLAN 30; gateway ping works."

Expected reasoning:

"Likely inter-VLAN routing or ACL issue at Layer 3/4. Next commands: show ip route, show access-lists, show interfaces trunk. Confidence should be medium until route/ACL evidence is shown."

This is only a demonstration case.

==================================================
21. IMPORTANT PROJECT REQUIREMENTS

The final application must support the project requirements:

At least 30 troubleshooting cases

Multiple network fault types

Evidence-based AI responses

Deterministic Python checks

Human review

Accepted/Edited/Rejected review states

At least 5 corrected AI cases

Dashboard

Responsible AI log

Demonstration workflow

==================================================
22. DEVELOPMENT REQUIREMENT

Build the application incrementally but make the current version functional.

Do NOT create placeholder buttons that do nothing.

Every visible button should either:

perform its intended action,

navigate to a working page,

or clearly state that the required integration is not configured.

After implementing the application, test the main user flow:

New Diagnosis
→ AI Diagnosis
→ Rule Check
→ Human Review
→ Save Review
→ Dashboard update
→ Responsible AI Log update

Fix any runtime, TypeScript, database, or UI errors you encounter.

At the end, provide a concise explanation of:

Project structure

Database schema

AI integration

Rule checker architecture

How to configure the AI API

How to add/import the 30+ cases

How to run/test the application

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8e824715-2ace-4c95-8742-e91d91360b9e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
