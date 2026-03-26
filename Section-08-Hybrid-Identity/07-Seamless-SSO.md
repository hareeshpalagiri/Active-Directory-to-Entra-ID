# 🔓 Seamless SSO (Seamless Single Sign-On)

> **Simple Definition:** Seamless SSO lets users who are **already logged into their work computer** access cloud apps like Microsoft 365 **without typing their password again** — it happens silently in the background using Kerberos.

---

## 🏢 The Office Badge Analogy

```
WITHOUT SEAMLESS SSO:                  WITH SEAMLESS SSO:
─────────────────────────────────      ──────────────────────────────────
You badge into the building            You badge into the building
You need a SEPARATE login              Walk up to Teams → already in!
  for every app (Teams, Outlook,       Walk up to SharePoint → already in!
  SharePoint, Azure portal...)         Walk up to Azure portal → already in!
Password fatigue → weak passwords      One login → everything just works 🎉
```

---

## ⚙️ How Seamless SSO Works

```
┌──────────────────────────────────────────────────────────────────────┐
│                    SEAMLESS SSO FLOW                                 │
│                                                                      │
│  1. Alice logs into           2. Alice opens browser                 │
│     her Windows PC               types: myapps.microsoft.com        │
│     (domain-joined)                                                  │
│  ┌──────────────┐            ┌─────────────────────────────┐        │
│  │  🖥️ Alice's  │            │  Browser sees: Entra ID     │        │
│  │    PC        │            │  login page                 │        │
│  │  Logged in   │            │                             │        │
│  │  as alice@   │            │  Silently contacts DC for   │        │
│  │  contoso.com │            │  Kerberos ticket...         │        │
│  └──────────────┘            └─────────────────────────────┘        │
│                                           │                          │
│  3. Browser gets Kerberos ticket for AZUREADSSO account             │
│  ─────────────────────────────────────────────────────              │
│  Domain Controller issues:                                           │
│  Kerberos service ticket for: AZUREADSSO$@corp.local                │
│  (Special computer account created during Seamless SSO setup)        │
│                                                                      │
│  4. Browser sends encrypted ticket to Entra ID                      │
│  ─────────────────────────────────────────────────────              │
│  HTTPS POST with Kerberos token in header                            │
│  Entra ID decrypts using AZUREADSSO$ computer account key            │
│                                                                      │
│  5. Entra ID validates → issues Access Token                        │
│  ─────────────────────────────────────────────────────              │
│  ✅ "Kerberos ticket valid → Alice is authenticated"                 │
│  → No password prompt shown to Alice!                                │
│  → Access to M365 apps granted                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 The AZUREADSSO$ Account — The Secret Ingredient

```
┌──────────────────────────────────────────────────────────────────┐
│  THE AZUREADSSO$ COMPUTER ACCOUNT                                │
│                                                                  │
│  Location: Active Directory (every domain)                       │
│  Type: Computer account                                          │
│  Name: AZUREADSSO$                                               │
│                                                                  │
│  HOW IT WORKS:                                                   │
│  ─────────────────────────────────────────────────────           │
│  • Created during Entra Connect Seamless SSO setup               │
│  • Has a shared Kerberos decryption key with Entra ID            │
│  • When browser gets Kerberos TGS for this account →             │
│    Entra ID can decrypt and verify it                            │
│                                                                  │
│  ANALOGY:                                                        │
│  It's like a "secret handshake" account between                  │
│  your AD and Microsoft's cloud                                   │
│                                                                  │
│  ⚠️  IMPORTANT: Roll this account's password every 30 days      │
│  (Entra Connect does this automatically if configured)           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🖥️ Requirements for Seamless SSO to Work

```
REQUIREMENTS:
──────────────────────────────────────────────────────────────────────

  ✅ Domain-joined Windows PC (AD joined or Hybrid AAD joined)
  ✅ Entra Connect with Seamless SSO enabled
  ✅ PTA or PHS as the auth method (not ADFS)
  ✅ Browser configured to trust Azure AD endpoints

BROWSER CONFIGURATION:
──────────────────────────────────────────────────────────────────────
  Internet Explorer / Edge:   Works automatically (Intranet zone)
  Chrome on Windows:          Works with Windows Account extension
  Firefox:                    Needs manual trusted site config
  Safari (macOS):             Works with Kerberos

INTRANET ZONE (Automatic for IE/Edge):
  Add to Intranet Trusted Sites (via GPO):
  ✅ https://autologon.microsoftazuread-sso.com
  ✅ https://aadg.windows.net.nsatc.net
  
  GPO path: Computer Config → Windows Settings →
  Internet Explorer Maintenance → Security Zones
```

---

## 🗺️ Seamless SSO + PTA vs PHS

