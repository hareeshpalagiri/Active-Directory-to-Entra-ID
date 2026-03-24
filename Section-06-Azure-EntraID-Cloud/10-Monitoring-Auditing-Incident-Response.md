# Section 6.10 — Monitoring, Auditing & Incident Response

## 🎯 Overview

This section covers detecting, investigating, and responding to security events in Entra ID:

1. **Audit Logs & Logging** — What to log, how to collect
2. **Sign-in Logs** — User authentication tracking
3. **Alert Rules** — Detect suspicious patterns
4. **Incident Response** — Investigate and remediate
5. **Forensics** — Gather evidence after breach

---

## 📊 Audit Logs

### What Gets Logged

```
Entra ID logs almost everything:

Directory Changes:
├─ User created / modified / deleted
├─ Group created / modified / deleted
├─ Application registered
├─ Permissions granted / revoked
├─ Password reset
├─ MFA changes
└─ Device registered / modified

Authentication Events:
├─ User sign-in
├─ Sign-in failures
├─ MFA challenges
├─ Consent events
└─ Token issuance

Administrative Actions:
├─ Role assignments
├─ Policy changes
├─ License assignments
├─ Password resets
├─ Bulk operations
└─ App permissions

Conditional Access:
├─ Policy triggered
├─ MFA required
├─ Device block
└─ Access denied

Risk Events:
├─ Risk-based decisions
├─ Anomalous behavior
├─ Suspicious patterns
└─ Identity Protection events
```

### Accessing Audit Logs

**Azure Portal:**
```
Entra ID → Monitoring → Audit logs

Filters:
├─ Date range
├─ Activity type
├─ Category
├─ Initiated by (who made change)
├─ Target (who/what changed)
├─ Service
└─ Status (success/failure)

Export:
└─ CSV download for analysis
```

**PowerShell:**
```powershell
# Get audit logs
Get-MgAuditLogDirectoryAudit -All

# Filter by activity
Get-MgAuditLogDirectoryAudit -Filter "activityDisplayName eq 'Delete user'" -All

# Filter by date
$startDate = (Get-Date).AddDays(-7)
Get-MgAuditLogDirectoryAudit -Filter "createdDateTime ge $startDate" -All

# Export to CSV
Get-MgAuditLogDirectoryAudit -All | Export-Csv "audit-logs.csv" -NoTypeInformation
```

**Microsoft Graph API:**
```
GET https://graph.microsoft.com/v1.0/auditLogs/directoryAudits
Authorization: Bearer {access_token}

Optional filters:
?$filter=createdDateTime ge 2024-03-17 and activityDisplayName eq 'Delete user'
?$orderby=createdDateTime desc
?$top=100
```

### Key Audit Log Events

| Activity | Indicates | Risk Level |
|----------|-----------|-----------|
| **Create user** | New account | Low |
| **Delete user** | Account removed | Medium |
| **Reset password** | Credential reset | Low (if legitimate) |
| **Grant admin role** | Privilege escalation | High |
| **Add member to group** | Permission change | Medium |
| **Consent application** | App granted access | Medium |
| **Disable sign-in** | Lockout | Medium |
| **Modify federation** | Trust relationship | Critical |

---

## 🔍 Sign-in Logs

More detailed than audit logs — specifically for authentication.

### Sign-in Log Details

```
Entra ID → Monitoring → Sign-in logs

For EACH sign-in, log includes:

User:
├─ User principal name
├─ User ID
├─ Display name
└─ Source (Cloud, On-prem, Guest)

Authentication:
├─ Authentication method (password, MFA, etc)
├─ MFA result (passed, failed)
├─ Conditional Access (applied, exempted)
└─ Risk level (low, medium, high)

Device:
├─ Device name
├─ Device type (Desktop, Mobile)
├─ OS
├─ Compliant status
├─ Managed by MDM
└─ Device ID

Location:
├─ Country
├─ State/Region
├─ City
├─ IP address
├─ Geographic coordinates
└─ ISP

Application:
├─ App name
├─ App ID
├─ Resource (what app accessed)
└─ Protocol (OIDC, SAML, etc)

Result:
├─ Success
├─ Failure (with error code)
└─ Error message

Timestamp:
├─ Sign-in time (UTC)
└─ Duration (how long auth took)
```

