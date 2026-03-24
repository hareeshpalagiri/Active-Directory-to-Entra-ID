# Section 6.2 — Entra ID Architecture & Topology

## 🎯 Overview

This section covers **how Entra ID is architecturally designed**, including:
- Multi-tenancy (how isolation works)
- Synchronization mechanisms (AAD Connect)
- Federation models (SAML, OAuth, OIDC)
- Data flow and integration patterns

---

## 🏗️ Multi-Tenant Architecture

Entra ID is a **true multi-tenant cloud service**. Multiple organizations share the same infrastructure, but their data is isolated.

### How Isolation Works

```
┌─────────────────────────────────────────────────────────┐
│           Microsoft Entra ID Cloud Service              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐   │
│  │  Contoso Tenant      │  │  Fabrikam Tenant     │   │
│  │  (contoso.msonline.com) │  (fabrikam.msonline.com) │
│  │                      │  │                      │   │
│  │ • Users             │  │ • Users              │   │
│  │ • Groups            │  │ • Groups             │   │
│  │ • Devices           │  │ • Devices            │   │
│  │ • Apps              │  │ • Apps               │   │
│  │ • Roles             │  │ • Roles              │   │
│  │                      │  │                      │   │
│  │ (No cross-access)   │  │ (No cross-access)    │   │
│  └──────────────────────┘  └──────────────────────┘   │
│           ↓                           ↓                 │
│    Isolated Storage          Isolated Storage          │
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐   │
│  │  Acme Corp Tenant    │  │  Other Tenant        │   │
│  │  (acme.msonline.com) │  │  (xxx.onmicrosoft)   │   │
│  │                      │  │                      │   │
│  │ (Completely isolated)│  │ (Completely isolated)│   │
│  └──────────────────────┘  └──────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Isolation Mechanisms

1. **Tenant ID**: Each tenant gets a unique GUID (e.g., `550e8400-e29b-41d4-a716-446655440000`)
2. **Directory Database**: Separate logical database per tenant
3. **Access Control Lists (ACLs)**: Enforced at the API layer
4. **Routing**: All requests routed to correct tenant via domain/token
5. **Encryption**: Data encrypted with tenant-specific keys

### Multi-Tenant Considerations for Security

**Risk**: Admin from Tenant A could theoretically access Tenant B
**Mitigation**: 
- Strict ACL enforcement at API layer
- Cryptographic separation
- Regular audits
- Microsoft's shared responsibility model

---

## 🔄 Azure AD Connect: Synchronization Architecture

Most hybrid organizations use **Azure AD Connect** (or **Azure AD Connect Cloud Sync**) to sync identities from on-prem AD to Entra ID.

### Azure AD Connect (Traditional)

```
┌─────────────────────────────────┐
│      On-Premises AD             │
│                                 │
│ • Domain Controllers            │
│ • Users, Groups, Computers      │
│ • NTDS.dit database             │
└────────────────┬────────────────┘
                 │
                 │ (Sync agent)
                 ↓
         ┌───────────────┐
         │   AD Connect  │
         │   (Server)    │
         │               │
         │ • Reads AD    │
         │ • Hashes PW   │
         │ • Syncs delta │
         └───────────────┘
                 │
                 │ HTTPS (TLS 1.2+)
                 ↓
         ┌───────────────────┐
         │   Azure Entra ID  │
         │   (Cloud)         │
         │                   │
         │ • Cloud users     │
         │ • Cloud groups    │
         │ • Password hashes │
         └───────────────────┘
```

### Sync Modes

| Mode | Description | Best For |
|------|-------------|----------|
| **Password Hash Sync (PHS)** | AD passwords hashed and synced to cloud | Most common, simple hybrid |
| **Pass-Through Auth (PTA)** | On-prem AD validates passwords (cloud redirects) | High security, regulatory |
| **Federated Identity** | On-prem AD FS or 3rd-party identity provider | Legacy, complex scenarios |

### How Password Hash Sync Works

```
1. AD user changes password
   ↓
2. AD stores new password hash (NTLM, SHA1)
   ↓
3. AD Connect reads the hash (reads-only)
   ↓
4. AD Connect hashes it again with salt
   ↓
5. Sends hashed value to Entra ID via HTTPS
   ↓
6. Entra ID stores it separately from AD
   ↓
7. User can now log into cloud apps with same creds
```

### Key Points About PHS

- ✅ Simple, reliable, cloud-ready
- ✅ User gets SSO across on-prem and cloud
- ❌ Not "as secure" as Pass-Through Auth (password hash leaves on-prem)
- ✅ Industry standard — 90% of orgs use this
- ⚠️ If hash is stolen, attacker doesn't have plaintext (still salted)

### Pass-Through Authentication (PTA)

For organizations that won't tolerate password hashes in cloud:

```
1. User attempts to log into cloud app
   ↓
2. Entra ID receives credentials
   ↓
3. Entra ID forwards to on-prem PTA agent
   ↓
4. On-prem agent validates against AD
   ↓
5. Result sent back to Entra ID
   ↓
