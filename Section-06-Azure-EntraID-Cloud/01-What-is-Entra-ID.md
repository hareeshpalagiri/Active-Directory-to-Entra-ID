# Section 6.1 — What is Azure Entra ID?

## 🎯 Overview

Azure Entra ID (formerly Azure AD) is Microsoft's **cloud-based identity and access management (IAM) service**. It's the cloud equivalent of on-premises Active Directory, but built for modern hybrid and cloud-first environments.

Unlike on-prem AD (which manages Windows domains), Entra ID manages:
- Cloud apps (SaaS, web apps)
- Microsoft cloud services (Microsoft 365, Azure, Dynamics 365)
- Hybrid scenarios (on-prem AD + cloud)
- External identity federation
- Non-domain-joined devices

---

## 📊 Entra ID vs On-Prem AD: Quick Comparison

| Aspect | On-Prem AD | Entra ID |
|--------|------------|----------|
| **Location** | On-premises, in your data center | Microsoft cloud (multi-tenant) |
| **Primary Use** | Windows domain management | Cloud apps & SaaS |
| **Auth Protocol** | Kerberos, NTLM, LDAP | OAuth 2.0, OpenID Connect, SAML |
| **Device Type** | Domain-joined computers | Cloud-joined, Hybrid-joined, personal |
| **Scope** | LAN/WAN domains | Global cloud identity |
| **Replication** | Multi-master replication | Cloud sync |
| **Trust Model** | Forest trusts | Federation, B2B, B2C |
| **Conditional Access** | Group Policy (device-centric) | Conditional Access policies (risk-based) |
| **Password Storage** | NTDS.dit (local) | Cloud (encrypted, salted) |

---

## 🏗️ Architecture: High-Level Components

```
┌─────────────────────────────────────────────────────────┐
│                   Azure Entra ID Tenant                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │          Core Identity Components                 │  │
│  ├───────────────────────────────────────────────────┤  │
│  │ • Users & Groups (cloud-native)                   │  │
│  │ • Applications & Service Principals               │  │
│  │ • Roles & Permissions (RBAC)                      │  │
│  │ • Devices (AAD join, Hybrid join, Personal)       │  │
│  │ • Directory Roles (Global Admin, User Admin, etc) │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │      Authentication & Security Features           │  │
│  ├───────────────────────────────────────────────────┤  │
│  │ • Multi-Factor Authentication (MFA)               │  │
│  │ • Conditional Access Policies                     │  │
│  │ • Identity Protection (risk detection)            │  │
│  │ • Privileged Identity Management (PIM)            │  │
│  │ • Single Sign-On (SSO) to SaaS apps               │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │      Integration & Federation                     │  │
│  ├───────────────────────────────────────────────────┤  │
│  │ • Azure AD Connect (hybrid sync)                  │  │
│  │ • Microsoft Graph API                            │  │
│  │ • SAML / OAuth / OIDC Federation                  │  │
│  │ • B2B Collaboration (external identities)         │  │
│  │ • B2C (customer identity)                         │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
         │
         ├─── Connected to SaaS Apps (Teams, Salesforce, etc)
         ├─── Connected to Azure Resources (VMs, Databases, etc)
         ├─── Connected to On-Prem AD (via AAD Connect)
         └─── Connected to External Identity Providers (B2B)
```

---

## 🔑 Core Concepts

### 1. **Tenant**
- A dedicated instance of Entra ID
- Represents one organization or company
- Like a "forest" in on-prem AD
- Each tenant has a unique `.onmicrosoft.com` domain
- Example: `contoso.onmicrosoft.com`

### 2. **Users & Groups**
- **Cloud users**: Created directly in Entra ID
- **Synced users**: Created in on-prem AD, synced via AAD Connect
- **Guest users**: External identities invited for B2B collaboration
- **Groups**: Collections for easier permission management
  - Security groups (access control)
  - Microsoft 365 groups (mailbox + collaboration)

### 3. **Applications**
- **Enterprise apps**: SaaS apps (Salesforce, Slack, Jira)
- **Owned apps**: Custom apps your organization builds
- **Microsoft apps**: Teams, SharePoint, Exchange Online
- Registered in Entra ID for SSO

### 4. **Devices**
- **Azure AD joined**: Cloud-native devices (no on-prem presence)
- **Hybrid Azure AD joined**: Both on-prem AD and Entra ID
- **Registered devices**: Personal devices enrolled for access
- Device compliance tracked for conditional access

### 5. **Roles & Permissions**
- **Directory roles**: Admin roles (Global Admin, Security Admin, etc)
- **RBAC roles**: Azure resource access (Contributor, Reader, Owner)
- **App roles**: Custom roles for applications
- Supports principle of least privilege (PLP)

