# 🔐 Lab 05 — PIM & Conditional Access Hands-On Lab

> **Goal:** Configure Privileged Identity Management (PIM) in Entra ID to enforce just-in-time admin access, then build Conditional Access policies that block risky sign-ins — two of the most impactful controls you can deploy for cloud identity security.

---

## 🧭 What You're Building

```
┌──────────────────────────────────────────────────────────────────────┐
│                     LAB 05 OVERVIEW                                  │
│                                                                      │
│  PART A: PIM — Just-In-Time Privilege                                │
│  ─────────────────────────────────────────────────────────────────  │
│  Before PIM:   diana is ALWAYS a Global Admin → 24/7 attack surface │
│  After PIM:    diana has ZERO admin rights until she requests them   │
│                She gets 1 hour of admin → then back to nothing       │
│                Manager must approve → MFA required → All logged      │
│                                                                      │
│  PART B: Conditional Access — Smart Door Policies                    │
│  ─────────────────────────────────────────────────────────────────  │
│  Policy 1: Block access from high-risk countries                     │
│  Policy 2: Require MFA for all admin roles                           │
│  Policy 3: Block legacy authentication protocols                     │
│  Policy 4: Require compliant device for sensitive apps               │
└──────────────────────────────────────────────────────────────────────┘
```

---

# PART A — Privileged Identity Management (PIM)

## 📋 PIM Pre-Requisites

```
REQUIREMENTS:
──────────────────────────────────────────────────────────────────
  ✅ Microsoft Entra ID P2 license (included in M365 E5 trial)
  ✅ You must be a Global Admin to configure PIM
  ✅ Users you enroll must have Entra ID P2 license assigned

  CHECK: Entra portal → Identity Governance → Privileged Identity
         Management → if PIM doesn't appear, check your license
```

---

## 🔬 PIM Exercise 1 — Enable PIM and Assign Eligible Role

```
SCENARIO:
  diana@lab.onmicrosoft.com needs to occasionally manage Entra ID.
  Currently she's a permanent Global Admin — too risky!
  Goal: Make her ELIGIBLE for Global Admin (not permanent)
        She must REQUEST and get APPROVED for each admin session.


STEP 1: Open PIM
──────────────────────────────────────────────────────────────────
  1. Go to: portal.azure.com
  2. Search: "Privileged Identity Management"
  3. Click: PIM → Azure AD Roles


STEP 2: Remove diana's permanent Global Admin role
──────────────────────────────────────────────────────────────────
  PIM → Manage → Roles → Global Administrator
  → Assignments tab
  → Find diana in "Active" assignments
  → Click "Remove"
  → diana no longer has permanent admin!


STEP 3: Assign diana as ELIGIBLE for Global Admin
──────────────────────────────────────────────────────────────────
  PIM → Manage → Roles → Global Administrator
  → Assignments tab → Add Assignments
  → Membership type: ELIGIBLE (not Active!)
  → Select: diana@lab.onmicrosoft.com
  → Setting: No permanent eligible (set expiry: 90 days)
  → Assign

  RESULT: diana's role now shows under "Eligible" — not "Active"
  She has ZERO admin rights right now.


STEP 4: Configure Role Settings
──────────────────────────────────────────────────────────────────
  PIM → Manage → Roles → Global Administrator → Settings

  CONFIGURE:
  ┌──────────────────────────────────────────────────────────────┐
  │  Maximum activation duration:     1 Hour                     │
  │  On activation, require:          Azure MFA ✅               │
  │  Require justification:           ✅ Yes                     │
  │  Require ticket information:      ✅ (optional, for ITSM)    │
  │  Require approval to activate:    ✅ Yes                     │
  │  Approvers:                       your own account           │
  │  Send email notification:         ✅ Yes                     │
  └──────────────────────────────────────────────────────────────┘
  → Update settings


STEP 5: Test — diana requests activation
──────────────────────────────────────────────────────────────────
  Log in as diana@lab.onmicrosoft.com

  1. Go to: portal.azure.com → PIM
  2. Click "My Roles" → "Azure AD Roles"
  3. See: Global Administrator under "Eligible Roles"
  4. Click: "Activate"
  5. Fill in: Reason = "Performing quarterly user audit"
              Duration = 1 Hour
  6. Complete MFA challenge
  7. Role status: "Pending Approval"


STEP 6: Approve as admin
──────────────────────────────────────────────────────────────────
  Log back in as YOUR admin account
  
  PIM → Approve Requests
  → See diana's pending request
  → Review justification
  → Click "Approve"
  → Add comment: "Approved for quarterly audit"
  
  RESULT: diana NOW has Global Admin for exactly 1 hour
  After 1 hour → automatically removed → back to zero privileges


VERIFY IN AUDIT LOG:
──────────────────────────────────────────────────────────────────
  Entra ID → Audit Logs
  Filter: Category = "RoleManagement"
  
  You'll see:
  ✅ "Eligible Member added"   (when you made her eligible)
  ✅ "Member activated"        (when she requested activation)
  ✅ "Member deactivated"      (after 1 hour automatic removal)
  ✅ MFA recorded at each step
```

