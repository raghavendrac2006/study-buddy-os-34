# My Study Compass

Build a production-quality, personal Learning OS / Personal Study Mentor web application for a single user.

This is a personal-use application designed to help me maintain consistent coding practice, prepare for aptitude and reasoning, learn technical subjects, manage study materials, plan my days, track progress, and eventually use AI as my personal mentor.

The application should be mobile-first and fully responsive, so it works beautifully on both my phone and laptop. It should also be installable as a PWA on my phone.

Do not build this as a generic LMS or multi-user education platform. It is a single-user personal productivity and learning system.

1. CORE IDEA

The application should combine the most useful parts of:

Personal study planner

Calendar

Coding practice platform

IDE/code editor

Learning management system

Notes application

Flashcards

Quiz/practice system

Pomodoro/focus timer

Progress tracker

Habit/streak tracker

Personal analytics dashboard

AI personal mentor

The main principle is:

I should open the application every day and immediately know what I need to study and what I need to do.

The application should have a concept called:

"Today's Mission"

When I open the application, it should show me:

Today's date

Current study streak

Total study time

Today's subjects

Today's planned topics

Today's coding problem

Aptitude/reasoning practice

Pending tasks

Upcoming deadlines

Progress toward current learning goals

A large "Start Today's Study" button

2. SUBJECT MANAGEMENT

Create a Subject Management system.

Examples:

Java

Python

Data Structures & Algorithms

Aptitude

Logical Reasoning

Quantitative Aptitude

DBMS

Operating Systems

Computer Networks

Machine Learning

Artificial Intelligence

Any future subject I add

Each subject should have:

Name

Description

Icon

Color

Category

Difficulty

Start date

Target completion date

Total planned days

Current day

Progress percentage

Completed topics

Pending topics

Study materials

Practice questions

Notes

Flashcards

Study history

I should be able to create, edit, delete, archive and reorder subjects.

3. LEARNING PLAN / DAY-WISE CURRICULUM

I should be able to create a structured learning plan.

Example:

Java → 30-day plan

Day 1:

Java basics

Variables

Data types

Simple programs

Day 2:

Operators

Conditional statements

Day 3:

Loops

Practice problems

And so on.

Each learning plan should contain:

Day number

Date

Topic

Subtopics

Study material

Notes

Practice questions

Coding problems

Estimated duration

Completion status

Allow me to manually define what should be studied on each day.

The system must NOT force me to follow a fixed schedule if I fall behind.

If I miss a day, the application should intelligently reschedule unfinished work.

4. STUDY MATERIAL UPLOAD

Create a Study Materials section.

I should be able to upload:

PDF

DOC/DOCX

CSV

TXT

Images where practical

For every uploaded document, allow me to associate it with:

Subject

Learning plan

Day

Topic

Category

Example:

Java PDF → Java → Days 1–30

The application should maintain the relationship between the uploaded material and the relevant learning days.

Create a document library where I can:

Search

Filter

Open

Download

Delete

Rename

Categorize documents

Do not hard-code any AI provider for document processing.

Create a clean AI service abstraction layer so that an AI API can be connected later.

I will provide the AI API key/provider later.

The application should therefore work completely without an AI API key.

5. DAILY STUDY SESSION

This is one of the most important features.

When I start studying, show a dedicated Study Session screen.

At the beginning, allow me to select:

Subject

Topic

Planned duration

Default duration:

2 hours

But I must be able to change it.

Examples:

30 minutes 45 minutes 1 hour 1.5 hours 2 hours 3 hours Custom duration

The session should contain:

Countdown timer

Current subject

Current topic

Today's objectives

Study material

Notes

Tasks

Progress indicator

Pause

Resume

Finish session

Extend session

When the session finishes, ask me:

What did you complete?

What did you struggle with?

How difficult was today's topic?

Did you understand the topic?

Do you want additional practice?

Store this information in the study history.

6. POMODORO / FOCUS MODE

Add a dedicated focus mode.

Support:

25/5 Pomodoro

50/10

Custom intervals

Long break

Short break

During focus mode:

Hide unnecessary UI

Show only the timer and current task

Allow quick notes

Allow task completion

Track focus duration

Record total focused time.

7. CODING PRACTICE MODULE

Create a coding practice section similar in concept to coding practice platforms.

When I select:

Coding

show:

