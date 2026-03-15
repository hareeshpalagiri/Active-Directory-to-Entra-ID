# 06 — Zero Trust Architecture

> **Section:** 01 — IAM Core Concepts  
> **Difficulty:** Intermediate  
> **Depends on:** Authentication, Authorization, PAM

---

## 📌 What is Zero Trust?

For decades, the security model was simple:

> *"Everything inside the network is safe. Everything outside is dangerous."*

This was called the **castle-and-moat** model. The firewall was the moat. Once you were inside — you were trusted.

**Zero Trust throws that model away.**

> **Zero Trust definition:**  
> Never trust anything or anyone by default — inside or outside the network.  
> Always verify. Always authenticate. Always authorise. Every request. Every time.

---

## 🏰 Old Model vs Zero Trust

### The Old Model — Castle and Moat

```
Outside (Untrusted)          │  Inside (Trusted)
─────────────────────────────┼──────────────────────────────
Internet                     │  Company Network
Attackers                    │  All employees
                             │  All servers
        FIREWALL ────────────┤  All devices
        (the moat)           │  ← Once inside, TRUSTED
                             │
Problem: Attacker gets inside once (via phishing, VPN, etc.)
         → Can move freely across the entire network
         → Access any server, any database
         → Nobody questions them
```

### The Zero Trust Model

```
Every request — regardless of source — must prove:
  1. WHO are you?         → Identity verified
  2. IS THIS YOUR device? → Device health checked
  3. WHAT do you need?    → Least privilege enforced
  4. SHOULD you have it?  → Policy evaluated in real time
  5. IS THIS NORMAL?      → Behaviour analysed

Even if you are:
  → Already inside the network ← still verify
  → A domain admin ← still verify
  → Using a company laptop ← still verify
  → Coming from the office ← still verify
```

---

## 🧠 The Three Principles of Zero Trust

### 1. Verify Explicitly

Always authenticate and authorise based on **all available data points** — not just location.

```
Old model check:
  "Are you on the company network?" → Yes → TRUSTED ✅

Zero Trust check:
  "Who are you?"              → hareesh@company.com ✅
  "Is MFA satisfied?"         → Yes ✅
  "Is the device compliant?"  → Yes — updated, encrypted ✅
  "What is the risk score?"   → Low — normal behaviour ✅
  "What location?"            → Bengaluru — expected ✅
  "What are you requesting?"  → Read access to FileShare ✅
  → All checks pass → Access granted ✅

Same user, suspicious scenario:
  "Who are you?"              → hareesh@company.com ✅
  "Is MFA satisfied?"         → Yes ✅
  "Is the device compliant?"  → NO — personal unmanaged device ❌
  → One check fails → Access denied or limited ❌
```

### 2. Use Least Privilege Access

Grant only the minimum permissions needed. Use Just-in-Time access for elevated permissions.

```
GP needs to perform a Domain Admin task:
  Normal state: GP has standard user rights only
  
  GP requests elevation:
    → Justification submitted: "Patching DC01 — Change ticket CHG-4521"
    → Manager approval received
    → Domain Admin rights granted for 2 hours
    → Automatic revocation at end of window
    → Full audit trail recorded
    
  After 2 hours:
    → Rights automatically removed
    → GP back to standard user ✅
```

### 3. Assume Breach

Design the system as if attackers are already inside. This changes how you build defences.

```
Old mindset (castle):
  "The firewall will stop attackers from getting in"
  → If firewall is breached → game over

Zero Trust mindset:
  "Assume the attacker is already inside"
  → Segment everything → attacker cannot move freely
  → Encrypt everything → attacker cannot read data even if they reach it
  → Log everything → attacker's actions are visible
  → Verify everything → attacker cannot impersonate a trusted user
  → If one segment is breached → rest of network is still safe
```

---

## ⚙️ Zero Trust in Practice — The Five Pillars

### Pillar 1 — Identity

Every person and system must have a verified identity. Identity is the new perimeter.

```
Controls:
  ✅ Strong MFA for all users
  ✅ Phishing-resistant MFA (FIDO2) for admins
  ✅ Identity Protection risk scoring
  ✅ Conditional Access policies
  ✅ Privileged Identity Management (JIT)

Example:
  Hareesh logs in from a new device at an unusual time
  → Entra ID Identity Protection flags it as medium risk
  → Conditional Access triggers step-up authentication
  → Hareesh must complete additional MFA challenge
  → If he can't → access blocked until verified by IT
```

### Pillar 2 — Devices

Only trusted, managed, compliant devices should access company resources.