6. Entra ID grants/denies access
```

**Advantage**: Plaintext password never hits cloud  
**Disadvantage**: Slower, requires on-prem connectivity, complex setup

### Azure AD Connect Cloud Sync (Modern)

Newer alternative to traditional AAD Connect:
- Lightweight agent (not full sync engine)
- Better for multi-forest scenarios
- More flexible (can sync selective groups)
- Easier to scale

---

## 🔐 Federation Models

When you don't want to sync identities, you can **federate** — users stay in on-prem AD, cloud apps trust the on-prem identity provider.

### SAML Federation (AD FS Model)

```
┌──────────────────┐
│   User (Browser) │
└────────┬─────────┘
         │
         ├─── 1. User tries to access Salesforce
         │
         ↓
    ┌─────────────────┐
    │   Salesforce    │
    │   (SaaS App)    │
    └────────┬────────┘
             │
             ├─── 2. "I don't know you, ask AD FS"
             │
             ↓
    ┌─────────────────┐
    │   Entra ID      │
    │   (Federated)   │
    └────────┬────────┘
             │
             ├─── 3. "I'm federated, ask on-prem"
             │
             ↓
    ┌─────────────────┐
    │    AD FS        │
    │  (on-premises)  │
    └────────┬────────┘
             │
             ├─── 4. Validates against on-prem AD
             │
             ├─── 5. Issues SAML token
             │
             ↓ (back through chain)
    ┌─────────────────┐
    │   Salesforce    │
    │   (Trusts token)│
    └────────┬────────┘
             │
             ├─── User logged in!
```

### OAuth 2.0 / OIDC Federation

For modern cloud apps (Teams, custom apps):

```
User ─┐
      ├─→ App ─→ "Authenticate via Entra ID"
      │
      └─→ Entra ID ─→ Authorization Code
            ↓
            (optionally: forward to on-prem if federated)
            ↓
          App ← Access Token / ID Token
          ↓
          User logged in with claims
```

### Comparison: Sync vs Federation

| Aspect | Password Hash Sync | Pass-Through Auth | Federated (AD FS) |
|--------|------------------|-------------------|-------------------|
| **Identity location** | Cloud | Cloud | On-premises |
| **Password location** | Cloud (hashed) | On-prem (validated) | On-prem |
| **Dependency on on-prem** | None (async) | Always (real-time) | Always (real-time) |
| **SSO capability** | Yes (cloud token) | Yes (cloud token) | Yes (SAML token) |
| **Complexity** | Low | Medium | High |
| **Modern/Recommended** | Yes | Yes | Legacy (moving away) |

---

## 🌐 Data Flow: End-to-End Authentication

### Scenario: User accessing Microsoft Teams via Entra ID (PHS)

```
┌─────────────────────────────────────────────────────────┐
│                    USER LOGIN FLOW                      │
└─────────────────────────────────────────────────────────┘

PHASE 1: Password Entry
┌──────────────────────┐
│ User opens Teams     │
│ Enters: user@contoso.com  │
│ Enters: P@ssw0rd!    │
└──────────┬───────────┘
           │
           ↓ (HTTPS to Entra ID)

┌──────────────────────────────────────────┐
│  Entra ID (Cloud)                        │
│  1. Receives credentials                 │
│  2. Looks up user (contoso.onmicrosoft)  │
│  3. Retrieves stored password hash       │
│  4. Hashes input password                │
│  5. Compares hashes                      │
│  6. ✓ Match!                             │
└──────────┬───────────────────────────────┘
           │
           ↓

PHASE 2: MFA (if required by CA policy)
┌──────────────────────────────────────────┐
│  Conditional Access Engine               │
│  1. Evaluate policy rules:               │
│     • Location: On corporate network ✓   │
│     • Device: Windows 10, compliant ✓    │
│     • Risk: Low                          │
│  2. MFA required? Check policy...        │
│     → MFA required (admin policy set)    │
└──────────┬───────────────────────────────┘
           │
           ↓

┌──────────────────────────────────────────┐
│  MFA Challenge                           │
│  1. Send push to Microsoft Authenticator │
│  2. User approves on phone               │
│  3. ✓ Verified                           │
└──────────┬───────────────────────────────┘
           │
           ↓

PHASE 3: Token Issuance
┌──────────────────────────────────────────┐
│  Entra ID Issues Tokens                  │
│  1. ID Token (user info: name, email)    │
│  2. Access Token (permissions scopes)    │
│  3. Refresh Token (get new tokens later) │
└──────────┬───────────────────────────────┘
           │
           ↓ (HTTPS back to client)

┌──────────────────────────────────────────┐
│  Teams Client (Desktop/Web)              │
│  1. Receives tokens in local storage     │
│  2. Stores securely (DPAPI on desktop)   │
│  3. Includes access token in requests    │
└──────────┬───────────────────────────────┘
           │
           ↓