---

## 🔬 PIM Exercise 2 — Access Reviews

```
SCENARIO: Quarterly review — should diana still be eligible for GA?

CREATE AN ACCESS REVIEW:
──────────────────────────────────────────────────────────────────
  PIM → Manage → Access Reviews → New Access Review

  Settings:
  ┌──────────────────────────────────────────────────────────────┐
  │  Review name:    "Q1 2024 Global Admin Eligibility Review"   │
  │  Start date:     Today                                       │
  │  Frequency:      Quarterly (auto-repeating!)                 │
  │  End date:       Never (ongoing quarterly review)            │
  │  Scope:          Role → Global Administrator                 │
  │  Reviewers:      Specific user (your manager account)        │
  │  If reviewers don't respond: Remove access                   │
  └──────────────────────────────────────────────────────────────┘
  → Start Review


REVIEWER EXPERIENCE:
──────────────────────────────────────────────────────────────────
  Reviewer gets email: "Action required: Access Review"
  Click link → See: diana@lab.onmicrosoft.com needs Global Admin?
  Reviewer decision: Approve / Deny with justification
  
  If nobody reviews by deadline → access AUTOMATICALLY REMOVED
  This prevents orphaned admin accounts forever!
```

---

# PART B — Conditional Access Policies

## 🔬 CA Exercise 1 — Block Legacy Authentication

```
WHY: Legacy auth (SMTP, IMAP, POP3, old Office clients) 
     cannot do MFA → attackers love them to bypass MFA!

POLICY: "Block Legacy Authentication"
──────────────────────────────────────────────────────────────────
  Entra portal → Security → Conditional Access → New Policy

  Name: "Block Legacy Authentication - All Users"

  ASSIGNMENTS:
    Users: All users
    Cloud apps: All cloud apps
    Conditions:
      Client apps → Configure: Yes
        ✅ Exchange ActiveSync clients
        ✅ Other clients
        (These = legacy auth protocols)

  ACCESS CONTROLS:
    Grant: Block access

  Enable Policy: ON (start with Report-Only if unsure)
  → Save


WHAT THIS BLOCKS:
  ❌ SMTP auth to Exchange
  ❌ IMAP/POP3 clients
  ❌ Old Office 2010 clients
  ❌ Basic auth REST calls


TEST IN REPORT-ONLY MODE FIRST:
──────────────────────────────────────────────────────────────────
  Enable as "Report only" → Wait 7 days →
  Check Sign-in Logs → Filter: Conditional Access = Report-Only
  See who would be blocked →
  Remediate old clients BEFORE enabling →
  Then switch to "On"
```

---

## 🔬 CA Exercise 2 — Require MFA for Admin Roles

```
POLICY: "Require MFA for Administrators"
──────────────────────────────────────────────────────────────────
  Name: "Require MFA - Admin Roles"

  ASSIGNMENTS:
    Users: Directory Roles
      ☑️  Global Administrator
      ☑️  Security Administrator
      ☑️  Exchange Administrator
      ☑️  SharePoint Administrator
      ☑️  User Administrator
      ☑️  (All admin roles)

  Cloud apps: All cloud apps

  CONDITIONS:
    (no conditions — apply to all sign-ins for admins)

  ACCESS CONTROLS:
    Grant:
      ☑️  Require multi-factor authentication
      ☑️  Require authentication strength: Phishing-resistant MFA
          (Windows Hello, FIDO2 key, Certificate)

  Enable Policy: ON
  → Save


TEST:
──────────────────────────────────────────────────────────────────
  Login as diana (even if PIM-activated Global Admin)
  → Immediately prompted for MFA on EVERY sign-in
  → Cannot access admin portals without MFA
```

---

## 🔬 CA Exercise 3 — Require Compliant Device

```
POLICY: "Require Compliant Device for M365"
──────────────────────────────────────────────────────────────────
  PREREQUISITE: Intune enrolled devices in your tenant

  Name: "Require Compliant Device - Microsoft 365"

  ASSIGNMENTS:
    Users: All users (exclude: break-glass accounts!)
    Cloud apps:
      ☑️  Office 365
      ☑️  Microsoft Teams
      ☑️  SharePoint Online

  CONDITIONS:
    Device platforms: Windows, iOS, Android, macOS

  ACCESS CONTROLS:
    Grant:
      ☑️  Require device to be marked as compliant
    OR:
      ☑️  Require Hybrid Azure AD joined device
      (Use OR between these two)

  Enable Policy: Report-Only first → then ON
  → Save


WHAT HAPPENS:
──────────────────────────────────────────────────────────────────
  alice on corporate Hybrid AAD Joined PC:
  → CA checks: Is device compliant? ✅ → Access granted!

  alice on personal home laptop:
  → CA checks: Is device compliant? ❌ → Access BLOCKED
  → Message: "You can't get there from here. 
               Contact your IT department."

  alice on corporate-enrolled mobile phone:
  → Intune check: Latest OS? AV enabled? → ✅ → Access granted!
```

