# 💻 Hybrid Azure AD Join (Hybrid AAD Join)

> **Simple Definition:** Hybrid AAD Join means a Windows computer is **registered in BOTH your on-premise Active Directory AND Microsoft Entra ID** at the same time — giving users seamless access to both local and cloud resources from one device.

---

## 🎒 The School Backpack Analogy

```
IMAGINE A STUDENT'S LAPTOP:

  WITHOUT HYBRID JOIN:                WITH HYBRID JOIN:
  ─────────────────────────           ──────────────────────────────
  Works at school (AD)                Works at school ✅
  Can't access school                 Works at home ✅
    cloud apps from home              Access to Teams ✅
  IT can't manage remotely            IT can manage it remotely ✅
  No Conditional Access               Conditional Access enforced ✅
```

---

## 🏗️ What Does "Joined" Mean?

A device can be in one of several states:

```
DEVICE JOIN STATES:

  ┌────────────────────────────────────────────────────────────────┐
  │                                                                │
  │  1. AD JOINED (traditional)                                    │
  │     ────────────────────────────────────                      │
  │     • Joined to on-prem AD only                               │
  │     • Works inside office                                      │
  │     • No cloud management                                      │
  │     • Group Policy applies                                     │
  │                                                                │
  │  2. ENTRA ID JOINED (cloud-only)                               │
  │     ────────────────────────────────────                      │
  │     • Cloud only, no AD                                        │
  │     • Works anywhere                                           │
  │     • Intune managed                                           │
  │     • Great for remote workers                                 │
  │                                                                │
  │  3. HYBRID AAD JOINED ← THIS FILE                             │
  │     ────────────────────────────────────                      │
  │     • Joined to BOTH AD and Entra ID                          │
  │     • Best of both worlds                                      │
  │     • GPO + Intune possible                                    │
  │     • Works in office AND remotely                             │
  │                                                                │
  │  4. ENTRA REGISTERED (personal device)                        │
  │     ────────────────────────────────────                      │
  │     • BYOD / personal phone/laptop                            │
  │     • Lightweight registration                                 │
  │     • Access to M365 apps only                                 │
  └────────────────────────────────────────────────────────────────┘
```

---

## 🌊 How Hybrid AAD Join Works

```
┌──────────────────────────────────────────────────────────────────────┐
│              HYBRID AAD JOIN REGISTRATION PROCESS                    │
│                                                                      │
│  STEP 1: Computer joins domain (classic AD join)                    │
│  ─────────────────────────────────────────────────                  │
│  IT Admin joins PC to corp.local domain                              │
│  PC gets a computer account in AD                                    │
│                                                                      │
│  STEP 2: Entra Connect syncs computer object                        │
│  ─────────────────────────────────────────────────                  │
│  Entra Connect sees new computer in AD                               │
│  Syncs it to Entra ID as "registered device"                        │
│                                                                      │
│  STEP 3: Device contacts Azure for registration                     │
│  ─────────────────────────────────────────────────                  │
│  Windows Task Scheduler runs:                                        │
│  "Automatic-Device-Join" task on boot/login                         │
│  PC contacts: enterpriseregistration.windows.net                    │
│                                                                      │
│  STEP 4: Device gets a certificate from Entra ID                    │
│  ─────────────────────────────────────────────────                  │
│  Entra ID issues a device certificate                               │
│  Stored in: Local Machine certificate store                         │
│                                                                      │
│  STEP 5: Primary Refresh Token (PRT) issued                         │
│  ─────────────────────────────────────────────────                  │
│  When user logs in → PRT issued                                     │
│  PRT = SSO ticket for all cloud apps                                │
│  Expires: 14 days (auto-renewed on use)                             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🎟️ What is a PRT (Primary Refresh Token)?

The PRT is the magic behind seamless SSO:

```
PRIMARY REFRESH TOKEN (PRT)

  ┌────────────────────────────────────────────────────────────┐
  │  Think of PRT as a "master key card" for the building      │
  │                                                            │
  │  Created when: User logs into Hybrid AAD Joined device     │
  │  Stored in: LSASS (protected memory)                       │
  │  Valid for: 14 days, renewed automatically                 │
  │                                                            │
  │  WHAT IT ENABLES:                                          │
  │  User opens browser → types teams.microsoft.com            │
  │  Browser calls WAM (Web Auth Manager)                      │
  │  WAM uses PRT to get an access token silently              │
  │  User is signed in → NO PASSWORD PROMPT! 🎉               │
  │                                                            │
  │  WORKS FOR:                                                │
  │  ✅ Microsoft 365 apps                                     │
  │  ✅ Azure portal                                           │
  │  ✅ Any app integrated with Entra ID                       │
  └────────────────────────────────────────────────────────────┘
```

---

## 🔑 Conditional Access & Device Compliance

Hybrid AAD Join unlocks powerful Conditional Access policies:

```
CONDITIONAL ACCESS EXAMPLE:

  POLICY: "Only allow SharePoint access from corporate devices"

  Without Hybrid Join:           With Hybrid Join:
  ──────────────────────         ─────────────────────────────
  Can't verify if device         Entra ID knows device is:
    is corporate                 • Hybrid AAD Joined ✅
  Either allow all or            • Compliant with Intune ✅
    block all                    • Running updated Windows ✅

  RESULT: SharePoint access      RESULT: Only corp PCs get in
    granted from any device        Personal devices blocked

  SCENARIO: Employee's home PC tries to access SharePoint
  ──────────────────────────────────────────────────────────
  PC is NOT Hybrid AAD Joined
  Conditional Access policy detects this
  Policy: BLOCK ❌
  Message: "This app can only be accessed from compliant devices"
  Employee: "Let me use my work laptop instead!"
