# Section 6.5 — Users, Groups & Device Management

## 🎯 Overview

This section covers identity and device management in Entra ID:

1. **Cloud Users** — Creation, attributes, lifecycle
2. **Groups** — Security groups, Microsoft 365 groups, dynamic groups
3. **Devices** — Azure AD joined, Hybrid joined, Personal devices
4. **Guest Access** — B2B collaboration
5. **User Provisioning** — Bulk operations, lifecycle workflows

---

## 👤 Cloud Users

### User Types in Entra ID

```
┌─────────────────────────────────────────────────┐
│          User Types in Entra ID                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. CLOUD USERS                                 │
│     ├─ Created directly in Entra ID             │
│     ├─ No on-prem AD presence                   │
│     ├─ UPN: user@contoso.onmicrosoft.com        │
│     ├─ Use: Cloud-first orgs, guests            │
│     │                                           │
│  2. SYNCED USERS (Hybrid)                       │
│     ├─ Created in on-prem AD                    │
│     ├─ Synced via Azure AD Connect              │
│     ├─ UPN: user@contoso.com                    │
│     ├─ Password hash synced                     │
│     ├─ Use: Hybrid organizations                │
│     │                                           │
│  3. GUEST USERS (External)                      │
│     ├─ External identities invited              │
│     ├─ Guest UPN: user_contoso.com#EXT#...      │
│     ├─ Can use own identity provider            │
│     ├─ Limited permissions by default           │
│     ├─ Use: B2B collaboration                   │
│     │                                           │
│  4. SERVICE PRINCIPALS                          │
│     ├─ Identity for apps/services               │
│     ├─ No human interaction                     │
│     ├─ Used for automation, API access          │
│     ├─ Use: Scripts, integrations, daemons      │
│                                                 │
└─────────────────────────────────────────────────┘
```

### User Attributes

When creating a cloud user, you set:

```json
{
  "userPrincipalName": "alice@contoso.onmicrosoft.com",
  "mailNickname": "alice",
  "displayName": "Alice Johnson",
  "givenName": "Alice",
  "surname": "Johnson",
  "mail": "alice@contoso.com",
  "officeLocation": "New York, NY",
  "department": "Engineering",
  "jobTitle": "Security Analyst",
  "companyName": "Contoso Inc",
  "country": "United States",
  "city": "New York",
  "postalCode": "10001",
  "telephoneNumber": "+1-555-0100",
  "mobilePhone": "+1-555-0101",
  "streetAddress": "123 Main St"
}
```

### User Account Status

```
┌──────────────────────────────────────────┐
│       User Account Lifecycle             │
├──────────────────────────────────────────┤
│                                          │
│  1. CREATED (New User)                   │
│     • Temporary password assigned        │
│     • User must reset on first login     │
│     • No licenses yet                    │
│     │                                    │
│     ↓                                    │
│                                          │
│  2. ACTIVE (Normal Use)                  │
│     • User fully functional              │
│     • Licensed for services              │
│     • Can access cloud apps              │
│     │                                    │
│     ↓ (Promotion or separation)          │
│                                          │
│  3. BLOCKED FROM SIGN-IN                 │
│     • User account disabled              │
│     • Cannot authenticate                │
│     • Still in directory (can be re-enabled)
│     │                                    │
│     ↓                                    │
│                                          │
│  4. DELETED (Soft Delete)                │
│     • Hidden from GAL (Global Address    │
│       List) for 30 days                  │
│     • Can be restored within 30 days     │
│     • After 30 days: Permanently deleted │
│                                          │
└──────────────────────────────────────────┘
```

### Create User via PowerShell

```powershell
# Connect to Entra ID
Connect-MgGraph -Scopes "User.ReadWrite.All"

# Create new user
$params = @{
    accountEnabled = $true
    displayName = "Alice Johnson"
    givenName = "Alice"
    surname = "Johnson"
    userPrincipalName = "alice@contoso.onmicrosoft.com"
    mailNickname = "alice"
    passwordProfile = @{
        forceChangePasswordNextSignIn = $true
        password = "TempPassword!2024"
    }
    department = "Engineering"
    jobTitle = "Security Analyst"
}

New-MgUser -BodyParameter $params
```