Problem statement

Difficulty

Topic

Examples

Constraints

Input/output format

Test cases

Code editor

Language selector

Run

Submit

Reset code

Test results

Initially support:

Python

Java

C

Keep the architecture flexible so additional languages can be added later.

8. CODE EDITOR / IDE

Integrate a professional browser-based code editor.

The coding screen should contain:

LEFT SIDE:

Problem statement

Examples

Constraints

Hints

RIGHT SIDE:

Code editor

Language selector

Run button

Submit button

BOTTOM:

Console

Test case results

Runtime

Error output

Submission status

Make the editor responsive for mobile devices.

Do not require AI for the IDE to function.

9. CODING PROBLEM MANAGEMENT

Allow me to add coding problems manually.

Each problem should support:

Title

Description

Difficulty

Topic

Tags

Expected time

Supported languages

Test cases

Solution

Explanation

Hints

Related subject

Related learning day

Track:

Attempted

Solved

Failed

Number of attempts

Time taken

Difficulty

Mistake type

Create statistics such as:

Problems solved

Problems attempted

Success rate

Average solving time

Easy/Medium/Hard distribution

Topic-wise performance

10. APTITUDE & REASONING MODULE

Create a dedicated section for:

Quantitative Aptitude

Examples:

Percentages

Profit & Loss

Time & Work

Time, Speed & Distance

Ratios

Averages

Probability

Permutations & Combinations

Number Systems

Simple Interest

Compound Interest

Data Interpretation

Logical Reasoning

Examples:

Coding-Decoding

Blood Relations

Directions

Seating Arrangement

Puzzles

Syllogisms

Series

Analogies

Statements & Conclusions

Allow questions to be grouped by:

Topic

Difficulty

Subject

Learning day

Track:

Correct answers

Wrong answers

Accuracy

Time per question

Weak topics

Attempt history

11. PRACTICE MODE

Create a configurable practice mode.

I should be able to select:

Subject:

Coding

Aptitude

Reasoning

Any other subject

Difficulty:

Easy

Medium

Hard

Mixed

Number of questions:

5

10

20

30

Custom

Time limit:

None

15 min

30 min

60 min

Custom

After completing the practice session, show:

Score

Accuracy

Time taken

Correct answers

Incorrect answers

Weak topics

Recommended revision

12. SPACED REPETITION

Implement a spaced repetition system.

When I get a question wrong or mark a concept as difficult, schedule it for revision.

Use revision intervals such as:

1 day

3 days

7 days

14 days

30 days

Create a:

"Review Today"

section.

This should automatically surface:

Difficult concepts

Previously incorrect questions

Important notes

Flashcards

Previously studied topics

13. FLASHCARDS

Create a flashcard system.

Each flashcard should contain:

Front

Back

Subject

Topic

Difficulty

Review schedule

Actions:

Again

Hard

Good

Easy

Track review history.

14. NOTES

Create a personal notes system.

Features:

Create notes

Edit notes

Delete notes

Search notes

Categorize notes

Attach notes to subjects

Attach notes to topics

Attach notes to study days

Support basic rich text formatting.

15. CALENDAR

Create an integrated study calendar.

Calendar views:

Month

Week

Day

Show:

Study sessions

Coding practice

Aptitude practice

Revision sessions

Deadlines

Learning plan days

Personal tasks

Allow:

Drag and drop scheduling

Rescheduling

Editing

Deleting

Recurring study sessions

16. TASK MANAGEMENT

Create a simple task manager.

Each task should have:

Title

Description

Subject

Priority

Due date

Estimated time

Status

Statuses:

Todo

In Progress

Completed

Include:

Today's Tasks

and

Overdue Tasks

17. ADAPTIVE STUDY PLANNER

The application should intelligently adjust my schedule.

Example:

If I planned:

Java loops → Monday

but did not complete it,

the system should move it to the next suitable study slot instead of simply marking me as failed.

If I consistently struggle with:

Arrays

the system should recommend:

More array problems

Revision

Easier problems

Concept review

The scheduling engine should work without AI.

AI can later enhance recommendations, but the core scheduling must be deterministic.

18. PERSONAL AI MENTOR

Create an AI Mentor section.

IMPORTANT:

Do NOT hard-code Gemini, OpenAI, Claude, or any specific AI provider.

Create a generic AI provider/service abstraction.

