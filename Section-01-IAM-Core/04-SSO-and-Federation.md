# 04 — SSO & Federation

> **Section:** 01 — IAM Core Concepts  
> **Difficulty:** Intermediate  
> **Depends on:** [02-Authentication.md](./02-Authentication.md), [03-Authorization.md](./03-Authorization.md)

---

## 📌 What is SSO?

Without SSO, a typical employee's day looks like this:

```
Hareesh arrives at work:
  8:59am  → Logs into Windows (username + password)
  9:01am  → Opens Salesforce (different username + password)
  9:05am  → Opens ServiceNow (different username + password)
  9:10am  → Opens Jira (different username + password)
  9:15am  → Opens SharePoint (same as Windows? or different?)
  9:20am  → Opens HR portal (yet another password)

Result:
  Hareesh has 6 different passwords
  He reuses the same password everywhere (human nature)
  One breach of any app = all accounts at risk ❌
  IT cannot enforce MFA consistently ❌
  When Hareesh leaves — IT must disable 6 separate accounts ❌
```

With SSO:

```
Hareesh arrives at work:
  8:59am  → Logs into Windows (password + MFA) ← ONE login
  9:01am  → Opens Salesforce → automatically logged in ✅
  9:05am  → Opens ServiceNow → automatically logged in ✅
  9:10am  → Opens Jira → automatically logged in ✅
  9:15am  → Opens SharePoint → automatically logged in ✅
  9:20am  → Opens HR portal → automatically logged in ✅

Result:
  One strong password + MFA protects everything ✅
  IT enforces MFA at one place — applies to all apps ✅
  Hareesh leaves — disable one account — all access gone ✅
```

> **Simple definition:**  
> Single Sign-On (SSO) allows a user to authenticate once and access multiple applications without re-entering credentials.

---

## 🌐 What is Federation?

SSO works within one organisation. **Federation** extends SSO **across different organisations**.

```
Scenario:
  Company A uses Azure AD
  Company B (a partner) uses Okta

  A consultant from Company B needs to access Company A's SharePoint.

  Without federation:
    IT creates a separate account for the consultant in Company A's AD
    → Another account to manage
    → Another password to remember
    → When consultant leaves Company B — their Company A account may never be disabled

  With federation:
    Company B's Okta and Company A's Azure AD establish a TRUST
    Consultant logs into their Company B Okta account
    Company A's SharePoint recognises Company B's Okta as trusted
    → Consultant gets access using their OWN credentials ✅
    → When consultant leaves Company B → their Okta account disabled
    → Access to Company A automatically revoked ✅
    → Company A never had to create a separate account
```

> **Simple definition:**  
> Federation is a trust relationship between two identity systems that allows users from one system to access resources in the other using their existing credentials.

---

## 🔑 Key Roles in SSO/Federation

| Role | What it does | Example |
|------|-------------|---------|
| **Identity Provider (IdP)** | Authenticates the user, issues tokens | Azure AD, Okta, Google |
| **Service Provider (SP)** | The app the user wants to access | Salesforce, Jira, SharePoint |
| **Token / Assertion** | Proof that authentication happened | SAML Assertion, JWT token |
| **Trust** | SP trusts tokens from the IdP | Configured via certificates |

```
Simple SSO flow:

Hareesh → Salesforce: "I want in"
Salesforce → Hareesh: "I don't know you — go prove yourself to Azure AD"
Hareesh → Azure AD: authenticates (password + MFA)
Azure AD → Salesforce: "I've verified Hareesh — here is his signed token"
Salesforce → Hareesh: "Welcome ✅"

Next time (Jira):
Hareesh → Jira: "I want in"
Jira → Azure AD: "Is Hareesh already authenticated?"
Azure AD → Jira: "Yes — here is his token"
Jira → Hareesh: "Welcome ✅" (no login prompt shown to Hareesh)
```

---

## ⚙️ SSO Protocols — How They Work

### Protocol 1 — SAML 2.0 (Enterprise SSO)

SAML (Security Assertion Markup Language) is the dominant enterprise SSO protocol. It uses XML-based messages called **assertions**.

**Used for:** Enterprise apps — Salesforce, ServiceNow, Workday, AWS Console

**Full SP-Initiated SAML Flow:**