---

## 🔬 CA Exercise 4 — Sign-in Risk Policy

```
POLICY: "Block High-Risk Sign-ins"
──────────────────────────────────────────────────────────────────
  PREREQUISITE: Entra ID P2 (Identity Protection)

  Name: "Block High-Risk Sign-ins"

  ASSIGNMENTS:
    Users: All users

  CONDITIONS:
    Sign-in risk: High
    (Entra ID detection: impossible travel, anonymous IP,
     malware-linked IP, unfamiliar sign-in properties)

  ACCESS CONTROLS:
    Grant: Block access


  POLICY: "Require MFA for Medium-Risk Sign-ins"
  ──────────────────────────────────────────────────────────────────
  Name: "Require MFA - Medium Risk"

  CONDITIONS:
    Sign-in risk: Medium

  ACCESS CONTROLS:
    Grant:
      ☑️  Require multi-factor authentication
      ☑️  Require password change


SIMULATE A RISKY SIGN-IN IN LAB:
──────────────────────────────────────────────────────────────────
  Method 1: Use Tor Browser to sign in as alice
  → Tor = known anonymous IP → Entra flags as risky
  → Risk policy triggers → MFA or Block!

  Method 2: Entra portal simulation
  Entra ID → Security → Identity Protection →
  → Risky users → Select alice → Confirm user compromised
  → Sign in as alice → CA risk policy fires!
```

---

## 📊 CA Policy Matrix — What You've Built

```
┌──────────────────────────────────────────────────────────────────────┐
│              YOUR CONDITIONAL ACCESS POLICY MATRIX                   │
├─────────────────────────────────┬──────────────┬────────────────────┤
│  POLICY                         │  TARGET      │  CONTROL           │
├─────────────────────────────────┼──────────────┼────────────────────┤
│ Block Legacy Authentication     │  All users   │  Block always      │
├─────────────────────────────────┼──────────────┼────────────────────┤
│ Require MFA for Admins          │  Admin roles │  Phish-resistant   │
│                                 │              │  MFA required      │
├─────────────────────────────────┼──────────────┼────────────────────┤
│ Require Compliant Device        │  All users   │  Compliant OR      │
│ for M365                        │              │  Hybrid AAD Join   │
├─────────────────────────────────┼──────────────┼────────────────────┤
│ Block High-Risk Sign-ins        │  All users   │  Block             │
├─────────────────────────────────┼──────────────┼────────────────────┤
│ MFA for Medium-Risk Sign-ins    │  All users   │  MFA + pwd change  │
└─────────────────────────────────┴──────────────┴────────────────────┘

  ⚠️  ALWAYS EXCLUDE your break-glass admin account from ALL policies!
  If CA is misconfigured → break-glass = your way back in!
```

---

## 🚨 Break-Glass Account Setup

```
CRITICAL: Before enabling CA policies, create break-glass accounts!

  BREAK-GLASS ACCOUNT SETUP:
  ──────────────────────────────────────────────────────────────────
  1. Create 2 accounts:
     emergency-admin-01@yourtenant.onmicrosoft.com
     emergency-admin-02@yourtenant.onmicrosoft.com

  2. Assign: Global Administrator role (permanent!)

  3. Authentication:
     → FIDO2 hardware key (physical key stored in safe)
     → Long random password (100+ chars)
     → NO phone-based MFA (phones can be lost/sim-swapped)

  4. Exclusions:
     → Exclude from ALL Conditional Access policies
     → Exclude from PIM (these are emergency accounts)

  5. Monitoring:
     → Alert: ANY login by these accounts = incident!
     → They should NEVER be used in normal operations

  6. Storage:
     → Print credentials → seal in envelope → physical safe
     → Give one to CISO, one to on-call engineer
```

---

## ✅ Lab Checklist

```
PIM & CA LAB COMPLETE WHEN:
──────────────────────────────────────────────────────────────────
  PIM:
  □ diana's permanent Global Admin removed
  □ diana made ELIGIBLE for Global Admin via PIM
  □ Role settings: MFA required + approval required + 1 hour max
  □ Successfully tested: diana requests → you approve → she gets it
  □ Access review created (quarterly schedule)

  CONDITIONAL ACCESS:
  □ Legacy auth blocked (tested via CA sign-in log)
  □ MFA required for admin roles (tested with diana)
  □ Compliant device policy in report-only mode (reviewed logs)
  □ Risk-based policy configured

  BREAK-GLASS:
  □ Emergency admin accounts created
  □ Excluded from all CA policies
  □ Alert configured for any use of these accounts

  BONUS:
  □ Ran Named Locations to define trusted corporate IPs
  □ Created policy: Require MFA from outside Named Locations
```

---

**← Previous:** [04 - BloodHound Lab](./04-BloodHound-Lab.md)
**Next →** [06 - Interview Q&A](./06-Interview-QA.md)
