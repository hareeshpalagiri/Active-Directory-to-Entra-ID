# 02 — Authentication

> **Section:** 01 — IAM Core Concepts  
> **Difficulty:** Beginner → Intermediate  
> **Depends on:** [01-Introduction-to-IAM.md](./01-Introduction-to-IAM.md)

---

## 📌 What is Authentication?

In the previous topic we learned that an **identity** is who you are.

Authentication is the next step — **proving that you are who you claim to be.**

> **Simple definition:**  
> Authentication is the process of verifying that an identity is genuine.

### Real-World Analogy

You walk up to an ATM and insert your card.

- The card says **"I am Hareesh"** → That is identification
- The ATM asks for your PIN → That is authentication
- You enter the correct PIN → Identity is verified ✅
- ATM gives you access to your account → That is authorization

Authentication is the **PIN check** — the proof.

---

## 🔑 Authentication Factors

There are five types of authentication factors. Each one proves identity in a different way.

| Factor | Type | Examples |
|--------|------|---------|
| **Something you know** | Knowledge | Password, PIN, passphrase, security question |
| **Something you have** | Possession | Phone (OTP app), smart card, hardware token, USB key |
| **Something you are** | Biometric | Fingerprint, face scan, retina, voice |
| **Somewhere you are** | Location | Office IP address, GPS location, country |
| **Something you do** | Behavioural | Typing speed, mouse movement pattern |

### Single Factor vs Multi-Factor

```
Single Factor Authentication (SFA):
  Hareesh enters password → Access granted
  Problem: If password is stolen → attacker gets in ❌

Multi-Factor Authentication (MFA):
  Hareesh enters password (something you know)
       +
  Approves push notification on phone (something you have)
  → Both required → Access granted ✅
  Problem: Attacker has password but not Hareesh's phone ✅
```

> ⚠️ **Important:** Two factors from the **same category** is NOT MFA.  
> Two passwords = still single factor (both are "something you know").  
> A password + OTP = true MFA (knowledge + possession).

---

## ⚙️ How Authentication Works — Step by Step

### 1. Password Authentication

The most basic and most common form. A password is entered and compared to a stored value.

**How passwords are stored (correctly):**

```
GP sets his password: "Str0ng@Pass2024"
                │
                ▼
Hashing algorithm applied (bcrypt):
                │
                ▼
Hash stored in database: "$2b$12$xK9mP...qR7t"
(The actual password is NEVER stored)

At login:
GP enters "Str0ng@Pass2024"
                │
                ▼
Same hash algorithm applied to input
                │
                ▼
Result compared to stored hash
                │
      Match? ───┼─── Yes → Access granted ✅
                │
                └─── No  → Access denied ❌
```

**Password hashing algorithms:**

| Algorithm | Safe to use? | Notes |
|-----------|-------------|-------|
| MD5 | ❌ Never | Broken — cracks in seconds |
| SHA-1 | ❌ Never | Deprecated |
| SHA-256 | ⚠️ Acceptable | Better, but no built-in salting |
| bcrypt | ✅ Good | Slow by design — hard to brute force |
| Argon2 | ✅ Best | Winner of Password Hashing Competition |

**What is salting?**

```
Without salt:
  "password123" → always the same hash
  Attacker builds a rainbow table → cracks instantly

With salt (random value added before hashing):
  "password123" + "xK9mP2" (random salt) → unique hash
  Even if two users have the same password → different hashes
  Rainbow table attacks fail ✅
```

---

### 2. Multi-Factor Authentication (MFA)

#### TOTP — Time-Based One-Time Password

Used by apps like Microsoft Authenticator and Google Authenticator.

```
Setup:
  Server and Hareesh's phone share a secret key
       │
       ▼
Every 30 seconds:
  Both server and phone calculate:
  OTP = HMAC(secret_key, current_time / 30)
       │
       ▼
  They always get the same 6-digit code
  Code expires after 30 seconds → replay attacks fail
```

**Example login with TOTP:**
```
Hareesh logs into Azure portal:
  Step 1: Enter username + password
  Step 2: Open Microsoft Authenticator app
          → App shows: 4 8 2 1 9 3  (expires in 18 seconds)
  Step 3: Enter 482193
  Step 4: Access granted ✅
```

#### Push Notification MFA

```
Hareesh logs into company VPN:
  Step 1: Enter username + password
  Step 2: Phone receives push notification:
          "Approve sign-in to Company VPN?
           Location: Bengaluru, India
           Time: 09:05 AM
           [Approve] [Deny]"
  Step 3: Hareesh taps Approve
  Step 4: VPN connected ✅

If Hareesh gets a push he didn't request:
  → Tap Deny immediately
  → Someone has his password and is trying to log in
  → Report to IT security ← THIS IS MFA FATIGUE ATTACK PREVENTION
```

#### FIDO2 / Passkeys — The Most Secure MFA

Uses cryptography instead of passwords. This is the future of authentication.

