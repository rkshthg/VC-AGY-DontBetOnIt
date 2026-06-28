
# Product Requirements Document (PRD): Don't Bet On It - the squad betting platform

## 1. Product Overview

### 1.1 Objective

To build a web-based, risk-free social betting platform where friends and communities can wager on custom topics using a strictly virtual currency. The platform encourages social engagement, friendly competition, and community building through private groups ("Crews" or "Squads"), leaderboards, and discussion threads.

### 1.2 Target Audience

* Friend groups, coworkers, or hobby communities looking for a gamified way to predict outcomes (e.g., sports, entertainment, personal milestones) without financial risk.
* Users who enjoy social competition and leaderboard tracking.

---

## 2. Core Features & Requirements

### 2.1 User Authentication & Onboarding

* **Sign Up/Log In:** Users must be able to authenticate using:
* Standard Email and Password.
* Google Single Sign-On (SSO).


* **Welcome Bonus:** Upon successful registration, the system automatically credits the user's wallet with exactly **100,000 virtual credits**.
* **Profile:** Basic user profile displaying username, email, and global credit balance.

### 2.2 Economy & Currency (Strictly Virtual)

* **Currency Type:** Virtual Credits only.
* **Constraint:** The platform must not integrate any real-money payment gateways for deposits or withdrawals. The economy is closed and for entertainment purposes only.

### 2.3 Crew (Group) Management

* **Creation:** Any registered user can create a "Crew" (or "Squad").

* **Roles & Delegation:**
    * **Admin:** The creator of the Crew automatically assumes the Admin role. Admins have the authority to appoint other members of the crew to be Admins (allowing multiple Admins per Crew).
    * **Member:** Users who join the Crew via invitation.

* **Invitations:** Admins and/or members can invite others to join the Crew via a unique invite link or email integration.

### 2.4 Betting Mechanics (The "Bet Cards")

* **Topic Creation:** Users within a Crew can create a betting topic (displayed as a "Card" on the UI).

* **Topic Editing (Admin Only):** Admins are allowed to edit betting topics and their associated options.
    * *Constraint:* If an option is edited, any bets that members have already placed on that option must remain intact and tied to it.

* **Placing Bets & User-Generated Options:**
    * The wager amount is a **fixed amount** per bet (set during the creation of the bet card).
    * **Strict Restriction:** Members are allowed to bet on **ONLY 1 option per topic**.
    * **User-Generated Options:** Members are not restricted to the default options. They can create their own custom option within a topic and place their single bet on it. This option then becomes visible to the rest of the Crew.

* **The Pot:** The system deducts the fixed credit amount from participating members' balances and pools it into a "Pot" for that specific card.

* **Resolution:**
    * **Admin Only:** Only Crew Admins have the permission to resolve a bet and declare the winning outcome.

* **Payout Distribution:**
    * Single Winner: Receives 100% of the pot.
    * Multiple Winners: The pot is divided equally among all users who chose the winning outcome.
    * No Winners: The pot is refunded equally to all participants.


### 2.5 Crew Dashboard & Analytics

Each Crew will feature a centralized dashboard accessible to all its members, displaying:

* **Leaderboard:** Ranking of Crew members based on total credits won, net profit, or win-rate.
* **Active Bets:** A feed of ongoing, unresolved bet cards.
* **Historical Summaries:** User-specific and Crew-wide metrics, including:
    * Total bets made.
    * Total bets won/lost.
    * Biggest win (highest pot claimed).



---

## 3. User Flow Summary

1. **Onboarding:** User signs up via Google -> Receives 100,000 credits -> Lands on Home Page.
2. **Crew Setup:** User clicks "Create Crew" -> Names the Crew -> Generates invite link -> Sends to friends. User can promote a friend to Admin once they join.
3. **Bet Creation & Interaction:** A member creates a Bet Card. Another member views it, doesn't like the existing choices, creates a new custom option, and places their one allowed bet on it.
4. **Admin Editing:** An Admin notices a typo in an option and edits the text. The bets already placed on that option remain secure.
5. **Resolution:** Event concludes -> An Admin opens the card -> Selects the winning outcome -> System distributes the pooled credits to the winner(s).
6. **Tracking:** Members check the Crew Dashboard to see the updated leaderboard and their updated personal win/loss summary.

---

## 4. Non-Functional Requirements

| Category | Requirement |
| --- | --- |
| **Security** | Passwords must be hashed and salted. JWT or session-based authentication for secure API requests. Role-based access control (RBAC) to ensure only Admins can resolve or edit topics. |
| **Performance** | Dashboard and leaderboards should load in under 2 seconds. Comment sections should update smoothly. |
| **Responsiveness** | The web app must be mobile-responsive, prioritizing a mobile-first design as social betting frequently occurs on the go. |
| **Data Integrity** | Transactional integrity is crucial. Deductions and payouts must be handled atomically. Edits to options must cascade properly without unlinking foreign keys to existing wagers. |

---

## 5. Out of Scope (For V1)

* Real money transactions, wallet top-ups via credit card, or cash-outs.
* Global leaderboards (V1 focuses on private Crews).
* Dynamic odds or pari-mutuel betting mechanics (V1 uses fixed bet amounts).