### Analyzing Sign-in Logs

```powershell
# Get sign-in logs
Get-MgAuditLogSignIn -All

# Find failed logins
Get-MgAuditLogSignIn -Filter "status/errorCode ne 0" -All

# Find MFA failures
Get-MgAuditLogSignIn -Filter "authenticationDetails/any(ad: ad/authenticationMethod eq 'MFA' and ad/succeeded eq false)" -All

# Find logins from specific country
Get-MgAuditLogSignIn -Filter "location/countryOrRegion eq 'CN'" -All

# Find logins to sensitive app
Get-MgAuditLogSignIn -Filter "appDisplayName eq 'Microsoft 365 Admin Center'" -All

# Find impossible travel
# (Logins from different countries too close in time)
# Manual analysis of IP/location changes
```

### Key Sign-in Anomalies to Alert On

```
RED FLAGS:

1. Multiple failed logins
   └─ More than 5 failures in 10 minutes
   └─ Possible: Password spray, credential stuffing

2. Sign-in from unusual location
   └─ New country, especially high-risk
   └─ Possible: Account compromise, account takeover

3. Impossible travel
   └─ Los Angeles 9:00 AM, Singapore 9:05 AM
   └─ Not possible physically
   └─ Possible: Token stolen, credential reuse

4. Off-hours sign-in
   └─ Normal hours: 9 AM - 5 PM Monday-Friday
   └─ Sign-in at 2 AM on Sunday
   └─ Possible: Compromised account, scheduled attack

5. New device sign-in
   └─ User has never used this device before
   └─ Especially with admin account
   └─ Possible: Unauthorized access

6. Sensitive resource access
   └─ Admin portal access from unusual location
   └─ User suddenly accessing many files
   └─ Possible: Privilege escalation, exfiltration

7. Bulk operations
   └─ Many group additions in short time
   └─ Mass permission changes
   └─ Possible: Malicious activity, misconfiguration
```

---

## 🚨 Alerts & Monitoring Rules

### Set Up Alerts (Native)

**Entra ID → Monitoring → Alerts**

```
Alert Rule Examples:

1. "Multiple failed sign-in attempts"
IF:
  More than 5 failed logins
  In 10 minutes
  Same user
THEN:
  Alert immediately
  Disable account
  Notify security team

2. "Admin role assignment"
IF:
  User assigned admin role
THEN:
  Alert immediately
  Requires approval in PIM
  Notify compliance

3. "Unusual sign-in from new location"
IF:
  Sign-in from country never before used
  OR Impossible travel detected
THEN:
  Alert
  Require MFA
  Ask for approval
```

### Log Aggregation (SIEM)

**Send logs to SIEM for advanced detection:**

```
┌───────────────────────────────┐
│     Entra ID Logs             │
│  (Audit, Sign-in, Alerts)     │
└────────┬──────────────────────┘
         │
         ↓ (Export via Connector)
┌───────────────────────────────┐
│     SIEM (Microsoft Sentinel) │
│  (Central logging platform)   │
└────────┬──────────────────────┘
         │
         ├─ Run correlation rules
         ├─ Detect patterns
         ├─ Generate alerts
         ├─ Create dashboards
         └─ Investigate incidents
```

**Microsoft Sentinel Queries (KQL):**