```
Step 1: Hareesh opens Salesforce
        URL: https://company.salesforce.com

Step 2: Salesforce checks — no active session
        Salesforce creates a SAML AuthnRequest:
        <samlp:AuthnRequest
          Destination="https://login.microsoftonline.com/..."
          AssertionConsumerServiceURL="https://company.salesforce.com/saml/acs">
        </samlp:AuthnRequest>
        Salesforce redirects Hareesh to Azure AD with this request

Step 3: Azure AD shows login page
        Hareesh enters credentials + MFA

Step 4: Azure AD creates SAML Response (Assertion):
        <saml:Assertion>
          <saml:Subject>
            <saml:NameID>hareesh@company.com</saml:NameID>
          </saml:Subject>
          <saml:AttributeStatement>
            <saml:Attribute Name="email">hareesh@company.com</saml:Attribute>
            <saml:Attribute Name="role">IT-Admin</saml:Attribute>
          </saml:AttributeStatement>
          <ds:Signature>SIGNED WITH AZURE AD PRIVATE KEY</ds:Signature>
        </saml:Assertion>

Step 5: Azure AD POSTs the SAML Response to Salesforce's ACS URL:
        POST https://company.salesforce.com/saml/acs

Step 6: Salesforce verifies the signature using Azure AD's PUBLIC certificate
        Signature valid → Assertion trusted → Hareesh logged in ✅
```

**Key SAML Terms:**

| Term | Meaning |
|------|---------|
| **ACS URL** | Assertion Consumer Service URL — where SP receives the SAML response |
| **Entity ID** | Unique identifier for each IdP or SP |
| **Signing Certificate** | IdP signs assertions; SP verifies using the public cert |
| **NameID** | The unique user identifier in the assertion (usually email) |
| **Attributes** | User properties sent in the assertion (name, role, department) |

---

### Protocol 2 — OAuth 2.0 (Delegated Authorization)

OAuth is NOT an authentication protocol. It is an **authorization delegation** protocol — it allows an application to access resources on behalf of a user without the user sharing their password.

**The classic example — "Login with Google":**

```
Hareesh uses a project management tool (Asana).
Asana wants to add events to his Google Calendar.

WITHOUT OAuth (terrible):
  Asana asks: "Give us your Google username and password"
  Hareesh gives credentials
  → Asana has FULL access to Hareesh's Google account forever
  → If Asana is breached → Google account exposed ❌

WITH OAuth 2.0:
  Asana redirects to Google:
  "Asana wants permission to: Add events to your calendar only"
  Hareesh approves → Google issues an Access Token (limited scope)
  → Asana uses the token to add events only ✅
  → Asana never sees Hareesh's password ✅
  → Hareesh can revoke Asana's access at any time ✅
  → Token only allows calendar access — nothing else ✅
```

**OAuth 2.0 Authorization Code Flow (most secure):**

```
Step 1: Hareesh clicks "Login with Google" on Asana

Step 2: Asana redirects to Google:
  https://accounts.google.com/o/oauth2/auth?
    client_id=asana-app-id
    redirect_uri=https://asana.com/oauth/callback
    scope=calendar.events
    response_type=code
    state=random-csrf-token

Step 3: Google shows consent screen → Hareesh approves

Step 4: Google redirects back with Authorization Code:
  https://asana.com/oauth/callback?code=AUTH_CODE_XYZ

Step 5: Asana exchanges code for tokens (server-to-server):
  POST https://oauth2.googleapis.com/token
  {client_id, client_secret, code}

Step 6: Google returns:
  {
    "access_token": "ya29.short-lived-token",  ← expires in 1 hour
    "refresh_token": "long-lived-refresh",      ← used to get new tokens
    "scope": "calendar.events"                  ← limited scope only
  }

Step 7: Asana calls Google Calendar API:
  GET https://www.googleapis.com/calendar/v3/events
  Authorization: Bearer ya29.short-lived-token
```

---

### Protocol 3 — OpenID Connect (OIDC) — Authentication on OAuth

OAuth handles authorization. OIDC adds **identity** on top of OAuth — making it an authentication protocol.

```
OAuth 2.0 alone:  "What can this app access?" (authorization)
OIDC adds:        "Who is this user?"         (authentication)
```

**What OIDC adds — the ID Token:**

When a user authenticates with OIDC, the server returns an **ID Token** — a JWT (JSON Web Token) containing the user's identity information.

```
ID Token (JWT) structure:

Header:
  {"alg": "RS256", "typ": "JWT"}

Payload (decoded):
  {
    "iss": "https://login.microsoftonline.com/...",  ← who issued it (Azure AD)
    "sub": "hareesh-unique-id",                      ← who it's about
    "aud": "asana-app-id",                           ← who it's for
    "exp": 1735689600,                               ← when it expires
    "iat": 1735686000,                               ← when it was issued
    "email": "hareesh@company.com",
    "name": "Hareesh",
    "amr": ["mfa", "pwd"]                            ← how they authenticated
  }

Signature:
  HMACSHA256(base64(header) + "." + base64(payload), Azure_AD_Private_Key)
```

