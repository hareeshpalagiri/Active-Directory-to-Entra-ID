# Section 6.7 — Azure AD Connect (In Depth)

## 🎯 Overview

Azure AD Connect is the **synchronization engine** that bridges on-premises AD and Entra ID.

This section covers:
1. **Installation & Configuration** — Setting up AAD Connect
2. **Sync Modes** — PHS, PTA, Federated
3. **Filtering & Scoping** — What gets synced
4. **Troubleshooting** — Common issues and fixes
5. **Upgrade & Support** — Keeping it current

---

## 🚀 Installation & Initial Setup

### Prerequisites

```
Requirements for Azure AD Connect server:

Hardware:
  • CPU: 2+ cores (4 cores for 50k+ users)
  • RAM: 4GB minimum (8GB+ for large forests)
  • Storage: 10GB free (SSD recommended)
  • Network: Reliable internet connection

OS:
  • Windows Server 2012 R2+
  • Windows Server 2016/2019/2022 (recommended)

Permissions (on-prem):
  • Enterprise Admin or Domain Admin
  • Local Administrator on AAD Connect server

Permissions (Entra ID):
  • Global Administrator

Connectivity:
  • On-prem AD DC reachable (port 389/636 LDAP/LDAPS)
  • Internet access to Entra ID (port 443 HTTPS)
  • Global Catalog accessible (port 3268/3269)

Network Ports Needed:
  • 389 (LDAP) - Read AD
  • 636 (LDAPS) - Read AD securely
  • 3268 (GC) - Global Catalog
  • 3269 (GC SSL) - Global Catalog secure
  • 443 (HTTPS) - Sync to Entra ID
```

### Installation Steps

**Download:** https://www.microsoft.com/download/details.aspx?id=47594

```
Step 1: Run Installer
├─ AzureADConnect.msi
├─ Accept license terms
└─ Choose installation path

Step 2: Express Settings (Easiest)
├─ Single AD forest
├─ Password Hash Sync (PHS) default
├─ Cloud-only account
└─ All users and groups synced

Step 3: Entra ID Sign-in
├─ Global Admin credentials required
├─ AAD Connect validates permissions
└─ Proceeds only if admin confirmed

Step 4: Ready to Configure
├─ Review settings
├─ Proceed with installation
└─ Services start

Step 5: Complete
├─ Sync engine running
├─ Initial full sync starts
└─ Users/groups syncing to cloud

Timeline: 15-30 minutes total
```

### Customized Installation (More Control)

```
Choose Custom Settings For:

Connecting to AD:
├─ Select which AD forests to sync
├─ Choose specific domains/OUs
├─ Set up custom filtering
└─ Authentication method (Enterprise Admin or custom account)

User Sign-in:
├─ Password Hash Sync (PHS) - Most common
├─ Pass-Through Auth (PTA) - Higher security
├─ Federated (AD FS) - Legacy
└─ Do not configure - Manual setup later

Device Options:
├─ Device writeback
├─ Filtered device sync
└─ Group writeback

Directory Extensions:
├─ Custom AD attributes to sync
├─ Useful for app-specific fields
└─ Adds to user objects in cloud

Features:
├─ Exchange Hybrid
├─ Password writeback
├─ Group writeback
└─ Device writeback
```

---

## 🔄 Synchronization Modes Deep Dive

### Password Hash Sync (PHS) - Most Common

```
How PHS Works:

┌──────────────────────────────────────────────┐
│  On-Premises Active Directory                │
│  └─ User: alice@contoso.com                  │
│  └─ Password hash: MD4(password)             │
├──────────────────────────────────────────────┤
│                                              │
│  AAD Connect Process:                        │
│  1. Reads password hash from DC              │
│     (read-only LDAP query)                   │
│  2. Hashes it again with salt                │
│  3. Encrypts for transit                     │
│  4. Sends via HTTPS to Entra ID              │
│                                              │
│  Sync Schedule: Every 30 minutes (default)   │
│  Initial Sync: All users (full)              │
│  Delta Sync: Only changed users              │
├──────────────────────────────────────────────┤
│                                              │
│  Entra ID Cloud                              │
│  └─ User: alice@contoso.onmicrosoft.com     │
│  └─ Password hash: Stored securely           │
│  └─ Available for cloud app logins           │
│                                              │
└──────────────────────────────────────────────┘

Advantages:
  ✓ Simple to configure
  ✓ No on-prem dependencies (async)
  ✓ Lowest latency
  ✓ Most reliable
  ✓ Industry standard (90% of orgs)

Disadvantages:
  ✗ Password hash leaves on-prem
  ✗ Not "as secure" as PTA
  ✗ Cloud validation (not on-prem DC)

Best For:
  • Most organizations
  • Hybrid setups
  • Cloud-ready environments
```