I will provide the AI API key and provider later.

The application should have a settings page where I can configure the AI integration later.

Potential AI capabilities:

Explain difficult concepts

Summarize uploaded study material

Generate questions

Generate coding practice

Generate aptitude questions

Analyze mistakes

Recommend what to study

Create revision plans

Analyze study consistency

Generate daily study plans

Answer questions about uploaded study materials

Act as a coding mentor

Give hints instead of directly giving solutions

Identify weak areas

Give personalized feedback

If no API key is configured:

The application must continue working normally.

Display a clear message such as:

"AI Mentor is not configured yet. Add your AI API credentials in Settings to enable AI features."

Never expose API keys in the frontend.

Use secure environment variables/backend functions for AI API communication.

19. DAILY AI MENTOR

Once AI is configured, the mentor should be able to generate a daily briefing.

Example:

"Good morning. Today you have:

Java — Exception Handling — 45 min

DSA — 2 Array Problems — 45 min

Aptitude — Percentages — 30 min

Revision — 15 min

Yesterday you struggled with recursion, so I've added one additional revision problem."

Keep this optional and configurable.

20. AI CHAT

Create an AI mentor chat interface.

The user should be able to ask:

"Explain recursion."

"Why did my code fail?"

"Give me another problem like this."

"Quiz me on Java."

"Teach me percentages."

"What should I study today?"

"Analyze my coding performance."

The mentor should use my available learning history and relevant study context when generating responses.

21. DOCUMENT-BASED LEARNING

When AI is eventually configured, allow me to select an uploaded document and ask questions about it.

Examples:

"Summarize this chapter."

"Explain this topic."

"Give me 10 questions from this PDF."

"Create flashcards from this material."

"Teach me Day 5."

The architecture should support this later without requiring a complete rewrite.

22. STREAK SYSTEM

Track:

Daily study streak

Coding streak

Aptitude streak

Weekly consistency

Monthly consistency

Display:

🔥 Current streak 🏆 Longest streak

Do not punish the user excessively for missing a day.

The goal is consistency, not pressure.

23. ANALYTICS DASHBOARD

Create a detailed personal analytics dashboard.

Metrics:

Total study hours

Weekly study hours

Monthly study hours

Coding problems solved

Coding accuracy

Aptitude accuracy

Reasoning accuracy

Topics completed

Subjects completed

Current streak

Longest streak

Focus time

Revision completion

Weakest subjects

Strongest subjects

Charts:

Weekly study hours

Subject distribution

Coding performance

Aptitude performance

Consistency trend

Topic progress

24. GOALS

Allow me to create goals.

Examples:

"Complete Java in 30 days."

"Solve 100 DSA problems this month."

"Practice aptitude for 20 hours."

"Complete 5 subjects before placement season."

Each goal should contain:

Target

Deadline

Progress

Current status

Related subjects

Progress visualization

25. ONBOARDING

When I first open the application, show a simple onboarding process.

Ask:

What are you currently learning?

What are your target subjects?

How many hours can you study per day?

What time do you normally study?

What are your goals?

What is your current coding level?

Which programming languages do you use?

What is your target completion date?

Then create an initial study plan.

Allow all of this to be edited later.

26. DASHBOARD DESIGN

The dashboard should feel like a personal command center.

Top:

"Good morning 👋"

Then:

Today's Mission

Then cards:

Study Time

Current Streak

Today's Progress

Problems Solved

Then:

Today's Learning Plan

Then:

Continue Learning

Then:

Review Today

Then:

Upcoming Tasks

Then:

Progress Analytics

Then:

AI Mentor

Keep the UI clean and not overcrowded.

27. NAVIGATION

Desktop navigation:

Dashboard

Learn

Coding

Practice

Calendar

Notes

Flashcards

Analytics

AI Mentor

Goals

Materials

Settings

Mobile navigation should use a bottom navigation bar for the most important sections.

Use a responsive sidebar/drawer for secondary sections.

28. SETTINGS

Create settings for:

Profile

Name

Profile picture

Learning goals

Study

Daily study target

Default session duration

Preferred study time

Pomodoro settings

Weekly target

Notifications

Study reminders

Revision reminders

Task reminders

Streak reminders

AI

AI provider configuration

API key configuration

Model configuration where applicable

Enable/disable AI features

IMPORTANT:

