# Security Specification - Nexus Arena League

## 1. Data Invariants
- A chat message cannot exist without a valid tournament ID.
- A user can only edit their own profile, except for admin-only fields.
- A tournament can only be started or modified by an Admin.
- Participants can only register themselves for a tournament.
- Matches can only be created and updated by Admins.
- Chat messages can only be sent by the authenticated user (matching `senderId`), unless it's a system message sent by an Admin.

## 2. The "Dirty Dozen" Payloads (Anti-Patterns)
1. **Identity Spoofing (User Profile)**: User `A` attempts to update User `B`'s profile.
2. **Privilege Escalation**: User `A` attempts to set `isAdmin: true` on their own profile.
3. **Invalid Tournament ID**: Chat message created with a 2KB string as `tournamentId`.
4. **Chat Spoofing**: User `A` attempts to send a chat message with `senderId: "system"`.
5. **Score Injection**: Regular user attempts to update a match score.
6. **Double Start**: Attempting to set an `ongoing` tournament to `ongoing` again (State Shortcutting).
7. **Orphaned Match**: Creating a match for a tournament ID that does not exist.
8. **Shadow Registration**: User `A` registers User `B` for a tournament.
9. **Outcome Poisoning**: Submitting a match result once the match is already `completed` (Terminal State Locking).
10. **PII Leak**: Non-admin user attempting to list all user emails.
11. **Negative Score**: Updating a match with `score1: -100`.
12. **Future Message**: Sending a chat message with a `createdAt` timestamp from the future (Client-side clock spoofing).

## 3. Test Runner Concept
The tests will verify that:
- `match /tournaments/{tournamentId}/chat` rejects `senderId: "system"` for non-admins.
- `match /tournaments/{tournamentId}/chat` allows `senderId: "system"` for admins.
- `match /tournaments/{tournamentId}/matches` rejects writes for non-admins.
- `match /users/{userId}` blocks `isAdmin` updates for owners.