### Pass-Through Authentication (PTA)

```
How PTA Works:

┌──────────────────────────────────────────────┐
│  User attempts cloud login                   │
│  • Username: alice@contoso.onmicrosoft.com  │
│  • Password: (entered by user)               │
├──────────────────────────────────────────────┤
│                                              │
│  Entra ID receives login:                    │
│  "Forward to on-prem for validation"         │
│                                              │
│  ↓ (HTTPS encrypted)                         │
│                                              │
│  AAD Connect PTA Agent (on-prem):            │
│  1. Receives request from cloud              │
│  2. Forwards to local DC                     │
│  3. DC validates password (Kerberos)         │
│  4. Returns result (success/failure)         │
│  5. Sends back to Entra ID                   │
│                                              │
│  ↓                                            │
│                                              │
│  Entra ID:                                   │
│  • ✓ Result: Allow login                     │
│  • ✗ Result: Deny login                      │
│                                              │
└──────────────────────────────────────────────┘

Advantages:
  ✓ Password never leaves on-prem
  ✓ On-prem DC validates (stronger security)
  ✓ Regulatory compliance friendly
  ✓ No password hash in cloud

Disadvantages:
  ✗ Requires on-prem connectivity (sync)
  ✗ Slower than PHS (real-time validation)
  ✗ More complex setup
  ✗ Must deploy agents

Best For:
  • High-security requirements
  • Regulatory compliance (HIPAA, PCI-DSS)
  • Organizations not allowing password hashes in cloud
```

### Federated Identity (AD FS)

```
How Federation Works:

User tries to access cloud app
  ↓
App redirects to Entra ID
  ↓
Entra ID: "I'm federated, ask on-prem"
  ↓
Entra ID redirects to AD FS (on-prem)
  ↓
User authenticates to AD FS
  ↓
AD FS validates against local DC
  ↓
AD FS creates SAML token
  ↓
AD FS sends token back through Entra ID
  ↓
Entra ID validates, trusts token
  ↓
App trusts token, logs in user

Advantages:
  ✓ Highest control (on-prem handles everything)
  ✓ Can enforce on-prem policies
  ✓ Kerberos support

Disadvantages:
  ✗ Complex to set up (AD FS infrastructure)
  ✗ Multiple points of failure
  ✗ Slower than cloud-native
  ✗ Legacy (being phased out)
  ✗ Requires MFA setup on AD FS too

Best For:
  • Legacy enterprise setups
  • Complex on-prem policies
  • Declining in use (move to PTA)
```

### Mode Comparison Table

| Aspect | PHS | PTA | Federated |
|--------|-----|-----|-----------|
| **Password location** | Cloud (hashed) | On-prem (validated) | On-prem |
| **Sync type** | Async (30 min) | Sync (real-time) | Sync (real-time) |
| **On-prem dependency** | None (async) | Always (agent) | Always (AD FS) |
| **Setup complexity** | Low | Medium | High |
| **Performance** | Fast | Medium | Slower |
| **Security** | Good | Better | Best |
| **Recommended** | ✓ Yes (90%) | ✓ Yes (high-sec) | ✗ Legacy |

---

## 🎯 Filtering & Scoping

### What Gets Synced by Default

```
By default, AAD Connect syncs:
✓ All users from all domains
✓ All groups
✓ All contacts
✓ All computers (if device sync enabled)
✗ Exchange on-prem data (separate sync)
✗ SharePoint on-prem data (separate sync)

This can be too much!
```

### Domain/OU Filtering

```
Scenario: Multi-forest organization
├─ Forest 1: contoso.com (1000 users)
├─ Forest 2: fabrikam.com (500 users)
└─ Only want to sync contoso.com

Solution: Domain Filtering
┌──────────────────────────────────────────┐
│ AAD Connect → Configure                  │
│ → Domain and OU Filtering                │
│                                          │
│ Domains to sync:                         │
│  ☑ contoso.com                          │
│  ☐ fabrikam.com (unchecked)             │
│                                          │
│ Result:                                  │
│ • fabrikam.com users NOT synced          │
│ • Saves cloud quota                      │
│ • Faster sync                            │
└──────────────────────────────────────────┘
```

### OU-Level Filtering