```kusto
// Failed login spike
SigninLogs
| where Status.errorCode != 0
| summarize FailureCount = count() by UserPrincipalName
| where FailureCount > 5
| sort by FailureCount desc

// Impossible travel
SigninLogs
| sort by TimeGenerated desc
| where Status.errorCode == 0
| extend Country = tostring(LocationDetails.countryOrRegion)
| extend City = tostring(LocationDetails.city)
| extend TimeGap = (TimeGenerated - prev(TimeGenerated))
| extend DistanceKm = 7000  // rough approximation
| where TimeGap < 10m and DistanceKm > 1000
| project UserPrincipalName, Country, City, TimeGap

// Risky app usage
AuditLogs
| where Category == "ApplicationManagement"
| where ActivityDisplayName == "Consent to application"
| where Result == "Success"
| extend AppName = tostring(InitiatedBy.app.displayName)
| extend AppId = tostring(InitiatedBy.app.appId)
// Check if AppId in risky apps list
| where AppId in (risky_apps_list)
| project TimeGenerated, UserPrincipalName, AppName, AppId

// Privileged operations
AuditLogs
| where OperationType in ("Assign", "AssignAppRole", "GrantDelegatedAdminPermission")
| project TimeGenerated, OperationType, InitiatedBy, TargetResources
```

---

## 🕵️ Incident Investigation

### Security Event Timeline

When you detect suspicious activity:

```
Step 1: Isolate the Incident (Immediate)
├─ Disable user account (if compromised)
├─ Revoke sessions (sign out all sessions)
├─ Reset MFA (attacker can't use phone)
├─ Force password reset
└─ Block IP address (Conditional Access)

Step 2: Determine Scope (Next 2 hours)
├─ When did compromise start?
├─ What resources accessed?
├─ What data exposed?
├─ Other accounts compromised?
├─ System-wide or isolated?
└─ Notify stakeholders

Step 3: Evidence Collection (Ongoing)
├─ Export sign-in logs (suspicious user, date range)
├─ Export audit logs (permissions changes)
├─ Capture device state (if device compromised)
├─ Monitor for lateral movement
├─ Check app logs
└─ Preserve all logs

Step 4: Investigation (24-48 hours)
├─ Analyze attack pattern
├─ Identify attack vector (phishing, app, etc)
├─ Find other affected users
├─ Check for persistence (backdoor, scheduled task)
├─ Check app activity
└─ Document findings

Step 5: Remediation (Ongoing)
├─ Reset credentials for affected users
├─ Revoke compromised tokens
├─ Remove malicious app consent
├─ Review conditional access (may need tightening)
├─ Implement detective controls
└─ Prevent recurrence

Step 6: Recovery (1-2 weeks)
├─ Monitor for return of attacker
├─ Educate affected users
├─ Audit third-party access
├─ Review security controls
└─ Lessons learned
```

### Investigation Playbook: Account Takeover

```
SUSPECTED ACCOUNT TAKEOVER

1. Verify Compromise
   ├─ Access sign-in logs
   ├─ Find first unauthorized sign-in
   ├─ Note: Time, IP, location, device
   ├─ Check for multiple failed logins before success
   └─ Confirm: Attacker logged in successfully

2. Assess Lateral Movement
   ├─ What resources accessed after compromise?
   ├─ Sign-in logs → Check apps accessed
   ├─ Audit logs → Check if roles/perms added
   ├─ Email logs → Check if forwarding rules set
   ├─ Cloud apps logs → Check file/data access
   └─ Did attacker move to other accounts?

3. Identify Attack Vector
   ├─ Phishing? (check email logs for suspicious email)
   ├─ Weak password? (check password policy)
   ├─ Credential reuse? (password breach check)
   ├─ Token theft? (check device security)
   ├─ App compromise? (check app permissions)
   └─ Social engineering? (interview user)

4. Contain
   ├─ Disable account immediately
   ├─ Revoke all sessions
   ├─ Reset password (user must change)
   ├─ Reset MFA (re-enroll user)
   ├─ Revoke app consent if suspicious
   ├─ Revoke refresh tokens
   └─ Enable aggressive Conditional Access

5. Recover
   ├─ Reset account password (user must choose new)
   ├─ Re-enroll in MFA
   ├─ Review connected devices (remove unknown)
   ├─ Check for forwarding rules (email)
   ├─ Verify no persistent backdoors
   └─ Re-enable account with monitoring

6. Post-Incident
   ├─ User training (phishing awareness)
   ├─ Tighten Conditional Access
   ├─ Review admin account activity
   ├─ Audit other privileged accounts
   └─ Document case + lessons learned
```