---

## 👥 Groups

### Group Types

```
┌────────────────────────────────────────────────┐
│          Group Types in Entra ID               │
├────────────────────────────────────────────────┤
│                                                │
│  SECURITY GROUPS                               │
│  ├─ Purpose: Access control                    │
│  ├─ Members: Users, other groups               │
│  ├─ Owners: Can manage group                   │
│  ├─ Visibility: Can be hidden                  │
│  ├─ Email: No group email                      │
│  ├─ Use: Permission assignments, CA policies   │
│  │                                             │
│  MICROSOFT 365 GROUPS (Unified Groups)         │
│  ├─ Purpose: Collaboration + access            │
│  ├─ Members: Users, other groups               │
│  ├─ Owners: Can manage group                   │
│  ├─ Visibility: Public or Private              │
│  ├─ Email: Group email created                 │
│  ├─ Extras: Teams, SharePoint, mailbox created │
│  ├─ Use: Team collaboration, distribution      │
│  │                                             │
│  MAIL-ENABLED SECURITY GROUPS                  │
│  ├─ Purpose: Distribution + access             │
│  ├─ Email: Yes (distribution list)             │
│  ├─ Mailbox: No (office 365 group mailbox)     │
│  ├─ Use: Email distribution + permissions      │
│                                                │
└────────────────────────────────────────────────┘
```

### Dynamic Groups (Automatic Membership)

Instead of manually managing members, use rules:

```
┌───────────────────────────────────────────────────┐
│  Dynamic Group Rule Example                       │
├───────────────────────────────────────────────────┤
│                                                   │
│  Group Name: "Engineering Department"            │
│                                                   │
│  Rule: (user.department -eq "Engineering")       │
│                                                   │
│  Result:                                          │
│  • Anyone with department="Engineering" auto     │
│    added to group                                │
│  • When department changes away: auto removed    │
│  • Evaluated every ~15 minutes                   │
│                                                   │
│  Complex Rule Example:                           │
│  (user.department -eq "Engineering") -and        │
│  (user.accountEnabled -eq true) -and             │
│  (user.country -eq "United States")              │
│                                                   │
│  Result: Only active US-based engineering users  │
│                                                   │
└───────────────────────────────────────────────────┘
```

### Group RBAC Membership

```
Group Used For:
├─ Access Control (who can access resource)
├─ License Assignment (bulk licensing)
├─ Conditional Access (group in CA policy)
└─ Application Roles (assign app-specific roles)

Example: Assign 100 users to Teams app license
Instead of: License each user individually
Better way: Add them to group → Group gets licensed
            All members inherit license
```

### Create Security Group via PowerShell

```powershell
# Create security group
$params = @{
    displayName = "Engineering Team"
    description = "Members of the Engineering department"
    mailEnabled = $false
    securityEnabled = $true
    mailNickname = "engineering"
}

$group = New-MgGroup -BodyParameter $params

# Add members to group
$memberParams = @{
    "@odata.id" = "https://graph.microsoft.com/v1.0/directoryObjects/{userId}"
}

New-MgGroupMember -GroupId $group.Id -BodyParameter $memberParams
```

---

## 🖥️ Devices

### Device Types