```
Scenario: Only sync certain departments

Default: All users in contoso.com

Configure:
┌──────────────────────────────────────────┐
│ AAD Connect → Configure                  │
│ → Domain and OU Filtering                │
│                                          │
│ Select OUs:                              │
│  ☑ OU=Engineering                       │
│  ☑ OU=Sales                             │
│  ☐ OU=HR (test users, skip)             │
│  ☐ OU=Contractors (skip)                │
│                                          │
│ Only selected OUs synced                │
│                                          │
└──────────────────────────────────────────┘
```

### Attribute Filtering

```
Scenario: Don't sync certain user types

Configure which user objects to sync:

PowerShell:
Set-ADSyncObjectInclusionFilter `
  -SyncObjectType "User" `
  -FilteringEnabled $true `
  -FilterGroup "Cloud Users"

Result:
• Only users in "Cloud Users" group synced
• Other users not synced
• Reduces cloud quota usage
```

---

## 🔧 Troubleshooting Common Issues

### Issue 1: Users Not Syncing

```
Symptom: Created user in on-prem AD, not appearing in cloud after 30+ min

Check:
1. Is AAD Connect running?
   ├─ Services → Azure AD Sync
   ├─ Status: Running
   └─ If stopped: Start it

2. Check connector status:
   ├─ AAD Connect → Connectors
   ├─ Look for errors/warnings
   └─ Check last sync timestamp

3. Is user in filtered scope?
   ├─ AAD Connect → Domain/OU Filtering
   ├─ Is user's OU checked?
   └─ Is user's domain selected?

4. Check on-prem AD:
   ├─ User exists?
   ├─ User disabled? (should be enabled)
   ├─ User in right OU?
   └─ User has email address? (sometimes required)

5. Manual sync:
   ├─ Run AAD Connect manually
   ├─ PowerShell: Start-ADSyncSyncCycle -PolicyType Delta
   └─ Wait 2-3 minutes

6. Check sync errors:
   ├─ Event Viewer → AAD Connect logs
   ├─ Look for "Error" or "Warning"
   └─ Google error message
```

### Issue 2: Password Sync Not Working

```
Symptom: User created in Entra ID, but password hash not synced. User can't sign in.

Check:
1. Sync mode:
   ├─ AAD Connect → Users Sign-in
   ├─ Is "Password Hash Sync" enabled?
   └─ If not enabled: Enable it

2. Password hash filtering:
   ├─ AAD Connect → Sync Settings
   ├─ "Synchronize all passwords" checked?
   └─ Check for exclusion rules

3. Verify hash exists in AD:
   ├─ On AAD Connect server:
   ├─ Event Viewer → AAD Connect
   ├─ Look for "Couldn't read password hash"
   └─ User might not have synced hash yet

4. Wait 2 hours:
   ├─ Sometimes takes time to sync hash
   ├─ Force manual sync if needed
   ├─ PowerShell: Start-ADSyncSyncCycle -PolicyType Delta

5. Check Entra ID:
   ├─ User exists in cloud?
   ├─ Try password reset (creates new hash)
   ├─ Reset password on-prem AD
   ├─ Wait 30 min for sync
   └─ Test sign-in

Workaround:
• Reset user password on-prem
• Force full sync
• Wait for hash to replicate
```

### Issue 3: Duplicate Synced Users

```
Symptom: Same user appears twice in Entra ID (once as synced, once as cloud-native)

This happens when:
• User manually created in cloud
• Same user then synced from on-prem
• Two separate identities in cloud

Resolution:
1. Verify duplicate:
   ├─ Search user in Entra ID
   ├─ Check Source Type: "Cloud" vs "Directory"
   └─ Confirm both are same person

2. Delete cloud-native copy:
   ├─ Entra ID → Users
   ├─ Select cloud-native user
   ├─ Delete
   ├─ Wait for sync (5 min)
   └─ Only synced copy remains

3. Verify:
   ├─ User should have Source Type: "Directory"
   ├─ No "synced from on-prem" message
   └─ One single user object

Prevention:
• Before syncing, delete cloud-native users
• Use proper naming to identify source
• Communicate sync plan to admins
```

### Issue 4: Sync Failures

```
Symptom: AAD Connect shows "Error" in Sync Status

Check Event Viewer:
┌──────────────────────────────────────────┐
│ Windows Event Viewer                     │
│ → Applications and Services Logs         │
│ → Azure AD Sync                          │
│ → Look for "Error" events                │
│                                          │
│ Common errors:                           │
│ • "Connection to Entra ID failed"        │
│   → Check internet connectivity          │
│   → Check firewall (port 443)            │
│   → Check Entra ID service status        │
│                                          │
│ • "Could not connect to AD"              │
│   → Check DC is reachable                │
│   → Check LDAP ports (389/636)           │
│   → Check permissions                    │
│                                          │
│ • "Sync rule error"                      │
│   → Check object mappings                │
│   → Check attribute flows                │
│   → Restart Sync Service                 │
│                                          │
│ • "Account disabled for login"           │
│   → Check AAD Connect service account    │
│   → Re-run config wizard                 │
│   └─ May need to re-enter creds          │
│                                          │
└──────────────────────────────────────────┘