```
Controls:
  ✅ Device enrolled in Intune (MDM)
  ✅ Compliant: OS up to date, encryption enabled, AV active
  ✅ Conditional Access blocks unmanaged devices
  ✅ Certificate issued by company CA

Example:
  GP tries to access company email from his personal laptop:
  
  Conditional Access policy check:
    Device managed by Intune? → NO ❌
  
  Result: Access blocked. GP sees message:
  "This device is not compliant. Enrol your device or
   use a managed company device to access this resource."
```

### Pillar 3 — Network

Segment the network so a breach in one area cannot spread everywhere.

```
Traditional flat network (dangerous):
  Server room ←──────────────────────────────► Workstations
  Domain Controllers ◄────────────────────────► All employees
  Database servers ◄──────────────────────────► Everyone
  
  Attacker compromises one workstation → reaches everything

Zero Trust segmented network:
  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐
  │  Tier 0 Zone    │    │  Tier 1 Zone    │    │  User Zone  │
  │  Domain Ctrls   │    │  App Servers    │    │  Workstns   │
  │  PKI Servers    │    │  DB Servers     │    │  Laptops    │
  └────────┬────────┘    └────────┬────────┘    └──────┬──────┘
           │ Firewall             │ Firewall            │
           └──────────────────────┴─────────────────────┘
  
  Attacker compromises workstation → blocked by firewall
  Cannot reach DB servers or Domain Controllers
```

### Pillar 4 — Applications

Applications verify identity and enforce authorisation on every request — not just at login.

```
Old approach:
  User logs in once → session cookie created
  All subsequent requests → trusted automatically
  If session cookie stolen → attacker has full access

Zero Trust approach:
  Every API call is authenticated and authorised
  Short-lived tokens (15 minutes) → limit damage window
  Continuous Access Evaluation (CAE):
    If user account is disabled mid-session
    → Resource server (e.g. SharePoint) is notified in real time
    → Session terminated immediately
    → Not waiting for token to expire
```

### Pillar 5 — Data

Protect data itself — not just the perimeter around it.

```
Controls:
  ✅ Data classification (Public, Internal, Confidential, Restricted)
  ✅ Encryption at rest and in transit
  ✅ Microsoft Purview Information Protection (sensitivity labels)
  ✅ DLP (Data Loss Prevention) policies

Example:
  GP emails a document labelled "Restricted — Finance Data"
  to an external address:
  
  DLP policy detects:
    → Document classification: Restricted
    → Recipient: external domain
    → Policy: Block and notify
  
  Email blocked. GP receives notification:
  "This email contains restricted data and cannot be sent
   to external recipients. Contact your manager for approval."
```

---

## 🏢 Real-World Zero Trust Scenarios

### Scenario 1 — Remote Work

```
Before Zero Trust:
  Employee connects to VPN → full network access
  VPN = implicit trust → can reach any server
  
  Attacker steals VPN credentials:
  → Full network access → lateral movement → breach

After Zero Trust:
  Employee connects from home:
  → MFA verified ✅
  → Device compliance checked ✅
  → Conditional Access grants access to SPECIFIC apps only
  → No full network access — only what their role needs
  → Even if credentials stolen → attacker limited to those specific apps
  → Device check fails → no access at all
```

### Scenario 2 — Insider Threat Detection

```
Hareesh (IT Admin) suddenly starts:
  → Accessing finance database (never done before)
  → Downloading large volumes of data
  → At 11pm on a Friday

Zero Trust response:
  Identity Protection detects unusual behaviour
  Risk score elevated to HIGH
  Conditional Access blocks further access
  SOC alert triggered
  
  Investigation:
  → Hareesh's account was compromised via phishing
  → Attacker was performing data exfiltration
  → Blocked within minutes, not days ✅
```

### Scenario 3 — Zero Trust for Service Accounts

```
A web application needs to query a database.

Old approach:
  App uses hardcoded username/password → stored in config file
  → Developer accidentally commits config to public GitHub
  → Database exposed to internet

Zero Trust approach:
  App uses Managed Identity (no password at all)
  → Azure automatically handles authentication
  → Managed Identity has only SELECT permission on specific tables
  → No other access
  → Access reviewed quarterly
  → No credentials to steal ✅
```

---

## ⚠️ Common Zero Trust Mistakes

### Mistake 1 — Treating it as a product
```
Wrong: "We bought a Zero Trust solution, we're done"
Right: Zero Trust is a strategy and mindset — not a single product
       It requires changes to identity, devices, network, apps and data
```

### Mistake 2 — Starting with network instead of identity
```
Wrong: "We segmented the network, that's Zero Trust"
Right: Identity is the foundation — start there
       Verify WHO before worrying about WHERE they are
```