The app verifies the JWT signature using Azure AD's public key → if valid → user is authenticated.

---

### Protocol 4 — Kerberos (Windows Domain SSO)

Kerberos provides SSO within an Active Directory domain. Once you log into Windows, you can access all domain resources without re-authenticating.

```
GP logs into his workstation:
  → Kerberos TGT issued (valid 10 hours)
  → Stored in memory

GP opens \\FileServer01\Finance:
  → Windows silently presents TGT to KDC
  → KDC issues Service Ticket for FileServer01
  → FileServer01 accepts ticket → access granted ✅
  → GP never typed a password for the file server

GP opens \\PrintServer\HP-Printer:
  → Same process — silent, automatic ✅

GP opens the HR web application (on same domain):
  → Browser uses Kerberos (Windows Integrated Authentication)
  → HR app logs GP in automatically ✅

GP never typed a password after his initial Windows login.
That is Kerberos SSO in action.
```

---

## 🏢 Real-World Enterprise Scenarios

### Scenario 1 — Enterprise SAML SSO Setup

```
Company uses Azure AD as the central IdP.
IT team configures SAML for all enterprise apps:
  → Salesforce: SAML federation configured
  → ServiceNow: SAML federation configured
  → Workday (HR): SAML federation configured
  → AWS Console: SAML federation configured

Result:
  GP opens AWS Console → SAML flow → Azure AD authenticates → AWS access ✅
  No separate AWS username/password ✅
  MFA enforced at Azure AD layer → applies to ALL apps ✅
  GP leaves company → Azure AD account disabled → ALL app access gone instantly ✅
```

### Scenario 2 — B2B Partner Federation

```
Company A partners with Company B for a project.
Company B consultants need access to Company A's SharePoint.

Setup:
  Azure AD B2B configured
  Company B users invited as Guest accounts in Company A's Azure AD
  SharePoint site shared with Company B guest users

How it works:
  Company B consultant opens Company A's SharePoint link
  → Redirected to their own Company B IdP (Okta)
  → Authenticates with their own credentials + MFA
  → Okta sends assertion to Azure AD
  → Azure AD trusts it (B2B trust established)
  → SharePoint access granted ✅

When consultant leaves Company B:
  → Company B disables their account in Okta
  → Access to Company A automatically gone ✅
  → Company A never needed to manage their credentials
```

### Scenario 3 — "Login with Microsoft" (OIDC)

```
Hareesh uses a third-party security tool that supports Microsoft login.

Hareesh clicks "Login with Microsoft":
  → OIDC Authorization Code flow runs
  → Azure AD authenticates Hareesh (with MFA)
  → ID Token issued: confirms identity = hareesh@company.com
  → Access Token issued: allows tool to read Hareesh's profile

The tool:
  Reads Hareesh's name, email, and department from the ID Token
  Creates his account automatically ✅
  No separate registration needed ✅
  Hareesh's Azure AD MFA protects this app too ✅
```

---

## ⚠️ Attacks on SSO & Federation

### 1. SAML Assertion Forgery
```
What: If SP does not validate the assertion signature, attacker forges one
Example: Attacker creates a SAML assertion claiming to be GP (Domain Admin)
         → SP trusts it without signature check → GP-level access
Defense: Always validate assertion signatures; keep IdP certificates current
```

### 2. Golden SAML Attack
```
What: Attacker steals the ADFS token signing certificate private key
      → Can forge SAML assertions for ANY user, forever
      → No password needed, no MFA bypass needed — just forged assertions
Example: SolarWinds 2020 attack used this to access cloud resources
Defense: Protect ADFS servers as Tier 0 (same as Domain Controllers)
         Monitor for unusual SAML assertion patterns in Sentinel
```

### 3. OAuth Token Theft
```
What: Access token stolen and used to call APIs until it expires
Example: Access token leaked in browser history or application logs
         Attacker uses it to call Microsoft Graph API as Hareesh
Defense: Short token lifetimes (15-60 minutes), HTTPS everywhere,
         strict redirect URI validation
```

### 4. Illicit Consent Grant
```
What: Attacker sends phishing link that triggers OAuth consent prompt
      Asks user to grant a malicious app access to mailbox/files
Example:
  Hareesh receives: "Click here to view the document shared with you"
  → Page shows Microsoft OAuth consent:
    "HRDocViewer wants to: Read your email, Access your files"
  Hareesh approves thinking it's legitimate
  → Attacker's app has access to Hareesh's mailbox and OneDrive
  → Persists even after password reset ← because the GRANT persists

Defense: Require admin approval for third-party OAuth app permissions
         Audit registered OAuth applications regularly
```