Restart Sync Service:
PowerShell (Admin):
Restart-Service ADSync -Force
```

---

## 📊 Monitoring & Performance

### Sync Performance Optimization

```
Large Deployments (50k+ users):

1. Hardware:
   ├─ 4+ CPU cores
   ├─ 16GB+ RAM
   ├─ SSD storage
   └─ Dedicated server (not multi-purpose)

2. Network:
   ├─ High-speed internet (100Mbps+)
   ├─ Direct connection to DC (low latency)
   ├─ Avoid VPN for sync
   └─ Monitor bandwidth usage

3. Tuning:
   ├─ Increase sync frequency: 15-30 min
   ├─ PowerShell: Set-ADSyncScheduler -SyncCycleEnabled $true
   ├─ Monitor CPU/memory
   ├─ Offload other services

4. Filtering:
   ├─ Sync only needed users (OU filtering)
   ├─ Exclude test users
   ├─ Exclude disabled users
   └─ Reduces sync volume

Typical Sync Times:
├─ 1,000 users: 2-5 minutes
├─ 10,000 users: 10-20 minutes
├─ 50,000 users: 30-60 minutes
├─ 100,000+ users: 60-120 minutes
```

### Monitoring Dashboard

```
AAD Connect Health Portal:
https://aka.ms/aadconnecthealth

Monitor:
├─ Sync status
├─ Last successful sync
├─ Sync errors
├─ Performance metrics
├─ Alert configuration
└─ Detailed logs

Set up alerts for:
├─ Sync failures
├─ Password hash not synced
├─ Agent connectivity issues
├─ High error rates
└─ Large backlog
```

---

## 🆙 Upgrade & Support

### Azure AD Connect Lifecycle

```
Support Timeline:
└─ Latest version: Full support
├─ N-1 version: Critical patches only
├─ N-2 and older: No support

Recommendation:
• Upgrade within 60 days of new release
• Test in non-prod first
• Schedule during maintenance window
• Keep monthly update schedule

Upgrade Process:
1. Backup server (full image backup)
2. Download latest AAD Connect MSI
3. Run installer
4. Select "Upgrade"
5. Accept settings or reconfigure
6. Verify sync working
7. Monitor for 24 hours
```

### Post-Upgrade Verification

```
After AAD Connect upgrade:

1. Check sync status:
   ├─ Services → Azure AD Sync (Running)
   ├─ Full sync completed
   ├─ No errors in Event Viewer
   └─ Timestamp recent (within 30 min)

2. Verify synchronization:
   ├─ Create test user on-prem
   ├─ Wait for sync
   ├─ Verify in Entra ID cloud
   └─ Test password sign-in

3. Monitor for 24 hours:
   ├─ Check for sync failures
   ├─ Check performance (CPU/memory)
   ├─ Check error logs
   └─ Alert if issues detected

4. Rollback plan (if issues):
   ├─ Have previous version available
   ├─ Know how to downgrade
   ├─ Test rollback in lab first
   └─ Keep recent backup handy
```

---

## 🎓 Interview Questions

**Q1: What's Azure AD Connect and why is it needed?**
A: AAD Connect syncs identities from on-prem AD to Entra ID cloud. Enables hybrid identity — users sync from on-prem, get cloud app access, SSO. Without it: manual user management in cloud.

**Q2: What's the difference between PHS and PTA?**
A: PHS = password hash synced to cloud, Entra ID validates. PTA = password validated on-prem DC in real-time, hash never leaves on-prem. PTA more secure, PHS easier and faster.

**Q3: How often does AAD Connect sync by default?**
A: Every 30 minutes for delta (changed users). Initial sync is full. Can be changed with PowerShell: Set-ADSyncScheduler.

**Q4: What happens if AAD Connect server goes down?**
A: Sync stops. Existing cloud users still work. New on-prem users won't sync. On-prem users can still authenticate. If AAD Connect down > 30 days, sync might fail. Restart AAD Connect service to resume.

**Q5: How do you troubleshoot users not syncing?**
A: Check: Is AAD Connect running? Is user in filtered scope? Check Event Viewer for errors. Run manual sync. Verify user exists on-prem and meets sync criteria. Check network/connectivity.

---

*End of Section 6.7*