```
Registration (one time):
  Hareesh's device generates:
    Private key → stays on device, NEVER leaves
    Public key  → sent to server and stored

Login:
  Server sends a challenge (random data)
       │
       ▼
  Device signs the challenge with private key
       │
       ▼
  Server verifies signature using stored public key
       │
       ▼
  Match → Access granted ✅

Why phishing can't steal this:
  The challenge is bound to the EXACT website domain
  A fake phishing site (fake-company.com) sends a challenge
  The FIDO2 key refuses — it's not registered for that domain
  Attack fails even if user visits the phishing site ✅
```

---

### 3. Biometric Authentication

| Type | How it works | Used where |
|------|-------------|-----------|
| **Fingerprint** | Sensor maps ridge patterns | Phones, laptops, door access |
| **Face Recognition** | IR camera maps facial geometry | Windows Hello, iPhone Face ID |
| **Retina/Iris** | Maps blood vessel patterns | High-security physical access |
| **Voice** | Analyses vocal characteristics | Phone banking |

**Windows Hello for Business example:**
```
GP sits at his workstation:
  Camera scans face (biometric)
       │
       ▼
  Windows Hello verifies face → matches stored template
       │
       ▼
  Device uses stored cryptographic key (FIDO2 under the hood)
       │
       ▼
  GP is logged into Windows + Azure AD simultaneously ✅
  No password typed. No password to steal.
```

---

### 4. Authentication Protocols

#### Kerberos (Active Directory)

The default authentication protocol in Windows domain environments.

```
Characters:
  Hareesh = the user who wants access
  KDC     = Key Distribution Centre (runs on Domain Controller)
  File01  = the server Hareesh wants to access

Step 1: Hareesh logs into his PC
  → PC sends encrypted request to KDC:
    "I am Hareesh, here is proof (encrypted with my password hash)"

Step 2: KDC verifies and gives Hareesh a TGT
  → TGT = Ticket Granting Ticket = his "day pass"
  → Valid for 10 hours
  → Encrypted with KRBTGT key (Hareesh cannot read it)

Step 3: Hareesh wants to access File01
  → Presents TGT to KDC: "I need access to File01"

Step 4: KDC issues a Service Ticket for File01
  → Encrypted with File01's secret key

Step 5: Hareesh presents Service Ticket to File01
  → File01 decrypts it → trusts it → grants access ✅

Key point: Hareesh's password is only used in Step 1.
           It never travels across the network again.
```

#### NTLM (Legacy)

Older protocol, still present in many environments.

```
Step 1: Hareesh → Server: "I want to authenticate"
Step 2: Server → Hareesh: Challenge (random number)
Step 3: Hareesh → Server: Response = Hash(NTLM_hash + challenge)
Step 4: Server verifies → Access granted/denied

Problem: The NTLM hash in Step 3 can be captured by an attacker
         and used directly to authenticate — without the password.
         This is the Pass-the-Hash attack.
```

---

## 🏢 Real-World Enterprise Scenarios

### Scenario 1 — New Employee First Login
```
Hareesh receives his laptop on Day 1.
IT has pre-configured:
  - Domain join
  - Windows Hello for Business enrollment required
  - MFA registration required before first access

Hareesh powers on the laptop:
  Step 1: Enters temporary password (from IT)
  Step 2: Forced to set a new password (meets complexity requirements)
  Step 3: Prompted to register Microsoft Authenticator app
  Step 4: Prompted to set up Windows Hello (face/fingerprint)

From Day 2 onwards:
  Hareesh logs in with face scan (Windows Hello)
  → No password typed
  → Strong authentication every single day ✅
```

### Scenario 2 — VPN from Home
```
GP works from home and connects to company VPN:
  Step 1: Opens Cisco AnyConnect
  Step 2: Enters username: gp@company.com
  Step 3: Enters password
  Step 4: RADIUS sends authentication request to AD
  Step 5: AD verifies credentials
  Step 6: Duo MFA push sent to GP's phone
  Step 7: GP approves on phone
  Step 8: VPN connected ✅

If attacker has GP's password but not his phone:
  Step 6 fails → VPN access denied ✅
```

---

## ⚠️ Authentication Attacks

### 1. Brute Force
```
What: Try every possible password combination
Tool: Hydra, Hashcat
Example: Try aaa, aab, aac... all combinations until match found
Defense: Account lockout after N failed attempts, long passwords
```

### 2. Dictionary Attack
```
What: Try a list of common/leaked passwords
Tool: Hashcat with rockyou.txt (14 million real passwords)
Example: Try "password", "123456", "company2024" etc.
Defense: Block common passwords, breach password monitoring
```

### 3. Password Spraying
```
What: Try one common password across MANY accounts
Why: Avoids lockout — only 1-3 attempts per account
Example:
  Try "Winter2024!" against:
  hareesh@company.com → fail
  gp@company.com      → fail
  finance@company.com → SUCCESS ← one weak password found

Defense: MFA, anomaly detection, smart lockout policies
```

