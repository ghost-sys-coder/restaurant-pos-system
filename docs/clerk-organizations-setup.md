# Clerk Organizations setup

Before using multi-client onboarding, enable Organizations in the Clerk Dashboard and select **Membership required**. Disable end-user organization creation so restaurant organizations are created only by the platform-owner API.

Create these custom organization roles in the default Role Set:

| Clerk role | Application role | Required Clerk system permissions |
| --- | --- | --- |
| `org:restaurant_owner` | Restaurant Owner | Membership read/manage, organization profile manage |
| `org:restaurant_admin` | Restaurant Admin | Membership read, organization profile manage |
| `org:general_manager` | General Manager | Membership read |
| `org:accountant` | Accountant | Billing read |

Set `PLATFORM_OWNER_CLERK_USER_IDS` to the Clerk user ID of the agency/platform owner. Multiple IDs may be comma-separated. Platform users are not restaurant organization members after the first owner invitation is created.

Because membership-required mode does not allow a signed-in user without an Organization, create one internal Organization for your agency and add all platform users to it. This platform Organization is not mapped to a restaurant and will never be shown on a POS terminal.

The application maps each Clerk Organization to one `restaurants` row through `clerk_organization_id`. Operational roles (`shift_manager`, `cashier`, `server`, `bartender`, `host`, and `kitchen`) remain PIN-only database profiles.

Organization invitations redirect to the application's `/accept-invitation` route, which embeds Clerk's ticket-aware sign-in component. `APP_URL` must be an absolute application origin such as `http://localhost:3000` or `https://pos.example.com`.

## Account Portal redirects

In the Clerk Dashboard, open **Account Portal → Redirects** and use `/` for fields that require a relative fallback path. Do not paste a full URL into a path-only field.

If these fallbacks are missing, a successfully accepted invitation ends at the Clerk-hosted `/default-redirect` page instead of returning to this application.