---

## 🛡️ Forensic Data Collection

### Preserve Evidence Quickly

```
Immediate Actions (First 24 hours):

1. Export Sign-in Logs:
   Entra ID → Sign-in logs
   Filter: User + Date range around incident
   Export CSV
   └─ Preserve browser history, timestamps

2. Export Audit Logs:
   Entra ID → Audit logs
   Filter: All activities during incident window
   Export CSV
   └─ Shows WHO did WHAT and WHEN

3. Check Admin Accounts:
   Did attacker gain admin access?
   Review admin activity logs
   └─ Look for unauthorized privilege grants

4. Review Device Info:
   If device was compromised:
   Check device inventory
   Device ID, OS, last check-in
   └─ May need device wipe

5. Email Retention:
   Place user on litigation hold
   Prevent automatic deletion
   └─ Preserve evidence

6. App Logs:
   Enable app-specific logging
   Check activity in cloud apps
   (Teams, SharePoint, Outlook, etc)
   └─ See what user accessed

7. Network Logs:
   Get network/firewall logs
   Check for C2 communication
   Check for data exfiltration
   └─ See if data left network

8. Chain of Custody:
   Document everything
   Who accessed what
   When, Why, How
   └─ For legal proceedings
```

---

## 📈 Metrics & KPIs

Monitor these security metrics:

```
Authentication Security:
├─ Percentage of users with MFA enabled
│  Target: > 95%
├─ Failed login attempts per day
│  Target: < 1% of total logins
├─ Average time to detect breach
│  Target: < 4 hours
└─ MTTR (Mean Time To Respond)
   Target: < 1 hour

Compliance:
├─ Percentage of users with strong passwords
│  Target: 100%
├─ Admin accounts with PIM activation
│  Target: 100%
├─ Guest accounts reviewed
│  Target: Monthly
└─ Audit log retention
   Target: 90+ days

Risk:
├─ High-risk sign-ins per day
│  Target: Trending down
├─ Compromised credentials detected
│  Target: < 5 per month
├─ Malicious apps consented
│  Target: 0
└─ Accounts with impossible travel
   Target: 0 (after investigation)

Detection:
├─ Alerts reviewed within 24 hours
│  Target: 100%
├─ False positive rate
│  Target: < 10%
├─ Incidents escalated to incident response
│  Target: All high-severity
└─ Time to contain incident
   Target: < 2 hours
```

---

## 🎓 Interview Questions

**Q1: What's the difference between audit logs and sign-in logs?**
A: Sign-in logs = just authentication events (who logged in, when, from where, success/fail). Audit logs = all directory changes (users created, permissions granted, apps consented, etc). Both are important for different reasons.

**Q2: What's impossible travel and why is it suspicious?**
A: Impossible travel = user logs in from Location A, then Location B, too soon to physically travel between them. Example: NYC 9:00 AM, Singapore 9:05 AM. Suggests token theft or account takeover, not legitimate user.

**Q3: How would you investigate a suspected account compromise?**
A: Check sign-in logs for unauthorized access, find first unauthorized login, note time/location/IP, check what resources were accessed, determine if lateral movement occurred, contain the account, reset credentials, identify attack vector, implement preventive measures.

**Q4: What should you do immediately if you detect unauthorized admin access?**
A: Disable account, revoke sessions, reset MFA, force password reset, block IP in Conditional Access, export logs for investigation, check if other admin accounts compromised, review activity logs for what admin accessed/changed.

**Q5: Why is token theft more dangerous than password compromise?**
A: With password, user can reset it. With token (especially refresh token), attacker has continuing access for weeks/months, difficult to detect. Defend with token expiration, rotation, binding to device, detection of unusual usage.

---

*End of Section 6.10*