```
┌──────────────────────────────────────────────────┐
│        Device Registration States               │
├──────────────────────────────────────────────────┤
│                                                  │
│  1. AZURE AD JOINED (Cloud-native)               │
│     ├─ Registered to: Entra ID only              │
│     ├─ On-prem AD: No connection                 │
│     ├─ Typical OS: Windows 10/11                 │
│     ├─ Ownership: Corporate                      │
│     ├─ Use case: Cloud-first organizations      │
│     ├─ Security: Device compliance enforced      │
│     │                                            │
│     └─ Example Configuration:                    │
│        New Windows 10 PC                         │
│        → User signs in with Entra ID creds       │
│        → Automatically Entra ID joined           │
│        → No domain controller interaction        │
│                                                  │
│  2. HYBRID AZURE AD JOINED (On-prem + Cloud)    │
│     ├─ Registered to: Both on-prem AD + Entra ID│
│     ├─ On-prem AD: Full member                   │
│     ├─ Typical OS: Windows 10/11                 │
│     ├─ Ownership: Corporate                      │
│     ├─ Use case: Hybrid organizations           │
│     ├─ Security: Both GPO + CA policies         │
│     │                                            │
│     └─ Example Configuration:                    │
│        Existing domain-joined PC                 │
│        → Azure AD Connect discovers it           │
│        → Auto-joined to Entra ID                 │
│        → Still member of on-prem AD             │
│                                                  │
│  3. REGISTERED DEVICES (Personal/BYOD)          │
│     ├─ Registered to: Entra ID only              │
│     ├─ On-prem AD: No connection                 │
│     ├─ Typical OS: iOS, Android, macOS, Windows │
│     ├─ Ownership: Personal                       │
│     ├─ Use case: Remote work, BYOD              │
│     ├─ Security: Conditional Access, MDM policy │
│     │                                            │
│     └─ Example Configuration:                    │
│        Employee's iPhone                         │
│        → User enrolls in Intune MDM              │
│        → Device registered to Entra ID          │
│        → Subject to compliance policies         │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Device Compliance & Conditional Access

```
Device State Attributes:
├─ Compliant: Passes security requirements
│  └─ Example: Disk encryption enabled, no jailbreak
│
├─ Trusted: Marked as trusted by admin
│  └─ Example: Corporate network devices
│
└─ Managed: Enrolled in MDM (Microsoft Intune)
   └─ Example: Device policies applied

Conditional Access Example:
"Grant Teams access only from compliant devices"

IF (device.compliant == true)
   THEN Allow access
ELSE
   THEN Require MFA
```

### Device Object in Entra ID

```json
{
  "id": "12345678-1234-1234-1234-123456789012",
  "displayName": "ALICE-LAPTOP",
  "deviceId": "abc12345-678d-90ef-1234-567890abcdef",
  "deviceType": "Windows",
  "operatingSystem": "Windows",
  "operatingSystemVersion": "10.0.22621",
  "isCompliant": true,
  "isManaged": true,
  "trustType": "AzureAD",
  "registrationDateTime": "2024-01-15T10:30:00Z",
  "approximateLastSignInDateTime": "2024-03-24T09:15:00Z",
  "owner": "alice@contoso.onmicrosoft.com"
}
```

### Device Join Comparison

| Aspect | Azure AD Joined | Hybrid Joined | Registered |
|--------|-----------------|---------------|-----------|
| **Location** | Cloud only | Cloud + On-prem | Cloud only |
| **OS** | Windows 10/11 | Windows 10/11 | Any OS |
| **Owned by** | Company | Company | Individual |
| **Domain controller** | No | Yes | No |
| **Sync agent** | No | AAD Connect | No |
| **SSO** | Cloud apps | All apps | Cloud apps |
| **Policies** | Conditional Access | GPO + CA | Conditional Access |
| **Security** | Modern | Hybrid approach | MDM policies |

---

## 🛡️ Guest Users & B2B

### Invite Guest User

```powershell
# Create guest user invitation
$params = @{
    invitedUserEmailAddress = "external@company.com"
    inviteRedirectUrl = "https://contoso.com"
    sendInvitationMessage = $true
    invitedUserMessageInfo = @{
        customizedMessageBody = "Welcome to our collaboration!"
    }
}

New-MgInvitation -BodyParameter $params
```

### Guest User Attributes

```
External user invited:
external@company.com

Becomes guest in Entra ID:
├─ UPN: external_company.com#EXT#@contoso.onmicrosoft.com
├─ User Type: Guest
├─ Directory: Can't create other users (by default)
├─ Access: Limited to shared resources
├─ Permissions: Defined by resource owner
└─ Expiration: Optional (set B2B policy)
```

### Guest Access Restrictions (Default)

```
Guest users CAN:
✓ View profile info of other users
✓ See group membership
✓ Access shared resources (if invited)
✓ Change own password

