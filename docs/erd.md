# Capstone Monitor ERD

This diagram documents the application's Django data models. The database is
MySQL (hosted on Aiven in production). The current model and migration files in
`backend/` are the source of truth for the schema.

```mermaid
erDiagram
    USER {
        bigint id PK
        varchar email UK
        varchar password
        varchar role
        boolean is_active
        datetime created_at
        datetime approved_at
        boolean must_change_password
    }

    STUDENT_PROFILE {
        bigint id PK
        bigint user_id FK,UK
        varchar full_name
        varchar section
        bigint school_year_id FK
    }

    ADVISER_PROFILE {
        bigint id PK
        bigint user_id FK,UK
        varchar full_name
        int capacity_override
    }

    SCHOOL_YEAR {
        bigint id PK
        int start_semester
        int start_year
        int end_semester
        int end_year
        boolean is_active
    }

    SYSTEM_SETTING {
        bigint id PK
        int default_adviser_capacity
        bigint display_school_year_id FK
        datetime updated_at
    }

    LOGIN_SESSION {
        char id PK
        bigint user_id FK
        varchar device_id
        varchar server_instance_id
        datetime created_at
        datetime ended_at
        varchar end_reason
    }

    CAPSTONE_GROUP {
        bigint id PK
        bigint adviser_id FK
        bigint requested_by_id FK
        bigint school_year_id FK
        varchar capstone_title
        varchar title_document
        varchar status
        text rejection_reason
        datetime created_at
        datetime decided_at
    }

    GROUP_MEMBER {
        bigint id PK
        bigint group_id FK
        bigint student_id FK
        varchar student_name_snapshot
        boolean is_listed_partner
    }

    MILESTONE {
        bigint id PK
        bigint group_id FK
        varchar title
        text description
        datetime deadline
        varchar status
    }

    SUBMISSION {
        bigint id PK
        bigint group_id FK
        bigint milestone_id FK
        varchar file
        datetime submitted_at
        datetime updated_at
        varchar status
        int resubmission_count
    }

    SUBMISSION_HISTORY {
        bigint id PK
        bigint submission_id FK
        varchar file
        varchar status
        datetime replaced_at
    }

    FEEDBACK {
        bigint id PK
        bigint submission_id FK
        bigint adviser_id FK
        text comment
        datetime created_at
    }

    NOTIFICATION {
        bigint id PK
        bigint recipient_id FK
        varchar message
        boolean is_read
        datetime created_at
    }

    ANNOUNCEMENT {
        bigint id PK
        bigint posted_by_id FK
        varchar title
        text body
        boolean is_pinned
        datetime created_at
        datetime updated_at
    }

    DOCUMENT_TEMPLATE {
        bigint id PK
        bigint uploaded_by_id FK
        varchar title
        text description
        varchar file
        datetime created_at
    }

    STORED_FILE {
        varchar key PK
        varchar name
        varchar content_type
        bigint size
        datetime created_at
    }

    STORED_FILE_CHUNK {
        bigint id PK
        varchar stored_file_id FK
        int chunk_index
        longblob content
    }

    USER ||--o| STUDENT_PROFILE : has
    USER ||--o| ADVISER_PROFILE : has
    SCHOOL_YEAR o|--o{ STUDENT_PROFILE : enrolls
    SCHOOL_YEAR o|--o{ CAPSTONE_GROUP : covers
    SCHOOL_YEAR o|--o{ SYSTEM_SETTING : displayed_in
    USER ||--o{ LOGIN_SESSION : starts
    USER o|--o{ CAPSTONE_GROUP : advises
    USER o|--o{ CAPSTONE_GROUP : requests
    CAPSTONE_GROUP ||--o{ GROUP_MEMBER : contains
    USER o|--o{ GROUP_MEMBER : joins
    CAPSTONE_GROUP ||--o{ MILESTONE : defines
    CAPSTONE_GROUP ||--o{ SUBMISSION : receives
    MILESTONE ||--o{ SUBMISSION : referenced_by
    SUBMISSION ||--o{ SUBMISSION_HISTORY : preserves
    SUBMISSION ||--o{ FEEDBACK : receives
    USER o|--o{ FEEDBACK : writes
    USER ||--o{ NOTIFICATION : receives
    USER o|--o{ ANNOUNCEMENT : posts
    USER o|--o{ DOCUMENT_TEMPLATE : uploads
    STORED_FILE ||--|{ STORED_FILE_CHUNK : stores
```

## Notes

- `USER` is the custom Django user table. It inherits standard authentication
  fields from Django's `AbstractUser`; this diagram shows the fields most
  relevant to the application and omits Django's permission and group join
  tables.
- A user has one role (`admin`, `adviser`, or `student`). `STUDENT_PROFILE` and
  `ADVISER_PROFILE` hold role-specific details; admin accounts do not need a
  profile row.
- A `GROUP_MEMBER` may have no `student_id`: listed partners can be represented
  by `student_name_snapshot` without an account. The snapshot also preserves a
  member's name if their user account is deleted.
- A group can have one submission per milestone. Resubmission updates that
  submission and saves the previous file and status in `SUBMISSION_HISTORY`.
- File fields store a key. `STORED_FILE` and `STORED_FILE_CHUNK` hold the file
  metadata and bytes in MySQL, in one-megabyte chunks. The key links these rows
  at the storage layer; domain tables do not have separate foreign keys to
  `STORED_FILE`.
- `REPORTS` has no model of its own; reports are generated from existing data.