### 5. JWT Algorithm Confusion
```
What: Some libraries accept "alg: none" — no signature required
Example:
  Attacker takes Hareesh's JWT, modifies role to "admin",
  changes alg to "none", removes signature
  → If server accepts it → attacker has admin access

Defense: Explicitly reject "none" algorithm, specify allowed algorithms
```

---

## 🛡️ SSO & Federation Hardening Checklist

- [ ] Always validate SAML assertion signatures on the SP side
- [ ] Rotate ADFS/IdP signing certificates before expiry
- [ ] Enforce HTTPS for all SSO flows
- [ ] Validate OAuth redirect URIs with exact match (not prefix)
- [ ] Set short access token lifetimes (15-60 minutes)
- [ ] Use refresh token rotation
- [ ] Require admin approval for third-party OAuth app consent
- [ ] Audit all OAuth app permissions regularly
- [ ] Monitor for unusual SAML assertion sources in Sentinel
- [ ] Protect ADFS server at Tier 0 level

---

## 🔧 Troubleshooting

### SAML SSO login fails
```
Check 1: Clock skew
  SAML assertions have a validity window (usually 5 minutes)
  If clocks are out of sync → assertions rejected
  Fix: net time /domain /set /yes

Check 2: Certificate mismatch
  Is the SP using the current IdP signing certificate?
  Download fresh Federation Metadata XML from Azure AD
  Re-upload to SP

Check 3: Wrong ACS URL or Entity ID
  Compare SP configuration with IdP configuration exactly

Check 4: NameID format mismatch
  SP expects emailAddress format
  IdP sending persistent or unspecified format
  Fix: Match NameID format in both IdP and SP config
```

### JWT token rejected by application
```
Check 1: Token expired → check exp claim
  Decode: echo "TOKEN_PAYLOAD" | base64 -d

Check 2: Wrong audience (aud claim)
  Token issued for app A being presented to app B

Check 3: Key rotation
  IdP rotated signing key → app has old public key cached
  Fix: Refresh OIDC discovery document / JWKS endpoint
```

---

## 🎯 Interview Questions

**Q1. What is the difference between SSO and federation?**  
**A:** SSO lets a user authenticate once and access multiple applications within the same organisation without re-entering credentials. Federation extends this across different organisations — establishing a trust relationship so users from one identity system can access resources in another using their own credentials. SSO is within a single identity boundary; federation crosses identity boundaries.

---

**Q2. What is the difference between SAML and OAuth 2.0?**  
**A:** SAML is an authentication and SSO protocol — it provides identity assertions (who the user is) from an IdP to an SP, primarily for enterprise web app SSO. OAuth 2.0 is an authorization delegation protocol — it allows an application to access resources on behalf of a user without sharing credentials, primarily used for API access and "Login with..." buttons. SAML uses XML; OAuth uses JSON. OIDC adds identity (authentication) on top of OAuth.

---

**Q3. What is a JWT and what are its three parts?**  
**A:** JWT (JSON Web Token) is a compact token used in OIDC and API authentication. It has three Base64URL-encoded parts separated by dots: (1) Header — algorithm and token type. (2) Payload — claims about the user (sub, email, exp, aud, role). (3) Signature — cryptographic signature over header + payload using the IdP's private key. The app verifies the signature using the IdP's public key. The payload is NOT encrypted — only signed. Do not store sensitive data in JWT payloads.

---

**Q4. What is the Golden SAML attack?**  
**A:** Golden SAML is analogous to the Kerberos Golden Ticket attack. If an attacker compromises the ADFS token signing certificate's private key, they can forge SAML assertions for any user — including Global Administrators — without needing passwords or bypassing MFA. The SP trusts anything signed by the certificate. This is how the SolarWinds attackers moved from on-premise compromised infrastructure into cloud Azure AD resources. Defence: treat ADFS servers as Tier 0 assets, monitor for anomalous SAML assertion patterns.

---

**Q5. Scenario — A user's password is reset after their account is compromised. They have OAuth apps connected to their account. Is the account now safe?**  
**A:** Not necessarily. OAuth access tokens and refresh tokens remain valid after a password reset because they were granted to applications — not derived from the password. An attacker who captured a refresh token can continue generating new access tokens even after the password change. Full remediation requires: (1) Reset the password. (2) Revoke all refresh tokens (in Azure AD: Revoke-AzureADUserAllRefreshToken). (3) Review and revoke all third-party OAuth app permissions. (4) Check for any new OAuth app consents the attacker may have granted. (5) Enable Continuous Access Evaluation so token revocation takes effect immediately.

---

*"SSO reduces the number of doors — but it also means one key opens all of them. Protect that key with everything you have."*