Guest users CANNOT:
✗ View hidden groups
✗ View other users' full profile
✗ Invite other guests (default)
✗ See security group membership
✗ Create or edit resources (varies by app)
```

### Guest Access Permissions Policy

```powershell
# Configure guest access restrictions
Update-MgPolicyCrossTenantAccessPolicy -BodyParameter @{
    definition = @(
        "Block guest user creation: true"
    )
    description = "Strict guest policies"
}

# Limit what guests can do
$params = @{
    allowedToCreateApps = $false
    allowedToCreateSecurityGroups = $false
    allowedToReadOtherUsersMessages = $false
}
```

---

## 🔄 User Provisioning & Lifecycle

### Provisioning Scenarios

```
┌─────────────────────────────────────────────────┐
│    Typical Provisioning Workflow                │
├─────────────────────────────────────────────────┤
│                                                 │
│  ONBOARDING (New Hire)                          │
│  ├─ HR system: Employee record created          │
│  ├─ Workflow: Automatic (or manual approval)    │
│  ├─ Create: Entra ID user                       │
│  ├─ Assign: License (Teams, Exchange)           │
│  ├─ Add: Security groups (Engineering, US)      │
│  ├─ Provision: Cloud apps via SCIM              │
│  └─ Result: User fully functional               │
│                                                 │
│  ROLE CHANGE                                    │
│  ├─ HR system: Department changed               │
│  ├─ Workflow: Update dynamic group              │
│  ├─ Remove: Old security groups                 │
│  ├─ Add: New security groups (Sales)            │
│  ├─ Update: App roles and permissions           │
│  └─ Result: Access updated automatically        │
│                                                 │
│  OFFBOARDING (Termination)                      │
│  ├─ HR system: Employee terminated              │
│  ├─ Workflow: Automated offboarding             │
│  ├─ Disable: Entra ID user account              │
│  ├─ Revoke: All licenses                        │
│  ├─ Remove: All group memberships               │
│  ├─ Unprovision: From all SaaS apps (SCIM)     │
│  ├─ Archive: Email (Litigation hold)            │
│  └─ Delete: After 30 days                       │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Bulk User Operations

```powershell
# Bulk import users from CSV
Import-Csv -Path "users.csv" | ForEach-Object {
    New-MgUser -UserPrincipalName $_.UPN `
               -DisplayName $_.DisplayName `
               -MailNickname $_.MailNickname `
               -AccountEnabled $true
}

# CSV format:
# UPN,DisplayName,MailNickname,Department
# alice@contoso.onmicrosoft.com,Alice Johnson,alice,Engineering
# bob@contoso.onmicrosoft.com,Bob Smith,bob,Sales
```

---

## 🎓 Interview Questions

**Q1: What's the difference between Azure AD joined and Hybrid joined?**
A: Azure AD joined = cloud only, no on-prem connection. Hybrid joined = registered to both on-prem AD and Entra ID. Hybrid is migration path for existing domain-joined PCs.

**Q2: How does a dynamic group work?**
A: Rules evaluated every ~15 minutes. If user matches rule (e.g., department=Engineering), auto-added to group. If stops matching, auto-removed. No manual membership management.

**Q3: What happens to a guest user account after 30 days?**
A: Guest account stays unless B2B policy sets expiration. If expired, account disabled. Resource owner can extend access if needed. On termination, can be deleted (30-day recovery window).

**Q4: Why would you use groups for license assignment?**
A: Assign license to group once, all members inherit it. Much faster than licensing 100 users individually. When user removed from group, license revoked automatically.

**Q5: What's the difference between registered and joined devices?**
A: Registered = personal device, loose integration (MDM policies). Joined = corporate device, full integration (device compliance, device tokens, SSO). Joined is more managed/secure.

---

*End of Section 6.5*