```

---

## 🛠️ Configuring Hybrid AAD Join

```
PREREQUISITES:
──────────────────────────────────────────────────────────────
  ✅ Entra Connect installed and running
  ✅ Device writeback enabled in Entra Connect
  ✅ Service Connection Point (SCP) configured in AD
  ✅ Windows 10/11 (or Windows Server 2016+)
  ✅ DNS resolvable: enterpriseregistration.windows.net


SERVICE CONNECTION POINT (SCP):
──────────────────────────────────────────────────────────────
  The SCP tells domain-joined PCs where to register.
  Lives in AD at:
  CN=62a0ff2e-97b9-4513-943f-0d221bd30080,
  CN=Device Registration Configuration,
  CN=Services,CN=Configuration,DC=corp,DC=local

  Contains: Your Entra ID Tenant ID


ENTRA CONNECT SETUP:
──────────────────────────────────────────────────────────────
  Open Entra Connect Wizard
  → Configure device options
  → Enable: Configure Hybrid Azure AD join
  → Select: Windows 10 or later (or downlevel)
  → Entra Connect auto-configures SCP!
```

---

## 🔍 Verify a Device is Hybrid Joined

```
CHECK ON THE WINDOWS PC:
──────────────────────────────────────────────────────────────

  Command:   dsregcmd /status

  Output to look for:

  +----------------------------------------------------------------------+
  | Device State                                                         |
  +----------------------------------------------------------------------+
  
    AzureAdJoined : YES         ← In Entra ID
    DomainJoined  : YES         ← In on-prem AD
    
  [SSO State]
    AzureAdPrt : YES            ← Has a valid PRT (SSO working!)


  CHECK IN ENTRA PORTAL:
  ──────────────────────────────────────────────────────────────
  Entra ID → Devices → All devices
  Filter: Join type = Hybrid Azure AD joined
  
  Device shows:
  • Name: CONTOSO-PC01
  • Join type: Hybrid Azure AD joined
  • Compliant: Yes/No (if Intune is set up)
  • Last activity: Today
```

---

## 👮 Security Engineer's POV

> ⚠️ **PRT theft = account takeover without needing a password. This is a top attack target.**

```
🚨 PRT THEFT ATTACK:

  ATTACK: Pass-the-PRT
  ─────────────────────────────────────────────────────────
  1. Attacker compromises a Hybrid AAD Joined PC
  2. Dumps PRT from LSASS with tools like:
     - AADInternals
     - roadtx (Entra ID attack toolkit)
     - Mimikatz cloud extensions
  3. Exports PRT + session key
  4. Uses PRT from attacker's machine:
     roadtx.exe gettokens --prt <value>
  5. Gets full Entra ID access tokens
  6. Access Teams, SharePoint, Azure → without password!
  7. Even MFA is bypassed (device is already "trusted")!


🛡️  DEFENSIVE MEASURES:
  ✅ Enable Conditional Access: Require compliant device
  ✅ Intune device compliance = Defender running, up to date
  ✅ Microsoft Defender for Endpoint detects PRT abuse
  ✅ Token Protection (Conditional Access) - binds token to device
  ✅ Privileged Identity Management for admin accounts
  ✅ Monitor: New device registration events
  ✅ Alert on: PRT used from unusual locations/IPs
  ✅ Credential Guard: Protects LSASS, harder to dump PRT

🔍  DETECT PRT THEFT:
  Sign-in log: device ID mismatch vs user's normal device
  Sign-in log: impossible travel (token used in 2 countries)
  Defender: Alert "Suspicious Entra token use"
```

---

## 📊 Hybrid Join vs Cloud Join Comparison

```
                    HYBRID AAD JOIN      ENTRA ID JOINED
                    ─────────────────    ───────────────────
Domain joined       ✅ Yes (on-prem)     ❌ No
Cloud joined        ✅ Yes               ✅ Yes
Group Policy (GPO)  ✅ Yes               ❌ No (Intune only)
Intune MDM          ✅ Yes               ✅ Yes
Works off-VPN       ✅ With PRT          ✅ Always
On-prem resources   ✅ Direct access     ✅ via VPN/proxy
Best for            Existing AD corps    New setups/remote
Migration effort    Low (reuse AD)       High (rebuild)
```

---

## ✅ Summary

```
┌──────────────────────────────────────────────────────────────┐
│  HYBRID AAD JOIN IN A NUTSHELL:                              │
│                                                              │
│  💻 Device registered in BOTH AD and Entra ID               │
│  🎟️  PRT = silent SSO to all cloud apps                      │
│  🔒 Enables Conditional Access device checks                 │
│  🛡️  Compliant device = stronger security posture           │
│  ⚠️  PRT theft bypasses password + MFA                       │
│  ✅ Use Credential Guard + Token Protection to defend        │
│                                                              │
│  BEST FOR: Existing AD environments going hybrid             │
└──────────────────────────────────────────────────────────────┘
```

---

**← Previous:** [05 - ADFS Federation](./05-ADFS-Federation.md)
**Next →** [07 - Seamless SSO](./07-Seamless-SSO.md)