---

## 🔐 Why Entra ID Matters

### 1. **Cloud-First Security**
Modern attacks target cloud apps, not just domain controllers. Entra ID is built for cloud-first threats.

### 2. **Zero Trust Support**
Unlike on-prem AD (implicit trust inside forest), Entra ID enforces:
- Continuous verification
- Risk-based access
- Device compliance checks
- Conditional policies

### 3. **Hybrid Flexibility**
Many organizations run **both** on-prem AD and Entra ID:
- AD Connect syncs identities to cloud
- On-prem AD stays for legacy apps
- Cloud identity for SaaS and Microsoft 365

### 4. **Scalability**
- No domain controller replicas needed
- Handles global scale (millions of users)
- Multi-tenant SaaS scenarios
- No capacity planning like on-prem

### 5. **Advanced Features**
- Machine learning for risk detection
- Passwordless authentication
- Seamless federation
- Real-time compliance

---

## 📚 Entra ID Editions

| Edition | Use Case | Key Features |
|---------|----------|--------------|
| **Free** | Small orgs, basic cloud access | 5GB cloud storage, basic SSO |
| **Office 365** | Microsoft 365 users | Included with Microsoft 365 subscriptions |
| **Premium P1** | Mid-market, hybrid scenarios | Conditional Access, PIM, Self-service password reset |
| **Premium P2** | Enterprise, security-focused | Identity Protection, Privileged Access Review |

---

## 🌐 Authentication Flow Example: Accessing a SaaS App

```
1. User opens Salesforce app
   ↓
2. Salesforce redirects to Entra ID login
   ↓
3. User enters credentials
   ↓
4. Entra ID validates (check password hash, MFA if required)
   ↓
5. Conditional Access evaluates:
   - Device compliant?
   - Location trusted?
   - Risk factors?
   ↓
6. If all checks pass → Issue SAML/OAuth token
   ↓
7. Salesforce accepts token → User logged in
   ↓
8. User now has SSO to other apps (no re-login needed)
```

---

## 🏢 Common Scenarios

### Scenario 1: Pure Cloud Organization
```
Users → Entra ID → Microsoft 365, Salesforce, Slack, etc.
(No on-prem AD)
```

### Scenario 2: Hybrid Organization (Most Common)
```
On-Prem AD ←→ Azure AD Connect ←→ Entra ID
     ↓                                  ↓
Legacy apps                    Cloud apps, Microsoft 365
```

### Scenario 3: Multi-Cloud Identity
```
                  Entra ID (hub)
                 /  |  \  \
        Azure   /   |   \  AWS IAM
              /     |     \
          M365     Apps   Custom Apps
```

---

## 🔍 Key Takeaways

- **Entra ID = Cloud IAM**: It's not on-prem AD's direct replacement, it's an evolution for cloud
- **Protocol shift**: Kerberos/NTLM → OAuth 2.0/OIDC/SAML
- **Trust model change**: Forest trust → Cloud federation
- **Defense evolution**: GPO/domain-based → Risk-based conditional access
- **Hybrid is common**: Most enterprises run AD + Entra ID together

---

## 📖 Next Steps

→ **Section 6.2**: Entra ID architecture deep-dive (multi-tenant, sync, federation)  
→ **Section 6.3**: Users, groups, and device management  
→ **Section 6.4**: Authentication protocols in Entra ID  

---

## 🎓 Interview Questions

**Q1: What's the difference between Azure AD (on-prem) and Entra ID?**
A: Azure AD is on-prem, Entra ID is cloud. Entra ID uses OAuth/OIDC instead of Kerberos, is multi-tenant, and designed for SaaS. Azure AD isn't really used anymore — Microsoft unified the naming to "Entra ID."

**Q2: Why would a company use both on-prem AD and Entra ID?**
A: Hybrid scenarios — on-prem AD for legacy apps and Windows domain control, Entra ID for cloud apps (Teams, Salesforce, etc.) and Microsoft 365. Azure AD Connect synchronizes identities between them.

**Q3: What's a Tenant in Entra ID?**
A: A dedicated instance of Entra ID representing one organization. Like a "forest" in AD. Each tenant has unique domains and isolated users/permissions. One `.onmicrosoft.com` per tenant.

**Q4: How does SSO work with Entra ID?**
A: After logging into Entra ID once, your browser receives a token. Other SaaS apps (registered in Entra ID) trust that token, so you don't re-authenticate.

**Q5: What's the difference between cloud-joined and hybrid-joined devices?**
A: Cloud-joined: Only connected to Entra ID (modern). Hybrid-joined: Connected to both on-prem AD and Entra ID (migration path). On-prem-only: No Entra ID (legacy).

---

*End of Section 6.1*