Never store sensitive API keys directly in client-side code.

Appearance

Light mode

Dark mode

System mode

Data

Export data

Import data

Backup

Reset application

29. DATABASE ARCHITECTURE

Use a clean and scalable data model.

Suggested entities:

users subjects learningPlans learningDays topics studyMaterials studySessions codingProblems codingSubmissions practiceQuestions practiceSessions flashcards notes tasks calendarEvents goals revisions analytics aiSettings

Design relationships carefully.

The application should be structured so that it can scale later even though it is currently intended for personal use.

30. OFFLINE SUPPORT

Because this is a personal daily-use application, important functionality should work even with poor internet.

Cache:

Today's learning plan

Tasks

Notes

Study sessions

Basic progress

Flashcards

Synchronize changes when the connection is restored.

31. PWA

Make the application installable as a Progressive Web App.

Requirements:

App icon

Splash screen

Offline support

Install prompt

Responsive layout

Mobile-friendly navigation

The installed application should feel like a native mobile application.

32. NOTIFICATIONS

Support browser/PWA notifications for:

Study reminder

Session reminder

Revision reminder

Task deadline

Daily learning reminder

Allow notifications to be enabled/disabled.

33. DESIGN SYSTEM

Use a modern, premium, minimal interface.

Design principles:

Clean

Professional

Minimal

Modern

Mobile-first

Fast

Accessible

Not overly colorful

Not childish

Not like a generic school LMS

Use:

Cards

Subtle borders

Rounded corners

Clear typography

Consistent spacing

Meaningful icons

Progress indicators

Charts

Smooth but subtle animations

Support both light and dark mode.

34. TECHNOLOGY

Use a modern production-ready web stack.

Preferred:

React

TypeScript

Vite

Tailwind CSS

Lucide icons

Use a suitable backend/database architecture.

Keep authentication, database, storage, server-side functions and API integrations modular.

Do not tightly couple the application to any specific AI provider.

35. IMPORTANT AI ARCHITECTURE

Create an abstraction similar to:

AIProvider AIService AIChatService AIStudyPlanner AIDocumentService AIQuestionGenerator AICodingMentor

The actual provider implementation should be replaceable.

For now:

Use mock/placeholder responses where necessary.

Later I will provide an AI API key.

The application should then be able to connect to that provider through the service layer.

36. SECURITY

Implement:

Secure authentication

Protected routes

Secure database rules

Secure file storage

Input validation

API key protection

No secret keys in frontend code

Proper error handling

Secure server-side AI calls

Since this is personal data, privacy should be treated as a major requirement.

37. ERROR HANDLING

Every major feature should have:

Loading states

Empty states

Error states

Retry actions

Success feedback

Form validation

Never leave the user staring at a blank screen.

38. SEED DATA

Create useful demo data so the application is immediately understandable.

Example subjects:

Java Python DSA Aptitude Reasoning

Create sample learning plans and sample coding/practice questions.

Make it easy for me to delete the demo data later.

39. DEVELOPMENT APPROACH

Do not create everything as one huge unstructured implementation.

Build the application using modular components and reusable services.

Prioritize:

PHASE 1:

App shell

Authentication

Dashboard

Subjects

Learning plans

Study timer

Tasks

PHASE 2:

Study materials

Notes

Calendar

Flashcards

Practice system

PHASE 3:

Coding module

Code editor

Coding problems

Test cases

Coding analytics

PHASE 4:

Analytics

Goals

Streaks

Adaptive scheduling

Spaced repetition

PHASE 5:

AI service abstraction

AI mentor

AI chat

Document AI

AI recommendations

PHASE 6:

PWA

Offline support

Notifications

Performance optimization

Final UI polish

40. MOST IMPORTANT USER EXPERIENCE

The application should eliminate the question:

"What should I study today?"

Every time I open the app, it should clearly tell me:

TODAY'S MISSION

What to learn.

What to practice.

How long to study.

What to revise.

What remains incomplete.

And give me one clear:

START STUDY SESSION

button.

After the session, it should remember what I did and use that information to make tomorrow's plan better.

This application should ultimately feel like:

My personal learning operating system + personal mentor + coding practice platform + study planner.

Build the first complete functional version with clean architecture so that new features can be added without rewriting the application.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/802e7e62-63d4-40c6-b4d0-6c1987495dc4).

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
