# Alert Rules ER Diagram

## Current Architecture (Problematic)

```mermaid
erDiagram
    Organization ||--o{ AlertRule : "has"
    AlertRule ||--o{ Alert : "triggers"
    Alert }o--|| Client : "for"
    Alert }o--|| Transaction : "triggered_by"
    UmaValue ||--o{ AlertRule : "used_by"

    Organization {
        string id PK
        string name
    }

    AlertRule {
        string id PK
        string organizationId FK "REQUIRED - Problem: Legal rules duplicated per org"
        string name "LFPIORPI requirement"
        boolean active
        json ruleConfig "6,420 UMA threshold, etc"
    }

    Alert {
        string id PK
        string organizationId FK "REQUIRED - Correct"
        string alertRuleId FK
        string clientId FK
    }

    Client {
        string id PK
        string organizationId FK "REQUIRED - Correct"
        string rfc
    }

    UmaValue {
        string id PK
        decimal dailyValue "Global - no orgId"
        boolean active
    }
```

## Proposed Architecture (Recommended)

```mermaid
erDiagram
    AlertRule ||--o{ AlertRuleOverride : "can_have"
    AlertRuleOverride }o--|| Organization : "for"
    AlertRule ||--o{ Alert : "triggers"
    Alert }o--|| Client : "for"
    Alert }o--|| Transaction : "triggered_by"
    UmaValue ||--o{ AlertRule : "used_by"

    AlertRule {
        string id PK
        string name "Legal requirement (LFPIORPI)"
        string description
        string severity "Default"
        json ruleConfig "Legal thresholds (6,420 UMA)"
        boolean isSystemRule "Cannot delete"
        string legalBasis "LFPIORPI Art. 32"
    }

    AlertRuleOverride {
        string id PK
        string alertRuleId FK
        string organizationId FK
        boolean enabled "Enable/disable"
        json ruleConfigOverride "Custom thresholds"
        string severity "Custom severity"
    }

    Alert {
        string id PK
        string organizationId FK "REQUIRED - Correct"
        string alertRuleId FK
        string clientId FK
    }

    Client {
        string id PK
        string organizationId FK "REQUIRED - Correct"
        string rfc
    }

    UmaValue {
        string id PK
        decimal dailyValue "Global - no orgId"
        boolean active
    }

    Organization {
        string id PK
        string name
    }
```

## Key Differences

| Aspect                 | Current                       | Proposed                         |
| ---------------------- | ----------------------------- | -------------------------------- |
| **Alert Rules**        | Per organization (duplicated) | Global (shared)                  |
| **Legal Requirements** | Duplicated per org            | Single source of truth           |
| **Customization**      | Edit rule directly            | Override via `AlertRuleOverride` |
| **Compliance**         | Risk of inconsistencies       | Guaranteed consistency           |
| **Maintenance**        | Update per organization       | Update once                      |