```
SEAMLESS SSO WORKS WITH BOTH PTA AND PHS:

  WITH PTA:                           WITH PHS:
  ─────────────────────────           ─────────────────────────────
  Seamless SSO first attempts         Same flow
  If fails → PTA kicks in             If Kerberos fails → PHS used
  Password forwarded on-prem          Hash comparison in cloud

  RESULT: Same user experience        RESULT: Same user experience
  More on-prem dependency             More resilient

  DOES NOT WORK WITH ADFS:
  ──────────────────────────────────────────────────────────
  ADFS has its own SSO mechanism (Kerberos too, but different)
  Seamless SSO is disabled/irrelevant when ADFS is in use
```

---

## 🧪 Real-World Example

```
CONTOSO CORP - SEAMLESS SSO IN ACTION

  Monday Morning:
  ───────────────
  9:00 AM - Bob sits down at his desk, types Windows password
            → Logs into Windows normally (Kerberos TGT issued by DC)

  9:01 AM - Bob opens Chrome, goes to portal.azure.com
            → Browser silently gets Kerberos ticket for AZUREADSSO$
            → Ticket sent to Azure
            → Azure portal opens — Bob is already signed in!
            → No password prompt! 🎉

  9:02 AM - Bob opens teams.microsoft.com
            → Same Kerberos ticket (or PRT if Hybrid AAD Joined)
            → Teams opens — already signed in!

  9:15 AM - Bob's colleague sends a SharePoint link
            → Clicks link
            → SharePoint opens — already signed in!

  ALL DAY: Bob never types his password for cloud apps!


  What if Bob works from HOME:
  ─────────────────────────────────────────────────────
  Home PC is NOT domain-joined
  No Kerberos ticket available
  Entra ID: "No Kerberos, show login page"
  Bob types: username + password
  MFA prompt appears
  → Normal login, seamless SSO doesn't apply
```

---

## 🔧 Enable Seamless SSO (Quick Setup)

```
SETUP STEPS:

  1. Open Entra Connect (on your sync server)
  2. Click "Change user sign-in"
  3. On authentication page:
     ☑️  Enable single sign-on
  4. Enter Domain Admin credentials (to create AZUREADSSO$)
  5. Click Configure
  6. Deploy GPO to push Intranet Zone settings to all PCs

  VERIFY WITH POWERSHELL:
  ────────────────────────────────────────────────────────
  # Check if enabled in tenant
  Get-AzureADSSOStatus

  # Rollover the AZUREADSSO$ password (do every 30 days)
  Update-AzureADSSOForest -OnPremCredentials $creds
```

---

## 👮 Security Engineer's POV

> ⚠️ **The AZUREADSSO$ account holds a shared secret with Microsoft — it's a high-value target.**

```
🚨 ATTACK SCENARIO: "Silver Ticket for SSO"

  If attacker has NTLM hash of AZUREADSSO$ account:
  ─────────────────────────────────────────────────────
  1. Extract: secretsdump / Mimikatz to get AZUREADSSO$ hash
  2. Forge: Silver Ticket for AZUREADSSO$
  3. Pass the forged ticket to Entra ID endpoint:
     POST https://autologon.microsoftazuread-sso.com/...
  4. Entra ID: "Valid Kerberos ticket → here's your token"
  5. Attacker gets valid access token for ANY user!
  6. No MFA bypassed (device is "trusted" via Kerberos)

  → This is why rotating AZUREADSSO$ password is critical!


🛡️  DEFENSIVE MEASURES:
  ✅ Rotate AZUREADSSO$ password every 30 days!
  ✅ Monitor: Kerberos ticket requests for AZUREADSSO$
  ✅ Alert: Unusual access via autologon.microsoftazuread-sso.com
  ✅ Limit: Who can read AZUREADSSO$ attributes in AD
  ✅ Enable: Microsoft Defender for Identity
     → Detects Silver Ticket attacks
  ✅ Entra Sign-in logs: Watch for Seamless SSO from
     unusual devices/IPs

🔍  EVENT TO MONITOR:
  AD Security Log: Kerberos TGS requests for AZUREADSSO$
  Entra Sign-in: authenticationMethodsUsed = seamlessSSO
  Entra: "Successful" logins from non-corporate IPs using SSO
```

---

## ✅ Summary

```
┌───────────────────────────────────────────────────────────────┐
│  SEAMLESS SSO IN A NUTSHELL:                                  │
│                                                               │
│  🔓 Logged into Windows → automatic cloud app login          │
│  🎟️  Uses Kerberos (AD) as the identity proof                 │
│  🤫 Invisible to users — no prompts, no friction             │
│  ⚙️  Requires: Entra Connect + domain-joined PC              │
│  🔑 AZUREADSSO$ account = the "bridge" between AD & cloud     │
│  ⚠️  Rotate AZUREADSSO$ password every 30 days!              │
│                                                               │
│  BEST FOR: Improving user experience in hybrid environments   │
└───────────────────────────────────────────────────────────────┘
```

---

**← Previous:** [06 - Hybrid AAD Join](./06-Hybrid-AAD-Join.md)
**Next →** [08 - Section README & Summary](./Section-08-README.md)