### 4. MFA Fatigue (Push Bombing)
```
What: Attacker has the password.
      Sends dozens of MFA push notifications, often at 2-3am.
      Hopes user gets frustrated and taps Approve to stop them.

Example: Uber breach 2022 — attacker bombarded employee with
         pushes until they approved.

Defense: Number matching MFA (user must type a code shown
         on screen, not just tap approve)
```

### 5. Pass-the-Hash
```
What: Capture NTLM hash and use it directly — no password needed
Tool: Mimikatz
Example:
  Attacker compromises Hareesh's workstation
  Runs: mimikatz → sekurlsa::logonpasswords
  Gets: NTLM hash of GP (who logged into this machine earlier)
  Uses GP's hash to authenticate to other servers
  → Lateral movement without ever knowing the password

Defense: Credential Guard, Protected Users group, disable NTLM
```

### 6. Kerberoasting
```
What: Any domain user can request service tickets for service accounts.
      The ticket is encrypted with the service account's password hash.
      Attacker takes the ticket offline and cracks it.

Example:
  Hareesh (regular user) runs: Invoke-Kerberoast
  Gets encrypted service ticket for svc_backup account
  Runs Hashcat against it → cracks weak password in 2 hours
  Logs in as svc_backup → which has Domain Admin rights

Defense: Long random passwords on service accounts (25+ chars), gMSA
```

---

## 🛡️ How to Defend Authentication

### Checklist

- [ ] Enforce MFA for ALL users — especially admins
- [ ] Use phishing-resistant MFA (FIDO2/Passkeys) for privileged accounts
- [ ] Never use SMS OTP for high-value accounts (SIM swap risk)
- [ ] Enforce minimum password length of 14+ characters
- [ ] Block common and breached passwords
- [ ] Enable smart account lockout
- [ ] Deploy Windows Hello for Business
- [ ] Enable Credential Guard to protect NTLM hashes
- [ ] Add privileged accounts to Protected Users group
- [ ] Use gMSA for all service accounts
- [ ] Monitor for password spray: many 4625 events across different accounts
- [ ] Monitor for impossible travel alerts

### Key Event IDs to Watch

| Event ID | Meaning |
|----------|---------|
| 4624 | Successful logon |
| 4625 | Failed logon — check SubStatus for reason |
| 4648 | Logon using explicit credentials |
| 4740 | Account locked out |
| 4768 | Kerberos TGT requested |
| 4769 | Kerberos Service Ticket requested |
| 4771 | Kerberos pre-auth failed |
| 4776 | NTLM authentication attempt |

---

## 🔧 Troubleshooting

### User locked out
```powershell
# Check account status
Get-ADUser -Identity "hareesh" -Properties LockedOut, BadLogonCount

# Unlock
Unlock-ADAccount -Identity "hareesh"

# Find source of lockout (Event ID 4740 on DC)
Get-WinEvent -ComputerName "DC01" -FilterHashtable @{
    LogName='Security'; Id=4740
} | Where-Object { $_.Message -match "hareesh" }
```

### Kerberos clock skew error
```
Error: "The time at the Primary Domain Controller is different
        than the time at the Backup Domain Controller"
Fix: Sync time — Kerberos requires within 5 minutes
net time /domain /set /yes
```

---

## 🎯 Interview Questions

**Q1. What is the difference between identification and authentication?**  
**A:** Identification is claiming an identity — saying "I am Hareesh." Authentication is proving that claim — entering a password, OTP, or fingerprint. Identification alone is meaningless without authentication. A system must verify the claim before granting any access.

---

**Q2. What makes something true MFA?**  
**A:** True MFA requires two or more factors from *different categories* — something you know, something you have, or something you are. Two passwords is not MFA — they are both "something you know." A password plus an OTP from an authenticator app is true MFA — knowledge plus possession.

---

**Q3. Why is NTLM considered weaker than Kerberos?**  
**A:** NTLM uses a challenge-response mechanism where the NTLM hash of the password is used in the response. This hash can be captured from network traffic or from memory (using tools like Mimikatz) and used directly to authenticate — a Pass-the-Hash attack. Kerberos is more secure because it uses time-limited tickets, mutual authentication, and the password hash is only used once at initial login — tickets are used for subsequent authentication.

---

**Q4. What is password salting and why is it important?**  
**A:** A salt is a random value added to a password before hashing. Without salting, identical passwords produce identical hashes — attackers can precompute a rainbow table mapping common passwords to their hashes and look up hashes instantly. With salting, each password produces a unique hash even if two users have the same password, making rainbow table attacks useless.

---

**Q5. Scenario — GP receives 15 MFA push notifications at 2am that he didn't request. What is happening and what should he do?**  
**A:** This is an MFA fatigue attack — the attacker already has GP's password and is repeatedly triggering push notifications hoping GP approves one to stop the notifications. GP should: (1) Deny all push notifications. (2) Not approve anything. (3) Immediately call IT security (not email — email may be compromised). (4) IT should reset GP's password immediately and check sign-in logs for the source IP. The organisation should also switch to number-matching MFA to prevent future fatigue attacks.

---

*"A password alone is a single point of failure. MFA makes attackers need to compromise two things simultaneously — dramatically harder than one."*
