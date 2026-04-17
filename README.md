# Smart Transit Decision Engine
### *Know before you go. Leave at the right time, catch the right ride.*

---

## The Problem

Every urban commuter faces a daily micro-crisis: you're 1 km from a metro station or a bus stop. A bus or train is coming. Should you leave now? Should you jog? Is it even worth catching this one, or is the next one better? 

Right now, there is no tool that answers this question intelligently. Google Maps tells you schedules. It does not know how fast *you* walk. It does not know how full the bus is. It does not tell you whether sprinting 800 meters to catch a bus that is already 90% full is worth it.

**Smart Transit Decision Engine solves exactly this.**

---

## What It Does

Smart Transit Decision Engine is a real-time, personalized transit readiness tool. It takes live data about the bus or metro approaching your nearest stop, combines it with your personal movement profile, and gives you one clear, actionable verdict in under 3 seconds:

> **Leave now — jog pace**  
> Metro Purple Line · Arrives in 6 min · Coach 3 is 28% full  
> You reach Majestic by 8:41 AM  
> *(Next bus: 11 min away · 79% full · not recommended)*

No dashboards. No guessing. One decision, instantly.

---

## Data Sources & How They Work

### 1. Live Bus Occupancy — KSRTC Smart Ticketing System

Karnataka's KSRTC buses already run a digital ticketing system that supports UPI payments. Every ticket issued is tracked in real time. When a passenger's journey ends at their destination stop, the system logs them as exited and updates the count.

This gives us a live, accurate passenger count on every bus at any given moment. The Smart Transit Decision Engine pulls this occupancy figure and presents it as a percentage of the bus's total capacity — so you know before you even leave your house whether you're walking into a packed bus or a comfortable one.

### 2. Live Bus Location — KSRTC GPS Infrastructure

All KSRTC buses are equipped with onboard GPS units. Their real-time coordinates are available through the transit data layer. The engine uses this to calculate exactly how far the bus currently is from your stop and its estimated time of arrival — not a scheduled time, but an actual live ETA based on current position and speed.

### 3. Metro Coach Fill Level — Weight Sensor System

Bengaluru Metro (Namma Metro) uses a weight-based occupancy tracking system across train coaches. Each coach's load is monitored, and this data is used to determine which coaches are crowded and which have space.

The Smart Transit Decision Engine taps into this feed to show you not just whether the train is full, but *which specific coach* to walk toward on the platform before the train arrives. This saves you time at boarding and gets you a seat.

### 4. Your Personal Movement Profile — Google Fit & Smartwatch Integration

This is what makes the engine *personal*.

The app integrates with Google Fit and compatible smartwatches (Wear OS, Mi Band, Fitbit via API) to pull your historical movement data. From your workout logs and daily step tracking, it extracts three personalized speed values:

- Your average **casual walking speed**
- Your average **brisk walk / power walk speed**
- Your average **jogging speed**

These are not generic assumptions (the industry default is 1.4 m/s for walking — the same value used for a 60-year-old and a 22-year-old athlete). Your numbers are *yours*. If you naturally walk at 1.7 m/s, the engine knows you can cover 500 meters in under 5 minutes. It calculates accordingly.

---

## Core Logic — How the Decision Is Made

Given your location and destination, the engine runs the following calculation for each available transit option (bus and metro):

1. **Distance to stop** — calculated from your current GPS coordinates to the stop entrance
2. **Time to reach stop** — computed using your personal walk/jog speeds, with a selected effort level (casual / brisk / jog)
3. **Live ETA of next vehicle** — pulled from GPS (bus) or live schedule (metro)
4. **Can you make it?** — if your time to reach the stop is less than the vehicle's ETA, you can catch it
5. **Is it worth it?** — factors in occupancy (a full bus vs. a comfortable one), the gap until the next vehicle, and the total journey time to your destination
6. **Verdict** — one of: **LEAVE NOW (jog)**, **LEAVE NOW (walk)**, **WAIT — next one is better**, or **TAKE METRO INSTEAD**