PHASE 4: Resource Access
┌──────────────────────────────────────────┐
│  Teams API (REST)                        │
│  1. Receives request with access token   │
│  2. Validates token signature            │
│  3. Checks expiration (30 min default)   │
│  4. ✓ Valid                              │
│  5. Returns user's teams, messages       │
└──────────┬───────────────────────────────┘
           │
           ↓

┌──────────────────────────────────────────┐
│  User sees Teams loaded                  │
│  SSO in effect: Other M365 apps also OK  │
│  (Outlook, SharePoint, etc.)             │
└──────────────────────────────────────────┘
```

---

## 🔌 Integration Points

### 1. Azure AD Connect Ports & Protocols

| Component | Port | Protocol | Purpose |
|-----------|------|----------|---------|
| AD Connect Server → Entra ID | 443 | HTTPS/TLS | Sync communication |
| AD Connect Server → AD DC | 389/636 | LDAP/LDAPS | Read user objects |
| AD Connect Server → AD GC | 3268/3269 | LDAP (global catalog) | Query forest |
| Client → Entra ID | 443 | HTTPS | Auth requests |

### 2. Microsoft Graph API

All data in Entra ID accessible via Microsoft Graph:

```
GET https://graph.microsoft.com/v1.0/me
Authorization: Bearer {access_token}

Response:
{
  "id": "12345678-1234-5678-1234-567812345678",
  "userPrincipalName": "alice@contoso.onmicrosoft.com",
  "displayName": "Alice Johnson",
  "mail": "alice@contoso.com",
  "department": "Engineering",
  "jobTitle": "Security Analyst"
}
```

---

## 🏢 Hybrid Topology Examples

### Example 1: Simple Hybrid (Most Common)

```
┌──────────────────────┐         ┌──────────────────────┐
│   On-Prem AD         │ ─AAD─→  │   Entra ID           │
│                      │ Connect  │                      │
│ • Internal apps      │         │ • Microsoft 365      │
│ • Domain-joined PCs  │         │ • SaaS (Salesforce)  │
│ • File servers       │         │ • Custom cloud apps  │
│ • Exchange (on-prem) │         │ • Azure resources    │
└──────────────────────┘         └──────────────────────┘

User logs into:
- Exchange on-prem → on-prem AD auth
- Teams → Entra ID auth (via PHS)
- Salesforce → Entra ID auth (SSO)
```

### Example 2: Multi-Forest Hybrid

```
┌──────────────────┐     ┌──────────────────┐
│   AD Forest 1    │     │   AD Forest 2    │
│  (contoso.com)   │     │  (fabrikam.com)  │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         │                        │
         └────────┬───────────────┘
                  │
           (Multiple AAD Connect)
                  │
                  ↓
         ┌──────────────────────┐
         │    Entra ID          │
         │    (Central hub)      │
         │                      │
         │ All users merged     │
         │ Contoso + Fabrikam   │
         └──────────────────────┘
```

### Example 3: Complex Federation Scenario

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  On-Prem AD      │  │  Third-Party IdP │  │  Google Workspace│
│  (Enterprise)    │  │  (Okta, Ping)    │  │  (B2B collab)    │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
                    (Federation trust)
                               │
                               ↓
                    ┌──────────────────────┐
                    │    Entra ID          │
                    │   (Federated)        │
                    │                      │
                    │ • SAML → AD FS       │
                    │ • OIDC → Google      │
                    │ • Mixed users        │
                    └──────────────────────┘
```

---

## 🔍 Key Architectural Takeaways

1. **True Multi-Tenant**: Complete isolation per tenant via ACLs, not code
2. **Sync vs Federation**: Sync = identity in cloud, Federation = identity stays on-prem
3. **Password Hash Sync is standard**: Most orgs use PHS + Cloud-Join for devices
4. **Modern protocols**: OAuth 2.0, OIDC for cloud-native apps
5. **Hybrid is the transition state**: Most orgs today are hybrid (on-prem AD + Entra ID)

---

## 🎓 Interview Questions

**Q1: How does Azure AD Connect sync work?**
A: It runs on a server in your network, reads objects from on-prem AD (via LDAP), hashes passwords, and syncs to the cloud via HTTPS. It runs continuously (every 30 minutes by default).

**Q2: What's the difference between Password Hash Sync and Pass-Through Auth?**
A: PHS syncs a hashed password to the cloud — Entra ID validates it. PTA forwards the login to on-prem AD for validation — password never hits cloud. PTA is more secure but slower and requires on-prem connectivity.

**Q3: How is data isolation achieved in Entra ID's multi-tenant environment?**
A: Each tenant has a unique ID (GUID), separate database partition, and API-level ACLs. All requests routed through the tenant ID. Data encrypted with tenant-specific keys.

**Q4: Why would you use SAML Federation instead of syncing identities?**
A: You want to keep identities on-prem and don't want to sync password hashes to cloud. Legacy scenario, declining in use (PTA is preferred).

**Q5: How does SSO work across multiple cloud apps?**
A: User logs into Entra ID once, gets an access token. That token trusted by other apps registered in Entra ID (Salesforce, Teams, etc.). No re-auth needed.

---

*End of Section 6.2*