### Mistake 3 — Going too strict too fast
```
Wrong: Blocking everything immediately → users can't work → they bypass controls
Right: Start with monitoring, then gradually enforce
       Phase 1: Audit what exists
       Phase 2: Enforce MFA
       Phase 3: Device compliance
       Phase 4: Network segmentation
       Phase 5: Data protection
```

---

## 🛡️ Zero Trust Implementation Checklist

- [ ] Enable MFA for all users — no exceptions
- [ ] Enrol all devices in MDM (Intune)
- [ ] Configure Conditional Access policies
- [ ] Implement Identity Protection risk policies
- [ ] Deploy JIT access (Azure PIM) for all privileged roles
- [ ] Segment the network — no flat open access
- [ ] Encrypt all data at rest and in transit
- [ ] Classify data and apply sensitivity labels
- [ ] Enable Continuous Access Evaluation (CAE)
- [ ] Deploy Microsoft Defender for Identity
- [ ] Enable full audit logging across all systems
- [ ] Conduct regular access reviews

---

## 👨‍💻 Zero Trust — Cybersecurity Professional View

### SOC Analyst
- Monitors Identity Protection risky sign-ins dashboard daily
- Investigates Conditional Access policy failures
- Alerts on unusual data access patterns (Insider Risk Management)
- Reviews impossible travel and unfamiliar sign-in properties alerts

### Security Engineer
- Designs and implements Conditional Access policies
- Configures network segmentation and microsegmentation
- Deploys and manages Intune device compliance policies
- Implements data classification and DLP policies
- Builds Zero Trust maturity roadmap for the organisation

### Penetration Tester
- Tests whether network segmentation actually prevents lateral movement
- Checks if Conditional Access policies can be bypassed
- Tests for device compliance check bypasses
- Verifies that assumed-breach scenarios are properly contained

---

## ❓ Think About This

1. In a traditional VPN-based network, what happens if an attacker steals VPN credentials? How does Zero Trust change this outcome?
2. A user is inside the office, on a company-managed device, using a company laptop. Should they still be required to authenticate with MFA? Why?
3. What would the "assume breach" mindset change about how you design your file server access structure?
4. How would you phase in Zero Trust in an organisation of 500 employees without disrupting productivity?
5. A developer needs temporary access to a production database to debug an issue. How would Zero Trust principles shape how you grant that access?

---

## 🎯 Interview Questions

**Q1. What is Zero Trust and what problem does it solve?**  
**A:** Zero Trust is a security model based on the principle "never trust, always verify." It solves the problem of the traditional perimeter-based security model where everything inside the network was implicitly trusted. In modern environments, users work from anywhere, data lives in the cloud, and attackers can get inside the network perimeter. Zero Trust removes that implicit trust and requires every access request to be explicitly verified regardless of where it comes from.

---

**Q2. What are the three core principles of Zero Trust?**  
**A:** (1) Verify explicitly — always authenticate and authorise using all available data points including identity, device health, location, and behaviour. (2) Use least privilege — grant minimum access needed, use JIT for elevated permissions. (3) Assume breach — design as if attackers are already inside — segment networks, encrypt data, log everything so a breach in one area cannot spread.

---

**Q3. What is the difference between the castle-and-moat model and Zero Trust?**  
**A:** In the castle-and-moat model, the firewall is the perimeter — everything inside is trusted, everything outside is untrusted. Once an attacker bypasses the firewall (via phishing, VPN credential theft, etc.), they have free movement inside. Zero Trust removes that implicit internal trust — every user, device, and application must prove they should have access every time, regardless of whether they are inside or outside the network.

---

**Q4. Why is identity called "the new perimeter" in Zero Trust?**  
**A:** In the old model, the network boundary (firewall) was the perimeter. In Zero Trust, users work from anywhere — home, coffee shops, cloud — so the network boundary is meaningless. What remains constant is identity — you always know WHO is making a request. Identity verification (who you are, with MFA, device compliance, risk score) becomes the control point for every access decision, replacing the old network location check.

---

**Q5. Scenario — Your organisation implements Zero Trust. A user's credentials are stolen via phishing. How does Zero Trust limit the damage compared to the old model?**  
**A:** Old model: attacker logs in with stolen credentials → full network access → reaches any server, any database, pivots laterally → full breach. With Zero Trust: attacker logs in with stolen credentials → MFA challenge fires (attacker doesn't have the phone) → blocked. If somehow MFA is bypassed → device compliance check fails (attacker is on their own device, not enrolled in MDM) → blocked. If device check passes → access limited to only the specific apps that user's role requires → cannot reach Domain Controllers or databases → least privilege contains the damage. Identity Protection flags unusual behaviour → risk score elevated → session terminated → SOC alerted.

---

*"Zero Trust is not about trusting nothing — it is about verifying everything. The goal is not paranoia, it is precision."*