Weather is also factored in. On a rainy day, your effective walking speed is adjusted downward, and the comfort score of a less-crowded bus is weighted higher.

---

## Key Features

### Real-Time Verdict Card
The primary output is a clean, single-screen verdict that tells you:
- Which vehicle to take (bus route number or metro line)
- When it arrives and how full it is
- What pace you need to leave at
- Your estimated arrival time at your destination
- The next available option as a comparison

### Coach-Level Metro Guidance
For metro trips, the engine displays a visual fill map of each coach in the incoming train. It highlights the least crowded coach and tells you which end of the platform to stand at — *before* the train pulls in.

### Personalized Speed Engine
Rather than using population averages, the engine builds a speed profile unique to you from your Google Fit or smartwatch history. This makes the "can you make it?" calculation accurate to within seconds, not minutes.

### Live Occupancy for Buses
See the current passenger count on your approaching bus as a percentage of capacity. Know in advance if you're getting a seat or standing in the aisle for 40 minutes.

### Multi-Modal Comparison
If both a bus and a metro option are available for your route, the engine compares them side by side across three dimensions — speed, comfort (occupancy), and cost — and recommends the better one for your specific situation right now.

### Departure Timer
A live countdown tells you exactly how many minutes and seconds you have before you need to step out the door. As time passes, the engine recalculates and updates the recommended pace — if you wait 2 more minutes, it upgrades from "walk" to "jog."

---

## System Architecture (Prototype)

```
User Location + Destination
        │
        ▼
┌───────────────────────┐
│  Personal Speed Layer │  ← Google Fit / Smartwatch API
│  (walk / jog speeds)  │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐     ┌──────────────────────────┐
│   Bus Data Layer      │     │   Metro Data Layer       │
│  · Live GPS location  │     │  · Live train schedule   │
│  · Occupancy %        │     │  · Per-coach fill level  │
│    (KSRTC ticketing)  │     │    (weight sensor data)  │
└───────────┬───────────┘     └──────────────┬───────────┘
            │                                │
            └──────────────┬─────────────────┘
                           ▼
              ┌────────────────────────┐
              │   Decision Engine      │
              │  · Can you make it?    │
              │  · Is it worth it?     │
              │  · Which option wins?  │
              └────────────┬───────────┘
                           ▼
              ┌────────────────────────┐
              │   Verdict Output Card  │
              │  · Pace recommendation │
              │  · Departure timer     │
              │  · Coach guidance      │
              └────────────────────────┘
```

---

## Why This Is Different from Google Maps

| Feature | Google Maps | Smart Transit Decision Engine |
|---|---|---|
| Transit schedules | Scheduled (not live) | Live GPS-based ETA |
| Bus occupancy | Not shown | Live % from ticketing system |
| Metro coach fill | Not shown | Per-coach fill from weight sensors |
| Walking speed | Generic average | Your personal speed from fitness data |
| Decision output | Route overview | Single actionable verdict |
| Departure timing | "Leave at X" | Live countdown with pace guidance |
| Coach selection | Not shown | Least-crowded coach highlighted |

---

## Target Users

Urban commuters in Bengaluru and other Karnataka cities who use KSRTC buses and Namma Metro daily — particularly working professionals and college students who commute during peak hours and need to make fast, reliable transit decisions with minimal friction.

---

## Built For

**PromptWars Hackathon** — Smart Mobility Intelligence System Track  
Focus: Real-time, personalized, actionable urban mobility micro-decisions

---

## Tech Stack (Prototype)

- **Frontend** — React / HTML5, CSS3
- **Data Simulation** — Realistic live-feed simulation for bus GPS, occupancy, and metro coach data
- **Personal Speed** — Google Fit API integration (with manual input fallback)
- **Weather** — OpenWeatherMap API (free tier)
- **Maps** — Google Maps JavaScript API for distance calculation

---

*"We don't build navigation. We build decisions. Because in urban mobility, the 90 seconds before your bus arrives is the most stressful and least supported moment in any commuter's journey."*
